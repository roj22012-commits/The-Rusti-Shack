"""
Bulk-loads Rusti's full historical dataset into Supabase via the REST API,
using the service_role key (bypasses RLS -- never expose this key
client-side). Run this AFTER supabase/migration_002_historical_schema.sql
has been applied in the SQL Editor.

Reads SUPABASE credentials from .env.local. Merges the April 2026 update
workbook's *_Apr2026 sheets into the base tables (Orders, OrderLines,
RentalTransactions, OrderPromotions), per the dataset's own DataDictionary
note: "Append to Orders for a unified view across the full case period."

    python3 scripts/load_historical_data.py
"""
import os
import math
import pandas as pd
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
BATCH_SIZE = 1000


def load_env():
    env = {}
    with open(os.path.join(ROOT, ".env.local")) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


ENV = load_env()
SUPABASE_URL = ENV["NEXT_PUBLIC_SUPABASE_URL"]
SERVICE_ROLE_KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]
REST_URL = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


def clean_records(df: pd.DataFrame) -> list[dict]:
    records = df.to_dict(orient="records")
    cleaned = []
    for r in records:
        row = {}
        for k, v in r.items():
            if v is None:
                row[k] = None
            elif isinstance(v, float) and math.isnan(v):
                row[k] = None
            elif isinstance(v, pd.Timestamp):
                row[k] = v.strftime("%Y-%m-%d")
            else:
                row[k] = v
        cleaned.append(row)
    return cleaned


def load_table(table: str, records: list[dict]):
    total = len(records)
    for i in range(0, total, BATCH_SIZE):
        batch = records[i : i + BATCH_SIZE]
        resp = requests.post(f"{REST_URL}/{table}", headers=HEADERS, json=batch)
        if resp.status_code >= 300:
            raise RuntimeError(
                f"Failed loading {table} batch {i}-{i+len(batch)}: "
                f"{resp.status_code} {resp.text[:500]}"
            )
        print(f"  {table}: {min(i + BATCH_SIZE, total)}/{total}")
    print(f"Loaded {total} rows into {table}")


def main():
    main_xl = pd.ExcelFile(os.path.join(DATA_DIR, "The_Rusti_Shack_Dataset.xlsx"))
    upd_xl = pd.ExcelFile(os.path.join(DATA_DIR, "The_Rusti_Shack_Apr2026_Update.xlsx"))

    stores = pd.read_excel(main_xl, sheet_name="Stores")
    employees = pd.read_excel(main_xl, sheet_name="Employees")
    customers_core = pd.read_excel(main_xl, sheet_name="Customers_Core")
    customers_contact = pd.read_excel(main_xl, sheet_name="Customers_Contact")
    customers_demo = pd.read_excel(main_xl, sheet_name="Customers_Demographics")
    promotions = pd.read_excel(main_xl, sheet_name="Promotions")
    inventory = pd.read_excel(main_xl, sheet_name="Inventory")
    date_dim = pd.read_excel(main_xl, sheet_name="DateDimension")

    orders = pd.concat(
        [pd.read_excel(main_xl, sheet_name="Orders"), pd.read_excel(upd_xl, sheet_name="Orders_Apr2026")],
        ignore_index=True,
    )
    order_lines = pd.concat(
        [pd.read_excel(main_xl, sheet_name="OrderLines"), pd.read_excel(upd_xl, sheet_name="OrderLines_Apr2026")],
        ignore_index=True,
    )
    order_promos = pd.concat(
        [
            pd.read_excel(main_xl, sheet_name="OrderPromotions"),
            pd.read_excel(upd_xl, sheet_name="OrderPromotions_Apr2026"),
        ],
        ignore_index=True,
    ).drop_duplicates(subset=["OrderID", "PromoCode"])
    rentals = pd.concat(
        [
            pd.read_excel(main_xl, sheet_name="RentalTransactions"),
            pd.read_excel(upd_xl, sheet_name="RentalTransactions_Apr2026"),
        ],
        ignore_index=True,
    )

    # Customers_Contact predates the site's new address columns; historical
    # rows simply have no street address on file, same as the live site's
    # own web-order customers did before this feature existed.
    for col in ["StreetAddress", "Region", "PostalCode"]:
        if col not in customers_contact.columns:
            customers_contact[col] = None
    customers_contact["LoyaltyMember"] = customers_contact["LoyaltyMember"] == "Yes"

    rentals["Returned"] = rentals["Returned"].astype(str)

    date_dim = date_dim.rename(columns={})  # already matches column-for-column

    print("Loading in FK-safe order...")
    load_table("Stores", clean_records(stores))
    load_table("Employees", clean_records(employees))
    load_table("Customers_Core", clean_records(customers_core))
    load_table("Customers_Contact", clean_records(customers_contact))
    load_table("Customers_Demographics", clean_records(customers_demo))
    load_table("Promotions", clean_records(promotions))
    load_table("Orders", clean_records(orders))
    load_table("OrderLines", clean_records(order_lines))
    load_table("OrderPromotions", clean_records(order_promos))
    load_table("RentalTransactions", clean_records(rentals))
    load_table("Inventory", clean_records(inventory))
    load_table("DateDimension", clean_records(date_dim))

    print("Done.")


if __name__ == "__main__":
    main()

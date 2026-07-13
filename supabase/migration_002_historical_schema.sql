-- The Rusti Shack: schema for the historical/back-office tables (Part C).
-- Mirrors Rusti's remaining sheets column-for-column. Row data is NOT
-- loaded by this file -- it's loaded afterward via
-- scripts/load_historical_data.py (using the service_role key), since the
-- full history is ~80,000 rows and too large to paste comfortably here.
--
-- Run this once in the Supabase SQL Editor, then run the Python loader.

create table public."Stores" (
  "LocationCode" text primary key,
  "LocationName" text not null,
  "StoreType" text not null,
  "Country" text not null
);

create table public."Employees" (
  "EmpID" text primary key,
  "FirstName" text not null,
  "LastName" text not null,
  "Role" text not null,
  "HireDate" date not null,
  "HomeStore" text references public."Stores"("LocationCode")
);

create table public."Customers_Demographics" (
  "CustomerID" text primary key references public."Customers_Core"("CustomerID"),
  "Gender" text,
  "Occupation" text
);

create table public."Promotions" (
  "PromoCode" text primary key,
  "PromoName" text not null,
  "PromoType" text not null,
  "DiscountPct" numeric(5,2) not null,
  "StartDate" date not null,
  "EndDate" date not null,
  "Channel" text not null
);

create table public."OrderPromotions" (
  "OrderID" text references public."Orders"("OrderID"),
  "PromoCode" text references public."Promotions"("PromoCode"),
  primary key ("OrderID", "PromoCode")
);

create table public."RentalTransactions" (
  "RentalID" text primary key,
  "RentalDate" date not null,
  "CustID" text references public."Customers_Core"("CustomerID"),
  "LocationID" text references public."Stores"("LocationCode"),
  "SalesAssociate" text,
  "SKU" text not null,
  "Quantity" integer not null,
  "DailyRate" numeric(10,2) not null,
  "RentalRevenue" numeric(10,2) not null,
  "Returned" text not null
);

create table public."Inventory" (
  "SKU" text primary key references public.products("sku"),
  "OnHandQty" integer not null,
  "ReorderPoint" integer not null,
  "RentalUnits" integer not null,
  "AvailableForSale" integer not null,
  "WarehouseLocation" text,
  "LastCountDate" date
);

create table public."DateDimension" (
  "Date" date primary key,
  "Year" integer not null,
  "Quarter" text not null,
  "Month" integer not null,
  "MonthName" text not null,
  "Day" integer not null,
  "DayOfWeek" text not null,
  "WeekNum" integer not null,
  "IsWeekend" text not null,
  "Season" text not null,
  "FiscalYear" text not null
);

alter table public."Stores" enable row level security;
alter table public."Employees" enable row level security;
alter table public."Customers_Demographics" enable row level security;
alter table public."Promotions" enable row level security;
alter table public."OrderPromotions" enable row level security;
alter table public."RentalTransactions" enable row level security;
alter table public."Inventory" enable row level security;
alter table public."DateDimension" enable row level security;
-- No anon/authenticated policies, same as Orders/Customers: all reads for
-- the management back office go through the service_role key server-side.
-- See SECURITY.md.

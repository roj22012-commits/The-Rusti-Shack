-- The Rusti Shack: analytics views for the management back office (Part C).
-- Pre-aggregating in SQL keeps the dashboard fast instead of pulling
-- 40,000+ raw rows into Node on every page load. All views are owned by
-- the migration role and readable only via the service_role key (no grants
-- to anon/authenticated), consistent with every other Orders/Customer
-- table in this project. See SECURITY.md.

-- Monthly revenue, cost, and margin -- the backbone of the historicals
-- and forecast charts.
create or replace view public.monthly_performance as
select
  date_trunc('month', o."OrderDate")::date as month,
  extract(year from o."OrderDate")::int as year,
  extract(month from o."OrderDate")::int as month_num,
  o."Channel" as channel,
  sum(ol."LineRevenue")::numeric(12,2) as revenue,
  sum(ol."LineCost")::numeric(12,2) as cost,
  sum(ol."LineRevenue" - ol."LineCost")::numeric(12,2) as margin,
  count(distinct o."OrderID") as order_count,
  sum(ol."Quantity") as units_sold
from public."Orders" o
join public."OrderLines" ol on ol."OrderID" = o."OrderID"
group by 1, 2, 3, 4;

-- Per-product performance, all-time -- powers the margin-by-product view
-- ("which products truly earn their keep once cost is in").
create or replace view public.product_performance as
select
  ol."ProductCode" as sku,
  coalesce(p.product_name, ol."ProductCode") as product_name,
  coalesce(p.category, 'Unknown') as category,
  sum(ol."Quantity") as units_sold,
  sum(ol."LineRevenue")::numeric(12,2) as revenue,
  sum(ol."LineCost")::numeric(12,2) as cost,
  sum(ol."LineRevenue" - ol."LineCost")::numeric(12,2) as margin,
  case when sum(ol."LineRevenue") > 0
    then round(100 * sum(ol."LineRevenue" - ol."LineCost") / sum(ol."LineRevenue"), 1)
    else null end as margin_pct
from public."OrderLines" ol
left join public.products p on p.sku = ol."ProductCode"
group by 1, 2, 3;

-- Daily sales quantity per SKU -- feeds the inventory reorder-point
-- calculation (average daily demand and its variability).
create or replace view public.daily_sku_sales as
select
  ol."ProductCode" as sku,
  o."OrderDate" as sale_date,
  sum(ol."Quantity") as qty_sold
from public."Orders" o
join public."OrderLines" ol on ol."OrderID" = o."OrderID"
group by 1, 2;

-- One row per customer with lifetime behavior -- powers segmentation,
-- repeat-vs-one-time, and churn views.
create or replace view public.customer_summary as
select
  c."CustomerID" as customer_id,
  c."CustomerType" as customer_type,
  c."Country" as country,
  c."JoinDate" as join_date,
  cc."LoyaltyMember" as loyalty_member,
  count(distinct o."OrderID") as order_count,
  coalesce(sum(o."OrderTotal"), 0)::numeric(12,2) as lifetime_revenue,
  min(o."OrderDate") as first_order_date,
  max(o."OrderDate") as last_order_date
from public."Customers_Core" c
left join public."Customers_Contact" cc on cc."CustomerID" = c."CustomerID"
left join public."Orders" o on o."CustID" = c."CustomerID"
group by 1, 2, 3, 4, 5;

-- Rentals vs. sales, by SKU and month -- powers the "does renting eat
-- into selling" view.
create or replace view public.rental_vs_sales_by_sku_month as
select
  coalesce(s.sku, r.sku) as sku,
  coalesce(s.month, r.month) as month,
  coalesce(s.units_sold, 0) as units_sold,
  coalesce(s.sale_revenue, 0)::numeric(12,2) as sale_revenue,
  coalesce(r.units_rented, 0) as units_rented,
  coalesce(r.rental_revenue, 0)::numeric(12,2) as rental_revenue
from (
  select ol."ProductCode" as sku, date_trunc('month', o."OrderDate")::date as month,
    sum(ol."Quantity") as units_sold, sum(ol."LineRevenue") as sale_revenue
  from public."Orders" o join public."OrderLines" ol on ol."OrderID" = o."OrderID"
  group by 1, 2
) s
full outer join (
  select "SKU" as sku, date_trunc('month', "RentalDate")::date as month,
    sum("Quantity") as units_rented, sum("RentalRevenue") as rental_revenue
  from public."RentalTransactions"
  group by 1, 2
) r on r.sku = s.sku and r.month = s.month;

-- Promotion ROI -- discount given vs. revenue on orders that used each code.
create or replace view public.promo_performance as
select
  promo."PromoCode" as promo_code,
  promo."PromoName" as promo_name,
  promo."PromoType" as promo_type,
  count(distinct op."OrderID") as orders_using,
  coalesce(sum(ol."EffectiveDiscountAmount"), 0)::numeric(12,2) as total_discount,
  coalesce(sum(ol."LineRevenue"), 0)::numeric(12,2) as revenue_from_orders
from public."Promotions" promo
join public."OrderPromotions" op on op."PromoCode" = promo."PromoCode"
join public."OrderLines" ol on ol."OrderID" = op."OrderID"
group by 1, 2, 3;

-- Staff performance -- walk-in orders and rentals rung up per employee.
create or replace view public.staff_performance as
select
  e."EmpID" as emp_id,
  e."FirstName" || ' ' || e."LastName" as employee_name,
  e."Role" as role,
  (select count(*) from public."Orders" o where o."SalesAssociate" = e."EmpID") as orders_handled,
  (select coalesce(sum(o."OrderTotal"), 0) from public."Orders" o where o."SalesAssociate" = e."EmpID")::numeric(12,2) as order_revenue,
  (select count(*) from public."RentalTransactions" r where r."SalesAssociate" = e."EmpID") as rentals_handled,
  (select coalesce(sum(r."RentalRevenue"), 0) from public."RentalTransactions" r where r."SalesAssociate" = e."EmpID")::numeric(12,2) as rental_revenue
from public."Employees" e;

-- Revenue by season (Dry Peak / Typhoon / Shoulder) -- powers the
-- seasonality view, using Rusti's own DateDimension.Season labels.
create or replace view public.seasonal_performance as
select
  dd."Season" as season,
  extract(year from o."OrderDate")::int as year,
  sum(ol."LineRevenue")::numeric(12,2) as revenue,
  sum(ol."LineRevenue" - ol."LineCost")::numeric(12,2) as margin
from public."Orders" o
join public."OrderLines" ol on ol."OrderID" = o."OrderID"
join public."DateDimension" dd on dd."Date" = o."OrderDate"
group by 1, 2;

-- Defense in depth: views normally run with their creator's privileges in
-- Postgres, which could otherwise let them read past the underlying
-- tables' RLS. Explicitly block anon/authenticated from all of them, same
-- posture as every customer/order table in this project.
revoke all on public.monthly_performance from anon, authenticated;
revoke all on public.product_performance from anon, authenticated;
revoke all on public.daily_sku_sales from anon, authenticated;
revoke all on public.customer_summary from anon, authenticated;
revoke all on public.rental_vs_sales_by_sku_month from anon, authenticated;
revoke all on public.promo_performance from anon, authenticated;
revoke all on public.staff_performance from anon, authenticated;
revoke all on public.seasonal_performance from anon, authenticated;

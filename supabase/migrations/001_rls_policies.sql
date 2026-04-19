-- Enable RLS on every table
ALTER TABLE stores                ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_inventory       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillment_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_transfers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_stock_alerts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions  ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()::text;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_store()
RETURNS TEXT AS $$
  SELECT "storeId" FROM profiles WHERE id = auth.uid()::text;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid()::text OR get_my_role() = 'ADMIN');

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid()::text);

-- Stores: all authenticated users can read; only admin writes
CREATE POLICY "stores_select" ON stores FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "stores_write" ON stores FOR ALL
  USING (get_my_role() = 'ADMIN');

-- Products + categories
CREATE POLICY "products_select" ON products FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "products_write" ON products FOR ALL
  USING (get_my_role() = 'ADMIN');

CREATE POLICY "categories_select" ON categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "categories_write" ON categories FOR ALL
  USING (get_my_role() = 'ADMIN');

-- Inventory
CREATE POLICY "inventory_select" ON store_inventory FOR SELECT
  USING (
    get_my_role() = 'ADMIN'
    OR "storeId" = get_my_store()
  );

CREATE POLICY "inventory_write" ON store_inventory FOR ALL
  USING (get_my_role() IN ('ADMIN', 'WAREHOUSE_MANAGER'));

-- Orders
CREATE POLICY "orders_select" ON orders FOR SELECT
  USING (
    get_my_role() = 'ADMIN'
    OR "storeId" = get_my_store()
  );

CREATE POLICY "orders_insert" ON orders FOR INSERT
  WITH CHECK (
    get_my_role() IN ('ADMIN', 'STAFF', 'WAREHOUSE_MANAGER')
  );

CREATE POLICY "orders_update" ON orders FOR UPDATE
  USING (get_my_role() IN ('ADMIN', 'WAREHOUSE_MANAGER', 'STAFF'));

-- Order items
CREATE POLICY "order_items_select" ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items."orderId"
        AND (get_my_role() = 'ADMIN' OR o."storeId" = get_my_store())
    )
  );

CREATE POLICY "order_items_write" ON order_items FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Fulfillment logs
CREATE POLICY "fulfillment_logs_select" ON fulfillment_logs FOR SELECT
  USING (get_my_role() IN ('ADMIN', 'WAREHOUSE_MANAGER'));

CREATE POLICY "fulfillment_logs_insert" ON fulfillment_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Transfers
CREATE POLICY "transfers_select" ON store_transfers FOR SELECT
  USING (
    get_my_role() = 'ADMIN'
    OR "sourceStoreId" = get_my_store()
    OR "destStoreId"   = get_my_store()
  );

CREATE POLICY "transfers_write" ON store_transfers FOR ALL
  USING (get_my_role() IN ('ADMIN', 'WAREHOUSE_MANAGER'));

-- Customers
CREATE POLICY "customers_select" ON customers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "customers_write" ON customers FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Loyalty
CREATE POLICY "loyalty_select" ON loyalty_transactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Low stock alerts
CREATE POLICY "alerts_select" ON low_stock_alerts FOR SELECT
  USING (
    get_my_role() = 'ADMIN'
    OR "storeId" = get_my_store()
  );

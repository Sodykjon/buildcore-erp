-- Low stock alert trigger
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."quantityOnHand" <= NEW."lowStockThreshold" THEN
    INSERT INTO low_stock_alerts ("storeId", "productId", quantity)
    VALUES (NEW."storeId", NEW."productId", NEW."quantityOnHand")
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_low_stock
AFTER UPDATE OF "quantityOnHand" ON store_inventory
FOR EACH ROW EXECUTE FUNCTION check_low_stock();

-- Auto-create profile row when a new Supabase Auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, "fullName", role)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    'STAFF'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

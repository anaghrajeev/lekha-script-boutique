-- 1. Add POS columns to existing products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS size TEXT,
ADD COLUMN IF NOT EXISTS colour TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 5;

-- Create extension for pg_trgm to allow fast fuzzy search on products
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_sku_trgm_idx ON products USING gin (sku gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_barcode_trgm_idx ON products USING gin (barcode gin_trgm_ops);

-- 2. Create batches table
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_no TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  cost_price NUMERIC,
  selling_price NUMERIC,
  supplier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create bills table
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_no TEXT UNIQUE NOT NULL,
  bill_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  customer_name TEXT,
  customer_phone TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_mode TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'returned', 'partial_return')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create bill_items table
CREATE TABLE IF NOT EXISTS bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  size TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  cost_price NUMERIC,
  subtotal NUMERIC NOT NULL,
  returned_quantity INTEGER DEFAULT 0,
  custom_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure cost_price exists for older databases
ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC;

-- Ensure product_id is nullable (to support custom misc items)
ALTER TABLE bill_items ALTER COLUMN product_id DROP NOT NULL;

-- Ensure custom_name exists for custom items
ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS custom_name TEXT;

-- 5. RPC Function for Checkout Transaction
CREATE OR REPLACE FUNCTION process_pos_checkout(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_subtotal NUMERIC,
  p_tax NUMERIC,
  p_discount NUMERIC,
  p_total NUMERIC,
  p_payment_mode TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bill_id UUID;
  v_item JSONB;
  v_batch_qty INTEGER;
  v_batch_cost NUMERIC;
  v_next_invoice_number BIGINT;
  v_bill_no TEXT;
BEGIN
  -- Safely get the next incrementing number from pos_settings
  UPDATE pos_settings
  SET last_invoice_number = COALESCE(last_invoice_number, 0) + 1
  WHERE id = (SELECT id FROM pos_settings LIMIT 1)
  RETURNING last_invoice_number INTO v_next_invoice_number;

  IF v_next_invoice_number IS NULL THEN
    -- Fallback if pos_settings table is completely empty
    v_next_invoice_number := 1;
    INSERT INTO pos_settings (last_invoice_number, invoice_start_number)
    VALUES (v_next_invoice_number, 1);
  END IF;

  v_bill_no := 'INV-' || LPAD(v_next_invoice_number::TEXT, 6, '0');

  -- Ensure uniqueness: If this number happens to already exist, increment until free
  WHILE EXISTS (SELECT 1 FROM bills WHERE bill_no = v_bill_no) LOOP
    v_next_invoice_number := v_next_invoice_number + 1;
    v_bill_no := 'INV-' || LPAD(v_next_invoice_number::TEXT, 6, '0');
    
    -- Sync the correct skipped number back to pos_settings
    UPDATE pos_settings 
    SET last_invoice_number = v_next_invoice_number 
    WHERE id = (SELECT id FROM pos_settings LIMIT 1);
  END LOOP;

  -- Insert the bill
  INSERT INTO bills (bill_no, customer_name, customer_phone, subtotal, tax, discount, total, payment_mode)
  VALUES (v_bill_no, p_customer_name, p_customer_phone, p_subtotal, p_tax, p_discount, p_total, p_payment_mode)
  RETURNING id INTO v_bill_id;

  -- Loop through items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Fetch cost_price from batch
    v_batch_cost := NULL;
    IF (v_item->>'batch_id') IS NOT NULL AND (v_item->>'batch_id') != '' THEN
      SELECT cost_price INTO v_batch_cost FROM batches WHERE id = (v_item->>'batch_id')::UUID;
    END IF;

    -- Insert bill item
    INSERT INTO bill_items (bill_id, product_id, batch_id, size, quantity, unit_price, cost_price, subtotal, custom_name)
    VALUES (
      v_bill_id,
      (v_item->>'product_id')::UUID,
      (CASE WHEN (v_item->>'batch_id') = '' THEN NULL ELSE (v_item->>'batch_id')::UUID END),
      (v_item->>'size')::TEXT,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::NUMERIC,
      v_batch_cost,
      (v_item->>'subtotal')::NUMERIC,
      (v_item->>'name')::TEXT
    );

    -- Decrement stock in batches
    IF (v_item->>'batch_id') IS NOT NULL AND (v_item->>'batch_id') != '' THEN
      UPDATE batches
      SET quantity = quantity - (v_item->>'quantity')::INTEGER
      WHERE id = (v_item->>'batch_id')::UUID
      RETURNING quantity INTO v_batch_qty;

      IF v_batch_qty < 0 THEN
        RAISE EXCEPTION 'Insufficient stock for batch %', (v_item->>'batch_id');
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'bill_id', v_bill_id, 'bill_no', v_bill_no);
END;
$$;

-- 6. RPC Function for Process Return
CREATE OR REPLACE FUNCTION process_pos_return(
  p_bill_id UUID,
  p_return_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_current_returned INTEGER;
  v_original_qty INTEGER;
BEGIN
  -- Loop through items being returned
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_return_items)
  LOOP
    -- Get current item quantities
    SELECT quantity, returned_quantity INTO v_original_qty, v_current_returned
    FROM bill_items WHERE id = (v_item->>'bill_item_id')::UUID;

    IF v_original_qty < (v_current_returned + (v_item->>'return_qty')::INTEGER) THEN
      RAISE EXCEPTION 'Cannot return more than purchased quantity for item %', (v_item->>'bill_item_id');
    END IF;

    -- Update bill item
    UPDATE bill_items
    SET returned_quantity = returned_quantity + (v_item->>'return_qty')::INTEGER
    WHERE id = (v_item->>'bill_item_id')::UUID;

    -- Increment stock back in batches
    IF (v_item->>'batch_id') IS NOT NULL AND (v_item->>'batch_id') != '' THEN
      UPDATE batches
      SET quantity = quantity + (v_item->>'return_qty')::INTEGER
      WHERE id = (v_item->>'batch_id')::UUID;
    END IF;
  END LOOP;

  -- Update bill status
  UPDATE bills
  SET status = CASE 
    WHEN (SELECT COALESCE(SUM(quantity), 0) FROM bill_items WHERE bill_id = p_bill_id) = (SELECT COALESCE(SUM(returned_quantity), 0) FROM bill_items WHERE bill_id = p_bill_id) THEN 'returned'
    ELSE 'partial_return'
  END
  WHERE id = p_bill_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. RPC Function for Delete Bill
CREATE OR REPLACE FUNCTION delete_pos_bill(
  p_bill_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_net_qty INTEGER;
BEGIN
  -- Restock items that haven't been returned yet
  FOR v_item IN SELECT * FROM bill_items WHERE bill_id = p_bill_id
  LOOP
    v_net_qty := v_item.quantity - COALESCE(v_item.returned_quantity, 0);
    
    IF v_item.batch_id IS NOT NULL AND v_net_qty > 0 THEN
      UPDATE batches
      SET quantity = quantity + v_net_qty
      WHERE id = v_item.batch_id;
    END IF;
  END LOOP;

  -- Delete the bill (cascades to bill_items)
  DELETE FROM bills WHERE id = p_bill_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8. Create pos_settings table
CREATE TABLE IF NOT EXISTS pos_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enable_discounts BOOLEAN DEFAULT false,
  enable_gst BOOLEAN DEFAULT false,
  gst_percentage NUMERIC DEFAULT 18,
  invoice_start_number BIGINT DEFAULT 1,
  last_invoice_number BIGINT,
  logo_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a default row if it doesn't exist
INSERT INTO pos_settings (enable_discounts, enable_gst, gst_percentage, invoice_start_number)
SELECT false, false, 18, 1
WHERE NOT EXISTS (SELECT 1 FROM pos_settings);

-- Disable RLS on POS tables
ALTER TABLE pos_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE batches DISABLE ROW LEVEL SECURITY;

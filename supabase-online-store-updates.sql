-- 1. Create store_settings table for Online Storefront configuration
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_charge NUMERIC DEFAULT 0,
  free_delivery_threshold NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a default row if it doesn't exist
INSERT INTO store_settings (delivery_charge, free_delivery_threshold)
SELECT 0, 0
WHERE NOT EXISTS (SELECT 1 FROM store_settings);

-- Disable RLS so our frontend can read/write it directly
ALTER TABLE store_settings DISABLE ROW LEVEL SECURITY;


-- 2. Add 'cancelled' to the online_orders status CHECK constraint (if it doesn't exist, we must recreate the constraint or just ignore constraint errors. 
-- In Postgres, it's easier to drop and add the constraint if we know its name. 
-- Assuming standard naming, we can do this safely:
ALTER TABLE online_orders DROP CONSTRAINT IF EXISTS online_orders_status_check;
ALTER TABLE online_orders ADD CONSTRAINT online_orders_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled'));


-- 3. RPC Function to Cancel Order & Restock
CREATE OR REPLACE FUNCTION cancel_online_order(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_batch_id UUID;
BEGIN
  -- Check if order is accepted
  IF (SELECT status FROM online_orders WHERE id = p_order_id) != 'accepted' THEN
    RAISE EXCEPTION 'Order is not in accepted state, cannot restock';
  END IF;

  -- Loop through each item in the order to restock
  FOR v_item IN (SELECT * FROM online_order_items WHERE order_id = p_order_id)
  LOOP
    
    -- Find the most recently active batch for this product (to dump the stock back into)
    SELECT id INTO v_batch_id 
    FROM batches 
    WHERE product_id = v_item.product_id 
    ORDER BY created_at DESC 
    LIMIT 1;

    IF v_batch_id IS NOT NULL THEN
      -- Add quantity back to this batch
      UPDATE batches 
      SET quantity = quantity + v_item.quantity 
      WHERE id = v_batch_id;
    ELSE
      -- If NO batch exists at all, we create a generic "Restock" batch
      INSERT INTO batches (product_id, batch_no, quantity, cost_price, selling_price, supplier)
      VALUES (
        v_item.product_id, 
        'RESTOCK-' || extract(epoch from now())::integer::text,
        v_item.quantity,
        0, -- We don't know the exact cost price, so default to 0
        v_item.price, 
        'Cancelled Order Restock'
      );
    END IF;

  END LOOP;

  -- Update order status to cancelled
  UPDATE online_orders SET status = 'cancelled' WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

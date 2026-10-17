-- 1. Create online_orders table
CREATE TABLE IF NOT EXISTS online_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  total NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create online_order_items table
CREATE TABLE IF NOT EXISTS online_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL
);

-- 3. RPC Function to Accept Order & Deduct Stock
CREATE OR REPLACE FUNCTION accept_online_order(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_batch RECORD;
  v_qty_needed INTEGER;
  v_qty_deducted INTEGER;
BEGIN
  -- Check if order is pending
  IF (SELECT status FROM online_orders WHERE id = p_order_id) != 'pending' THEN
    RAISE EXCEPTION 'Order is not in pending state';
  END IF;

  -- Loop through each item in the order
  FOR v_item IN (SELECT * FROM online_order_items WHERE order_id = p_order_id)
  LOOP
    v_qty_needed := v_item.quantity;

    -- Find batches for this product and size (if size is provided), ordered by expiry (oldest first) then creation date
    FOR v_batch IN 
      SELECT * FROM batches 
      WHERE product_id = v_item.product_id 
        AND quantity > 0
      ORDER BY created_at ASC
    LOOP
      IF v_qty_needed = 0 THEN
        EXIT; -- Finished allocating for this item
      END IF;

      IF v_batch.quantity >= v_qty_needed THEN
        -- This batch can fulfill the remaining needed quantity
        v_qty_deducted := v_qty_needed;
        v_qty_needed := 0;
      ELSE
        -- This batch can only fulfill part of the needed quantity
        v_qty_deducted := v_batch.quantity;
        v_qty_needed := v_qty_needed - v_batch.quantity;
      END IF;

      -- Deduct from batch
      UPDATE batches 
      SET quantity = quantity - v_qty_deducted 
      WHERE id = v_batch.id;

    END LOOP;

    -- If we still need quantity after checking all batches, we don't have enough stock!
    IF v_qty_needed > 0 THEN
      RAISE EXCEPTION 'Insufficient stock to fulfill order for product %', v_item.product_id;
    END IF;

  END LOOP;

  -- Update order status to accepted
  UPDATE online_orders SET status = 'accepted' WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

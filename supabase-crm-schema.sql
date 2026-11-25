-- ==============================================================================
-- 1. Create customers table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  total_spend NUMERIC DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  loyalty_points NUMERIC DEFAULT 0,
  lifetime_points NUMERIC DEFAULT 0,
  tier TEXT DEFAULT 'Bronze' CHECK (tier IN ('Bronze', 'Silver', 'Gold', 'VIP')),
  notes TEXT,
  last_visit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_total_spend ON customers(total_spend DESC);
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(last_visit_at DESC);

-- Disable Row Level Security (RLS) for seamless client operations
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. Create loyalty_settings table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS loyalty_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  points_per_rupee NUMERIC DEFAULT 0.01,         -- e.g. 0.01 = 1 point per 100 spent (1% cashback)
  rupees_per_point NUMERIC DEFAULT 1.0,          -- e.g. 1 point = 1 rupee discount
  min_points_to_redeem INTEGER DEFAULT 50,       -- min points needed to redeem
  bronze_min_spend NUMERIC DEFAULT 0,
  silver_min_spend NUMERIC DEFAULT 5000,
  gold_min_spend NUMERIC DEFAULT 15000,
  vip_min_spend NUMERIC DEFAULT 30000,
  enable_loyalty BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE loyalty_settings DISABLE ROW LEVEL SECURITY;

-- Insert default row if none exists
INSERT INTO loyalty_settings (
  points_per_rupee, 
  rupees_per_point, 
  min_points_to_redeem, 
  bronze_min_spend, 
  silver_min_spend, 
  gold_min_spend, 
  vip_min_spend,
  enable_loyalty
)
SELECT 0.01, 1.0, 50, 0, 5000, 15000, 30000, true
WHERE NOT EXISTS (SELECT 1 FROM loyalty_settings LIMIT 1);

-- ==============================================================================
-- 3. Create loyalty_transactions table (Audit log)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points NUMERIC NOT NULL,                       -- positive = earned, negative = redeemed
  type TEXT NOT NULL,                            -- 'earn_pos', 'earn_online', 'redeem_pos', 'redeem_online', 'manual_adjustment'
  bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
  order_id UUID REFERENCES online_orders(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_created ON loyalty_transactions(created_at DESC);

ALTER TABLE loyalty_transactions DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 4. Historical Backfill from existing Bills and Online Orders
-- ==============================================================================

-- A) Backfill from POS bills
INSERT INTO customers (name, phone, total_spend, visit_count, last_visit_at, created_at)
SELECT 
  COALESCE(NULLIF(TRIM(MAX(customer_name)), ''), 'Walk-in') as name,
  TRIM(customer_phone) as phone,
  SUM(COALESCE(total, 0)) as total_spend,
  COUNT(*) as visit_count,
  MAX(COALESCE(bill_date, created_at)) as last_visit_at,
  MIN(COALESCE(bill_date, created_at)) as created_at
FROM bills
WHERE customer_phone IS NOT NULL AND TRIM(customer_phone) != ''
GROUP BY TRIM(customer_phone)
ON CONFLICT (phone) DO UPDATE 
SET 
  total_spend = EXCLUDED.total_spend,
  visit_count = EXCLUDED.visit_count,
  last_visit_at = EXCLUDED.last_visit_at;

-- B) Merge / Backfill from Online Orders
INSERT INTO customers (name, phone, address, total_spend, visit_count, last_visit_at, created_at)
SELECT 
  COALESCE(NULLIF(TRIM(MAX(customer_name)), ''), 'Online Customer') as name,
  TRIM(customer_phone) as phone,
  MAX(customer_address) as address,
  SUM(COALESCE(total, 0)) as total_spend,
  COUNT(*) as visit_count,
  MAX(created_at) as last_visit_at,
  MIN(created_at) as created_at
FROM online_orders
WHERE customer_phone IS NOT NULL AND TRIM(customer_phone) != '' AND status != 'rejected'
GROUP BY TRIM(customer_phone)
ON CONFLICT (phone) DO UPDATE 
SET 
  total_spend = customers.total_spend + EXCLUDED.total_spend,
  visit_count = customers.visit_count + EXCLUDED.visit_count,
  address = COALESCE(customers.address, EXCLUDED.address),
  last_visit_at = GREATEST(customers.last_visit_at, EXCLUDED.last_visit_at);

-- C) Update tiers based on total_spend
UPDATE customers
SET tier = CASE 
  WHEN total_spend >= 30000 THEN 'VIP'
  WHEN total_spend >= 15000 THEN 'Gold'
  WHEN total_spend >= 5000 THEN 'Silver'
  ELSE 'Bronze'
END;

-- D) Initialize loyalty points from historical spend (1% cashback = 1 point per 100 spent)
UPDATE customers
SET 
  loyalty_points = FLOOR(total_spend * 0.01),
  lifetime_points = FLOOR(total_spend * 0.01)
WHERE loyalty_points = 0 AND total_spend > 0;

-- Add supplier_price and retail_price to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS supplier_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS retail_price NUMERIC DEFAULT 0;

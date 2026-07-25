-- SAMAQU Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  kain TEXT,
  series TEXT,
  colors TEXT[] DEFAULT '{}',
  price INTEGER NOT NULL,
  tag TEXT,
  note TEXT,
  image TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_whatsapp TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_postal_code TEXT,
  shipping_notes TEXT,
  shipping_method TEXT NOT NULL DEFAULT 'reguler',
  shipping_cost INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'bank',
  subtotal INTEGER NOT NULL,
  discount INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  color TEXT,
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  category TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  verified BOOLEAN DEFAULT false,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_category ON testimonials(category);
CREATE INDEX IF NOT EXISTS idx_testimonials_type ON testimonials(type);

-- Enable RLS (Row Level Security)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Policies: allow public read for products and testimonials
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read testimonials" ON testimonials FOR SELECT USING (true);

-- Policies: allow public insert for orders (checkout)
CREATE POLICY "Public insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert order_items" ON order_items FOR INSERT WITH CHECK (true);

-- Policies: admin can do everything (you'll need to set up auth later)
-- For now, allow all operations with service role key
CREATE POLICY "Service role all products" ON products FOR ALL USING (true);
CREATE POLICY "Service role all orders" ON orders FOR ALL USING (true);
CREATE POLICY "Service role all order_items" ON order_items FOR ALL USING (true);
CREATE POLICY "Service role all testimonials" ON testimonials FOR ALL USING (true);

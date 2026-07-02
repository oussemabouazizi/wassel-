-- Wassel Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'vendor', 'delivery', 'admin')),
  is_active BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'en' CHECK (language IN ('ar', 'fr', 'en')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  icon TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores table
CREATE TABLE stores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  cover_url TEXT,
  category_id UUID REFERENCES categories(id) NOT NULL,
  rating DECIMAL(2,1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
  is_open BOOLEAN DEFAULT true,
  min_order DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  estimated_delivery_time INTEGER DEFAULT 30,
  opening_time TEXT DEFAULT '09:00',
  closing_time TEXT DEFAULT '22:00',
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  preparation_time INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Addresses table
CREATE TABLE addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  delivery_person_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered', 'cancelled')),
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  promo_code_id UUID,
  delivery_address_id UUID REFERENCES addresses(id) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_latitude DECIMAL(10,8) NOT NULL,
  delivery_longitude DECIMAL(11,8) NOT NULL,
  delivery_instructions TEXT,
  scheduled_for TIMESTAMPTZ,
  tip DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items table
CREATE TABLE order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, order_id)
);

-- Promo Codes table
CREATE TABLE promo_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER DEFAULT 100,
  current_uses INTEGER DEFAULT 0,
  min_order DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  store_id UUID REFERENCES stores(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chats table
CREATE TABLE chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  delivery_person_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites table
CREATE TABLE favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, store_id),
  UNIQUE(user_id, product_id)
);

-- Loyalty Points table
CREATE TABLE loyalty_points (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals table
CREATE TABLE referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referral_code TEXT NOT NULL,
  bonus_amount DECIMAL(10,2) DEFAULT 5.00,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery Zones table
CREATE TABLE delivery_zones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery Persons table
CREATE TABLE delivery_persons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  type TEXT DEFAULT 'freelance' CHECK (type IN ('staff', 'freelance')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  online_status TEXT DEFAULT 'offline' CHECK (online_status IN ('online', 'offline', 'busy')),
  vehicle_type TEXT NOT NULL,
  vehicle_plate TEXT NOT NULL,
  id_document_url TEXT NOT NULL,
  license_document_url TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  total_deliveries INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 5.0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_stores_owner ON stores(owner_id);
CREATE INDEX idx_stores_category ON stores(category_id);
CREATE INDEX idx_stores_status ON stores(status);
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_delivery ON orders(delivery_person_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_addresses_user ON addresses(user_id);
CREATE INDEX idx_reviews_store ON reviews(store_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_favorites_user ON favorites(user_id);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
-- Admin policies on profiles intentionally omitted to avoid infinite recursion from subquery on same table.
-- Admin role is checked via JWT claims in policies on other tables instead.

-- Stores policies
CREATE POLICY "Anyone can view approved stores" ON stores FOR SELECT USING (status = 'approved');
CREATE POLICY "Vendors can view own stores" ON stores FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Vendors can update own stores" ON stores FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Vendors can create stores" ON stores FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Admins can manage all stores" ON stores FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Products policies
CREATE POLICY "Anyone can view available products" ON products FOR SELECT USING (is_available = true);
CREATE POLICY "Vendors can manage own products" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM stores WHERE id = store_id AND owner_id = auth.uid())
);

-- Orders policies
CREATE POLICY "Customers can view own orders" ON orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Customers can create orders" ON orders FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Vendors can view store orders" ON orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM stores WHERE id = store_id AND owner_id = auth.uid())
);
CREATE POLICY "Delivery can view assigned orders" ON orders FOR SELECT USING (delivery_person_id = auth.uid());
CREATE POLICY "Admins can manage all orders" ON orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Order items policies
CREATE POLICY "View order items through order" ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders WHERE id = order_id AND (
      customer_id = auth.uid() OR
      delivery_person_id = auth.uid() OR
      EXISTS (SELECT 1 FROM stores WHERE id = store_id AND owner_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);

-- Addresses policies
CREATE POLICY "Users can manage own addresses" ON addresses FOR ALL USING (user_id = auth.uid());

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Customers can create reviews" ON reviews FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Chats policies
CREATE POLICY "Participants can view chats" ON chats FOR SELECT USING (
  customer_id = auth.uid() OR delivery_person_id = auth.uid()
);

-- Messages policies
CREATE POLICY "Chat participants can view messages" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chats WHERE id = chat_id AND (
      customer_id = auth.uid() OR delivery_person_id = auth.uid()
    )
  )
);
CREATE POLICY "Chat participants can send messages" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM chats WHERE id = chat_id AND (
      customer_id = auth.uid() OR delivery_person_id = auth.uid()
    )
  )
);

-- Favorites policies
CREATE POLICY "Users can manage own favorites" ON favorites FOR ALL USING (user_id = auth.uid());

-- Trigger: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, name_ar, name_fr, icon, image_url, sort_order) VALUES
  ('Food', 'طعام', 'Nourriture', 'utensils', '/images/categories/food.jpg', 1),
  ('Groceries', 'بقالة', 'Épicerie', 'shopping-cart', '/images/categories/groceries.jpg', 2),
  ('Pharmacy', 'صيدلية', 'Pharmacie', 'pill', '/images/categories/pharmacy.jpg', 3),
  ('Flowers', 'ورود', 'Fleurs', 'flower-2', '/images/categories/flowers.jpg', 4),
  ('Pets', 'حيوانات أليفة', 'Animaux', 'paw-print', '/images/categories/pets.jpg', 5),
  ('Electronics', 'إلكترونيات', 'Électronique', 'laptop', '/images/categories/electronics.jpg', 6),
  ('Fashion', 'أزياء', 'Mode', 'shirt', '/images/categories/fashion.jpg', 7),
  ('Sports', 'رياضة', 'Sport', 'dumbbell', '/images/categories/sports.jpg', 8),
  ('Baby', 'أطفال', 'Bébé', 'baby', '/images/categories/baby.jpg', 9),
  ('Stationery', 'قرطاسية', 'Papeterie', 'pen-tool', '/images/categories/stationery.jpg', 10);

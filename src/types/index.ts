export type UserRole = 'customer' | 'vendor' | 'delivery' | 'admin';

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';

export type StoreStatus = 'pending' | 'approved' | 'suspended' | 'rejected';

export type DeliveryPersonType = 'staff' | 'freelance';

export type DeliveryPersonStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type OnlineStatus = 'online' | 'offline' | 'busy';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  language: 'ar' | 'fr' | 'en';
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  image_url: string;
  cover_url: string | null;
  category_id: string;
  rating: number;
  total_reviews: number;
  total_orders: number;
  status: StoreStatus;
  is_open: boolean;
  min_order: number;
  delivery_fee: number;
  estimated_delivery_time: number;
  opening_time: string;
  closing_time: string;
  latitude: number;
  longitude: number;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  name_ar: string;
  name_fr: string;
  icon: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock: number;
  is_available: boolean;
  is_featured: boolean;
  preparation_time: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  store_id: string;
  delivery_person_id: string | null;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  promo_code_id: string | null;
  delivery_address_id: string;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  delivery_instructions: string | null;
  scheduled_for: string | null;
  tip: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  notes: string | null;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  store_id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_percent: number;
  discount_amount: number;
  max_uses: number;
  current_uses: number;
  min_order: number;
  max_discount: number | null;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  store_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface Chat {
  id: string;
  order_id: string;
  customer_id: string;
  delivery_person_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  is_read: boolean;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  store_id: string | null;
  product_id: string | null;
  created_at: string;
}

export interface LoyaltyPoint {
  id: string;
  user_id: string;
  points: number;
  order_id: string;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  bonus_amount: number;
  is_used: boolean;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  store_id: string;
  name: string;
  coordinates: unknown;
  is_active: boolean;
  created_at: string;
}

export interface DeliveryPerson {
  id: string;
  user_id: string;
  type: DeliveryPersonType;
  status: DeliveryPersonStatus;
  online_status: OnlineStatus;
  vehicle_type: string;
  vehicle_plate: string;
  id_document_url: string;
  license_document_url: string;
  latitude: number | null;
  longitude: number | null;
  total_deliveries: number;
  rating: number;
  total_earnings: number;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

export interface StoreWithCategory extends Store {
  categories: Category;
}

export interface ProductWithCategory extends Product {
  categories: Category;
}

export interface OrderWithDetails extends Order {
  stores: Store;
  profiles: Profile;
  delivery_person: DeliveryPerson | null;
  order_items: OrderItem[];
}

export interface ReviewWithUser extends Review {
  profiles: Profile;
}

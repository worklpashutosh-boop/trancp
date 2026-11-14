export interface ColorOption {
  name: string;
  hex: string;
}

export interface Product {
  id: number;
  slug: string;
  title: string;
  brand: string;
  category: string;
  subcategory: string;
  collection_tag: 'Trending' | 'Best Seller' | 'New Arrival' | 'Exclusive';
  description: string;
  original_price: number;
  discounted_price: number;
  discount_percent: number;
  stock: number;
  sizes: string[];
  colors: ColorOption[];
  images: string[];
  rating: number;
  review_count: number;
  sku: string;
  is_featured: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_group: string;
  image: string;
  display_order: number;
  product_count?: number;
}

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  image_url: string;
  placement: 'hero' | 'promo';
  active: number;
  display_order: number;
}

export interface Review {
  id: number;
  product_id: number;
  user_id?: number;
  user_name: string;
  rating: number;
  title: string;
  comment: string;
  verified_purchase: number;
  created_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
}

export interface Address {
  id: number;
  user_id: number;
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  is_default: number;
}

export interface CartItem {
  product: Product;
  size: string;
  color: string;
  quantity: number;
}

export interface OrderItem {
  product_id: number;
  title: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  image: string;
}

export interface TrackingEvent {
  status: string;
  note: string;
  time: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: {
    full_name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  coupon_code: string;
  shipping_fee: number;
  total_amount: number;
  payment_method: 'RAZORPAY' | 'COD';
  payment_status: 'PENDING' | 'PAID' | 'FAILED';
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  order_status: string;
  tracking_history: TrackingEvent[];
  created_at: string;
}

export interface Coupon {
  id: number;
  code: string;
  description: string;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  min_order: number;
  max_discount: number;
  active: number;
  usage_count: number;
  expires_at: string;
}

export type AppView =
  | { name: 'home' }
  | { name: 'catalog'; category?: string; subcategory?: string; collection?: string; search?: string }
  | { name: 'product'; idOrSlug: string }
  | { name: 'wishlist' }
  | { name: 'checkout' }
  | { name: 'track'; orderNumber?: string }
  | { name: 'admin' }
  | { name: 'info'; page: 'about' | 'contact' | 'privacy' | 'terms' | 'returns' | 'shipping' | 'faqs' };

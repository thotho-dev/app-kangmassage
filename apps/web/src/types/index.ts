export type UserRole = 'user' | 'therapist' | 'admin';
export type OrderStatus = 'pending' | 'accepted' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'wallet' | 'midtrans' | 'cash';
export type TherapistStatus = 'online' | 'offline' | 'busy';
export type TherapistTier = 'bronze' | 'silver' | 'gold' | 'diamond';
export type TransactionType = 'credit' | 'debit';
export type VoucherType = 'percentage' | 'fixed';
export type VoucherCategory = 'direct' | 'new_user' | 'repeat_order' | 'happy_hour' | 'location' | 'service' | 'therapist' | 'event' | 'topup' | 'cashback' | 'referral';

export interface User {
  id: string;
  supabase_uid: string;
  full_name: string;
  phone: string;
  email?: string;
  avatar_url?: string;
  role: UserRole;
  wallet_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Therapist {
  id: string;
  supabase_uid: string;
  full_name: string;
  phone: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  gender?: string;
  specializations?: string[];
  rating: number;
  total_reviews: number;
  total_orders: number;
  status: TherapistStatus;
  wallet_balance: number;
  commission_rate: number;
  device_id?: string;
  is_verified: boolean;
  is_active: boolean;
  tier: TherapistTier;
  created_at: string;
  updated_at: string;
}

export interface TherapistLocation {
  id: string;
  therapist_id: string;
  latitude: number;
  longitude: number;
  last_updated: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  category_slug?: string[];
  duration_min: number;
  base_price: number;
  duration_options?: { duration: number; price: number }[];
  image_url?: string;
  is_active: boolean;
  price_type?: 'duration' | 'treatment';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  description?: string;
  image_url?: string;
  category: VoucherCategory;
  type: VoucherType;
  value: number;
  min_order_amount: number;
  max_discount?: number;
  min_order_count?: number;
  start_time?: string;
  end_time?: string;
  days_of_week?: number[];
  area_names?: string[];
  service_id?: string;
  therapist_id?: string;
  usage_limit?: number;
  user_limit: number;
  usage_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  is_cashback: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  therapist_id?: string;
  service_id: string;
  voucher_id?: string;
  address: string;
  latitude: number;
  longitude: number;
  service_price: number;
  discount_amount: number;
  total_price: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  scheduled_at?: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  user_notes?: string;
  cancellation_reason?: string;
  rating?: number;
  review?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: User;
  therapist?: Therapist;
  service?: Service;
  voucher?: Voucher;
}

export interface OrderLog {
  id: string;
  order_id: string;
  status: OrderStatus;
  note?: string;
  created_by?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id?: string;
  therapist_id?: string;
  order_id?: string;
  type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  therapist_id?: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Dashboard analytics
export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalTherapists: number;
  activeOrders: number;
  onlineTherapists: number;
  todayOrders: number;
  todayRevenue: number;
  ordersByStatus: { status: OrderStatus; count: number }[];
  revenueByDay: { date: string; revenue: number; orders: number }[];
}

// Matching
export interface TherapistWithDistance extends Therapist {
  distance: number;
  location?: TherapistLocation;
}

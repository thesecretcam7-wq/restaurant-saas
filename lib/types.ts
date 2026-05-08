// Tenants
export interface Tenant {
  id: string;
  organization_name: string;
  slug: string;
  primary_domain: string | null;
  logo_url: string | null;
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscription_plan: 'free' | 'basic' | 'pro' | 'premium' | null;
  subscription_stripe_id: string | null;
  subscription_expires_at?: string | null;
  trial_ends_at?: string | null;
  stripe_customer_id: string | null;
  stripe_account_id: string | null;
  stripe_account_status: 'verified' | 'pending' | 'failed' | null;
  owner_email: string;
  owner_name: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

// Branding
export interface TenantBranding {
  tenant_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  button_primary_color?: string;
  button_secondary_color?: string;
  text_primary_color?: string;
  text_secondary_color?: string;
  border_color?: string;
  font_family: string;
  heading_font?: string;
  font_url: string | null;
  heading_font_size?: number;
  body_font_size?: number;
  heading_font_weight?: string;
  body_font_weight?: string;
  letter_spacing?: number;
  line_height?: number;
  text_transform?: string;
  app_name: string | null;
  tagline: string | null;
  description?: string | null;
  custom_texts: Record<string, string>;
  favicon_url: string | null;
  logo_url?: string | null;
  hero_image_url?: string | null;
  section_background_color?: string;
  section_background_image_url?: string;
  use_gradient?: boolean;
  gradient_start_color?: string;
  gradient_end_color?: string;
  gradient_direction?: string;
  border_radius?: number;
  button_border_radius?: number;
  shadow_intensity?: string;
  button_style?: string;
  instagram_url?: string;
  facebook_url?: string;
  whatsapp_number?: string;
  contact_email?: string;
  contact_phone?: string;
  booking_description?: string;
  delivery_description?: string;
  featured_text?: string;
  welcome_title?: string;
  welcome_message?: string;
  footer_text?: string;
  hours_title?: string;
  hours_content?: string;
  button_add_to_cart_text?: string;
  button_checkout_text?: string;
  button_reserve_text?: string;
  empty_cart_message?: string;
  button_hover_effect?: string;
  button_hover_color?: string;
  link_hover_color?: string;
  link_hover_underline?: boolean;
  transition_speed?: string;
  page_config: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

// Restaurant Settings
export interface RestaurantSettings {
  tenant_id: string;
  display_name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  country: string;
  country_code?: string;
  currency?: string;
  currency_symbol?: string;
  timezone: string;
  delivery_enabled: boolean;
  delivery_fee: number;
  delivery_min_order: number;
  delivery_time_minutes: number;
  reservations_enabled: boolean;
  total_tables: number;
  seats_per_table: number;
  reservation_advance_hours: number;
  cash_payment_enabled: boolean;
  tax_rate: number;
  featured_image_url: string | null;
  operating_hours: Record<string, { open: string; close: string }>;
  waiter_pin: string | null;
  kitchen_pin: string | null;
  created_at: string;
  updated_at: string;
}

// Menu
export interface MenuCategory {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItemVariant {
  name: string;
  price_delta?: number;
}

export interface MenuItem {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  featured: boolean;
  variants: {
    sizes?: MenuItemVariant[];
    addons?: MenuItemVariant[];
  };
  created_at: string;
  updated_at: string;
}

// Orders
export interface OrderItem {
  item_id: string;
  name: string;
  qty: number;
  price: number;
  variants_selected?: Record<string, string>;
}

export interface Order {
  id: string;
  tenant_id: string;
  order_number: string;
  customer_id: string | null;
  customer_email: string | null;
  customer_name: string;
  customer_phone: string | null;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  delivery_fee: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled';
  payment_method: 'stripe' | 'cash' | null;
  payment_status: 'pending' | 'paid' | 'failed';
  stripe_payment_intent_id: string | null;
  delivery_type: 'pickup' | 'delivery' | 'dine-in';
  delivery_address: string | null;
  table_number: number | null;
  waiter_name: string | null;
  notes: string | null;
  display_number: number | null;
  created_at: string;
  updated_at: string;
}

// Reservations
export interface Reservation {
  id: string;
  tenant_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  table_id: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'no-show' | 'completed';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Tables
export interface Table {
  id: string;
  tenant_id: string;
  table_number: number;
  seats: number;
  location: string | null;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  created_at: string;
  updated_at: string;
}

// Customers
export interface Customer {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

// Subscription Plans
export interface SubscriptionPlan {
  id: string;
  name: 'basic' | 'pro' | 'premium';
  monthly_price: number;
  features: {
    max_products: number;
    orders_per_month: number;
    [key: string]: any;
  };
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  annual_price: number | null;
  stripe_annual_price_id: string | null;
  created_at: string;
}

// Cart Item
export interface CartItem {
  item_id: string;
  name: string;
  price: number;
  qty: number;
  image_url?: string;
  variants_selected?: Record<string, string>;
  toppings?: Array<{ id: string; name: string; price: number }>;
}

// Tenant Context
export interface TenantContext {
  tenant?: Tenant;
  branding?: TenantBranding;
  settings?: RestaurantSettings;
  isLoading: boolean;
  error?: string;
}

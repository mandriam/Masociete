/**
 * Application Types
 * 
 * Core type definitions used throughout the application.
 * Includes types for users, products, orders, categories, and other entities.
 * Provides consistent type safety across components and services.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'buyer' | 'seller' | 'admin';
  phone?: string;
  address?: string;
  avatar?: string;
  verified: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: 'MGA' | 'EUR' | 'USD';
  images: string[];
  category_id: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    icon: string;
  };
  subcategory_id?: string;
  subcategory?: {
    id: string;
    name: string;
    slug: string;
  };
  condition: 'new' | 'used' | 'refurbished';
  location: string;
  seller_id: string;
  seller?: User; // Made optional to handle cases where seller info might be missing
  stock: number;
  featured: boolean;
  status: 'active' | 'inactive' | 'sold';
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  buyer_id: string;
  items: CartItem[];
  total: number;
  currency: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: 'mvola' | 'orange_money' | 'airtel_money' | 'stripe';
  shipping_address: Address;
  created_at: string;
  updated_at: string;
}

export interface Address {
  street: string;
  city: string;
  region: string;
  zipCode?: string;
  country: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'mobile_money' | 'card';
  provider: 'mvola' | 'orange_money' | 'airtel_money' | 'stripe';
  logo: string;
  enabled: boolean;
}

// Updated messaging types for product-based conversations
export interface ProductConversation {
  id: string; // Composite ID: product_id-other_user_id
  product_id: string;
  product_title: string;
  other_participant: User;
  last_message?: ProductMessage;
  last_message_at: string;
  has_unread: boolean;
  is_buyer: boolean;
}

export interface ProductMessage {
  id: string;
  product_id: string;
  sender_id: string;
  recipient_id: string;
  sender: User;
  content: string;
  read_at?: string;
  created_at: string;
}

// Legacy types for backward compatibility
export interface Message {
  id: string;
  sender_id: string;
  sender: User;
  content: string;
  read_at?: string;
  created_at: string;
}
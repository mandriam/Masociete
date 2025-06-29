/**
 * Database Types
 * 
 * TypeScript type definitions for the Supabase database schema.
 * Provides type safety for database operations and queries.
 * Includes all tables, columns, and relationships in the database.
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: 'buyer' | 'seller' | 'admin';
          phone: string | null;
          address: string | null;
          avatar: string | null;
          verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          role?: 'buyer' | 'seller' | 'admin';
          phone?: string | null;
          address?: string | null;
          avatar?: string | null;
          verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: 'buyer' | 'seller' | 'admin';
          phone?: string | null;
          address?: string | null;
          avatar?: string | null;
          verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          title: string;
          description: string;
          price: number;
          currency: 'MGA' | 'EUR' | 'USD';
          images: string[];
          category_id: string;
          subcategory_id: string | null;
          condition: 'new' | 'used' | 'refurbished';
          location: string;
          seller_id: string;
          stock: number;
          featured: boolean;
          status: 'active' | 'inactive' | 'sold';
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          price: number;
          currency?: 'MGA' | 'EUR' | 'USD';
          images: string[];
          category_id: string;
          subcategory_id?: string | null;
          condition: 'new' | 'used' | 'refurbished';
          location: string;
          seller_id: string;
          stock: number;
          featured?: boolean;
          status?: 'active' | 'inactive' | 'sold';
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          price?: number;
          currency?: 'MGA' | 'EUR' | 'USD';
          images?: string[];
          category_id?: string;
          subcategory_id?: string | null;
          condition?: 'new' | 'used' | 'refurbished';
          location?: string;
          seller_id?: string;
          stock?: number;
          featured?: boolean;
          status?: 'active' | 'inactive' | 'sold';
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          total: number;
          currency: string;
          status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
          payment_method: 'mvola' | 'orange_money' | 'airtel_money' | 'stripe';
          shipping_address: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          total: number;
          currency: string;
          status?: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
          payment_method: 'mvola' | 'orange_money' | 'airtel_money' | 'stripe';
          shipping_address: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          total?: number;
          currency?: string;
          status?: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
          payment_method?: 'mvola' | 'orange_money' | 'airtel_money' | 'stripe';
          shipping_address?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          price?: number;
          created_at?: string;
        };
      };
      product_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string;
          description: string | null;
          sort_order: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          icon: string;
          description?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          icon?: string;
          description?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_subcategories: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          slug: string;
          description: string | null;
          sort_order: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          slug: string;
          description?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string | null;
          sender_id: string;
          recipient_id: string;
          content: string;
          product_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id?: string | null;
          sender_id: string;
          recipient_id: string;
          content: string;
          product_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string | null;
          sender_id?: string;
          recipient_id?: string;
          content?: string;
          product_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_unread_message_count: {
        Args: {};
        Returns: number;
      };
      get_user_conversations: {
        Args: {};
        Returns: {
          product_id: string;
          product_title: string;
          other_user_id: string;
          other_user_name: string;
          other_user_verified: boolean;
          last_message_content: string;
          last_message_at: string;
          unread_count: number;
          is_buyer: boolean;
        }[];
      };
      get_product_messages: {
        Args: {
          p_product_id: string;
          p_other_user_id: string;
        };
        Returns: {
          id: string;
          content: string;
          sender_id: string;
          sender_name: string;
          sender_avatar: string;
          product_id: string;
          read_at: string | null;
          created_at: string;
        }[];
      };
      send_product_message: {
        Args: {
          p_product_id: string;
          p_recipient_id: string;
          p_content: string;
        };
        Returns: {
          message_id: string;
          created_at: string;
        }[];
      };
      handle_product_message: {
        Args: {
          p_product_id: string;
          p_recipient_id: string;
          p_content: string;
        };
        Returns: {
          message_sent: boolean;
          existing_conversation: boolean;
        }[];
      };
      mark_product_messages_as_read: {
        Args: {
          p_product_id: string;
          p_sender_id: string;
        };
        Returns: void;
      };
      get_seller_orders: {
        Args: {
          seller_id: string;
        };
        Returns: {
          id: string;
          buyer_id: string;
          total: number;
          currency: string;
          status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
          payment_method: 'mvola' | 'orange_money' | 'airtel_money' | 'stripe';
          shipping_address: any;
          created_at: string;
          updated_at: string;
          order_items: any;
        }[];
      };
      get_categories_with_subcategories: {
        Args: {};
        Returns: {
          id: string;
          name: string;
          slug: string;
          icon: string;
          description: string;
          sort_order: number;
          active: boolean;
          created_at: string;
          updated_at: string;
          subcategories: any;
        }[];
      };
      get_related_products: {
        Args: {
          p_product_id: string;
          p_limit?: number;
        };
        Returns: any[];
      };
    };
    Enums: {
      user_role: 'buyer' | 'seller' | 'admin';
      product_condition: 'new' | 'used' | 'refurbished';
      product_status: 'active' | 'inactive' | 'sold';
      order_status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
      payment_method: 'mvola' | 'orange_money' | 'airtel_money' | 'stripe';
    };
  };
}
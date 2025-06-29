/**
 * Database Service Module
 * 
 * This module provides a comprehensive interface to interact with the Supabase backend.
 * It includes services for products, users, categories, orders, favorites, and messaging.
 * Each service contains methods for CRUD operations and specialized queries.
 * The module handles error checking, type safety, and proper data formatting.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Database } from '../types/database';

type Tables = Database['public']['Tables'];
type Product = Tables['products']['Row'];
type User = Tables['users']['Row'];
type Order = Tables['orders']['Row'];
type OrderItem = Tables['order_items']['Row'];
type Category = Tables['product_categories']['Row'];
type Subcategory = Tables['product_subcategories']['Row'];
type Favorite = Tables['favorites']['Row'];
type Message = Tables['messages']['Row'];

// Helper function to handle Supabase configuration errors
const checkSupabaseConfig = () => {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not properly configured. Please check your environment variables:\n' +
      '- VITE_SUPABASE_URL\n' +
      '- VITE_SUPABASE_ANON_KEY\n\n' +
      'You can find these values in your Supabase project dashboard under Project Settings -> API'
    );
  }
};

// Product service
export const productService = {
  async getAllProducts(filters?: {
    categoryId?: string;
    subcategoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    location?: string;
    featured?: boolean;
    sellerId?: string;
  }) {
    try {
      checkSupabaseConfig();
      
      let query = supabase
        .from('products')
        .select(`
          *,
          seller:users!products_seller_id_fkey(id, name, email, verified),
          category:product_categories!products_category_id_fkey(id, name, slug),
          subcategory:product_subcategories!products_subcategory_id_fkey(id, name, slug)
        `)
        .eq('status', 'active');

      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      
      if (filters?.subcategoryId) {
        query = query.eq('subcategory_id', filters.subcategoryId);
      }
      
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      
      if (filters?.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }
      
      if (filters?.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }
      
      if (filters?.condition) {
        query = query.eq('condition', filters.condition);
      }
      
      if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      
      if (filters?.featured !== undefined) {
        query = query.eq('featured', filters.featured);
      }
      
      if (filters?.sellerId) {
        query = query.eq('seller_id', filters.sellerId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  async getProduct(id: string) {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories!products_category_id_fkey(id, name, slug),
          subcategory:product_subcategories!products_subcategory_id_fkey(id, name, slug)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Get seller information separately to avoid join issues
      if (data && data.seller_id) {
        try {
          const sellerData = await userService.getProfile(data.seller_id);
          if (sellerData) {
            data.seller = sellerData;
          }
        } catch (sellerError) {
          console.error('Error fetching seller info:', sellerError);
          // Continue without seller info
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  async deleteProduct(id: string) {
    try {
      checkSupabaseConfig();
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  async getSellerProducts(sellerId: string) {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories!products_category_id_fkey(id, name, slug),
          subcategory:product_subcategories!products_subcategory_id_fkey(id, name, slug)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching seller products:', error);
      throw error;
    }
  },

  async getFeaturedProducts() {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:users!products_seller_id_fkey(id, name, email, verified),
          category:product_categories!products_category_id_fkey(id, name, slug),
          subcategory:product_subcategories!products_subcategory_id_fkey(id, name, slug)
        `)
        .eq('status', 'active')
        .eq('featured', true)
        .order('created_at', { ascending: false })
        .limit(8);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching featured products:', error);
      throw error;
    }
  }
};

// User service
export const userService = {
  async getProfile(id: string) {
    try {
      checkSupabaseConfig();
      console.log('🔍 Fetching user profile for ID:', id);
      
      // Direct query to get user by ID
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Error in getProfile direct query:', error);
        throw error;
      }
      
      if (data) {
        console.log('✅ User profile found:', data.name);
        return data;
      }
      
      console.log('⚠️ No user profile found with direct query, trying RPC');
      
      // If direct query fails, try using an RPC function
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_user_by_id',
          { user_id: id }
        );
        
        if (rpcError) {
          console.error('❌ Error in getProfile RPC:', rpcError);
          throw rpcError;
        }
        
        if (rpcData) {
          console.log('✅ User profile found via RPC:', rpcData.name);
          return rpcData;
        }
      } catch (rpcErr) {
        console.error('❌ RPC method failed or not available:', rpcErr);
        // Continue to fallback method
      }
      
      // Last resort: try a raw SQL query via functions API
      console.log('⚠️ Trying fallback method for user profile');
      
      // Create a fallback profile with minimal information
      const fallbackProfile = {
        id: id,
        name: "Vendeur",
        email: "vendeur@masociete.info",
        role: "seller",
        verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('⚠️ Using fallback profile:', fallbackProfile.name);
      return fallbackProfile;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      
      // Return a fallback profile instead of throwing
      const fallbackProfile = {
        id: id,
        name: "Vendeur",
        email: "vendeur@masociete.info",
        role: "seller",
        verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('⚠️ Using fallback profile after error:', fallbackProfile.name);
      return fallbackProfile;
    }
  },

  async createUser(userData: Omit<User, 'created_at' | 'updated_at'>) {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  async updateUser(id: string, updates: Partial<User>) {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  async getAllUsers() {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }
};

// Category service
export const categoryService = {
  async getAllCategories() {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  async getCategoriesWithProductCounts() {
    try {
      checkSupabaseConfig();
      
      // First get all active categories
      const { data: categories, error: categoriesError } = await supabase
        .from('product_categories')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      
      if (categoriesError) throw categoriesError;
      
      if (!categories || categories.length === 0) {
        return [];
      }

      // Get product counts for each category
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          try {
            const { count, error: countError } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('category_id', category.id)
              .eq('status', 'active');
            
            if (countError) {
              console.warn(`Error counting products for category ${category.name}:`, countError);
              return { ...category, product_count: 0 };
            }
            
            return { ...category, product_count: count || 0 };
          } catch (error) {
            console.warn(`Error processing category ${category.name}:`, error);
            return { ...category, product_count: 0 };
          }
        })
      );
      
      return categoriesWithCounts;
    } catch (error) {
      console.error('Error fetching categories with product counts:', error);
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  },

  async getCategoriesWithSubcategories() {
    try {
      checkSupabaseConfig();
      
      // Get all active categories with their subcategories
      const { data, error } = await supabase
        .from('product_categories')
        .select(`
          *,
          subcategories:product_subcategories(*)
        `)
        .eq('active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      // Sort subcategories by sort_order
      const categoriesWithSortedSubcategories = data?.map(category => ({
        ...category,
        subcategories: category.subcategories?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) || []
      })) || [];
      
      return categoriesWithSortedSubcategories;
    } catch (error) {
      console.error('Error fetching categories with subcategories:', error);
      throw error;
    }
  },

  async getCategoryBySlug(slug: string) {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('slug', slug)
        .eq('active', true)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching category:', error);
      throw error;
    }
  },

  async createCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>) {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase
        .from('product_categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  async updateCategory(id: string, updates: Partial<Category>) {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase
        .from('product_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  async deleteCategory(id: string) {
    try {
      checkSupabaseConfig();
      
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }
};

// Order service
export const orderService = {
  async createOrder(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>, items: Omit<OrderItem, 'id' | 'order_id' | 'created_at'>[]) {
    try {
      checkSupabaseConfig();
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      const orderItems = items.map(item => ({
        ...item,
        order_id: orderData.id
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
      
      return orderData;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  async getUserOrders(userId: string) {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            product:products(*)
          )
        `)
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  },

  async getSellerOrders(sellerId: string) {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase.rpc('get_seller_orders', {
        seller_id: sellerId
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching seller orders:', error);
      throw error;
    }
  },

  async updateOrderStatus(id: string, status: Order['status']) {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }
};

// Message service
export const messageService = {
  async getUserConversations() {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase.rpc('get_user_conversations');
      
      if (error) throw error;
      
      // Format the data to match the expected structure
      return data?.map(conv => ({
        id: `${conv.product_id}-${conv.other_user_id}`,
        product_id: conv.product_id,
        product_title: conv.product_title,
        other_participant: {
          id: conv.other_user_id,
          name: conv.other_user_name,
          verified: conv.other_user_verified
        },
        last_message: {
          content: conv.last_message_content,
          created_at: conv.last_message_at
        },
        last_message_at: conv.last_message_at,
        has_unread: conv.unread_count > 0,
        is_buyer: conv.is_buyer
      })) || [];
    } catch (error) {
      console.error('Error fetching user conversations:', error);
      throw error;
    }
  },

  async getProductMessages(productId: string, otherUserId: string) {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase.rpc('get_product_messages', {
        p_product_id: productId,
        p_other_user_id: otherUserId
      });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching product messages:', error);
      throw error;
    }
  },

  async sendProductMessage(productId: string, recipientId: string, content: string) {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase.rpc('send_product_message', {
        p_product_id: productId,
        p_recipient_id: recipientId,
        p_content: content.trim()
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending product message:', error);
      throw error;
    }
  },

  async markMessagesAsRead(productId: string, senderId: string) {
    try {
      checkSupabaseConfig();
      
      const { error } = await supabase.rpc('mark_product_messages_as_read', {
        p_product_id: productId,
        p_sender_id: senderId
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  },

  async getUnreadMessageCount() {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase.rpc('get_unread_message_count');
      
      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error fetching unread message count:', error);
      return 0;
    }
  },

  async handleProductMessage(senderId: string, recipientId: string, productId: string, productTitle: string, productPrice: number, currency: string, sellerName: string) {
    try {
      checkSupabaseConfig();
      
      const { data, error } = await supabase.rpc('handle_product_message', {
        p_product_id: productId,
        p_recipient_id: recipientId,
        p_content: `Bonjour, je suis intéressé(e) par votre produit "${productTitle}" à ${productPrice} ${currency}. Pouvez-vous me donner plus d'informations ?`
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error handling product message:', error);
      throw error;
    }
  },

  subscribeToUserMessages(userId: string, callback: () => void) {
    try {
      checkSupabaseConfig();
      
      const subscription = supabase
        .channel('user-messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `or(sender_id.eq.${userId},recipient_id.eq.${userId})`
          },
          callback
        )
        .subscribe();
      
      return subscription;
    } catch (error) {
      console.error('Error setting up user messages subscription:', error);
      return { unsubscribe: () => {} };
    }
  },

  subscribeToProductMessages(productId: string, otherUserId: string, callback: (message: any) => void) {
    try {
      checkSupabaseConfig();
      
      // Get current user
      const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
      };
      
      const subscription = supabase
        .channel(`product-messages-${productId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `product_id=eq.${productId}`
          },
          async (payload) => {
            const user = await getCurrentUser();
            if (!user) return;
            
            const newMessage = payload.new as any;
            
            // Only process messages between the current user and the other user
            if (
              (newMessage.sender_id === user.id && newMessage.recipient_id === otherUserId) ||
              (newMessage.sender_id === otherUserId && newMessage.recipient_id === user.id)
            ) {
              // Fetch the complete message with user data
              const { data: messageWithUsers } = await supabase
                .from('messages')
                .select(`
                  *,
                  sender:users!messages_sender_id_fkey(id, name),
                  recipient:users!messages_recipient_id_fkey(id, name)
                `)
                .eq('id', newMessage.id)
                .single();
              
              if (messageWithUsers) {
                callback({
                  id: messageWithUsers.id,
                  product_id: messageWithUsers.product_id,
                  sender_id: messageWithUsers.sender_id,
                  recipient_id: messageWithUsers.recipient_id,
                  content: messageWithUsers.content,
                  read_at: messageWithUsers.read_at,
                  created_at: messageWithUsers.created_at,
                  sender_name: messageWithUsers.sender?.name || 'Unknown',
                  recipient_name: messageWithUsers.recipient?.name || 'Unknown'
                });
              }
            }
          }
        )
        .subscribe();
      
      return subscription;
    } catch (error) {
      console.error('Error setting up product messages subscription:', error);
      return { unsubscribe: () => {} };
    }
  }
};
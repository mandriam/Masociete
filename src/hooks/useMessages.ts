/**
 * Message Hooks
 * 
 * Custom React hooks for handling messaging functionality.
 * Provides hooks for conversations, product messages, and unread message counts.
 * Includes real-time subscriptions for message updates.
 */

import { useState, useEffect } from 'react';
import { messageService } from '../services/database';
import { useAuth } from '../contexts/AuthContext';

export interface ProductConversation {
  id: string;
  product_id: string;
  product_title: string;
  other_participant: {
    id: string;
    name: string;
    verified: boolean;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
  last_message_at: string;
  has_unread: boolean;
  is_buyer: boolean;
}

export interface ProductMessage {
  id: string;
  product_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at?: string;
  created_at: string;
  sender_name: string;
  recipient_name: string;
}

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ProductConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await messageService.getUserConversations();
      
      // Ensure we have unique conversations by product_id and other_participant.id
      const uniqueConversations = new Map<string, ProductConversation>();
      
      (data || []).forEach((conv: any) => {
        const key = `${conv.product_id}-${conv.other_participant.id}`;
        if (!uniqueConversations.has(key) || 
            new Date(conv.last_message_at) > new Date(uniqueConversations.get(key)!.last_message_at)) {
          uniqueConversations.set(key, conv);
        }
      });
      
      setConversations(Array.from(uniqueConversations.values()));
    } catch (err: any) {
      console.error('❌ Error fetching conversations:', err);
      setError(err.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const subscription = messageService.subscribeToUserMessages(
      user.id,
      fetchConversations
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return { conversations, loading, error, refetch: fetchConversations };
};

export const useProductMessages = (productId: string | null, otherUserId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ProductMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    if (!productId || !otherUserId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await messageService.getProductMessages(productId, otherUserId);
      
      // Ensure we have unique messages by ID
      const uniqueMessages = new Map<string, ProductMessage>();
      (data || []).forEach((msg: ProductMessage) => {
        uniqueMessages.set(msg.id, msg);
      });
      
      setMessages(Array.from(uniqueMessages.values()).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
      
      // Mark messages as read
      if (user) {
        await messageService.markMessagesAsRead(productId, otherUserId);
      }
    } catch (err: any) {
      console.error('❌ Error fetching messages:', err);
      setError(err.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [productId, otherUserId, user]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!productId || !otherUserId || !user) return;

    const subscription = messageService.subscribeToProductMessages(
      productId,
      otherUserId,
      (newMessage: ProductMessage) => {
        setMessages(prev => {
          // Check if message already exists
          if (prev.some(msg => msg.id === newMessage.id)) {
            return prev;
          }
          
          const updated = [...prev, newMessage];
          
          // Sort by creation date
          return updated.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
        
        // Mark as read if user is not the sender
        if (user && newMessage.sender_id !== user.id) {
          messageService.markMessagesAsRead(productId, otherUserId);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [productId, otherUserId, user]);

  const sendMessage = async (content: string) => {
    if (!productId || !otherUserId || !user || !content.trim()) return;

    try {
      const result = await messageService.sendProductMessage(productId, otherUserId, content);
      // Message will be added via real-time subscription
      return result;
    } catch (err: any) {
      console.error('❌ Error sending message:', err);
      setError(err.message || 'Failed to send message');
      throw err;
    }
  };

  return { messages, loading, error, sendMessage, refetch: fetchMessages };
};

export const useUnreadMessageCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = async () => {
    if (!user) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const unreadCount = await messageService.getUnreadMessageCount();
      setCount(unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
  }, [user]);

  // Set up real-time subscription for count updates
  useEffect(() => {
    if (!user) return;

    const subscription = messageService.subscribeToUserMessages(
      user.id,
      fetchCount
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return { count, loading, refetch: fetchCount };
};
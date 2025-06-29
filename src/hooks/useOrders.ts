/**
 * Order Hooks
 * 
 * Custom React hooks for order-related functionality.
 * Provides hooks for user orders and seller orders.
 * Handles loading states and error handling.
 */

import { useState, useEffect } from 'react';
import { orderService } from '../services/database';
import { useAuth } from '../contexts/AuthContext';

export const useUserOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await orderService.getUserOrders(user.id);
        setOrders(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  return { orders, loading, error };
};

export const useSellerOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSellerOrders = async () => {
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await orderService.getSellerOrders(user.id);
        setOrders(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch seller orders');
      } finally {
        setLoading(false);
      }
    };

    fetchSellerOrders();
  }, [user]);

  return { orders, loading, error };
};
/**
 * Product Hooks
 * 
 * Custom React hooks for product-related functionality.
 * Provides hooks for fetching and filtering products.
 * Includes hooks for featured products and product search.
 */

import { useState, useEffect } from 'react';
import { productService } from '../services/database';

export const useProducts = (filters?: {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sellerId?: string;
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await productService.getAllProducts(filters);
        setProducts(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters?.category, filters?.minPrice, filters?.maxPrice, filters?.search, filters?.sellerId]);

  return { products, loading, error, refetch: () => fetchProducts() };
};

export const useFeaturedProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await productService.getFeaturedProducts();
        setProducts(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch featured products');
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  return { products, loading, error };
};
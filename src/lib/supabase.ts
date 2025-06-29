/**
 * Supabase Client Configuration
 * 
 * This module initializes and exports the Supabase client for database operations.
 * It includes error handling for missing environment variables and provides
 * helper functions to check configuration status.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are properly configured
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  console.error('Required variables:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_ANON_KEY');
  console.error('You can find these values in your Supabase project dashboard under Project Settings -> API');
}

// Validate URL format
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  console.error('VITE_SUPABASE_URL should start with https://');
}

// Create client with error handling
let supabase: ReturnType<typeof createClient<Database>>;

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } else {
    // Create a mock client that will throw meaningful errors
    supabase = createClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  throw new Error('Supabase configuration error. Please check your environment variables.');
}

export { supabase };

// Auth helpers
export const auth = supabase.auth;

// Database helpers
export const db = supabase;

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));
};

// Helper function to get configuration status
export const getSupabaseConfigStatus = () => {
  return {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlValid: supabaseUrl ? supabaseUrl.startsWith('https://') : false,
    configured: isSupabaseConfigured(),
  };
};
/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the application.
 * Handles user authentication, registration, profile management, and session persistence.
 * Includes robust error handling and state management for authentication flows.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { userService } from '../services/database';

interface AuthResult {
  success: boolean;
  error?: string;
  redirect?: string;
}

interface AuthContextType {
  user: User | null;
  profile: any | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'buyer' | 'seller';
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Force clear all auth state
  const forceAuthClear = () => {
    console.log('🧹 Force clearing all auth state');
    setUser(null);
    setProfile(null);
    setIsLoading(false);
    setProfileLoading(false);
    
    // Clear any localStorage items that might persist
    try {
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-wfuoqbvnwsjjwuzcnfpw-auth-token');
      // Clear any other potential auth storage
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Error clearing localStorage:', error);
    }
    
    // Clear sessionStorage as well
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('Error clearing sessionStorage:', error);
    }
  };

  const loadUserProfile = async (userId: string, retryCount = 0) => {
    // Prevent multiple simultaneous profile loads
    if (profileLoading) {
      console.log('⏳ Profile loading already in progress, skipping...');
      return null;
    }

    try {
      setProfileLoading(true);
      console.log(`👤 Loading profile for user: ${userId} (attempt ${retryCount + 1})`);
      
      // Add a small delay to prevent rapid successive calls
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // First try to get the profile using the service
      let profileData = await userService.getProfile(userId);
      
      if (!profileData) {
        console.log('⚠️ No profile found via service, trying direct query...');
        
        // If no profile found, try direct query
        const { data: directProfile, error: directError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (directError) {
          console.error('❌ Direct profile query error:', directError);
          throw directError;
        }
        
        profileData = directProfile;
      }
      
      if (profileData) {
        console.log('✅ Profile loaded successfully:', profileData.name, profileData.role);
        setProfile(profileData);
        return profileData;
      } else {
        console.log('⚠️ No profile data found for user');
        
        // Check if this is the admin email
        const currentUser = await supabase.auth.getUser();
        if (currentUser.data.user?.email === 'admin@masociete.info') {
          console.log('🔧 Admin user detected but no profile found.');
          console.log('📋 Please follow the admin setup instructions in ADMIN_SETUP.md');
          console.log('💡 The admin profile must be created manually in the Supabase dashboard');
          
          // Set a temporary profile to indicate admin setup is needed
          const tempProfile = {
            id: userId,
            email: 'admin@masociete.info',
            name: 'Admin Setup Required',
            role: 'admin',
            verified: false,
            setupRequired: true
          };
          setProfile(tempProfile);
          return tempProfile;
        }
        
        // For non-admin users, if we still don't have a profile and retries are available, retry
        if (retryCount < 2) {
          console.log('🔄 Retrying profile load...');
          setProfileLoading(false);
          return await loadUserProfile(userId, retryCount + 1);
        }
        
        setProfile(null);
        return null;
      }
    } catch (error: any) {
      console.error('❌ Error loading user profile:', error);
      
      // If there's an RLS error, we can still continue without the profile
      if (error.message?.includes('infinite recursion') || error.message?.includes('policy')) {
        console.warn('⚠️ RLS policy issue detected, continuing without profile data');
        setProfile(null);
      } else if (retryCount < 1) {
        // Retry on other errors (but limit retries)
        console.log('🔄 Retrying profile load due to error...');
        setProfileLoading(false);
        return await loadUserProfile(userId, retryCount + 1);
      } else {
        setProfile(null);
      }
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user && !profileLoading) {
      await loadUserProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;
    let initializationComplete = false;

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          if (mounted) {
            forceAuthClear();
          }
          return;
        }

        console.log('📋 Initial session check:', session?.user?.email || 'No user');
        
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            await loadUserProfile(session.user.id);
          } else {
            forceAuthClear();
          }
          setIsLoading(false);
          initializationComplete = true;
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (mounted) {
          forceAuthClear();
          initializationComplete = true;
        }
      }
    };

    // Set up auth state listener
    const setupAuthListener = () => {
      authSubscription = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;

          console.log('🔔 Auth state change:', event, session?.user?.email || 'No user');
          
          // Skip processing if we're still initializing
          if (!initializationComplete && event !== 'SIGNED_OUT') {
            console.log('⏭️ Skipping auth state change during initialization');
            return;
          }
          
          try {
            switch (event) {
              case 'SIGNED_OUT':
                console.log('👋 User signed out - force clearing state');
                forceAuthClear();
                break;
                
              case 'SIGNED_IN':
                if (session?.user) {
                  console.log('👋 User signed in:', session.user.email);
                  setUser(session.user);
                  // Only load profile if we don't already have one for this user
                  if (!profile || profile.id !== session.user.id) {
                    await loadUserProfile(session.user.id);
                  }
                  setIsLoading(false);
                } else {
                  forceAuthClear();
                }
                break;
                
              case 'TOKEN_REFRESHED':
                if (session?.user) {
                  console.log('🔄 Token refreshed for:', session.user.email);
                  setUser(session.user);
                  // Only load profile if we don't have it or it's for a different user
                  if (!profile || profile.id !== session.user.id) {
                    await loadUserProfile(session.user.id);
                  }
                  setIsLoading(false);
                } else {
                  forceAuthClear();
                }
                break;
                
              default:
                // Handle any other auth state changes
                if (session?.user) {
                  setUser(session.user);
                  // Only load profile if we don't have it or it's for a different user
                  if (!profile || profile.id !== session.user.id) {
                    await loadUserProfile(session.user.id);
                  }
                  setIsLoading(false);
                } else {
                  forceAuthClear();
                }
                break;
            }
          } catch (error) {
            console.error('❌ Error handling auth state change:', error);
            if (mounted) {
              setIsLoading(false);
            }
          }
        }
      );
    };

    // Initialize
    initializeAuth().then(() => {
      setupAuthListener();
    });

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.data?.subscription?.unsubscribe();
      }
    };
  }, []); // Remove profile dependency to prevent loops

  const login = async (email: string, password: string): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      console.log('🔐 Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Login error:', error);
        setIsLoading(false);
        return { success: false, error: error.message || 'Login failed' };
      }

      if (data.user) {
        console.log('✅ Login successful for:', data.user.email);
        
        // Set user immediately
        setUser(data.user);
        
        // Load the user profile to determine redirect
        const userProfile = await loadUserProfile(data.user.id);
        
        // Determine redirect based on user role
        let redirectPath = '/';
        if (userProfile?.role === 'admin') {
          redirectPath = '/admin';
          console.log('🎯 Admin user detected, redirecting to admin dashboard');
        } else if (userProfile?.role === 'seller') {
          redirectPath = '/seller/dashboard';
          console.log('🎯 Seller user detected, redirecting to seller dashboard');
        }
        
        setIsLoading(false);
        return { success: true, redirect: redirectPath };
      }

      setIsLoading(false);
      return { success: false, error: 'No user data returned' };
    } catch (error: any) {
      console.error('❌ Login exception:', error);
      setIsLoading(false);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const register = async (data: RegisterData): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      // Create auth user with role in metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: data.role,
            name: data.name
          }
        }
      });

      if (authError) {
        setIsLoading(false);
        return { success: false, error: authError.message || 'Registration failed' };
      }

      if (authData.user) {
        // Try to create user profile
        try {
          await userService.createUser({
            id: authData.user.id,
            email: data.email,
            name: data.name,
            role: data.role,
            phone: data.phone,
            verified: false,
          });

          await loadUserProfile(authData.user.id);
        } catch (profileError) {
          console.warn('User created but profile creation failed:', profileError);
          // Registration is still successful even if profile creation fails
        }
      }

      setIsLoading(false);
      return { success: true };
    } catch (error: any) {
      setIsLoading(false);
      return { success: false, error: error.message || 'Registration failed' };
    }
  };

  const logout = async (): Promise<AuthResult> => {
    console.log('🚪 === LOGOUT PROCESS STARTED ===');
    setIsLoading(true);
    
    try {
      // Step 1: Immediately clear local state
      console.log('🧹 Step 1: Force clearing local state');
      forceAuthClear();
      
      // Step 2: Multiple signout attempts to ensure complete logout
      console.log('🔐 Step 2: Supabase signout attempts');
      
      // First attempt: local signout
      try {
        const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
        if (localError) {
          console.warn('⚠️ Local signout warning:', localError);
        } else {
          console.log('✅ Local signout successful');
        }
      } catch (localErr) {
        console.warn('⚠️ Local signout exception:', localErr);
      }
      
      // Second attempt: global signout
      try {
        const { error: globalError } = await supabase.auth.signOut({ scope: 'global' });
        if (globalError) {
          console.warn('⚠️ Global signout warning:', globalError);
        } else {
          console.log('✅ Global signout successful');
        }
      } catch (globalErr) {
        console.warn('⚠️ Global signout exception:', globalErr);
      }
      
      // Step 3: Force clear session data
      console.log('🗑️ Step 3: Force clearing session data');
      try {
        // Clear the session from Supabase client
        await supabase.auth.admin.signOut(user?.id || '');
      } catch (adminErr) {
        console.warn('⚠️ Admin signout not available:', adminErr);
      }
      
      // Step 4: Final cleanup
      console.log('🧽 Step 4: Final cleanup');
      forceAuthClear();
      
      // Step 5: Force reload to ensure clean state
      console.log('🔄 Step 5: Forcing page reload for clean state');
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      
      console.log('✅ === LOGOUT PROCESS COMPLETED ===');
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Logout exception:', error);
      // Even on exception, force clear local state and reload
      forceAuthClear();
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      return { success: false, error: error.message || 'Logout failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, login, register, logout, isLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
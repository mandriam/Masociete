# MySQL Migration Guide for MaSociété.info

This guide outlines the necessary changes to migrate the application from Supabase (PostgreSQL) to MySQL. The migration involves changes to database schema, authentication, and data access patterns.

## Table of Contents

1. [Environment Configuration](#environment-configuration)
2. [Database Schema Migration](#database-schema-migration)
3. [Authentication Changes](#authentication-changes)
4. [Data Access Layer Changes](#data-access-layer-changes)
5. [File-by-File Modifications](#file-by-file-modifications)

## Environment Configuration

Update `.env` file to use MySQL connection parameters:

```
# MySQL Configuration
DATABASE_URL=mysql://username:password@localhost:3306/masociete_db
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=masociete_db

# JWT Secret for authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=7d
```

## Database Schema Migration

### Enum Types

MySQL doesn't support enum types like PostgreSQL. Convert these to either:
1. VARCHAR columns with CHECK constraints
2. Separate lookup tables

Example conversion:

```sql
-- Supabase (PostgreSQL)
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');

-- MySQL
CREATE TABLE user_roles (
  role VARCHAR(20) PRIMARY KEY
);

INSERT INTO user_roles (role) VALUES ('buyer'), ('seller'), ('admin');

-- Then reference in users table
ALTER TABLE users ADD CONSTRAINT fk_user_role FOREIGN KEY (role) REFERENCES user_roles(role);
```

Or simpler approach with CHECK constraints:

```sql
-- MySQL
CREATE TABLE users (
  -- other columns
  role VARCHAR(20) NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  -- other columns
);
```

### UUID Handling

MySQL doesn't natively support UUIDs. Options:

1. Use CHAR(36) columns to store UUID strings
2. Use binary(16) for more efficient storage
3. Use auto-increment integers instead

Example:

```sql
-- MySQL with UUID strings
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  -- other columns
);

-- MySQL with binary UUIDs
CREATE TABLE users (
  id BINARY(16) PRIMARY KEY,
  -- other columns
);

-- MySQL with auto-increment
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  -- other columns
);
```

### Array Types

MySQL doesn't support array types. Convert to:
1. JSON columns (MySQL 5.7+)
2. Separate junction tables

Example:

```sql
-- Supabase (PostgreSQL)
CREATE TABLE products (
  id uuid PRIMARY KEY,
  images text[],
  tags text[]
);

-- MySQL using JSON
CREATE TABLE products (
  id CHAR(36) PRIMARY KEY,
  images JSON,
  tags JSON
);

-- MySQL using junction tables
CREATE TABLE product_images (
  product_id CHAR(36),
  image_url TEXT,
  position INT,
  PRIMARY KEY (product_id, position),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE product_tags (
  product_id CHAR(36),
  tag VARCHAR(100),
  PRIMARY KEY (product_id, tag),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

### JSONB Type

MySQL 5.7+ supports JSON type but not JSONB. Convert:

```sql
-- Supabase (PostgreSQL)
shipping_address JSONB NOT NULL

-- MySQL
shipping_address JSON NOT NULL
```

### Timestamp Handling

Convert `timestamptz` to `TIMESTAMP`:

```sql
-- Supabase (PostgreSQL)
created_at timestamptz DEFAULT now()

-- MySQL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Full-Text Search

Replace PostgreSQL's full-text search with MySQL's:

```sql
-- MySQL
CREATE FULLTEXT INDEX idx_products_search ON products(title, description);

-- Then in queries
SELECT * FROM products 
WHERE MATCH(title, description) AGAINST ('search term' IN NATURAL LANGUAGE MODE);
```

## Authentication Changes

Replace Supabase Auth with a custom JWT-based authentication system:

1. Create a new `auth` directory with the following files:

### auth/jwt.js

```javascript
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };
```

### auth/middleware.js

```javascript
const { verifyToken } = require('./jwt');
const db = require('../lib/mysql');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user from database
    const [users] = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { authMiddleware };
```

## Data Access Layer Changes

### Create MySQL Connection

Create a new file `lib/mysql.js`:

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
```

### API Routes

Create Express API routes to replace Supabase RPC functions:

```javascript
// Example: api/products.js
const express = require('express');
const router = express.Router();
const db = require('../lib/mysql');
const { authMiddleware } = require('../auth/middleware');

// Get all products
router.get('/', async (req, res) => {
  try {
    const { categoryId, subcategoryId, minPrice, maxPrice, search, sellerId, featured } = req.query;
    
    let query = `
      SELECT p.*, 
        c.id as category_id, c.name as category_name, c.slug as category_slug,
        sc.id as subcategory_id, sc.name as subcategory_name, sc.slug as subcategory_slug,
        u.id as seller_id, u.name as seller_name, u.email as seller_email, u.verified as seller_verified
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.id
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE p.status = 'active'
    `;
    
    const params = [];
    
    if (categoryId) {
      query += ' AND p.category_id = ?';
      params.push(categoryId);
    }
    
    if (subcategoryId) {
      query += ' AND p.subcategory_id = ?';
      params.push(subcategoryId);
    }
    
    if (minPrice !== undefined) {
      query += ' AND p.price >= ?';
      params.push(minPrice);
    }
    
    if (maxPrice !== undefined) {
      query += ' AND p.price <= ?';
      params.push(maxPrice);
    }
    
    if (search) {
      query += ' AND (p.title LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (sellerId) {
      query += ' AND p.seller_id = ?';
      params.push(sellerId);
    }
    
    if (featured !== undefined) {
      query += ' AND p.featured = ?';
      params.push(featured === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    const [products] = await db.query(query, params);
    
    // Format the response to match the Supabase structure
    const formattedProducts = products.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      currency: p.currency,
      images: JSON.parse(p.images),
      condition: p.condition,
      location: p.location,
      stock: p.stock,
      featured: Boolean(p.featured),
      status: p.status,
      tags: p.tags ? JSON.parse(p.tags) : [],
      created_at: p.created_at,
      updated_at: p.updated_at,
      seller_id: p.seller_id,
      category_id: p.category_id,
      subcategory_id: p.subcategory_id,
      seller: {
        id: p.seller_id,
        name: p.seller_name,
        email: p.seller_email,
        verified: Boolean(p.seller_verified)
      },
      category: {
        id: p.category_id,
        name: p.category_name,
        slug: p.category_slug
      },
      subcategory: p.subcategory_id ? {
        id: p.subcategory_id,
        name: p.subcategory_name,
        slug: p.subcategory_slug
      } : null
    }));
    
    res.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Other routes...

module.exports = router;
```

## File-by-File Modifications

### 1. package.json

Add MySQL dependencies:

```diff
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
+   "mysql2": "^3.6.0",
+   "express": "^4.18.2",
+   "jsonwebtoken": "^9.0.1",
+   "bcrypt": "^5.1.0",
+   "cors": "^2.8.5",
    "lucide-react": "^0.344.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.3"
  }
}
```

### 2. src/lib/supabase.ts → src/lib/mysql.ts

Replace with:

```typescript
import mysql from 'mysql2/promise';

// Create connection pool
const pool = mysql.createPool({
  host: import.meta.env.VITE_DATABASE_HOST,
  port: Number(import.meta.env.VITE_DATABASE_PORT),
  user: import.meta.env.VITE_DATABASE_USER,
  password: import.meta.env.VITE_DATABASE_PASSWORD,
  database: import.meta.env.VITE_DATABASE_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Check if environment variables are properly configured
if (!import.meta.env.VITE_DATABASE_HOST || !import.meta.env.VITE_DATABASE_USER) {
  console.error('Missing MySQL environment variables. Please check your .env file.');
  console.error('Required variables:');
  console.error('- VITE_DATABASE_HOST');
  console.error('- VITE_DATABASE_PORT');
  console.error('- VITE_DATABASE_USER');
  console.error('- VITE_DATABASE_PASSWORD');
  console.error('- VITE_DATABASE_NAME');
}

// Helper function to check if MySQL is properly configured
export const isMySQLConfigured = (): boolean => {
  return !!(
    import.meta.env.VITE_DATABASE_HOST &&
    import.meta.env.VITE_DATABASE_USER &&
    import.meta.env.VITE_DATABASE_PASSWORD &&
    import.meta.env.VITE_DATABASE_NAME
  );
};

// Helper function to get configuration status
export const getMySQLConfigStatus = () => {
  return {
    hasHost: !!import.meta.env.VITE_DATABASE_HOST,
    hasUser: !!import.meta.env.VITE_DATABASE_USER,
    hasPassword: !!import.meta.env.VITE_DATABASE_PASSWORD,
    hasDatabase: !!import.meta.env.VITE_DATABASE_NAME,
    configured: isMySQLConfigured(),
  };
};

export default pool;
```

### 3. src/services/database.ts

Replace with a MySQL implementation:

```typescript
import pool, { isMySQLConfigured } from '../lib/mysql';
import { User, Product, Order, Category, Subcategory, Message } from '../types';

// Helper function to handle MySQL configuration errors
const checkMySQLConfig = () => {
  if (!isMySQLConfigured()) {
    throw new Error(
      'MySQL is not properly configured. Please check your environment variables:\n' +
      '- VITE_DATABASE_HOST\n' +
      '- VITE_DATABASE_PORT\n' +
      '- VITE_DATABASE_USER\n' +
      '- VITE_DATABASE_PASSWORD\n' +
      '- VITE_DATABASE_NAME\n'
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
      checkMySQLConfig();
      
      let query = `
        SELECT p.*, 
          c.id as category_id, c.name as category_name, c.slug as category_slug, c.icon as category_icon,
          sc.id as subcategory_id, sc.name as subcategory_name, sc.slug as subcategory_slug,
          u.id as seller_id, u.name as seller_name, u.email as seller_email, 
          u.verified as seller_verified, u.phone as seller_phone
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.id
        LEFT JOIN users u ON p.seller_id = u.id
        WHERE p.status = 'active'
      `;
      
      const params: any[] = [];
      
      if (filters?.categoryId) {
        query += ' AND p.category_id = ?';
        params.push(filters.categoryId);
      }
      
      if (filters?.subcategoryId) {
        query += ' AND p.subcategory_id = ?';
        params.push(filters.subcategoryId);
      }
      
      if (filters?.search) {
        query += ' AND (p.title LIKE ? OR p.description LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }
      
      if (filters?.minPrice !== undefined) {
        query += ' AND p.price >= ?';
        params.push(filters.minPrice);
      }
      
      if (filters?.maxPrice !== undefined) {
        query += ' AND p.price <= ?';
        params.push(filters.maxPrice);
      }
      
      if (filters?.condition) {
        query += ' AND p.condition = ?';
        params.push(filters.condition);
      }
      
      if (filters?.location) {
        query += ' AND p.location LIKE ?';
        params.push(`%${filters.location}%`);
      }
      
      if (filters?.featured !== undefined) {
        query += ' AND p.featured = ?';
        params.push(filters.featured ? 1 : 0);
      }
      
      if (filters?.sellerId) {
        query += ' AND p.seller_id = ?';
        params.push(filters.sellerId);
      }
      
      query += ' ORDER BY p.created_at DESC';
      
      const [rows] = await pool.query(query, params);
      
      // Format the response to match the Supabase structure
      return (rows as any[]).map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        currency: p.currency,
        images: JSON.parse(p.images),
        condition: p.condition,
        location: p.location,
        stock: p.stock,
        featured: Boolean(p.featured),
        status: p.status,
        tags: p.tags ? JSON.parse(p.tags) : [],
        created_at: p.created_at,
        updated_at: p.updated_at,
        seller_id: p.seller_id,
        category_id: p.category_id,
        subcategory_id: p.subcategory_id,
        seller: {
          id: p.seller_id,
          name: p.seller_name,
          email: p.seller_email,
          verified: Boolean(p.seller_verified),
          phone: p.seller_phone
        },
        category: {
          id: p.category_id,
          name: p.category_name,
          slug: p.category_slug,
          icon: p.category_icon
        },
        subcategory: p.subcategory_id ? {
          id: p.subcategory_id,
          name: p.subcategory_name,
          slug: p.subcategory_slug
        } : null
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  async getProduct(id: string) {
    try {
      checkMySQLConfig();
      
      const query = `
        SELECT p.*, 
          c.id as category_id, c.name as category_name, c.slug as category_slug, c.icon as category_icon,
          sc.id as subcategory_id, sc.name as subcategory_name, sc.slug as subcategory_slug,
          u.id as seller_id, u.name as seller_name, u.email as seller_email, 
          u.verified as seller_verified, u.phone as seller_phone
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.id
        LEFT JOIN users u ON p.seller_id = u.id
        WHERE p.id = ?
      `;
      
      const [rows] = await pool.query(query, [id]);
      
      if ((rows as any[]).length === 0) {
        return null;
      }
      
      const p = (rows as any[])[0];
      
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        currency: p.currency,
        images: JSON.parse(p.images),
        condition: p.condition,
        location: p.location,
        stock: p.stock,
        featured: Boolean(p.featured),
        status: p.status,
        tags: p.tags ? JSON.parse(p.tags) : [],
        created_at: p.created_at,
        updated_at: p.updated_at,
        seller_id: p.seller_id,
        category_id: p.category_id,
        subcategory_id: p.subcategory_id,
        seller: {
          id: p.seller_id,
          name: p.seller_name,
          email: p.seller_email,
          verified: Boolean(p.seller_verified),
          phone: p.seller_phone
        },
        category: {
          id: p.category_id,
          name: p.category_name,
          slug: p.category_slug,
          icon: p.category_icon
        },
        subcategory: p.subcategory_id ? {
          id: p.subcategory_id,
          name: p.subcategory_name,
          slug: p.subcategory_slug
        } : null
      };
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  // Continue with other methods...
};

// User service
export const userService = {
  async getProfile(id: string) {
    try {
      checkMySQLConfig();
      console.log('🔍 Fetching user profile for ID:', id);
      
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      
      if ((rows as any[]).length === 0) {
        console.log('⚠️ No user profile found with ID:', id);
        
        // Create a fallback profile
        return {
          id: id,
          name: "Vendeur",
          email: "vendeur@masociete.info",
          role: "seller",
          verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      
      console.log('✅ User profile found:', (rows as any[])[0].name);
      return (rows as any[])[0];
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      
      // Return a fallback profile instead of throwing
      return {
        id: id,
        name: "Vendeur",
        email: "vendeur@masociete.info",
        role: "seller",
        verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  },

  // Continue with other methods...
};

// Continue with other services...
```

### 4. src/contexts/AuthContext.tsx

Replace Supabase Auth with custom JWT auth:

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userService } from '../services/database';
import api from '../lib/api'; // New API client

interface AuthResult {
  success: boolean;
  error?: string;
  redirect?: string;
}

interface AuthContextType {
  user: any | null;
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
  const [user, setUser] = useState<any | null>(null);
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
      localStorage.removeItem('auth.token');
      localStorage.removeItem('auth.user');
      // Clear any other potential auth storage
      Object.keys(localStorage).forEach(key => {
        if (key.includes('auth')) {
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
    // Implementation remains similar, but uses MySQL service
    // ...
  };

  const refreshProfile = async () => {
    if (user && !profileLoading) {
      await loadUserProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;
    let initializationComplete = false;

    // Get initial session from localStorage
    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth...');
        const storedToken = localStorage.getItem('auth.token');
        const storedUser = localStorage.getItem('auth.user');
        
        if (!storedToken || !storedUser) {
          if (mounted) {
            forceAuthClear();
          }
          return;
        }

        // Verify token with backend
        try {
          const response = await api.get('/auth/verify');
          if (response.status !== 200) {
            throw new Error('Invalid token');
          }
          
          const userData = JSON.parse(storedUser);
          console.log('📋 Initial session check:', userData?.email || 'No user');
          
          if (mounted) {
            setUser(userData);
            await loadUserProfile(userData.id);
          }
        } catch (error) {
          console.error('❌ Token verification failed:', error);
          forceAuthClear();
          return;
        }
        
        if (mounted) {
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

    // Initialize
    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      console.log('🔐 Attempting login for:', email);
      
      const response = await api.post('/auth/login', { email, password });
      
      if (response.status !== 200) {
        console.error('❌ Login error:', response.data);
        setIsLoading(false);
        return { success: false, error: response.data.error || 'Login failed' };
      }

      const { token, user } = response.data;
      
      // Store token and user in localStorage
      localStorage.setItem('auth.token', token);
      localStorage.setItem('auth.user', JSON.stringify(user));
      
      console.log('✅ Login successful for:', user.email);
      
      // Set user immediately
      setUser(user);
      
      // Load the user profile to determine redirect
      const userProfile = await loadUserProfile(user.id);
      
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
    } catch (error: any) {
      console.error('❌ Login exception:', error);
      setIsLoading(false);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const register = async (data: RegisterData): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', data);
      
      if (response.status !== 201) {
        setIsLoading(false);
        return { success: false, error: response.data.error || 'Registration failed' };
      }

      const { token, user } = response.data;
      
      // Store token and user in localStorage
      localStorage.setItem('auth.token', token);
      localStorage.setItem('auth.user', JSON.stringify(user));
      
      // Set user immediately
      setUser(user);
      
      await loadUserProfile(user.id);
      
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
      
      // Step 2: Call logout endpoint
      console.log('🔐 Step 2: Calling logout endpoint');
      try {
        await api.post('/auth/logout');
        console.log('✅ Logout API call successful');
      } catch (logoutErr) {
        console.warn('⚠️ Logout API call failed:', logoutErr);
      }
      
      // Step 3: Force clear session data
      console.log('🗑️ Step 3: Force clearing session data');
      localStorage.removeItem('auth.token');
      localStorage.removeItem('auth.user');
      
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
```

### 5. Create API Client (src/lib/api.ts)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth.token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear auth state and redirect to login
      localStorage.removeItem('auth.token');
      localStorage.removeItem('auth.user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 6. Backend API Implementation

Create a Node.js Express backend with the following structure:

```
/server
  /routes
    auth.js
    products.js
    users.js
    categories.js
    orders.js
    messages.js
  /controllers
    authController.js
    productController.js
    userController.js
    categoryController.js
    orderController.js
    messageController.js
  /middleware
    auth.js
  /utils
    jwt.js
  index.js
```

Example implementation for auth routes:

```javascript
// server/routes/auth.js
const express = require('express');
const router = express.Router();
const { login, register, verify, logout } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/login', login);
router.post('/register', register);
router.get('/verify', authMiddleware, verify);
router.post('/logout', authMiddleware, logout);

module.exports = router;
```

### 7. Real-time Features

Replace Supabase real-time subscriptions with Socket.IO:

```javascript
// server/index.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('User connected:', socket.user.id);
  
  // Join user-specific room
  socket.join(`user:${socket.user.id}`);
  
  // Handle message events
  socket.on('send_message', async (data) => {
    try {
      // Save message to database
      // ...
      
      // Emit to recipient
      io.to(`user:${data.recipientId}`).emit('new_message', {
        id: messageId,
        senderId: socket.user.id,
        recipientId: data.recipientId,
        productId: data.productId,
        content: data.content,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.user.id);
  });
});

// Express middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/messages', require('./routes/messages'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 8. Frontend Socket.IO Integration

```typescript
// src/lib/socket.ts
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
  autoConnect: false,
  auth: {
    token: localStorage.getItem('auth.token')
  }
});

export const connectSocket = () => {
  if (localStorage.getItem('auth.token')) {
    socket.auth = { token: localStorage.getItem('auth.token') };
    socket.connect();
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export default socket;
```

### 9. Update Hooks

Update hooks to use the new API client:

```typescript
// src/hooks/useProducts.ts
import { useState, useEffect } from 'react';
import api from '../lib/api';

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
        
        const params = new URLSearchParams();
        if (filters?.category) params.append('category', filters.category);
        if (filters?.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
        if (filters?.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
        if (filters?.search) params.append('search', filters.search);
        if (filters?.sellerId) params.append('sellerId', filters.sellerId);
        
        const response = await api.get(`/products?${params.toString()}`);
        setProducts(response.data || []);
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

// Continue with other hooks...
```

## MySQL Schema Creation

Create a complete MySQL schema script:

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS masociete_db;
USE masociete_db;

-- User roles
CREATE TABLE user_roles (
  role VARCHAR(20) PRIMARY KEY
);

INSERT INTO user_roles (role) VALUES ('buyer'), ('seller'), ('admin');

-- Product conditions
CREATE TABLE product_conditions (
  condition VARCHAR(20) PRIMARY KEY
);

INSERT INTO product_conditions (condition) VALUES ('new'), ('used'), ('refurbished');

-- Product statuses
CREATE TABLE product_statuses (
  status VARCHAR(20) PRIMARY KEY
);

INSERT INTO product_statuses (status) VALUES ('active'), ('inactive'), ('sold');

-- Order statuses
CREATE TABLE order_statuses (
  status VARCHAR(20) PRIMARY KEY
);

INSERT INTO order_statuses (status) VALUES ('pending'), ('paid'), ('shipped'), ('delivered'), ('cancelled');

-- Payment methods
CREATE TABLE payment_methods (
  method VARCHAR(20) PRIMARY KEY
);

INSERT INTO payment_methods (method) VALUES ('mvola'), ('orange_money'), ('airtel_money'), ('stripe');

-- Users table
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'buyer',
  phone VARCHAR(50),
  address TEXT,
  avatar VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role) REFERENCES user_roles(role)
);

-- Product categories
CREATE TABLE product_categories (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  icon VARCHAR(50) NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Product subcategories
CREATE TABLE product_subcategories (
  id CHAR(36) PRIMARY KEY,
  category_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (category_id, name),
  UNIQUE KEY (category_id, slug),
  FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE CASCADE
);

-- Products table
CREATE TABLE products (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
  currency VARCHAR(10) DEFAULT 'MGA' CHECK (currency IN ('MGA', 'EUR', 'USD')),
  images JSON DEFAULT ('[]'),
  category_id CHAR(36) NOT NULL,
  subcategory_id CHAR(36),
  condition VARCHAR(20) DEFAULT 'new',
  location VARCHAR(255) NOT NULL,
  seller_id CHAR(36) NOT NULL,
  stock INT DEFAULT 0 CHECK (stock >= 0),
  featured BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  tags JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES product_categories(id),
  FOREIGN KEY (subcategory_id) REFERENCES product_subcategories(id),
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (condition) REFERENCES product_conditions(condition),
  FOREIGN KEY (status) REFERENCES product_statuses(status)
);

-- Orders table
CREATE TABLE orders (
  id CHAR(36) PRIMARY KEY,
  buyer_id CHAR(36),
  total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
  currency VARCHAR(10) DEFAULT 'MGA',
  status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(20) NOT NULL,
  shipping_address JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (status) REFERENCES order_statuses(status),
  FOREIGN KEY (payment_method) REFERENCES payment_methods(method)
);

-- Order items table
CREATE TABLE order_items (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36),
  product_id CHAR(36),
  quantity INT NOT NULL CHECK (quantity > 0),
  price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Favorites table
CREATE TABLE favorites (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  product_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE messages (
  id CHAR(36) PRIMARY KEY,
  sender_id CHAR(36) NOT NULL,
  recipient_id CHAR(36) NOT NULL,
  product_id CHAR(36),
  content TEXT NOT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Create indexes for better performance
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_subcategory_id ON products(subcategory_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_featured ON products(featured);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_messages_product_id ON messages(product_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_read_at ON messages(read_at);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE FULLTEXT INDEX idx_products_search ON products(title, description);
```

## Conclusion

This migration guide outlines the key changes needed to switch from Supabase (PostgreSQL) to MySQL. The main challenges are:

1. Converting PostgreSQL-specific types (enums, arrays, JSONB) to MySQL equivalents
2. Replacing Supabase Auth with a custom JWT authentication system
3. Creating a Node.js Express backend to replace Supabase's RPC functions
4. Implementing Socket.IO for real-time features to replace Supabase's real-time subscriptions

The migration requires significant backend development but allows for more control over the database and authentication system. The frontend changes are minimal, mainly focused on updating the data access layer to use the new API client instead of Supabase.
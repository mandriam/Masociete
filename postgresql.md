# PostgreSQL Migration Guide for MaSociété.info

This guide outlines the necessary changes to migrate from Supabase to a standard PostgreSQL database while maintaining the existing codebase structure.

## Table of Contents

1. [Environment Configuration](#environment-configuration)
2. [Database Setup](#database-setup)
3. [Authentication Changes](#authentication-changes)
4. [Data Access Layer Changes](#data-access-layer-changes)
5. [Real-time Features](#real-time-features)
6. [File-by-File Modifications](#file-by-file-modifications)
7. [Migration Steps](#migration-steps)

## Environment Configuration

Update `.env` file to use direct PostgreSQL connection parameters:

```
# PostgreSQL Configuration
VITE_PG_HOST=localhost
VITE_PG_PORT=5432
VITE_PG_USER=postgres
VITE_PG_PASSWORD=your_password
VITE_PG_DATABASE=masociete_db

# JWT Configuration for Auth
VITE_JWT_SECRET=your_jwt_secret_key
VITE_JWT_EXPIRY=7d

# API URL for backend server
VITE_API_URL=http://localhost:3000/api
```

## Database Setup

### Schema Migration

The good news is that PostgreSQL schema can remain largely the same as Supabase. You'll need to:

1. Export the schema from Supabase
2. Create a new PostgreSQL database
3. Import the schema with some modifications

To export the schema from Supabase:

```bash
# Using Supabase CLI (if available)
supabase db dump -f schema.sql

# Or from the Supabase dashboard:
# 1. Go to SQL Editor
# 2. Run: SELECT schema_to_xml('public', true, true, '');
# 3. Save the output
```

### Schema Modifications

When importing to a standard PostgreSQL database, you'll need to:

1. Remove Supabase-specific extensions and functions
2. Remove RLS (Row Level Security) policies
3. Remove Supabase auth schema references

Example modifications:

```sql
-- Remove Supabase extensions
-- DELETE THESE LINES:
-- CREATE EXTENSION IF NOT EXISTS "supabase_vault";
-- CREATE EXTENSION IF NOT EXISTS "pg_graphql";
-- etc.

-- Remove RLS policies
-- DELETE THESE LINES:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
-- etc.

-- Remove auth schema references
-- REPLACE:
-- auth.uid()
-- WITH:
-- current_user_id()
```

### Create Custom Functions

Create PostgreSQL functions to replace Supabase-specific functions:

```sql
-- Create a function to get current user ID (used in place of auth.uid())
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_user_id', TRUE)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a function to set current user ID
CREATE OR REPLACE FUNCTION set_current_user_id(user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql;
```

## Authentication Changes

Since Supabase Auth won't be available, you'll need to implement a custom authentication system:

### 1. Create Authentication API

Create a Node.js Express server with authentication endpoints:

```javascript
// server/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Get user from database
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );
    
    // Return user and token
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Generate UUID
    const userId = crypto.randomUUID();
    
    // Create user
    const newUser = await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role, phone, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, role, phone, verified`,
      [userId, email, passwordHash, name, role, phone, false]
    );
    
    const user = newUser.rows[0];
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );
    
    // Return user and token
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({ valid: true });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
```

### 2. Update AuthContext

The `AuthContext.tsx` will need to be updated to use the new authentication API instead of Supabase Auth.

## Data Access Layer Changes

### 1. Create PostgreSQL Client

Create a new file `src/lib/postgres.ts` to replace `src/lib/supabase.ts`:

```typescript
import { Pool } from 'pg';

// Create connection pool
const pool = new Pool({
  host: import.meta.env.VITE_PG_HOST,
  port: Number(import.meta.env.VITE_PG_PORT),
  user: import.meta.env.VITE_PG_USER,
  password: import.meta.env.VITE_PG_PASSWORD,
  database: import.meta.env.VITE_PG_DATABASE
});

// Check if environment variables are properly configured
if (!import.meta.env.VITE_PG_HOST || !import.meta.env.VITE_PG_USER) {
  console.error('Missing PostgreSQL environment variables. Please check your .env file.');
  console.error('Required variables:');
  console.error('- VITE_PG_HOST');
  console.error('- VITE_PG_PORT');
  console.error('- VITE_PG_USER');
  console.error('- VITE_PG_PASSWORD');
  console.error('- VITE_PG_DATABASE');
}

// Helper function to check if PostgreSQL is properly configured
export const isPgConfigured = (): boolean => {
  return !!(
    import.meta.env.VITE_PG_HOST &&
    import.meta.env.VITE_PG_USER &&
    import.meta.env.VITE_PG_PASSWORD &&
    import.meta.env.VITE_PG_DATABASE
  );
};

// Helper function to get configuration status
export const getPgConfigStatus = () => {
  return {
    hasHost: !!import.meta.env.VITE_PG_HOST,
    hasUser: !!import.meta.env.VITE_PG_USER,
    hasPassword: !!import.meta.env.VITE_PG_PASSWORD,
    hasDatabase: !!import.meta.env.VITE_PG_DATABASE,
    configured: isPgConfigured(),
  };
};

export default pool;
```

### 2. Create API Client

Create a new file `src/lib/api.ts` for making API requests:

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

### 3. Update Database Services

Update `src/services/database.ts` to use the new API client instead of Supabase:

```typescript
import api from '../lib/api';
import { isPgConfigured } from '../lib/postgres';
import { User, Product, Order, Category, Subcategory, Message } from '../types';

// Helper function to handle PostgreSQL configuration errors
const checkPgConfig = () => {
  if (!isPgConfigured()) {
    throw new Error(
      'PostgreSQL is not properly configured. Please check your environment variables:\n' +
      '- VITE_PG_HOST\n' +
      '- VITE_PG_PORT\n' +
      '- VITE_PG_USER\n' +
      '- VITE_PG_PASSWORD\n' +
      '- VITE_PG_DATABASE\n'
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
      checkPgConfig();
      
      const params = new URLSearchParams();
      if (filters?.categoryId) params.append('categoryId', filters.categoryId);
      if (filters?.subcategoryId) params.append('subcategoryId', filters.subcategoryId);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
      if (filters?.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
      if (filters?.condition) params.append('condition', filters.condition);
      if (filters?.location) params.append('location', filters.location);
      if (filters?.featured !== undefined) params.append('featured', filters.featured.toString());
      if (filters?.sellerId) params.append('sellerId', filters.sellerId);
      
      const response = await api.get(`/products?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  async getProduct(id: string) {
    try {
      checkPgConfig();
      
      const response = await api.get(`/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
    try {
      checkPgConfig();
      
      const response = await api.post('/products', product);
      return response.data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    try {
      checkPgConfig();
      
      const response = await api.put(`/products/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  async deleteProduct(id: string) {
    try {
      checkPgConfig();
      
      await api.delete(`/products/${id}`);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  async getFeaturedProducts() {
    try {
      checkPgConfig();
      
      const response = await api.get('/products/featured');
      return response.data;
    } catch (error) {
      console.error('Error fetching featured products:', error);
      throw error;
    }
  }
};

// Continue with other services...
```

## Real-time Features

### 1. Server-Side Implementation

Use PostgreSQL's LISTEN/NOTIFY with Socket.IO:

```javascript
// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// PostgreSQL connection
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE
});

// Set up PostgreSQL notification listener
const pgClient = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE
});

pgClient.connect((err, client) => {
  if (err) {
    console.error('Error connecting to PostgreSQL for notifications:', err);
    return;
  }
  
  // Listen for notifications
  client.query('LISTEN message_created');
  client.query('LISTEN product_updated');
  client.query('LISTEN order_updated');
  
  client.on('notification', (msg) => {
    try {
      const payload = JSON.parse(msg.payload);
      
      switch (msg.channel) {
        case 'message_created':
          io.to(`user:${payload.recipient_id}`).emit('new_message', payload);
          break;
        case 'product_updated':
          io.emit('product_updated', payload);
          break;
        case 'order_updated':
          io.to(`user:${payload.buyer_id}`).emit('order_updated', payload);
          io.to(`user:${payload.seller_id}`).emit('order_updated', payload);
          break;
      }
    } catch (error) {
      console.error('Error processing notification:', error);
    }
  });
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
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.user.id);
  });
});

// Express routes
// ...

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### 2. PostgreSQL Triggers for Notifications

Create triggers to send notifications when data changes:

```sql
-- Function to notify on message creation
CREATE OR REPLACE FUNCTION notify_message_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'message_created',
    json_build_object(
      'id', NEW.id,
      'sender_id', NEW.sender_id,
      'recipient_id', NEW.recipient_id,
      'product_id', NEW.product_id,
      'content', NEW.content,
      'created_at', NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_created_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_message_created();

-- Function to notify on product update
CREATE OR REPLACE FUNCTION notify_product_updated()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'product_updated',
    json_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'price', NEW.price,
      'stock', NEW.stock,
      'status', NEW.status,
      'updated_at', NEW.updated_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_updated_trigger
AFTER UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION notify_product_updated();

-- Function to notify on order update
CREATE OR REPLACE FUNCTION notify_order_updated()
RETURNS TRIGGER AS $$
DECLARE
  seller_id uuid;
BEGIN
  -- Get seller ID from first product in order
  SELECT p.seller_id INTO seller_id
  FROM order_items oi
  JOIN products p ON oi.product_id = p.id
  WHERE oi.order_id = NEW.id
  LIMIT 1;

  PERFORM pg_notify(
    'order_updated',
    json_build_object(
      'id', NEW.id,
      'buyer_id', NEW.buyer_id,
      'seller_id', seller_id,
      'status', NEW.status,
      'updated_at', NEW.updated_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_updated_trigger
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_updated();
```

### 3. Client-Side Socket.IO Integration

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

## File-by-File Modifications

### 1. src/lib/supabase.ts → src/lib/postgres.ts

Replace with the PostgreSQL client implementation shown above.

### 2. src/contexts/AuthContext.tsx

Update to use the new authentication API instead of Supabase Auth.

### 3. src/services/database.ts

Update to use the new API client instead of Supabase.

### 4. src/hooks/*.ts

Update all hooks to use the new API client.

## Migration Steps

1. **Export Supabase Schema**
   ```bash
   supabase db dump -f schema.sql
   ```

2. **Modify Schema**
   - Remove Supabase-specific extensions
   - Remove RLS policies
   - Add custom authentication tables and functions

3. **Set Up PostgreSQL Database**
   ```bash
   createdb masociete_db
   psql -d masociete_db -f modified_schema.sql
   ```

4. **Create Backend API**
   - Set up Express server
   - Implement authentication endpoints
   - Create API endpoints for all database operations
   - Implement real-time features with Socket.IO and PostgreSQL LISTEN/NOTIFY

5. **Update Frontend**
   - Create new PostgreSQL client
   - Create API client
   - Update AuthContext
   - Update database services
   - Implement Socket.IO for real-time features

6. **Test Migration**
   - Test authentication flow
   - Test data fetching and manipulation
   - Test real-time features

7. **Deploy**
   - Deploy PostgreSQL database
   - Deploy Express API server
   - Update frontend environment variables
   - Deploy frontend

## Conclusion

Migrating from Supabase to a standard PostgreSQL database requires implementing custom solutions for:

1. **Authentication** - Replacing Supabase Auth with a custom JWT-based system
2. **Data Access** - Replacing Supabase client with direct PostgreSQL queries via an API
3. **Real-time Features** - Replacing Supabase real-time with Socket.IO and PostgreSQL LISTEN/NOTIFY

The advantage of this approach is greater control over your database and backend, while the disadvantage is the increased complexity and maintenance burden of managing your own infrastructure.

By following this guide, you can successfully migrate from Supabase to a standard PostgreSQL database without significant changes to your application's functionality or user experience.
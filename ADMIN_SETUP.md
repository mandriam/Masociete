# Admin Setup Guide - MaSociété.info

## Default Admin Account

A default admin account has been created for managing the marketplace:

### Admin Credentials
- **Email**: `admin@masociete.info`
- **Role**: Administrator
- **Status**: Verified

### Setting Up the Admin Password

Since we're using Supabase Auth, you need to create the authentication user separately:

1. **Go to your Supabase Dashboard**
2. **Navigate to Authentication > Users**
3. **Click "Add User"**
4. **Fill in the details**:
   - Email: `admin@masociete.info`
   - Password: Choose a secure password
   - Email Confirm: ✅ (checked)
   - Auto Confirm User: ✅ (checked)

5. **Copy the User ID** from the created auth user
6. **Go to SQL Editor** and run:
   ```sql
   UPDATE users 
   SET id = 'YOUR_COPIED_USER_ID_HERE'
   WHERE email = 'admin@masociete.info';
   ```

## Admin Features

### 🎛️ Admin Dashboard
- **Marketplace Statistics**: Users, products, orders, revenue
- **Real-time Metrics**: Live data from the database
- **Quick Actions**: Direct access to management tools
- **Visual Analytics**: Charts and graphs for insights

### 👥 User Management
- **View All Users**: Complete user directory
- **Role Management**: Promote/demote users (buyer/seller/admin)
- **User Verification**: Verify/unverify user accounts
- **Search & Filter**: Find users by name, email, or role
- **User Statistics**: Breakdown by role and status

### 📦 Product Management
- **Product Overview**: All products across the marketplace
- **Status Control**: Activate/deactivate products
- **Featured Products**: Promote products to featured status
- **Product Deletion**: Remove inappropriate content
- **Advanced Filtering**: By category, status, seller
- **Product Statistics**: Active, featured, sold counts

### 🔐 Admin Permissions

Admins have full access to:
- **Read all user data** (with RLS policies)
- **Update user roles and verification status**
- **Manage all products** regardless of seller
- **View all orders** across the platform
- **Access marketplace statistics**
- **Manage categories** and site content

### 🛡️ Security Features

- **Row Level Security**: Database-level access control
- **Role-based Access**: Different permissions per user type
- **Admin-only Functions**: Secure database functions
- **Audit Trails**: All changes are logged with timestamps

## Admin Navigation

### Header Menu
When logged in as admin, you'll see additional menu items:
- **Administration** (main dashboard)
- **Gestion utilisateurs** (user management)
- **Gestion produits** (product management)

### Admin Routes
- `/admin` - Main admin dashboard
- `/admin/users` - User management
- `/admin/products` - Product management

## Database Functions

### Available Admin Functions
```sql
-- Get marketplace statistics
SELECT get_marketplace_stats();

-- Update user role (admin only)
SELECT update_user_role('user_id', 'new_role');

-- Update user verification (admin only)
SELECT update_user_verification('user_id', true/false);
```

## Best Practices

### 🔒 Security
- **Change default password** immediately after setup
- **Use strong passwords** for admin accounts
- **Limit admin access** to trusted personnel only
- **Regular security audits** of admin activities

### 📊 Monitoring
- **Check dashboard daily** for unusual activity
- **Monitor user registrations** for spam accounts
- **Review product listings** for inappropriate content
- **Track order patterns** for fraud detection

### 🚀 Maintenance
- **Regular database backups** (handled by Supabase)
- **Update user roles** as needed
- **Manage featured products** to promote quality listings
- **Respond to user reports** promptly

## Troubleshooting

### Common Issues

1. **Can't access admin pages**
   - Verify user role is set to 'admin' in database
   - Check if user is properly authenticated
   - Ensure RLS policies are correctly applied

2. **Statistics not loading**
   - Check database connection
   - Verify admin functions are properly created
   - Look for errors in browser console

3. **Can't update user roles**
   - Ensure you're logged in as admin
   - Check if target user exists
   - Verify database permissions

### Support
For technical support or questions about admin features:
- Check the database logs in Supabase
- Review the browser console for errors
- Contact the development team

---

**Important**: Keep this admin account secure and only share credentials with authorized personnel. The admin has full control over the marketplace and all user data.
# Test Accounts Setup Guide

## Quick Setup Instructions

The login form shows test accounts, but they need to be created in your Supabase project. Follow these steps:

### 1. Create Authentication Users

Go to your **Supabase Dashboard** → **Authentication** → **Users** → **Add User**

Create these three users:

#### Admin Account
- **Email**: `admin@masociete.info`
- **Password**: `password`
- **Email Confirm**: ✅ (checked)
- **Auto Confirm User**: ✅ (checked)

#### Buyer Account  
- **Email**: `buyer@test.com`
- **Password**: `password`
- **Email Confirm**: ✅ (checked)
- **Auto Confirm User**: ✅ (checked)

#### Seller Account
- **Email**: `seller@test.com`  
- **Password**: `password`
- **Email Confirm**: ✅ (checked)
- **Auto Confirm User**: ✅ (checked)

### 2. Update Database Profiles

After creating each auth user, **copy their User ID** and run these SQL commands in your **Supabase SQL Editor**:

```sql
-- Update admin profile with real auth user ID
UPDATE users 
SET id = 'PASTE_ADMIN_USER_ID_HERE'
WHERE email = 'admin@masociete.info';

-- Update buyer profile with real auth user ID  
UPDATE users
SET id = 'PASTE_BUYER_USER_ID_HERE'
WHERE email = 'buyer@test.com';

-- Update seller profile with real auth user ID
UPDATE users
SET id = 'PASTE_SELLER_USER_ID_HERE'  
WHERE email = 'seller@test.com';
```

### 3. Test Login

Now you can use these credentials on the login page:

- **Admin**: admin@masociete.info / password
- **Buyer**: buyer@test.com / password  
- **Seller**: seller@test.com / password

## Troubleshooting

### "Invalid login credentials" error
- Verify the auth users were created in Supabase Dashboard
- Check that you're using the correct password: `password`
- Ensure "Auto Confirm User" was checked when creating users

### Profile not loading after login
- Verify the database profile IDs match the auth user IDs
- Check that the migration ran successfully
- Look for RLS policy errors in browser console

### Admin features not working
- Ensure the admin user's role is set to 'admin' in the database
- Verify the admin profile is properly linked to the auth user
- Check that admin policies are working in the database

## Security Note

**Important**: These are test accounts for development only. In production:
- Use strong, unique passwords
- Remove or disable test accounts
- Implement proper user registration flows
- Follow security best practices

## Quick Verification

To verify everything is working:

1. **Login Test**: Try logging in with each account
2. **Role Test**: Check that admin sees admin menu items
3. **Profile Test**: Verify user profiles load correctly
4. **Permission Test**: Test that users can only access their own data

If any step fails, double-check the auth user creation and database profile linking steps above.
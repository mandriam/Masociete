# MaSociété.info - Madagascar Marketplace

A modern marketplace platform built for Madagascar, connecting local buyers and sellers with support for mobile money payments and international payment methods.

## Features

### 🛍️ Marketplace Core
- **Product Management**: Full CRUD operations for products
- **User Roles**: Buyers, Sellers, and Administrators
- **Categories**: Hierarchical product categorization
- **Search & Filters**: Advanced product discovery
- **Favorites**: Save products for later
- **Shopping Cart**: Full cart management

### 💳 Payment Integration
- **Mobile Money**: MVola, Orange Money, Airtel Money
- **International**: Stripe for credit/debit cards
- **Multi-currency**: MGA, EUR, USD support

### 🔐 Authentication & Security
- **Supabase Auth**: Secure authentication system
- **Row Level Security**: Database-level security
- **Role-based Access**: Different permissions per user type

### 📱 Modern UI/UX
- **Responsive Design**: Mobile-first approach
- **Tailwind CSS**: Modern styling framework
- **React Router**: Client-side routing
- **TypeScript**: Type-safe development

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Router DOM** for navigation

### Backend & Database
- **Supabase** (PostgreSQL with real-time features)
- **Row Level Security** for data protection
- **Supabase Auth** for user management
- **Real-time subscriptions** for live updates

### Payment Processing
- **Stripe** for international payments
- **Mobile Money APIs** for local payments
- **Multi-currency support**

## Database Schema

### Core Tables
- `users` - User accounts and profiles
- `products` - Product listings
- `categories` - Product categories
- `orders` - Order management
- `order_items` - Order line items
- `favorites` - User favorites

### Key Features
- **Full-text search** on products
- **Hierarchical categories**
- **Multi-currency pricing**
- **Image storage support**
- **Audit trails** with timestamps

## Getting Started

### Prerequisites
- Node.js 18+ 
- Supabase account
- Stripe account (for payments)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd masociete-marketplace
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Fill in your Supabase and Stripe credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

4. **Set up the database**
- Create a new Supabase project
- Run the migration file in the Supabase SQL editor
- Enable Row Level Security policies

5. **Start the development server**
```bash
npm run dev
```

## Database Setup

### Supabase Configuration

1. **Create a new Supabase project**
2. **Run the migration**:
   - Go to the SQL Editor in your Supabase dashboard
   - Copy and paste the content from `supabase/migrations/create_initial_schema.sql`
   - Execute the migration

3. **Configure Authentication**:
   - Enable email/password authentication
   - Set up email templates (optional)
   - Configure redirect URLs

### Row Level Security

The database uses RLS policies to ensure:
- Users can only access their own data
- Sellers can only manage their own products
- Buyers can only see their own orders
- Public access to active products and categories

## API Services

### User Service
- Profile management
- User creation and updates
- Role-based access control

### Product Service
- CRUD operations for products
- Advanced filtering and search
- Featured products management
- Seller-specific product management

### Order Service
- Order creation and management
- Order status updates
- Buyer and seller order views
- Payment integration

### Category Service
- Category management
- Hierarchical structure support

### Favorites Service
- Add/remove favorites
- User favorites listing
- Favorite status checking

## Payment Integration

### Mobile Money (Madagascar)
- **MVola**: Telma's mobile money service
- **Orange Money**: Orange Madagascar's payment solution
- **Airtel Money**: Airtel's mobile payment platform

### International Payments
- **Stripe**: Credit/debit card processing
- **Multi-currency**: Support for MGA, EUR, USD

### Implementation Notes
- Payment methods are configured per order
- Support for both one-time and recurring payments
- Webhook integration for payment status updates

## Development

### Project Structure
```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth, Cart)
├── hooks/              # Custom React hooks
├── lib/                # Third-party library configurations
├── pages/              # Page components
├── services/           # API service functions
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### Key Hooks
- `useAuth()` - Authentication state and methods
- `useCart()` - Shopping cart management
- `useProducts()` - Product data fetching
- `useOrders()` - Order management

### Database Hooks
- `useProducts(filters)` - Filtered product listing
- `useFeaturedProducts()` - Featured products
- `useUserOrders()` - User's order history
- `useSellerOrders()` - Seller's order management

## Deployment

### Frontend Deployment
The application can be deployed to:
- **Vercel** (recommended)
- **Netlify**
- **AWS Amplify**
- Any static hosting service

### Database
- **Supabase** handles all backend infrastructure
- Automatic scaling and backups
- Real-time capabilities
- Built-in authentication

### Environment Variables
Ensure all production environment variables are set:
- Supabase credentials
- Stripe API keys
- Mobile money API credentials

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Email: contact@masociete.info
- Documentation: [Link to docs]
- Issues: [GitHub Issues]

---

Built with ❤️ for Madagascar's digital economy.
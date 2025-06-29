import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign,
  Plus,
  Eye,
  Edit,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  Users,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { productService, orderService } from '../../services/database';

interface SellerStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  averageRating: number;
}

interface RecentProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  status: string;
  stock: number;
  created_at: string;
}

interface RecentOrder {
  id: string;
  total: number;
  currency: string;
  status: string;
  created_at: string;
  buyer_name: string;
}

const SellerDashboard: React.FC = () => {
  const { profile, user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataFetched, setDataFetched] = useState(false);

  useEffect(() => {
    // Only fetch data once when we have the required auth state
    if (!authLoading && user && profile?.role === 'seller' && !dataFetched) {
      console.log('🔄 SellerDashboard: Starting data fetch for seller:', user.email);
      fetchDashboardData();
    }
  }, [user, profile, authLoading, dataFetched]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDataFetched(true); // Mark as fetched to prevent re-fetching

      console.log('📊 Fetching seller dashboard data for user:', user!.id);

      // Fetch seller's products with error handling
      let products: any[] = [];
      try {
        console.log('📦 Fetching products...');
        products = await productService.getAllProducts({ sellerId: user!.id });
        console.log('✅ Products fetched:', products?.length || 0);
      } catch (productError) {
        console.error('❌ Error fetching products:', productError);
        // Continue with empty products array
        products = [];
      }
      
      // Fetch seller's orders with error handling
      let orders: any[] = [];
      try {
        console.log('🛒 Fetching orders...');
        orders = await orderService.getSellerOrders(user!.id);
        console.log('✅ Orders fetched:', orders?.length || 0);
      } catch (orderError) {
        console.error('❌ Error fetching orders:', orderError);
        // Continue with empty orders array
        orders = [];
      }

      // Calculate stats safely
      const totalProducts = products?.length || 0;
      const activeProducts = products?.filter(p => p.status === 'active').length || 0;
      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const totalRevenue = orders?.reduce((sum, order) => {
        if (['paid', 'shipped', 'delivered'].includes(order.status)) {
          return sum + (order.total || 0);
        }
        return sum;
      }, 0) || 0;

      console.log('📈 Calculated stats:', {
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        totalRevenue
      });

      setStats({
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        totalRevenue,
        averageRating: 4.5 // Mock rating for now
      });

      // Set recent products (last 5) safely
      setRecentProducts(products?.slice(0, 5) || []);

      // Set recent orders (last 5) safely
      setRecentOrders(orders?.slice(0, 5) || []);

      console.log('✅ Dashboard data loaded successfully');

    } catch (err: any) {
      console.error('❌ Error fetching dashboard data:', err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: currency === 'MGA' ? 'MGA' : 'EUR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'sold': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'inactive': return 'Inactif';
      case 'sold': return 'Vendu';
      case 'pending': return 'En attente';
      case 'paid': return 'Payé';
      case 'shipped': return 'Expédié';
      case 'delivered': return 'Livré';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connexion requise</h1>
          <p className="text-gray-600">Vous devez être connecté pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  // Show access denied if not seller
  if (profile && profile.role !== 'seller') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">
            Vous devez être un vendeur pour accéder à cette page.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Rôle actuel: {profile?.role || 'Non défini'}
          </p>
        </div>
      </div>
    );
  }

  // Show loading while profile is being loaded
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du profil utilisateur...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => {
              setDataFetched(false);
              fetchDashboardData();
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Produits totaux',
      value: stats?.totalProducts || 0,
      icon: Package,
      color: 'bg-blue-500',
      change: '+2 ce mois',
      changeType: 'positive'
    },
    {
      title: 'Produits actifs',
      value: stats?.activeProducts || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: `${stats?.activeProducts}/${stats?.totalProducts}`,
      changeType: 'neutral'
    },
    {
      title: 'Commandes totales',
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'bg-purple-500',
      change: '+5 cette semaine',
      changeType: 'positive'
    },
    {
      title: 'Revenus totaux',
      value: formatPrice(stats?.totalRevenue || 0, 'MGA'),
      icon: DollarSign,
      color: 'bg-yellow-500',
      change: '+15% ce mois',
      changeType: 'positive'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tableau de bord vendeur</h1>
              <p className="text-gray-600 mt-2">
                Bienvenue, {profile?.name}. Gérez vos produits et suivez vos ventes.
              </p>
            </div>
            <Link
              to="/seller/add-product"
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Ajouter un produit
            </Link>
          </div>
          
          {/* Success indicator */}
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-green-800 text-sm">
                ✅ Compte vendeur actif - Profil vérifié: {profile?.verified ? 'Oui' : 'Non'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {typeof card.value === 'string' ? card.value : card.value.toLocaleString()}
                  </p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-gray-600">{card.change}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              to="/seller/add-product"
              className="flex items-center justify-center px-4 py-3 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Ajouter un produit
            </Link>
            <Link 
              to="/seller/products"
              className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Package className="h-5 w-5 mr-2" />
              Gérer les produits
            </Link>
            <Link 
              to="/seller/orders"
              className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Voir les commandes
            </Link>
            <button className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
              <BarChart3 className="h-5 w-5 mr-2" />
              Voir les statistiques
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Products */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Produits récents</h3>
              <Link 
                to="/seller/products"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Voir tout
              </Link>
            </div>
            <div className="space-y-4">
              {recentProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun produit trouvé</p>
                  <Link 
                    to="/seller/add-product"
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    Ajouter votre premier produit
                  </Link>
                </div>
              ) : (
                recentProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 truncate">{product.title}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm font-semibold text-primary-600">
                          {formatPrice(product.price, product.currency)}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(product.status)}`}>
                          {getStatusText(product.status)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Stock: {product.stock}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(product.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Commandes récentes</h3>
              <Link 
                to="/seller/orders"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Voir tout
              </Link>
            </div>
            <div className="space-y-4">
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune commande trouvée</p>
                  <p className="text-sm">Les commandes apparaîtront ici</p>
                </div>
              ) : (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Commande #{order.id.substring(0, 8)}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm font-semibold text-primary-600">
                          {formatPrice(order.total, order.currency)}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">{order.buyer_name}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aperçu des performances</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats?.averageRating || 0}/5</div>
              <div className="text-sm text-gray-600">Note moyenne</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats?.pendingOrders || 0}</div>
              <div className="text-sm text-gray-600">Commandes en attente</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">95%</div>
              <div className="text-sm text-gray-600">Taux de satisfaction</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
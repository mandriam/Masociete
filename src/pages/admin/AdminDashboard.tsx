import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  RefreshCw,
  Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface MarketplaceStats {
  total_users: number;
  total_buyers: number;
  total_sellers: number;
  total_admins: number;
  total_products: number;
  active_products: number;
  total_orders: number;
  pending_orders: number;
  total_revenue: number;
  total_categories: number;
}

const AdminDashboard: React.FC = () => {
  const { profile, user, isLoading: authLoading, refreshProfile } = useAuth();
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [profileRetryCount, setProfileRetryCount] = useState(0);

  useEffect(() => {
    // Debug current auth state
    const currentDebugInfo = {
      user: user?.email,
      userId: user?.id,
      profile: profile,
      profileRole: profile?.role,
      authLoading,
      timestamp: new Date().toISOString(),
      profileRetryCount
    };
    
    console.log('🔍 AdminDashboard - Auth State:', currentDebugInfo);
    setDebugInfo(currentDebugInfo);

    if (!authLoading && user) {
      // If we have a user but no profile, try to refresh it
      if (!profile && profileRetryCount < 3) {
        console.log('🔄 No profile found, attempting refresh...');
        setProfileRetryCount(prev => prev + 1);
        refreshProfile();
      } else if (profile || profileRetryCount >= 3) {
        // Either we have a profile or we've tried enough times
        fetchStats();
      }
    }
  }, [user, profile, authLoading, profileRetryCount]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Fetching marketplace stats...');
      const { data, error: statsError } = await supabase.rpc('get_marketplace_stats');
      
      if (statsError) {
        console.error('❌ Stats error:', statsError);
        throw statsError;
      }
      
      console.log('✅ Stats loaded:', data);
      setStats(data);
    } catch (err: any) {
      console.error('❌ Error fetching stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshProfile = async () => {
    setProfileRetryCount(0);
    await refreshProfile();
  };

  const handleEnsureAdminUser = async () => {
    if (!user?.email) return;
    
    try {
      console.log('🔧 Ensuring admin user exists...');
      const { data, error } = await supabase.rpc('ensure_admin_user', {
        user_email: user.email,
        user_name: 'Administrateur MaSociété'
      });
      
      if (error) {
        console.error('❌ Error ensuring admin user:', error);
        alert('Erreur lors de la création du profil admin: ' + error.message);
      } else {
        console.log('✅ Admin user ensured:', data);
        await refreshProfile();
        alert('Profil admin créé/mis à jour avec succès!');
      }
    } catch (err: any) {
      console.error('❌ Exception ensuring admin user:', err);
      alert('Erreur: ' + err.message);
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

  // Check admin access - be more flexible about profile loading
  const isAdmin = profile?.role === 'admin';
  const profileLoaded = profile !== null;
  
  // If profile isn't loaded yet and we haven't exhausted retries, show loading
  if (!profileLoaded && profileRetryCount < 3) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">Chargement du profil utilisateur...</p>
          <p className="text-sm text-gray-500 mb-6">Tentative {profileRetryCount + 1}/3</p>
          
          {/* Manual refresh button */}
          <button 
            onClick={handleRefreshProfile}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 mb-4 flex items-center mx-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser le profil
          </button>
          
          {/* Debug info */}
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <h3 className="font-medium text-gray-900 mb-2">Debug Info</h3>
            <pre className="text-xs text-gray-600 text-left overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // If profile loading failed and user is admin email, offer to create admin profile
  if (!profileLoaded && user.email === 'admin@masociete.info') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <Settings className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuration Admin</h1>
          <p className="text-gray-600 mb-6">
            Profil administrateur non trouvé. Cliquez ci-dessous pour créer votre profil admin.
          </p>
          
          <button 
            onClick={handleEnsureAdminUser}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 mb-4 flex items-center mx-auto"
          >
            <Settings className="h-5 w-5 mr-2" />
            Créer le profil admin
          </button>
          
          <button 
            onClick={handleRefreshProfile}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 mb-4 flex items-center mx-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser le profil
          </button>
          
          {/* Debug info */}
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <h3 className="font-medium text-gray-900 mb-2">Debug Info</h3>
            <pre className="text-xs text-gray-600 text-left overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (profileLoaded && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600 mb-4">
            Vous n'avez pas les permissions pour accéder à cette page.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Rôle actuel: {profile?.role || 'Non défini'}
          </p>
          
          {/* If this is the admin email but wrong role, offer to fix it */}
          {user.email === 'admin@masociete.info' && (
            <button 
              onClick={handleEnsureAdminUser}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 mb-4 flex items-center mx-auto"
            >
              <Settings className="h-4 w-4 mr-2" />
              Corriger le rôle admin
            </button>
          )}
          
          {/* Debug info for non-admin users */}
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <h3 className="font-medium text-gray-900 mb-2">Debug Info</h3>
            <pre className="text-xs text-gray-600 text-left overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des statistiques...</p>
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
            onClick={fetchStats}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center mx-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const statCards = [
    {
      title: 'Utilisateurs totaux',
      value: stats?.total_users || 0,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Produits actifs',
      value: stats?.active_products || 0,
      icon: Package,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: 'Commandes totales',
      value: stats?.total_orders || 0,
      icon: ShoppingCart,
      color: 'bg-purple-500',
      change: '+15%',
      changeType: 'positive'
    },
    {
      title: 'Revenus totaux',
      value: formatCurrency(stats?.total_revenue || 0),
      icon: DollarSign,
      color: 'bg-yellow-500',
      change: '+23%',
      changeType: 'positive'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tableau de bord administrateur</h1>
          <p className="text-gray-600 mt-2">
            Bienvenue, {profile?.name}. Voici un aperçu de votre marketplace.
          </p>
          
          {/* Success indicator */}
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-green-800 text-sm">
                  ✅ Accès administrateur confirmé - Rôle: {profile?.role}
                </span>
              </div>
              <button 
                onClick={handleRefreshProfile}
                className="text-green-600 hover:text-green-800 text-sm flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualiser
              </button>
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
                <span className="text-sm text-green-600 font-medium">{card.change}</span>
                <span className="text-sm text-gray-500 ml-1">vs mois dernier</span>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* User Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des utilisateurs</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">Acheteurs</span>
                </div>
                <span className="font-semibold">{stats?.total_buyers || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">Vendeurs</span>
                </div>
                <span className="font-semibold">{stats?.total_sellers || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">Administrateurs</span>
                </div>
                <span className="font-semibold">{stats?.total_admins || 0}</span>
              </div>
            </div>
          </div>

          {/* Order Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">État des commandes</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-yellow-500 mr-3" />
                  <span className="text-gray-700">En attente</span>
                </div>
                <span className="font-semibold">{stats?.pending_orders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Traitées</span>
                </div>
                <span className="font-semibold">
                  {(stats?.total_orders || 0) - (stats?.pending_orders || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 text-blue-500 mr-3" />
                  <span className="text-gray-700">Total</span>
                </div>
                <span className="font-semibold">{stats?.total_orders || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a 
              href="/admin/users"
              className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Users className="h-5 w-5 mr-2" />
              Gérer les utilisateurs
            </a>
            <a 
              href="/admin/products"
              className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Package className="h-5 w-5 mr-2" />
              Gérer les produits
            </a>
            <button className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Gérer les commandes
            </button>
            <button className="flex items-center justify-center px-4 py-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">
              <BarChart3 className="h-5 w-5 mr-2" />
              Voir les rapports
            </button>
          </div>
        </div>

        {/* Debug Section (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-gray-100 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Debug Information</h3>
            <pre className="text-xs text-gray-600 overflow-auto">
              {JSON.stringify({ debugInfo, stats }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
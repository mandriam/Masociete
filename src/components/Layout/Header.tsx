import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X, Store, Heart, Settings, MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useUnreadMessageCount } from '../../hooks/useMessages';

const Header: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const { getTotalItems } = useCart();
  const { count: unreadCount } = useUnreadMessageCount();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      console.log('🚫 Logout already in progress, ignoring click');
      return;
    }
    
    setIsLoggingOut(true);
    console.log('🚪 Header: Starting logout process for user:', user?.email);
    
    try {
      // Close mobile menu immediately
      setIsMenuOpen(false);
      
      // Show immediate feedback
      console.log('🔄 Header: Calling logout function...');
      const result = await logout();
      
      console.log('📋 Header: Logout result:', result);
      
      // The logout function will handle the redirect and page reload
      // No need to do anything else here as the page will reload
      
    } catch (error) {
      console.error('❌ Header: Logout error:', error);
      // Force reload even on error
      window.location.href = '/';
    } finally {
      // This might not execute due to page reload, but just in case
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Store className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">MaSociété</span>
            <span className="text-sm text-gray-500 hidden sm:inline">.info</span>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher des produits..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </form>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <Link to="/favorites" className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors">
                  <Heart className="h-5 w-5" />
                  <span>Favoris</span>
                </Link>
                
                <Link to="/cart" className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 relative transition-colors">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Panier</span>
                  {getTotalItems() > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {getTotalItems()}
                    </span>
                  )}
                </Link>

                {/* Messages */}
                <Link to="/messages" className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 relative transition-colors">
                  <MessageCircle className="h-5 w-5" />
                  <span>Messages</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                {profile?.role === 'seller' && (
                  <Link to="/seller/dashboard" className="text-gray-700 hover:text-primary-600 transition-colors">
                    Tableau de bord
                  </Link>
                )}

                <div className="relative group">
                  <button className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors">
                    <User className="h-5 w-5" />
                    <span>{profile?.name || user?.email || 'Utilisateur'}</span>
                    {isLoggingOut && (
                      <div className="ml-2 w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </button>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-50">
                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                      Mon profil
                    </Link>
                    <Link to="/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                      Mes commandes
                    </Link>
                    <Link to="/messages" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <span>Messages</span>
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </Link>
                    {profile?.role === 'seller' && (
                      <>
                        <div className="border-t border-gray-100 my-1"></div>
                        <Link to="/seller/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                          Tableau de bord vendeur
                        </Link>
                        <Link to="/seller/products" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                          Mes produits
                        </Link>
                        <Link to="/seller/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                          Mes commandes
                        </Link>
                        <Link to="/seller/add-product" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                          Ajouter un produit
                        </Link>
                      </>
                    )}
                    {profile?.role === 'admin' && (
                      <>
                        <div className="border-t border-gray-100 my-1"></div>
                        <Link to="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center">
                            <Settings className="h-4 w-4 mr-2" />
                            Administration
                          </div>
                        </Link>
                        <Link to="/admin/users" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                          Gestion utilisateurs
                        </Link>
                        <Link to="/admin/products" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                          Gestion produits
                        </Link>
                        <Link to="/admin/categories" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                          Gestion catégories
                        </Link>
                      </>
                    )}
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoggingOut ? (
                        <div className="flex items-center">
                          <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                          Déconnexion...
                        </div>
                      ) : (
                        'Déconnexion'
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-primary-600 transition-colors">
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-primary-600 transition-colors"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-2 space-y-2">
            {user ? (
              <>
                <Link to="/favorites" className="block py-2 text-gray-700 hover:text-primary-600 transition-colors">Favoris</Link>
                <Link to="/cart" className="block py-2 text-gray-700 hover:text-primary-600 transition-colors">Panier ({getTotalItems()})</Link>
                <Link to="/messages" className="block py-2 text-gray-700 hover:text-primary-600 transition-colors">
                  Messages {unreadCount > 0 && `(${unreadCount})`}
                </Link>
                {profile?.role === 'seller' && (
                  <>
                    <Link to="/seller/dashboard" className="block py-2 text-gray-700 hover:text-primary-600 transition-colors">Tableau de bord</Link>
                    <Link to="/seller/products" className="block py-2 text-gray-700 hover:text-primary-600 transition-colors">Mes produits</Link>
                    <Link to="/seller/orders" className="block py-2 text-gray-700 hover:text-primary-600 transition-colors">Mes commandes</Link>
                    <Link to="/seller/add-product" className="block py-2 text-gray-700 hover:text-primary-600 transition-colors">Ajouter un produit</Link>
                  </>
                )}
                <Link to="/profile" className="block py-2 text-gray-700 hover:text-primary-600 transition-colors">Mon profil</Link>
                <Link to="/orders" className="block py-2 text-gray-700 hover:text-primary-600 transition-colors">Mes commandes</Link>
                {profile?.role === 'admin' && (
                  <>
                    <Link to="/admin" className="block py-2 text-gray-700 hover:text-primary-600 transition-colors">Administration</Link>
                    <Link to="/admin/users" className="block py-2 text-gray-700 hover:text-primary-600 transition-colors">Gestion utilisateurs</Link>
                    <Link to="/admin/products" className="block py-2 text-gray-700 hover:text-primary-600 transition-colors">Gestion produits</Link>
                    <Link to="/admin/categories" className="block py-2 text-gray-700 hover:text-primary-600 transition-colors">Gestion catégories</Link>
                  </>
                )}
                <button 
                  onClick={handleLogout} 
                  disabled={isLoggingOut}
                  className="block w-full text-left py-2 text-gray-700 hover:text-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingOut ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Déconnexion...
                    </div>
                  ) : (
                    'Déconnexion'
                  )}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block py-2 text-gray-700 hover:text-primary-600 transition-colors">Connexion</Link>
                <Link to="/register" className="block py-2 text-gray-700 hover:text-primary-600 transition-colors">S'inscrire</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
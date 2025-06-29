import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Shield, Truck, Users, Search, Tag, TrendingUp, AlertCircle } from 'lucide-react';
import { categoryService } from '../services/database';
import { isSupabaseConfigured, getSupabaseConfigStatus } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  product_count?: number;
}

const Home: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        const configStatus = getSupabaseConfigStatus();
        let errorMessage = 'Supabase configuration is incomplete:\n';
        
        if (!configStatus.hasUrl) {
          errorMessage += '- Missing VITE_SUPABASE_URL\n';
        }
        if (!configStatus.hasKey) {
          errorMessage += '- Missing VITE_SUPABASE_ANON_KEY\n';
        }
        if (configStatus.hasUrl && !configStatus.urlValid) {
          errorMessage += '- VITE_SUPABASE_URL should start with https://\n';
        }
        
        errorMessage += '\nPlease check your .env file and restart the development server.';
        setError(errorMessage);
        return;
      }
      
      // Use the new method that includes product counts
      const data = await categoryService.getCategoriesWithProductCounts();
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Shield,
      title: 'Sécurisé',
      description: 'Transactions protégées et vendeurs vérifiés'
    },
    {
      icon: Truck,
      title: 'Livraison rapide',
      description: 'Livraison dans toute l\'île de Madagascar'
    },
    {
      icon: Users,
      title: 'Communauté locale',
      description: 'Soutenez les entreprises malgaches'
    }
  ];

  const getColorClass = (index: number) => {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-pink-100 text-pink-600',
      'bg-green-100 text-green-600',
      'bg-red-100 text-red-600',
      'bg-orange-100 text-orange-600',
      'bg-yellow-100 text-yellow-600',
      'bg-purple-100 text-purple-600',
      'bg-indigo-100 text-indigo-600',
      'bg-teal-100 text-teal-600',
      'bg-gray-100 text-gray-600'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Votre marketplace
                <span className="block text-secondary-300">Madagascar</span>
              </h1>
              <p className="text-xl text-primary-100 leading-relaxed">
                Découvrez des milliers de produits locaux, soutenez les entrepreneurs malgaches 
                et profitez d'une expérience d'achat sécurisée.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  Découvrir les produits
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/seller/register"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-primary-600 transition-colors"
                >
                  Devenir vendeur
                </Link>
              </div>
              <div className="flex items-center space-x-8 text-primary-100">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">15K+</div>
                  <div className="text-sm">Produits</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">3K+</div>
                  <div className="text-sm">Vendeurs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">50K+</div>
                  <div className="text-sm">Clients satisfaits</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <img
                  src="https://images.pexels.com/photos/5632371/pexels-photo-5632371.jpeg"
                  alt="Shopping à Madagascar"
                  className="rounded-lg shadow-2xl w-full h-80 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-center mb-6">Que recherchez-vous ?</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher des produits, marques, catégories..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <button className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                Rechercher
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Toutes nos catégories</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Explorez toutes nos catégories et trouvez exactement ce que vous cherchez
            </p>
          </div>
          
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
              <div className="flex items-start">
                <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-red-800 mb-2">Configuration Error</h3>
                  <pre className="text-sm text-red-700 whitespace-pre-wrap font-mono bg-red-100 p-3 rounded">
                    {error}
                  </pre>
                  <div className="mt-4">
                    <p className="text-sm text-red-700 mb-2">
                      To fix this issue:
                    </p>
                    <ol className="text-sm text-red-700 list-decimal list-inside space-y-1">
                      <li>Copy the <code className="bg-red-100 px-1 rounded">.env.example</code> file to <code className="bg-red-100 px-1 rounded">.env</code></li>
                      <li>Get your Supabase URL and API key from your Supabase project dashboard</li>
                      <li>Replace the placeholder values in the <code className="bg-red-100 px-1 rounded">.env</code> file</li>
                      <li>Restart the development server</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {[...Array(10)].map((_, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto"></div>
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Tag className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune catégorie disponible</h3>
              <p className="text-gray-600">Les catégories seront bientôt disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {categories.map((category, index) => (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className="group"
                >
                  <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group-hover:scale-105 text-center">
                    <div className={`w-16 h-16 ${getColorClass(index)} rounded-full flex items-center justify-center text-2xl mx-auto mb-4`}>
                      {category.icon}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                    <p className="text-sm text-gray-500">
                      {category.product_count || 0} produit{(category.product_count || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Pourquoi choisir MaSociété ?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Une plateforme conçue pour répondre aux besoins spécifiques du marché malgache
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-8 w-8 mb-2" />
              </div>
              <div className="text-3xl font-bold">98%</div>
              <div className="text-primary-200">Satisfaction client</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <Star className="h-8 w-8 mb-2" />
              </div>
              <div className="text-3xl font-bold">4.8/5</div>
              <div className="text-primary-200">Note moyenne</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <Tag className="h-8 w-8 mb-2" />
              </div>
              <div className="text-3xl font-bold">24h</div>
              <div className="text-primary-200">Livraison express</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <Shield className="h-8 w-8 mb-2" />
              </div>
              <div className="text-3xl font-bold">100%</div>
              <div className="text-primary-200">Paiement sécurisé</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Prêt à commencer votre aventure ?
          </h2>
          <p className="text-gray-600 mb-8 text-lg">
            Rejoignez notre communauté grandissante d'acheteurs et vendeurs à Madagascar
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-4 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              Créer un compte
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-primary-600 text-primary-600 font-semibold rounded-lg hover:bg-primary-50 transition-colors"
            >
              Explorer maintenant
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
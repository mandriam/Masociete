import React, { useState } from 'react';
import { Search, Filter, Grid, List, Star, Heart, ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { Product } from '../types';

const Products: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [filterCategory, setFilterCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const { addToCart } = useCart();

  // Mock products data
  const mockProducts: Product[] = [
    {
      id: '1',
      title: 'Samsung Galaxy A54 5G',
      description: 'Smartphone dernière génération avec appareil photo 50MP',
      price: 850000,
      currency: 'MGA',
      images: ['https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg'],
      category: 'Électronique',
      condition: 'new',
      location: 'Antananarivo',
      sellerId: '1',
      seller: {
        id: '1',
        name: 'TechStore Madagascar',
        email: 'tech@store.mg',
        role: 'seller',
        verified: true,
        createdAt: '2024-01-01'
      },
      stock: 15,
      featured: true,
      status: 'active',
      createdAt: '2024-12-01',
      updatedAt: '2024-12-01'
    },
    {
      id: '2',
      title: 'Robe traditionnelle Lamba',
      description: 'Robe traditionnelle malgache en soie naturelle',
      price: 120000,
      currency: 'MGA',
      images: ['https://images.pexels.com/photos/9558618/pexels-photo-9558618.jpeg'],
      category: 'Mode & Vêtements',
      condition: 'new',
      location: 'Fianarantsoa',
      sellerId: '2',
      seller: {
        id: '2',
        name: 'Artisan Malagasy',
        email: 'artisan@mg.com',
        role: 'seller',
        verified: true,
        createdAt: '2024-01-01'
      },
      stock: 8,
      featured: false,
      status: 'active',
      createdAt: '2024-12-01',
      updatedAt: '2024-12-01'
    },
    {
      id: '3',
      title: 'Vélo VTT 26 pouces',
      description: 'Vélo tout terrain en parfait état, idéal pour la ville',
      price: 350000,
      currency: 'MGA',
      images: ['https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg'],
      category: 'Sport & Loisirs',
      condition: 'used',
      location: 'Toamasina',
      sellerId: '3',
      seller: {
        id: '3',
        name: 'Sport Madagascar',
        email: 'sport@mg.com',
        role: 'seller',
        verified: true,
        createdAt: '2024-01-01'
      },
      stock: 3,
      featured: false,
      status: 'active',
      createdAt: '2024-12-01',
      updatedAt: '2024-12-01'
    }
  ];

  const [products] = useState(mockProducts);
  const [favorites, setFavorites] = useState<string[]>([]);

  const categories = ['all', 'Électronique', 'Mode & Vêtements', 'Sport & Loisirs', 'Maison & Jardin', 'Automobile'];

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: currency === 'MGA' ? 'MGA' : 'EUR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const filteredProducts = products.filter(product => {
    if (filterCategory !== 'all' && product.category !== filterCategory) return false;
    if (product.price < priceRange[0] || product.price > priceRange[1]) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Tous les produits</h1>
        <p className="text-gray-600">Découvrez {products.length} produits disponibles sur notre marketplace</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher des produits..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'Toutes les catégories' : category}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="newest">Plus récent</option>
              <option value="price_low">Prix croissant</option>
              <option value="price_high">Prix décroissant</option>
              <option value="popular">Plus populaire</option>
            </select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {filteredProducts.length} produit(s) trouvé(s)
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className={viewMode === 'grid' 
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
        : 'space-y-6'
      }>
        {filteredProducts.map(product => (
          <div key={product.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${
            viewMode === 'list' ? 'flex' : ''
          }`}>
            <div className={viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}>
              <div className="relative">
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className={`w-full object-cover ${viewMode === 'list' ? 'h-48' : 'h-64'}`}
                />
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
                >
                  <Heart className={`h-5 w-5 ${favorites.includes(product.id) ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
                </button>
                {product.featured && (
                  <div className="absolute top-3 left-3 bg-primary-600 text-white px-2 py-1 rounded-md text-xs font-medium">
                    Recommandé
                  </div>
                )}
                {product.condition === 'new' && (
                  <div className="absolute bottom-3 left-3 bg-green-600 text-white px-2 py-1 rounded-md text-xs font-medium">
                    Neuf
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 flex-1">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{product.title}</h3>
                <div className="flex items-center ml-2">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-600 ml-1">4.5</span>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>

              <div className="flex items-center justify-between mb-3">
                <div className="text-2xl font-bold text-primary-600">
                  {formatPrice(product.price, product.currency)}
                </div>
                <div className="text-sm text-gray-500">
                  Stock: {product.stock}
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center text-sm text-gray-500">
                  <span className="truncate">{product.location}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="truncate">{product.seller.name}</span>
                  {product.seller.verified && (
                    <div className="ml-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => addToCart(product)}
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>Ajouter au panier</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit trouvé</h3>
          <p className="text-gray-600">Essayez de modifier vos critères de recherche</p>
        </div>
      )}
    </div>
  );
};

export default Products;
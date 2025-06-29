/**
 * Category Page
 * 
 * Displays products within a specific category.
 * Includes filtering by subcategory, price range, and sorting options.
 * Provides grid and list view options for product display.
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Grid, List, Star, Heart, ShoppingCart, MapPin, Filter, SortAsc } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { productService, categoryService } from '../services/database';
import { Product } from '../types';

const Category: React.FC = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Store all products for filtering
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest'); // Default to newest first
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [maxPrice, setMaxPrice] = useState<number>(1000000); // Dynamic max price
  const [favorites, setFavorites] = useState<string[]>([]);
  const [displayLimit, setDisplayLimit] = useState<number>(10); // Start with 10 products

  // Scroll to top when component mounts or category changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [categorySlug]);

  // Check for subcategory in URL params
  useEffect(() => {
    const subcategoryId = searchParams.get('subcategory');
    if (subcategoryId) {
      setSelectedSubcategory(subcategoryId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (categorySlug) {
      fetchCategoryData();
    }
  }, [categorySlug]);

  // Separate effect for filtering and sorting
  useEffect(() => {
    applyFiltersAndSort();
  }, [allProducts, selectedSubcategory, priceRange, sortBy]);

  // Separate effect for display limiting
  useEffect(() => {
    applyDisplayLimit();
  }, [filteredProducts, displayLimit]);

  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching data for category slug:', categorySlug);
      
      // Get all categories with subcategories to find the one matching the slug
      const categoriesData = await categoryService.getCategoriesWithSubcategories();
      const category = categoriesData?.find(cat => cat.slug === categorySlug);
      
      if (!category) {
        console.error('❌ Category not found for slug:', categorySlug);
        setLoading(false);
        return;
      }
      
      console.log('✅ Found category:', category.name, 'ID:', category.id);
      setCategoryInfo(category);
      
      // Extract unique subcategories and sort them alphabetically
      const uniqueSubcategories = Array.from(
        new Map(
          (category.subcategories || []).map((subcat: any) => [subcat.id, subcat])
        ).values()
      ).sort((a: any, b: any) => a.name.localeCompare(b.name));
      
      setSubcategories(uniqueSubcategories);
      
      // Fetch all products for this category using category ID
      console.log('📦 Fetching products for category ID:', category.id);
      const productsData = await productService.getAllProducts({ 
        categoryId: category.id 
      });
      
      console.log('📦 Products found:', productsData?.length || 0);
      
      // Store all products (already sorted by newest first from database)
      setAllProducts(productsData || []);
      
      // Initialize roundedMaxPrice with default value
      let roundedMaxPrice = 1000000;
      
      // Calculate dynamic max price from the products in this category
      if (productsData && productsData.length > 0) {
        const prices = productsData.map(p => p.price);
        const categoryMaxPrice = Math.max(...prices);
        roundedMaxPrice = Math.ceil(categoryMaxPrice / 100000) * 100000; // Round up to nearest 100k
        
        setMaxPrice(roundedMaxPrice);
        // Update price range to include all products by default
        setPriceRange([0, roundedMaxPrice]);
      } else {
        // No products found, keep default
        setMaxPrice(1000000);
        setPriceRange([0, 1000000]);
      }
      
      console.log('🏷️ Found unique subcategories:', uniqueSubcategories.length);
      
      // Reset display limit when category changes
      setDisplayLimit(10);
      
    } catch (error) {
      console.error('❌ Error fetching category data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...allProducts];

    console.log('🔧 Starting with products:', filtered.length);

    // Apply subcategory filter
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(product => product.subcategory_id === selectedSubcategory);
      console.log('🏷️ After subcategory filter:', filtered.length, 'for subcategory:', selectedSubcategory);
    }

    // Apply price range filter
    filtered = filtered.filter(product => {
      const inRange = product.price >= priceRange[0] && product.price <= priceRange[1];
      return inRange;
    });
    console.log('💰 After price filter:', filtered.length);

    // Apply sorting - prioritize newest first
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          // Sort by creation date, newest first (most recent dates have higher timestamps)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          // Sort by creation date, oldest first
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'price_low':
          return a.price - b.price;
        case 'price_high':
          return b.price - a.price;
        case 'popular':
          // Featured products first, then by creation date
          if (a.featured !== b.featured) {
            return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          // Default to newest first
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    console.log('📊 After filtering and sorting:', filtered.length);
    
    setFilteredProducts(filtered);
  };

  const applyDisplayLimit = () => {
    const limited = filteredProducts.slice(0, displayLimit);
    console.log('📺 Displaying:', limited.length, 'of', filteredProducts.length, 'filtered products');
    setProducts(limited);
  };

  const loadMoreProducts = () => {
    setDisplayLimit(prev => prev + 10);
  };

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: currency === 'MGA' ? 'MGA' : 'EUR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const resetFilters = () => {
    setSelectedSubcategory('all');
    setPriceRange([0, maxPrice]);
    setSortBy('newest'); // Reset to newest first
    setDisplayLimit(10);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la catégorie...</p>
        </div>
      </div>
    );
  }

  if (!categoryInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Catégorie non trouvée</h1>
          <p className="text-gray-600 mb-4">La catégorie demandée n'existe pas.</p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link to="/" className="hover:text-primary-600">Accueil</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{categoryInfo.name}</span>
          </nav>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <span className="text-4xl mr-3">{categoryInfo.icon}</span>
                {categoryInfo.name}
              </h1>
              <p className="text-gray-600">
                Affichage de {products.length} sur {filteredProducts.length} produit(s)
                {allProducts.length !== filteredProducts.length && ` (${allProducts.length} au total)`}
              </p>
              {sortBy === 'newest' && (
                <p className="text-sm text-primary-600 mt-1">
                  ✨ Triés par date d'ajout (plus récents en premier)
                </p>
              )}
            </div>
            <Link
              to="/"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour à l'accueil
            </Link>
          </div>
        </div>

        {/* Subcategories */}
        {subcategories.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sous-catégories</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSubcategory('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedSubcategory === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Toutes
              </button>
              {subcategories.map(subcategory => (
                <button
                  key={subcategory.id}
                  onClick={() => setSelectedSubcategory(subcategory.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedSubcategory === subcategory.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {subcategory.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fourchette de prix
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max={maxPrice}
                  step={Math.max(1000, Math.floor(maxPrice / 1000))}
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0 MGA</span>
                  <span>{formatPrice(priceRange[1], 'MGA')}</span>
                </div>
                <div className="text-xs text-gray-400">
                  Max: {formatPrice(maxPrice, 'MGA')}
                </div>
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trier par
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="newest">Plus récent d'abord</option>
                <option value="oldest">Plus ancien d'abord</option>
                <option value="price_low">Prix croissant</option>
                <option value="price_high">Prix décroissant</option>
                <option value="popular">Plus populaire</option>
              </select>
            </div>

            {/* View Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Affichage
              </label>
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

            {/* Results Count */}
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <p>{products.length} produit(s) affiché(s)</p>
                {filteredProducts.length > products.length && (
                  <p className="text-xs text-primary-600">
                    {filteredProducts.length - products.length} de plus disponibles
                  </p>
                )}
                {allProducts.length !== filteredProducts.length && (
                  <p className="text-xs text-gray-500">
                    {allProducts.length} au total
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid/List */}
        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Grid className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit trouvé</h3>
            <p className="text-gray-600 mb-4">
              {allProducts.length === 0 
                ? `Aucun produit disponible dans la catégorie "${categoryInfo.name}".`
                : 'Aucun produit ne correspond à vos critères dans cette catégorie.'
              }
            </p>
            {allProducts.length > 0 && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors mr-4"
              >
                Réinitialiser les filtres
              </button>
            )}
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Retour à l'accueil
            </Link>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
            : 'space-y-6'
          }>
            {products.map((product, index) => (
              <div key={product.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${
                viewMode === 'list' ? 'flex' : ''
              }`}>
                <div className={viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}>
                  <div className="relative">
                    <Link to={`/product/${product.id}`}>
                      <img
                        src={product.images[0] || 'https://images.pexels.com/photos/441923/pexels-photo-441923.jpeg'}
                        alt={product.title}
                        className={`w-full object-cover hover:scale-105 transition-transform ${viewMode === 'list' ? 'h-48' : 'h-64'}`}
                      />
                    </Link>
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
                    {/* Show position indicator for newest sort */}
                    {sortBy === 'newest' && index < 3 && (
                      <div className="absolute top-3 right-16 bg-blue-600 text-white px-2 py-1 rounded-md text-xs font-medium">
                        #{index + 1} Nouveau
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <Link to={`/product/${product.id}`}>
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 hover:text-primary-600 transition-colors">
                        {product.title}
                      </h3>
                    </Link>
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

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="truncate">{product.location}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(product.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="truncate">{product.seller?.name || 'Vendeur inconnu'}</span>
                      {product.seller?.verified && (
                        <div className="ml-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {product.subcategory && (
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {product.subcategory.name}
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Link
                      to={`/product/${product.id}`}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-center text-sm font-medium"
                    >
                      Voir détails
                    </Link>
                    <button
                      onClick={() => addToCart(product)}
                      className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-1 text-sm font-medium"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>Panier</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {products.length > 0 && filteredProducts.length > products.length && (
          <div className="mt-12 text-center">
            <button 
              onClick={loadMoreProducts}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Afficher 10 produits de plus ({filteredProducts.length - products.length} restants)
            </button>
          </div>
        )}

        {/* Show All Button (when many products remain) */}
        {products.length > 0 && filteredProducts.length > products.length && (filteredProducts.length - products.length) > 20 && (
          <div className="mt-4 text-center">
            <button 
              onClick={() => setDisplayLimit(filteredProducts.length)}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Afficher tous les {filteredProducts.length} produits
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Category;
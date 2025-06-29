import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Heart, 
  ShoppingCart, 
  Star, 
  MapPin, 
  Shield, 
  Truck,
  MessageCircle,
  Share2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Loader
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { productService, messageService, userService } from '../services/database';
import { Product } from '../types';
import { supabase } from '../lib/supabase';

const ProductDetail: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSeller, setLoadingSeller] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [contactingSeller, setContactingSeller] = useState(false);
  const [uniqueSubcategories, setUniqueSubcategories] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching product:', productId);
      const productData = await productService.getProduct(productId!);
      
      if (!productData) {
        throw new Error('Product not found');
      }
      
      console.log('✅ Product loaded:', productData);
      setProduct(productData);
      
      // Extract seller info from product data
      // Handle both array format and direct object format
      let seller = null;
      if (productData.seller) {
        if (Array.isArray(productData.seller) && productData.seller.length > 0) {
          seller = productData.seller[0];
        } else if (typeof productData.seller === 'object') {
          seller = productData.seller;
        }
      }
      
      // If seller info is not included or incomplete in the product data, fetch it separately
      if (productData.seller_id && (!seller || !seller.name)) {
        try {
          setLoadingSeller(true);
          console.log('🔍 Fetching seller info for ID:', productData.seller_id);
          const sellerData = await userService.getProfile(productData.seller_id);
          if (sellerData) {
            console.log('✅ Seller info loaded:', sellerData.name);
            setSellerInfo(sellerData);
          } else {
            console.warn('⚠️ No seller info found for ID:', productData.seller_id);
          }
        } catch (sellerError) {
          console.error('❌ Error fetching seller info:', sellerError);
          // We'll continue without seller info
        } finally {
          setLoadingSeller(false);
        }
      } else if (seller) {
        // If seller info is already included in the product data
        setSellerInfo(seller);
      }
      
      // Fetch related products with improved matching logic
      if (productData) {
        await fetchRelatedProducts(productData);
      }
      
    } catch (err: any) {
      console.error('❌ Error fetching product:', err);
      setError(err.message || 'Erreur lors du chargement du produit');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedProducts = async (currentProduct: Product) => {
    try {
      // Use the RPC function for related products
      const { data, error } = await supabase.rpc('get_related_products', {
        p_product_id: currentProduct.id,
        p_limit: 4
      });
      
      if (error) {
        console.error('❌ Error fetching related products:', error);
        
        // Strategy 1: Try to find products with exact category AND subcategory match
        let related: Product[] = [];
        
        if (currentProduct.subcategory_id) {
          console.log('📋 Step 1: Looking for exact category + subcategory match');
          
          // Get products with same subcategory
          const subcategoryProducts = await productService.getAllProducts({ 
            subcategoryId: currentProduct.subcategory_id 
          });
          
          // Filter out current product
          related = (subcategoryProducts || [])
            .filter(p => p.id !== currentProduct.id);
          
          console.log(`✅ Found ${related.length} products with exact subcategory match`);
        }
        
        // Strategy 2: If we don't have enough products (less than 4), add products from same category
        if (related.length < 4) {
          console.log('📋 Step 2: Adding products from same category to reach minimum 4');
          
          const categoryProducts = await productService.getAllProducts({ 
            categoryId: currentProduct.category_id 
          });
          
          // Add products from same category that aren't already included
          const additionalProducts = (categoryProducts || [])
            .filter(p => 
              p.id !== currentProduct.id && 
              !related.some(existing => existing.id === p.id)
            );
          
          // Prioritize products with subcategories, then those without
          const withSubcategory = additionalProducts.filter(p => p.subcategory_id);
          const withoutSubcategory = additionalProducts.filter(p => !p.subcategory_id);
          
          // Add products with subcategories first, then without
          related = [
            ...related,
            ...withSubcategory.slice(0, 4 - related.length),
            ...withoutSubcategory.slice(0, Math.max(0, 4 - related.length))
          ];
          
          console.log(`✅ Total after adding category products: ${related.length}`);
        }
        
        // Limit to maximum 4 products and sort by creation date (newest first)
        related = related
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 4);
        
        setRelatedProducts(related);
      } else {
        console.log('✅ Related products loaded via RPC:', data?.length || 0);
        setRelatedProducts(data || []);
      }
      
      // Extract unique subcategories from current product and related products
      const allProducts = [currentProduct, ...(data || [])];
      const subcategories = allProducts
        .filter(p => p.subcategory && p.subcategory.id && p.subcategory.name)
        .map(p => ({
          id: p.subcategory!.id,
          name: p.subcategory!.name
        }));
      
      // Filter unique subcategories by id and sort alphabetically by name
      const uniqueSubcats = Array.from(
        new Map(subcategories.map(item => [item.id, item])).values()
      ).sort((a, b) => a.name.localeCompare(b.name));
      
      setUniqueSubcategories(uniqueSubcats);
      
    } catch (error) {
      console.error('❌ Error fetching related products:', error);
      setRelatedProducts([]);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: currency === 'MGA' ? 'MGA' : 'EUR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      // Show success message or redirect
    }
  };

  const handleContactSeller = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!product?.seller_id) {
      console.error('❌ Product seller ID is missing');
      alert('Erreur: Informations du vendeur manquantes.');
      return;
    }

    if (user.id === product.seller_id) {
      console.warn('⚠️ User trying to contact themselves');
      return;
    }

    try {
      setContactingSeller(true);
      
      console.log('💬 === STARTING CONTACT SELLER PROCESS ===');
      console.log('📦 Product ID:', productId);
      console.log('📦 Product:', product.title);
      console.log('👤 Buyer ID:', user.id);
      console.log('👤 Seller ID:', product.seller_id);
      
      // Navigate to the messages page with product and seller parameters
      navigate(`/messages?product=${productId}&user=${product.seller_id}`);
      
    } catch (error: any) {
      console.error('❌ Error handling seller contact:', error);
      alert(error.message || 'Erreur lors de la création de la discussion');
    } finally {
      setContactingSeller(false);
    }
  };

  const nextImage = () => {
    if (product && product.images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === product.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (product && product.images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? product.images.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du produit...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Produit non trouvé</h1>
          <p className="text-gray-600 mb-4">{error || 'Ce produit n\'existe pas ou a été supprimé'}</p>
          <Link
            to="/products"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux produits
          </Link>
        </div>
      </div>
    );
  }

  // Check if user owns this product
  const isOwnProduct = user && product.seller_id && user.id === product.seller_id;
  
  // Get seller info either from product.seller or from separately fetched sellerInfo
  const seller = sellerInfo || (Array.isArray(product.seller) ? product.seller[0] : product.seller);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link to="/" className="hover:text-primary-600">Accueil</Link>
            <span>/</span>
            {product.category && (
              <Link to={`/category/${product.category.slug}`} className="hover:text-primary-600">
                {product.category.name}
              </Link>
            )}
            {product.subcategory && (
              <>
                <span>/</span>
                <span className="text-gray-500">{product.subcategory.name}</span>
              </>
            )}
            <span>/</span>
            <span className="text-gray-900 font-medium truncate">{product.title}</span>
          </nav>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Retour
          </button>
        </div>

        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Images */}
          <div>
            <div className="relative bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 mb-4">
              <img
                src={product.images[currentImageIndex] || 'https://images.pexels.com/photos/441923/pexels-photo-441923.jpeg'}
                alt={product.title}
                className="w-full h-96 object-cover"
              />
              
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  </button>
                </>
              )}

              {product.featured && (
                <div className="absolute top-4 left-4 bg-primary-600 text-white px-3 py-1 rounded-md text-sm font-medium">
                  Recommandé
                </div>
              )}

              {product.condition === 'new' && (
                <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-md text-sm font-medium">
                  Neuf
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {product.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === currentImageIndex ? 'border-primary-600' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  <Star className="h-5 w-5 text-gray-300" />
                  <span className="ml-2 text-sm text-gray-600">(4.0) • 12 avis</span>
                </div>
              </div>
              <div className="text-4xl font-bold text-primary-600 mb-4">
                {formatPrice(product.price, product.currency)}
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600">{product.location}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600">
                  État: {product.condition === 'new' ? 'Neuf' : 
                         product.condition === 'used' ? 'Occasion' : 'Reconditionné'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-600">Stock disponible: {product.stock}</span>
              </div>
            </div>

            {/* Quantity and Actions */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantité
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 border border-gray-300 rounded-lg min-w-[60px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="flex-1 bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>Ajouter au panier</span>
                </button>
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
                </button>
                <button className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Share2 className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Seller Info */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations vendeur</h3>
              
              {loadingSeller ? (
                <div className="flex items-center justify-center p-4">
                  <Loader className="h-6 w-6 text-primary-600 animate-spin mr-2" />
                  <span className="text-gray-600">Chargement des informations vendeur...</span>
                </div>
              ) : seller ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {seller.name && seller.name.length > 0 ? seller.name.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {seller.name || 'Nom non disponible'}
                        </span>
                        {seller.verified && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600">4.8 (156 avis)</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Contact Seller Button */}
                  <div>
                    {!user ? (
                      <button
                        onClick={() => navigate('/login')}
                        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Se connecter pour contacter
                      </button>
                    ) : isOwnProduct ? (
                      <span className="text-sm text-gray-500 italic">Votre produit</span>
                    ) : (
                      <button
                        onClick={handleContactSeller}
                        disabled={contactingSeller}
                        className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {contactingSeller ? 'Envoi...' : 'Contacter le vendeur'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Informations du vendeur non disponibles
                    </p>
                    <p className="text-sm text-yellow-700">
                      Les détails du vendeur ne peuvent pas être affichés pour le moment.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
              <div className="prose max-w-none text-gray-600">
                <p>{product.description}</p>
              </div>

              {product.tags && product.tags.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails du produit</h3>
              <dl className="space-y-3">
                {product.category && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Catégorie</dt>
                    <dd className="text-sm text-gray-900">{product.category.name}</dd>
                  </div>
                )}
                {product.subcategory && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Sous-catégorie</dt>
                    <dd className="text-sm text-gray-900">{product.subcategory.name}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">État</dt>
                  <dd className="text-sm text-gray-900">
                    {product.condition === 'new' ? 'Neuf' : 
                     product.condition === 'used' ? 'Occasion' : 'Reconditionné'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Localisation</dt>
                  <dd className="text-sm text-gray-900">{product.location}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Date de publication</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(product.created_at).toLocaleDateString('fr-FR')}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Security Info */}
            <div className="bg-green-50 rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold text-green-900 mb-3">Achat sécurisé</h3>
              <div className="space-y-2 text-sm text-green-800">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Paiement sécurisé</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4" />
                  <span>Livraison rapide</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Vendeur vérifié</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>Communication directe</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subcategories List */}
        {uniqueSubcategories.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sous-catégories disponibles</h3>
            <div className="flex flex-wrap gap-2">
              {uniqueSubcategories.map(subcategory => (
                <Link 
                  key={subcategory.id}
                  to={`/category/${product.category?.slug}?subcategory=${subcategory.id}`}
                  className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm hover:bg-gray-200 transition-colors"
                >
                  {subcategory.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Produits similaires</h2>
                <p className="text-gray-600 text-sm mt-1">
                  {product.subcategory 
                    ? `Autres produits dans "${product.subcategory.name}" • ${product.category?.name}`
                    : `Autres produits dans "${product.category?.name}"`
                  }
                </p>
              </div>
              {product.category && (
                <Link 
                  to={`/category/${product.category.slug}`}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  Voir tous les produits →
                </Link>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map(relatedProduct => (
                <Link
                  key={relatedProduct.id}
                  to={`/product/${relatedProduct.id}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
                >
                  <div className="relative">
                    <img
                      src={relatedProduct.images[0] || 'https://images.pexels.com/photos/441923/pexels-photo-441923.jpeg'}
                      alt={relatedProduct.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                    />
                    {relatedProduct.subcategory_id === product.subcategory_id && product.subcategory_id && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                        Même type
                      </div>
                    )}
                    {relatedProduct.featured && (
                      <div className="absolute top-2 right-2 bg-primary-600 text-white px-2 py-1 rounded text-xs font-medium">
                        Recommandé
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
                      {relatedProduct.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-primary-600">
                        {formatPrice(relatedProduct.price, relatedProduct.currency)}
                      </div>
                      {relatedProduct.subcategory && (
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {relatedProduct.subcategory.name}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
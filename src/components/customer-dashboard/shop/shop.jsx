import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProductsPaginated } from '../../../lib/productStore';
import { fetchReviews } from '../../../lib/reviewStore';
import { fetchCart, addToCart, removeFromCart, updateCartQuantity } from '../../../lib/cartStore';
import { fetchOrders } from '../../../lib/orderStore';
import { useNavigate, useLocation } from 'react-router-dom';
import './shop.css';
import ProductCard from '../product/card/productCard';
import debounce from 'lodash/debounce';
import { collection, getDocs, query, orderBy, startAfter, limit, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const priceRanges = [
  { label: 'Up to ₹600', min: 0, max: 600 },
  { label: '₹600 - ₹800', min: 600, max: 800 },
  { label: '₹800 - ₹6,000', min: 800, max: 6000 },
  { label: 'Over ₹6,000', min: 6000, max: Infinity },
];
const discountRanges = [
  { label: '10% or more', min: 10 },
  { label: '25% or more', min: 25 },
  { label: '50% or more', min: 50 },
  { label: '70% or more', min: 70 },
];
const ratingOptions = [5, 4, 3, 2, 1];
const PAGE_SIZE = 12;

const Shop = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const reviews = useSelector(state => state.review.items);
  const user = useSelector(state => state.user);
  const orders = useSelector(state => state.order.items);
  const cart = useSelector(state => state.cart.items);
  const [products, setProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const lastDocRef = React.useRef(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // State for filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [showNewArrivals, setShowNewArrivals] = useState(false);
  const [showBestSeller, setShowBestSeller] = useState(false);

  // Fetch all categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const q = query(collection(db, 'products'));
        const snapshot = await getDocs(q);
        const categories = Array.from(new Set(snapshot.docs.map(doc => doc.data().category).filter(Boolean)));
        setAllCategories(categories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch all data on mount
  useEffect(() => {
    dispatch(fetchReviews());
    dispatch(fetchOrders());
    if (user.email) dispatch(fetchCart(user.email));
  }, [dispatch, user.email]);

  // Set selectedCategory from query param on initial load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category');
    if (cat) setSelectedCategory(cat);
  }, [location.search]);

  // Reset filters when navigating to /customer-dashboard/shop with no query params
  useEffect(() => {
    if (location.pathname === '/customer-dashboard/shop' && !location.search) {
      setSearch('');
      setSelectedCategory('');
      setSelectedPrice(null);
      setSelectedDiscount(null);
      setSelectedRating(null);
      setShowNewArrivals(false);
      setShowBestSeller(false);
    }
  }, [location.pathname, location.search]);

  // Helper to get average rating for a product
  const getAvgRating = (productId) => {
   

    const productReviews = reviews.filter(r => r.productid === productId);
    if (productReviews.length === 0) return 0;
    return (productReviews.reduce((sum, r) => sum + Number(r.rating), 0) / productReviews.length).toFixed(1);
  };

  // 1. Apply all base filters (category, price, discount, rating, search)
  const baseFilteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    if (selectedPrice) {
      filtered = filtered.filter(p => p.cost >= selectedPrice.min && p.cost <= selectedPrice.max);
    }
    if (selectedDiscount) {
      filtered = filtered.filter(p => Number(p.discount) >= selectedDiscount.min);
    }
    if (selectedRating) {
      filtered = filtered.filter(p => {
        const avg = getAvgRating(p.id);
        return Number(avg) >= selectedRating;
      });
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(p =>
        (p.name && p.name.toLowerCase().includes(s)) ||
        (p.category && p.category.toLowerCase().includes(s))
      );
    }
    return filtered;
  }, [products, selectedCategory, selectedPrice, selectedDiscount, selectedRating, search, reviews]);

  // 2. Calculate best sellers (5+ orders in filtered set)
  const bestSellerIds = useMemo(() => {
    const count = {};
    orders.forEach(o => {
      if (baseFilteredProducts.find(p => p.id === o.productid)) {
        count[o.productid] = (count[o.productid] || 0) + (o.quantity || 1);
      }
    });
    const ids = Object.entries(count)
      .filter(([id, c]) => c >= 5)
      .map(([id]) => id);
    // If all products have 0 orders, treat none as best sellers
    return ids;
  }, [orders, baseFilteredProducts]);

  // 3. Calculate new arrivals (top 10 by createdAt, or all if all dates are the same)
  const newArrivalIds = useMemo(() => {
    if (!baseFilteredProducts.length) return [];
    // Only consider products with valid numeric createdAt
    const validProducts = baseFilteredProducts.filter(p => typeof p.createdAt === 'number' && !isNaN(p.createdAt));
    if (validProducts.length === 0) {
      // If all are missing/invalid, show all
      return baseFilteredProducts.map(p => p.id);
    }
    const allDates = validProducts.map(p => p.createdAt);
    const allSame = allDates.every(date => date === allDates[0]);
    if (allSame) {
      // If all valid dates are the same, show all with valid createdAt
      return validProducts.map(p => p.id);
    }
    // Otherwise, top 10 by createdAt
    const sortedProducts = [...validProducts]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);
    return sortedProducts.map(p => p.id);
  }, [baseFilteredProducts]);

  // 4. Apply toggles
  const filteredProducts = useMemo(() => {
    let filtered = baseFilteredProducts;
    if (showBestSeller) {
      filtered = filtered.filter(p => bestSellerIds.includes(p.id));
    }
    if (showNewArrivals) {
      filtered = filtered.filter(p => newArrivalIds.includes(p.id));
    }
    return filtered;
  }, [baseFilteredProducts, showBestSeller, showNewArrivals, bestSellerIds, newArrivalIds]);

  // Recently added: products with createdAt within last 2 days
  const recentlyAddedIds = useMemo(() => {
    const now = Date.now();
    return products.filter(p => p.createdAt && (now - p.createdAt < 2 * 24 * 60 * 60 * 1000)).map(p => p.id);
  }, [products]);

  // Fetch products with filters and pagination (local Firestore logic)
  const fetchPage = async (reset = false) => {
    setLoading(true);
    try {
      if (reset) {
        setProducts([]);
        lastDocRef.current = null;
        setHasMore(true);
      }

      // Build Firestore query constraints
      let constraints = [];
      if (selectedCategory) constraints.push(where('category', '==', selectedCategory));
      if (selectedPrice) {
        constraints.push(where('cost', '>=', selectedPrice.min));
        if (selectedPrice.max !== Infinity) constraints.push(where('cost', '<=', selectedPrice.max));
      }
      if (selectedDiscount) constraints.push(where('discount', '>=', selectedDiscount.min));
      // Always order by cost (or createdAt for better pagination)
      constraints.push(orderBy('cost', 'asc'));
      if (lastDocRef.current && !reset) constraints.push(startAfter(lastDocRef.current));
      constraints.push(limit(PAGE_SIZE));

      const q = query(collection(db, 'products'), ...constraints);
      const snapshot = await getDocs(q);
      let newProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // In-memory search filter
      if (search) {
        const s = search.toLowerCase();
        newProducts = newProducts.filter(p =>
          (p.name && p.name.toLowerCase().includes(s)) ||
          (p.category && p.category.toLowerCase().includes(s))
        );
      }
      // In-memory rating filter
      if (selectedRating) {
        newProducts = newProducts.filter(p => {
          const avg = getAvgRating(p.id);
          return Number(avg) >= selectedRating;
        });
      }

      if (reset) {
        setProducts(newProducts);
      } else {
        setProducts(prev => {
          const ids = new Set(prev.map(p => p.id));
          return [...prev, ...newProducts.filter(p => !ids.has(p.id))];
        });
      }
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setHasLoadedOnce(true);
    } catch (error) {
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search with reset
  const debouncedFetch = useMemo(() => debounce(() => fetchPage(true), 300), [selectedCategory, selectedPrice, selectedDiscount, selectedRating, showNewArrivals, showBestSeller, search]);

  // Fetch on mount and when filters/search change
  useEffect(() => {
    setHasLoadedOnce(false); // Reset before fetch
    setProducts([]); // Clear existing products
    lastDocRef.current = null; // Reset pagination
    debouncedFetch();
    return debouncedFetch.cancel;
  }, [selectedCategory, selectedPrice, selectedDiscount, selectedRating, showNewArrivals, showBestSeller, search]);

  // Load more handler
  const handleLoadMore = () => {
    if (!loading && hasMore) fetchPage();
  };

  // Add to cart handler
  const handleAddToCart = async (productId) => {
    if (!user.email) {
      navigate('/login?mode=login&redirect=/customer-dashboard/shop');
      return;
    }
    
    await dispatch(addToCart({ userid: user.email, productid: productId }));
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(selectedCategory === category ? '' : category);
  };

  const handlePriceChange = (price) => {
    setSelectedPrice(selectedPrice === price ? null : price);
  };

  const handleDiscountChange = (discount) => {
    setSelectedDiscount(selectedDiscount === discount ? null : discount);
  };

  const handleRatingChange = (rating) => {
    setSelectedRating(selectedRating === rating ? null : rating);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
  };

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSelectedPrice(null);
    setSelectedDiscount(null);
    setSelectedRating(null);
    setSearch('');
    setShowNewArrivals(false);
    setShowBestSeller(false);
  };

  // Debug logs
  console.log('filteredProducts:', filteredProducts);

  return (
    <div className="shop-page-layout">
      <aside className="shop-sidebar">
        <div className="shop-filter-section">
          <div className="shop-filter-title">Price</div>
          {priceRanges.map(range => (
            <div
              key={range.label}
              className={`shop-filter-option${selectedPrice === range ? ' selected' : ''}`}
              onClick={() => handlePriceChange(range)}
            >
              {range.label}
            </div>
          ))}
        </div>
        <div className="shop-filter-section">
          <div className="shop-filter-title">Discount</div>
          {discountRanges.map(range => (
            <div
              key={range.label}
              className={`shop-filter-option${selectedDiscount === range ? ' selected' : ''}`}
              onClick={() => handleDiscountChange(range)}
            >
              {range.label}
            </div>
          ))}
        </div>
        <div className="shop-filter-section">
          <div className="shop-filter-title">Rating</div>
          {ratingOptions.map(rating => (
            <div
              key={rating}
              className={`shop-filter-option${selectedRating === rating ? ' selected' : ''}`}
              onClick={() => handleRatingChange(rating)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
              <span>&amp; Up</span>
            </div>
          ))}
        </div>
      </aside>
      <main className="shop-main">
        <div className="shop-filter-bar">
          <input
            type="text"
            placeholder="Search by name or category..."
            value={search}
            onChange={handleSearch}
            className="shop-search-input"
          />
          <select
            className="shop-category-dropdown"
            value={selectedCategory}
            onChange={e => handleCategoryChange(e.target.value)}
          >
            <option value="">All Categories</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            className={`shop-filter-btn${showBestSeller ? ' selected' : ''}`}
            onClick={() => setShowBestSeller(v => !v)}
          >
            Best Seller
          </button>
          <button
            className={`shop-filter-btn${showNewArrivals ? ' selected' : ''}`}
            onClick={() => setShowNewArrivals(v => !v)}
          >
            New Arrival
          </button>
          <button
            className="shop-filter-btn"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
        </div>
        {loading && products.length === 0 ? (
          <div className="loading">Loading products...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : !loading && filteredProducts.length === 0 && hasLoadedOnce ? (
          <div className="empty">No products found matching your criteria.</div>
        ) : (
          <>
            <div className="shop-grid">
              {filteredProducts.map(product => {
                const hasDiscount = Number(product.discount) > 0;
                const discountedPrice = hasDiscount
                  ? (product.cost - (product.cost * Number(product.discount)) / 100).toFixed(2)
                  : product.cost;
                const avgRating = getAvgRating(product.id);
                const cartItem = cart.find(item => item.productid === product.id);
                const inCart = !!cartItem;
                const isBestSeller = bestSellerIds.includes(product.id);
                const isRecentlyAdded = recentlyAddedIds.includes(product.id);
                return (
                  <ProductCard
                    key={product.id}
                    product={{ ...product, cartId: cartItem ? cartItem.id : undefined, quantity: cartItem ? cartItem.quantity : undefined }}
                    avgRating={avgRating}
                    hasDiscount={hasDiscount}
                    discountedPrice={discountedPrice}
                    inCart={inCart}
                    isBestSeller={isBestSeller}
                    isRecentlyAdded={isRecentlyAdded}
                    stock={product.stock}
                    onAddToCart={() => handleAddToCart(product.id)}
                    onRemove={() => {
                      if (cartItem) dispatch(removeFromCart(cartItem.id));
                    }}
                    onNavigate={() => navigate(`/customer-dashboard/product/${product.id}`)}
                    onOrder={async q => {
                      if (!user.email) {
                        navigate('/login?mode=login&redirect=/customer-dashboard/shop');
                        return;
                      }
                      if (!inCart) {
                        await dispatch(addToCart({ userid: user.email, productid: product.id, quantity: 1 }));
                      }
                      const qty = inCart && cartItem ? cartItem.quantity : 1;
                      navigate(`/customer-dashboard/checkout?productId=${product.id}&quantity=${qty}`);
                    }}
                  />
                );
              })}
            </div>
            {hasMore && filteredProducts.length > 0 && (
              <button 
                className="load-more-btn"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            )}
            {(!loading && hasLoadedOnce && showBestSeller && bestSellerIds.length === 0) && (
              <div className="empty">No best sellers found (need at least 5 orders for a product).</div>
            )}
            {(!loading && hasLoadedOnce && showNewArrivals && newArrivalIds.length === 0) && (
              <div className="empty">No new arrivals found (check createdAt field in your data).</div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Shop;

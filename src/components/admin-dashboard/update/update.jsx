import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProductsPaginated } from '../../../lib/productStore';
import { fetchReviews } from '../../../lib/reviewStore';
import { fetchOrders } from '../../../lib/orderStore';
import { useNavigate, useLocation } from 'react-router-dom';
import './update.css';
import UpdateCard from './card/updateCard';
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

const Update = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const reviews = useSelector(state => state.review.items);
  const orders = useSelector(state => state.order.items);
  const [products, setProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const lastDocRef = React.useRef(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [showNewArrivals, setShowNewArrivals] = useState(false);
  const [showBestSeller, setShowBestSeller] = useState(false);

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

  
  useEffect(() => {
    dispatch(fetchReviews());
    dispatch(fetchOrders());
  }, [dispatch]);

  
  const getAvgRating = (productId) => {
    const productReviews = reviews.filter(r => r.productid === productId);
    if (productReviews.length === 0) return 0;
    return (productReviews.reduce((sum, r) => sum + Number(r.rating), 0) / productReviews.length).toFixed(1);
  };

  
  const baseFilteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    if (selectedPrice) {
      const range = priceRanges.find(r => r.label === selectedPrice);
      if (range) {
        filtered = filtered.filter(p => p.cost >= range.min && p.cost <= range.max);
      }
    }
    if (selectedDiscount) {
      const range = discountRanges.find(r => r.label === selectedDiscount);
      if (range) {
        filtered = filtered.filter(p => Number(p.discount) >= range.min);
      }
    }
    if (selectedRating) {
      filtered = filtered.filter(p => {
        const avg = getAvgRating(p.id);
        return Number(avg) >= selectedRating;
      });
    }
    if (searchInput) {
      const s = searchInput.toLowerCase();
      filtered = filtered.filter(p =>
        (p.name && p.name.toLowerCase().includes(s)) ||
        (p.category && p.category.toLowerCase().includes(s))
      );
    }
    return filtered;
  }, [products, selectedCategory, selectedPrice, selectedDiscount, selectedRating, searchInput, reviews]);

  
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

    return ids;
  }, [orders, baseFilteredProducts]);

  
  const newArrivalIds = useMemo(() => {
    if (!baseFilteredProducts.length) return [];
  
    const validProducts = baseFilteredProducts.filter(p => typeof p.createdAt === 'number' && !isNaN(p.createdAt));
    if (validProducts.length === 0) {
      return baseFilteredProducts.map(p => p.id);
    }
    const allDates = validProducts.map(p => p.createdAt);
    const allSame = allDates.every(date => date === allDates[0]);
    if (allSame) {
      return validProducts.map(p => p.id);
    }
    const sortedProducts = [...validProducts]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);
    return sortedProducts.map(p => p.id);
  }, [baseFilteredProducts]);

  
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

  
  console.log('newArrivalIds:', newArrivalIds);
  console.log('bestSellerIds:', bestSellerIds);

  
  console.log('filteredProducts:', filteredProducts);

  
  const fetchPage = async (reset = false) => {
    setLoading(true);
    try {
      if (reset) {
        setProducts([]);
        lastDocRef.current = null;
        setHasMore(true);
      }

      
      let constraints = [];
      if (selectedCategory) constraints.push(where('category', '==', selectedCategory));
      if (selectedPrice) {
        const range = priceRanges.find(r => r.label === selectedPrice);
        if (range) {
          constraints.push(where('cost', '>=', range.min));
          if (range.max !== Infinity) constraints.push(where('cost', '<=', range.max));
        }
      }
      if (selectedDiscount) {
        const range = discountRanges.find(r => r.label === selectedDiscount);
        if (range) constraints.push(where('discount', '>=', range.min));
      }
      constraints.push(orderBy('cost', 'asc'));
      if (lastDocRef.current && !reset) constraints.push(startAfter(lastDocRef.current));
      constraints.push(limit(PAGE_SIZE));
      
      const q = query(collection(db, 'products'), ...constraints);
      const snapshot = await getDocs(q);
      let newProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      
      if (searchInput) {
        const s = searchInput.toLowerCase();
        newProducts = newProducts.filter(p =>
          (p.name && p.name.toLowerCase().includes(s)) ||
          (p.category && p.category.toLowerCase().includes(s))
        );
      }
    
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


  const debouncedFetch = useMemo(() => debounce(() => fetchPage(true), 300), [selectedCategory, selectedPrice, selectedDiscount, selectedRating, showNewArrivals, showBestSeller, searchInput]);

  
  useEffect(() => {
    setHasLoadedOnce(false); 
    setProducts([]); 
    lastDocRef.current = null; 
    debouncedFetch();
    return debouncedFetch.cancel;
  }, [selectedCategory, selectedPrice, selectedDiscount, selectedRating, showNewArrivals, showBestSeller, searchInput]);

  
  const handleLoadMore = () => {
    if (!loading && hasMore) fetchPage();
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchInput(value);
  };

  return (
    <div className="shop-page-layout">
      <aside className="shop-sidebar">
        <div className="shop-filter-section">
          <div className="shop-filter-title">Price</div>
          {priceRanges.map(range => (
            <div
              key={range.label}
              className={`shop-filter-option${selectedPrice === range.label ? ' selected' : ''}`}
              onClick={() => setSelectedPrice(selectedPrice === range.label ? null : range.label)}
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
              className={`shop-filter-option${selectedDiscount === range.label ? ' selected' : ''}`}
              onClick={() => setSelectedDiscount(selectedDiscount === range.label ? null : range.label)}
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
              onClick={() => setSelectedRating(selectedRating === rating ? null : rating)}
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
            value={searchInput}
            onChange={handleSearch}
            className="shop-search-input"
          />
          <select
            className="shop-category-dropdown"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
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
                const isBestSeller = bestSellerIds.includes(product.id);
                const isRecentlyAdded = newArrivalIds.includes(product.id);
                return (
                  <UpdateCard
                    key={product.id}
                    product={product}
                    avgRating={avgRating}
                    hasDiscount={hasDiscount}
                    discountedPrice={discountedPrice}
                    isBestSeller={isBestSeller}
                    isRecentlyAdded={isRecentlyAdded}
                    onClick={() => navigate(`/admin-dashboard/update-product/${product.id}`)}
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

export default Update;

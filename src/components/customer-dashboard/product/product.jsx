import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { addToCart, removeFromCart, updateCartQuantity } from '../../../lib/cartStore';
import { addOrder } from '../../../lib/orderStore';
import { fetchReviews, addReview, deleteReview, editReview } from '../../../lib/reviewStore';
import { db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import './product.css';
import { FaEllipsisV } from 'react-icons/fa';
import { fetchProducts } from '../../../lib/productStore';

const Product = () => {
  // --- ALL HOOKS AT THE TOP ---
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const products = useSelector(state => state.products.items);
  const productsLoading = useSelector(state => state.products.loading);
  const user = useSelector(state => state.user);
  const allReviews = useSelector(state => state.review.items);
  const cart = useSelector(state => state.cart.items);
  const orders = useSelector(state => state.order.items);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc');
  const [usernames, setUsernames] = useState({});
  const [usernamesLoading, setUsernamesLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewText, setEditReviewText] = useState('');
  const [editRating, setEditRating] = useState(0);
  const [editError, setEditError] = useState('');
  const [dropdownOpenId, setDropdownOpenId] = useState(null);
  const [lensPos, setLensPos] = useState(null);
  const [isZooming, setIsZooming] = useState(false);
  const imgRef = useRef();
  const usernamesRef = useRef({});

  // Memoized values that do NOT depend on product being defined
  const productReviews = useMemo(() => allReviews ? allReviews.filter(r => r.productid === id) : [], [allReviews, id]);
  const categoryOptions = useMemo(() => products ? Array.from(new Set(products.map(p => p.category).filter(Boolean))) : [], [products]);
  const bestSellerIds = useMemo(() => {
    const count = {};
    if (orders) {
    orders.forEach(o => {
      count[o.productid] = (count[o.productid] || 0) + (o.quantity || 1);
    });
    }
    return Object.entries(count)
      .filter(([id, c]) => c >= 5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
  }, [orders]);

  // Effects
  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchReviews(id));
  }, [dispatch, id]);

  useEffect(() => {
    const missingUserIds = productReviews
      .map(r => r.userid)
      .filter(id => !usernamesRef.current[id]);
    if (missingUserIds.length === 0) return;
    let isMounted = true;
    const fetchUsernames = async () => {
      setUsernamesLoading(true);
      const newUsernames = {};
      for (const userid of missingUserIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userid));
          newUsernames[userid] = userDoc.exists() ? userDoc.data().username || userid : userid;
        } catch {
          newUsernames[userid] = userid;
        }
      }
      if (isMounted && Object.keys(newUsernames).length > 0) {
        usernamesRef.current = { ...usernamesRef.current, ...newUsernames };
        setUsernames(prev => ({ ...prev, ...newUsernames }));
      }
      if (isMounted) setUsernamesLoading(false);
    };
    fetchUsernames();
    return () => { isMounted = false; };
  }, [productReviews.map(r => r.userid).join(',')]);
  
  // Always show user's own reviews first (robust to missing user)
  const sortedReviews = useMemo(() => {
    if (!productReviews || !user) return [];
    const userReviews = productReviews.filter(r => r.userid === user.email);
    const otherReviews = productReviews.filter(r => r.userid !== user.email);
    const sortedOthers = [...otherReviews].sort((a, b) => {
      if (sortOrder === 'asc') return a.rating - b.rating;
      return b.rating - a.rating;
    });
    return [...userReviews, ...sortedOthers];
  }, [productReviews, user?.email, sortOrder]);

  // --- FIND PRODUCT AFTER ALL HOOKS ---
  const product = products ? products.find(p => p.id === id) : undefined;

  // --- EARLY RETURNS (NO HOOKS BELOW THIS) ---
  if (productsLoading) return <div style={{padding: '2rem', color: '#232f3e', fontWeight: 600, fontSize: '1.2rem'}}>Loading product...</div>;
  if (!product) return <div style={{padding: '2rem', color: '#232f3e', fontWeight: 600, fontSize: '1.2rem'}}>Product not found.</div>;

  // --- PRODUCT-DEPENDENT LOGIC ---
  const cartItem = cart ? cart.find(item => item.productid === product.id) : undefined;
  const inCart = !!cartItem;
  const quantity = cartItem ? cartItem.quantity || 1 : 1;
  const isRecentlyAdded = product.createdAt && (Date.now() - product.createdAt < 2 * 24 * 60 * 60 * 1000);
  const isBestSeller = bestSellerIds.includes(product.id);
  const hasDiscount = Number(product.discount) > 0;
  const discountedPrice = hasDiscount
    ? (product.cost - (product.cost * Number(product.discount)) / 100).toFixed(2)
    : product.cost;
  const avgRating = productReviews.length > 0 ? (productReviews.reduce((sum, r) => sum + Number(r.rating), 0) / productReviews.length).toFixed(1) : null;

  // --- DIAGNOSTIC LOG ---
  if (typeof window !== 'undefined') {
    window.__PRODUCT_HOOKS_RENDER_COUNT = (window.__PRODUCT_HOOKS_RENDER_COUNT || 0) + 1;
    if (window.__PRODUCT_HOOKS_RENDER_COUNT > 50) {
      // This is just to help debug infinite re-render loops
      // eslint-disable-next-line no-debugger
      debugger;
    }
  }

  // --- HANDLERS ---
  const handleAddToCart = async () => {
    if (!user.email) {
      navigate(`/login?mode=login&redirect=/customer-dashboard/product/${product.id}`);
      return;
    }
    await dispatch(addToCart({ userid: user.email, productid: product.id }));
  };

  const handleRemoveFromCart = async () => {
    const cartItem = cart.find(item => item.productid === product.id);
    if (cartItem) {
      await dispatch(removeFromCart(cartItem.id));
    }
  };

  const handleOrder = async () => {
    if (!user.email) {
      navigate(`/login?mode=login&redirect=/customer-dashboard/product/${product.id}`);
      return;
    }
    if (!inCart) {
      await dispatch(addToCart({ userid: user.email, productid: product.id }));
    }
    const qty = inCart && cartItem ? cartItem.quantity : 1;
    navigate(`/customer-dashboard/checkout?productId=${product.id}&quantity=${qty}`);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user.email) {
      navigate(`/login?mode=login&redirect=/customer-dashboard/product/${product.id}`);
      return;
    }
    if (!reviewText) return;
    if (!rating) {
      setReviewError('Please select a star rating.');
      return;
    }
    setReviewError('');
    await dispatch(addReview({ userid: user.email, productid: product.id, review: reviewText, rating }));
    setReviewText('');
    setRating(0);
  };

  const handleDeleteReview = async (reviewId) => {
    await dispatch(deleteReview(reviewId));
  };

  const handleEditReview = (review) => {
    setEditingReviewId(review.id);
    setEditReviewText(review.review);
    setEditRating(review.rating);
    setEditError('');
  };

  const handleEditReviewSubmit = async (e) => {
    e.preventDefault();
    if (!editReviewText) return;
    if (!editRating) {
      setEditError('Please select a star rating.');
      return;
    }
    setEditError('');
    await dispatch(editReview({ id: editingReviewId, review: editReviewText, rating: editRating }));
    setEditingReviewId(null);
    setEditReviewText('');
    setEditRating(0);
  };

  const formatIndianDate = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // --- RENDER ---
  const infoBoxStyle = {
    background: 'linear-gradient(135deg, #f6f7fb 60%, #e9eaf3 100%)',
    borderRadius: '14px',
    boxShadow: '0 2px 12px rgba(100,108,255,0.07)',
    padding: '2rem 2.5rem',
    marginBottom: '1.5rem',
    border: '1.5px solid #e3e6ee',
    minWidth: 0,
  };

  return (
    <div className="product-detail-outer" style={{background: 'linear-gradient(135deg, #f6f7fb 60%, #e9eaf3 100%)'}}>
      <div className="product-detail-container" style={{background: 'rgba(255,255,255,0.98)', border: '1.5px solid #e3e6ee'}}>
        <div className="product-detail-left" style={{position:'relative'}}>
          <div
            style={{position:'relative', width:'100%', maxWidth:320, maxHeight:320}}
            onMouseMove={e => {
              const rect = imgRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              setLensPos({ x, y, width: rect.width, height: rect.height });
              setIsZooming(true);
            }}
            onMouseLeave={() => setIsZooming(false)}
          >
            <img
              ref={imgRef}
              src={product.url}
              alt={product.name}
              className="product-detail-img-main"
              style={{display:'block', width:'100%', maxWidth:320, maxHeight:320, objectFit:'contain', borderRadius:10, boxShadow:'0 2px 8px rgba(0,0,0,0.07)', background:'#f7f7f7'}} />
            {isZooming && lensPos && (
              <div
                style={{
                  position:'absolute',
                  left: Math.max(0, Math.min(lensPos.x - 50, lensPos.width - 100)),
                  top: Math.max(0, Math.min(lensPos.y - 50, lensPos.height - 100)),
                  width:100,
                  height:100,
                  border:'2px solid #646cff',
                  borderRadius:'50%',
                  background:'rgba(255,255,255,0.2)',
                  pointerEvents:'none',
                  zIndex:2
                }}
              />
            )}
            {isZooming && lensPos && (
              <div
                style={{
                  position:'absolute',
                  left:'105%',
                  top:0,
                  width:200,
                  height:200,
                  border:'2px solid #646cff',
                  borderRadius:12,
                  overflow:'hidden',
                  background:'#fff',
                  boxShadow:'0 2px 8px rgba(100,108,255,0.13)',
                  zIndex:3,
                  display:'block'
                }}
              >
                <img
                  src={product.url}
                  alt="zoom"
                  style={{
                    position:'absolute',
                    left: -((lensPos.x/ lensPos.width) * 320 - 100),
                    top: -((lensPos.y/ lensPos.height) * 320 - 100),
                    width:320,
                    height:320,
                    objectFit:'contain',
                    pointerEvents:'none',
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <div className="product-detail-right">
          <div style={infoBoxStyle}>
            <div className="product-detail-tags-row">
              {isBestSeller && <span className="shop-tag shop-tag-bestseller">Best Seller</span>}
              {isRecentlyAdded && <span className="shop-tag shop-tag-recent">Recently Added</span>}
              {hasDiscount && <span className="shop-tag shop-tag-discount">Discount</span>}
            </div>
            <h1 className="product-detail-title" style={{marginBottom: '0.7rem'}}>{product.name}</h1>
            {avgRating && (
              <div className="product-detail-stars">
                {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}
                <span className="product-detail-avg">({avgRating})</span>
              </div>
            )}
            <div className="product-detail-prices" style={{margin: '0.7rem 0'}}>
              <span className="product-detail-price">₹{discountedPrice}</span>
              {hasDiscount && (
                <span className="product-detail-original">₹{Number(product.cost).toFixed(2)}</span>
              )}
            </div>
            <div className="product-detail-desc" style={{marginBottom: '0.7rem'}}><b>Description:</b> {product.details || 'No description available.'}</div>
            <div className="product-detail-row" style={{marginBottom: '0.7rem'}}>
              <span className="product-detail-label">Stock:</span> <span className="product-detail-stock">{product.stock}</span>
            </div>
            <div className="product-detail-meta" style={{marginBottom: '0.7rem'}}>
              <span><b>Category:</b> {product.category}</span>
              <span><b>Share:</b> FB TW PIN</span>
            </div>
            <div className="product-detail-actions">
              {inCart && cartItem ? (
                <div style={{display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1}}>
                    <div className="quantity-selector" style={{margin: 0, width: 'auto', minWidth: 0}}>
                      <button className="qty-btn" onClick={() => cartItem && quantity > 1 && dispatch(updateCartQuantity({ cartId: cartItem.id, quantity: quantity - 1 }))} disabled={!cartItem || quantity <= 1}>-</button>
                      <span className="qty-value">{quantity}</span>
                      <button className="qty-btn" onClick={() => cartItem && quantity < product.stock && dispatch(updateCartQuantity({ cartId: cartItem.id, quantity: quantity + 1 }))} disabled={!cartItem || quantity >= product.stock}>+</button>
                    </div>
                    <span
                      style={{cursor: 'pointer', fontSize: '1.2rem', color: 'red', marginLeft: 8}}
                      title="Remove from cart"
                      onClick={e => { e.stopPropagation(); handleRemoveFromCart(); }}
                    >
                      🗑️
                    </span>
                  </div>
                  <button className="shop-order-btn" style={{width:'40%', minWidth:90}} onClick={handleOrder}>Order</button>
                </div>
              ) : (
                <div style={{display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%'}}>
                  <button className="product-detail-cart" onClick={handleAddToCart} style={{width:'auto', minWidth:90, padding:'0.4rem 1rem', fontSize:'0.98rem'}}>
                    + Add to Cart
                  </button>
                  <button className="shop-order-btn" style={{width:'40%', minWidth:90}} onClick={handleOrder}>Order</button>
                </div>
              )}
            </div>
          </div>
          <div className="product-detail-reviews" style={{background: 'rgba(246,247,251,0.98)', border: '1.5px solid #e3e6ee'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem', flexWrap:'wrap', gap:'1rem'}}>
              <h3 style={{margin:0}}>Reviews ({productReviews.length})</h3>
              <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                <label htmlFor="sort-reviews" style={{fontWeight:600, color:'#232f3e'}}>Sort by:</label>
                <select id="sort-reviews" value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{padding:'0.3rem 0.7rem', borderRadius:'6px', border:'1px solid #bbb'}}>
                  <option value="desc">Highest Rated</option>
                  <option value="asc">Lowest Rated</option>
                </select>
              </div>
            </div>
            <div className="product-detail-review-list">
              {usernamesLoading && <div style={{color:'#232f3e', fontWeight:600}}>Loading reviewers...</div>}
              {!usernamesLoading && sortedReviews.length === 0 && <div style={{color:'#232f3e', fontWeight:600}}>No reviews yet.</div>}
              {!usernamesLoading && sortedReviews.map(r => (
                <div key={r.id} className="product-detail-review-item" style={{position:'relative'}}>
                  <div className="product-detail-review-header">
                    <span className="product-detail-review-user">{usernames[r.userid] || r.userid}</span>
                    <span className="product-detail-review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    {(r.editedAt || r.createdAt) && (
                      <span className="product-detail-review-date">
                        {r.editedAt
                          ? <>edited {formatIndianDate(r.editedAt)}</>
                          : formatIndianDate(r.createdAt)
                        }
                      </span>
                    )}
                    {user.email === r.userid && editingReviewId !== r.id && (
                      <div style={{marginLeft:'auto', position:'relative'}}>
                        <button
                          style={{background:'none', border:'none', cursor:'pointer', padding:'0.2rem'}}
                          onClick={() => setDropdownOpenId(dropdownOpenId === r.id ? null : r.id)}
                          aria-label="More options"
                        >
                          <FaEllipsisV size={18} color="#646cff" />
                        </button>
                        {dropdownOpenId === r.id && (
                          <div style={{position:'absolute', right:0, top:'2rem', background:'#fff', border:'1px solid #e3e6ee', borderRadius:6, boxShadow:'0 2px 8px rgba(0,0,0,0.10)', zIndex:10}}>
                            <button style={{display:'block', width:'100%', padding:'0.5rem 1.2rem', background:'none', border:'none', color:'#646cff', textAlign:'left', cursor:'pointer'}} onClick={() => { setDropdownOpenId(null); handleEditReview(r); }}>Edit</button>
                            <button style={{display:'block', width:'100%', padding:'0.5rem 1.2rem', background:'none', border:'none', color:'#d32f2f', textAlign:'left', cursor:'pointer'}} onClick={() => { setDropdownOpenId(null); handleDeleteReview(r.id); }}>Delete</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {editingReviewId === r.id ? (
                    <form onSubmit={handleEditReviewSubmit} style={{width:'100%'}}>
                      {editError && <div style={{color:'#d32f2f', fontWeight:600, marginBottom:'0.5rem'}}>{editError}</div>}
                      <textarea
                        value={editReviewText}
                        onChange={e => setEditReviewText(e.target.value)}
                        rows={2}
                        style={{width:'100%', borderRadius:6, border:'1px solid #bbb', padding:'0.5rem', marginBottom:'0.5rem', background:'#fff', color:'#232f3e'}}
                        required
                      />
                      <div className="product-detail-review-stars-select" style={{marginBottom:8}}>
                        {[1,2,3,4,5].map(star => (
                          <span
                            key={star}
                            className={star <= editRating ? 'star-selected' : 'star'}
                            onClick={() => setEditRating(star)}
                            style={{cursor: 'pointer', fontSize: '1.3rem'}}>
                            ★
                          </span>
                        ))}
                        <span style={{marginLeft: '1rem'}}>{editRating ? `${editRating} / 5` : ''}</span>
                      </div>
                      <button type="submit" className="product-detail-review-btn" style={{marginRight:8}}>Save</button>
                      <button type="button" className="product-detail-review-btn" style={{background:'#eee', color:'#232f3e'}} onClick={() => setEditingReviewId(null)}>Cancel</button>
                    </form>
                  ) : (
                    <div className="product-detail-review-text">{r.review}</div>
                  )}
                </div>
              ))}
            </div>
            <form className="product-detail-review-form" onSubmit={handleReviewSubmit}>
              {reviewError && <div style={{color:'#d32f2f', fontWeight:600, marginBottom:'0.5rem'}}>{reviewError}</div>}
              <textarea
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder="Write your review..."
                rows={3}
                required
                style={{background:'#fff', color:'#232f3e'}} />
              <div className="product-detail-review-stars-select">
                {[1,2,3,4,5].map(star => (
                  <span
                    key={star}
                    className={star <= rating ? 'star-selected' : 'star'}
                    onClick={() => setRating(star)}
                    style={{cursor: 'pointer', fontSize: '1.5rem'}}>
                    ★
                  </span>
                ))}
                <span style={{marginLeft: '1rem'}}>{rating ? `${rating} / 5` : ''}</span>
              </div>
              <button type="submit" className="product-detail-review-btn">Post Review</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Product;

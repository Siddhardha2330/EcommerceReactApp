import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCart, removeFromCart, updateCartQuantity } from '../../../lib/cartStore';
import { useNavigate } from 'react-router-dom';
import './cart.css';
import CartCard from './card/cartCard';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(state => state.user);
  const cart = useSelector(state => state.cart.items);
  const products = useSelector(state => state.products.items);
  const reviews = useSelector(state => state.review.items);
  const loading = useSelector(state => state.cart.loading);
  const initialLoadComplete = useSelector(state => state.cart.initialLoadComplete);
  const error = useSelector(state => state.cart.error);
  const [cartProducts, setCartProducts] = React.useState([]);
  const [productsLoading, setProductsLoading] = React.useState(true);
  const [firstLoad, setFirstLoad] = React.useState(true);

  useEffect(() => {
    if (!user.email) {
      navigate('/login?mode=login&redirect=/customer-dashboard/cart');
      return;
    }
    if (user.email) {
      dispatch(fetchCart(user.email));
    }
  }, [dispatch, user.email, navigate]);

  // Fetch only products in cart
  useEffect(() => {
    const fetchCartProducts = async () => {
      setProductsLoading(true);
      const prods = [];
      for (const item of cart) {
        const docSnap = await getDoc(doc(db, 'products', item.productid));
        if (docSnap.exists()) {
          prods.push({ ...docSnap.data(), id: item.productid, cartId: item.id, quantity: item.quantity });
        }
      }
      setCartProducts(prods);
      setProductsLoading(false);
    };
    if (cart.length > 0) fetchCartProducts();
    else {
      setCartProducts([]);
      setProductsLoading(false);
    }
  }, [cart]);

  useEffect(() => {
    if (!productsLoading && initialLoadComplete && firstLoad) {
      setFirstLoad(false);
    }
  }, [productsLoading, initialLoadComplete, firstLoad]);

  // Helper to get average rating for a product
  const getAvgRating = (productId) => {
    const productReviews = reviews.filter(r => r.productid === productId);
    if (productReviews.length === 0) return 0;
    return (productReviews.reduce((sum, r) => sum + Number(r.rating), 0) / productReviews.length).toFixed(1);
  };

  return (
    <div style={{height: '100%', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
      <div style={{flex: 1, overflowY: 'auto', width: '100%'}} className="shop-grid">
        {firstLoad ? (
          <div className="loading">Loading cart...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : cartProducts.length === 0 ? (
          <div className="empty">Your cart is empty.</div>
        ) : (
          cartProducts.map(product => {
          const hasDiscount = Number(product.discount) > 0;
          const discountedPrice = hasDiscount
            ? (product.cost - (product.cost * Number(product.discount)) / 100).toFixed(2)
            : product.cost;
          const avgRating = getAvgRating(product.id);
          return (
            <CartCard
              key={product.cartId}
              product={product}
              avgRating={avgRating}
              hasDiscount={hasDiscount}
              discountedPrice={discountedPrice}
              stock={product.stock}
              onOrder={q => navigate(`/customer-dashboard/checkout?productId=${product.id}&quantity=${q}`)}
              onRemove={() => dispatch(removeFromCart(product.cartId))}
              onNavigate={() => navigate(`/customer-dashboard/product/${product.id}`)}
            />
          );
          })
        )}
      </div>
      {cartProducts.length > 0 && (
        null
      )}
    </div>
  );
};

export default Cart;

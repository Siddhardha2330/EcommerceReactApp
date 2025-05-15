import React, { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOrders } from '../../../lib/orderStore';
import { fetchProducts } from '../../../lib/productStore';
import OrderCard from './card/orderCard';
import { useNavigate } from 'react-router-dom';
import './order.css';

const Order = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(state => state.user);
  const orders = useSelector(state => state.order.items);
  const products = useSelector(state => state.products.items);
  const reviews = useSelector(state => state.review.items);
  const allOrders = useSelector(state => state.order.items); // for best seller logic
  const productsLoading = useSelector(state => state.products.loading);
  const ordersLoading = useSelector(state => state.order.loading);

  useEffect(() => {
    if (!user.email) {
      navigate('/login?mode=login&redirect=/customer-dashboard/orders');
      return;
    }
    if (user.email) {
      dispatch(fetchOrders(user.email));
    }
    dispatch(fetchProducts());
  }, [dispatch, user.email, navigate]);

  // Best seller logic (top 3 by total quantity, min 5 quantity)
  const bestSellerIds = useMemo(() => {
    const count = {};
    allOrders.forEach(o => {
      count[o.productid] = (count[o.productid] || 0) + (o.quantity || 1);
    });
    return Object.entries(count)
      .filter(([id, c]) => c >= 5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
  }, [allOrders]);

  // Helper to get average rating for a product
  const getAvgRating = (productId) => {
    const productReviews = reviews.filter(r => r.productid === productId);
    if (productReviews.length === 0) return 0;
    return (productReviews.reduce((sum, r) => sum + Number(r.rating), 0) / productReviews.length).toFixed(1);
  };

  // Map orders to products
  const orderedProducts = orders.map(order => {
    const product = products.find(p => p.id === order.productid);
    return product ? { ...product, orderId: order.id } : null;
  }).filter(Boolean);

  // Recently added logic
  const now = Date.now();

  return (
    <div style={{height: '100%', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
      <div style={{flex: 1, overflowY: 'auto', width: '100%'}} className="shop-grid">
        {(productsLoading || ordersLoading) && <div className="loading">Loading orders...</div>}
        {!productsLoading && !ordersLoading && orderedProducts.length === 0 && <div className="empty">No orders found.</div>}
        {!productsLoading && !ordersLoading && orderedProducts.map(product => {
          const hasDiscount = Number(product.discount) > 0;
          const discountedPrice = hasDiscount
            ? (product.cost - (product.cost * Number(product.discount)) / 100).toFixed(2)
            : product.cost;
          const avgRating = getAvgRating(product.id);
          const isBestSeller = bestSellerIds.includes(product.id);
          const isRecentlyAdded = product.createdAt && (now - product.createdAt < 2 * 24 * 60 * 60 * 1000);
          return (
            <OrderCard
              key={product.orderId}
              product={product}
              avgRating={avgRating}
              hasDiscount={hasDiscount}
              discountedPrice={discountedPrice}
              isBestSeller={isBestSeller}
              isRecentlyAdded={isRecentlyAdded}
              onNavigate={() => navigate(`/customer-dashboard/product/${product.id}`)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Order;

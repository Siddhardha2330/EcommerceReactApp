import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../lib/useUserStore';
import { useNavigate, Link, Routes, Route, useLocation, Outlet } from 'react-router-dom';
import Shop from './shop/shop';
import { FaShoppingCart } from 'react-icons/fa';
import './cus-dashboard.css';
// Placeholder imports for new pages
import Product from './product/product';
import Cart from './cart/cart';
import Checkout from './checkout/checkout';
import Order from './order/order';
import HeroSlider from './HeroSlider';
import { fetchCart } from '../../lib/cartStore';

const CustomerDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(state => state.user);
  const cart = useSelector(state => state.cart.items);

  // Fetch cart on dashboard load for navbar badge
  useEffect(() => {
    if (user.email) {
      dispatch(fetchCart(user.email));
    }
  }, [dispatch, user.email]);

  // Calculate total cart item count (sum of all quantities)
  const cartCount = cart && cart.length > 0 ? cart.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/customer-dashboard');
  };

  return (
    <div className="cus-dashboard">
      <nav className="cus-navbar">
        <div className="nav-left">
          <span className="brand" style={{fontSize: '1.2rem',fontFamily: 'monospace', cursor: 'pointer'}} onClick={() => navigate('/customer-dashboard')}>Ecommerce</span>
        </div>
        <div className="nav-right">
          <Link to="/customer-dashboard/shop" className="nav-link">Shop</Link>
          <Link to="/customer-dashboard/cart" className="cart-btn" title="Cart" style={{position:'relative'}}>
            <FaShoppingCart size={20} />
            {user.email && cartCount > 0 && (
              <span className="cart-count-badge">{cartCount}</span>
            )}
          </Link>
          <Link to="/customer-dashboard/orders" className="nav-link">Orders</Link>
          {user.email ? (
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          ) : (
            <>
              <button className="nav-link" style={{marginRight:8}} onClick={() => navigate('/login?mode=login')}>Login</button>
              <button className="nav-link" style={{marginRight: '2.6rem', marginLeft: 0}} onClick={() => navigate('/login?mode=signup')}>Signup</button>
            </>
          )}
        </div>
      </nav>
      {location.pathname === '/customer-dashboard' && <HeroSlider />}
      <div className="cus-content">
        <Outlet />
      </div>
    </div>
  );
};

export default CustomerDashboard;



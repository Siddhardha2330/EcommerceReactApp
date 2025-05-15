import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import LoginSignup from './components/login/login';
import AdminDashboard from './components/admin-dashboard/admin-dashboard';
import CustomerDashboard from './components/customer-dashboard/cus-dashboard';
import Shop from './components/customer-dashboard/shop/shop';
import Product from './components/customer-dashboard/product/product';
import Cart from './components/customer-dashboard/cart/cart';
import Checkout from './components/customer-dashboard/checkout/checkout';
import Order from './components/customer-dashboard/order/order';
import HeroSlider from './components/customer-dashboard/HeroSlider';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState, useRef } from 'react';
import { initializeAuth } from './lib/useUserStore';

import './App.css'

function ProtectedRoute({ children }) {
  const user = useSelector(state => state.user);
  const location = useLocation();
  if (!user.email) {
    return <Navigate to={`/login?mode=login&redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return children;
}

function App() {
  const user = useSelector(state => state.user);
  const dispatch = useDispatch();
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state, then set loading to false
    const unsubscribe = dispatch(initializeAuth(() => setAuthLoading(false)));
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [dispatch]);

  if (authLoading) {
    return (
      <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f6f7fb',color:'#232f3e',fontSize:'1.5rem',fontWeight:700}}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginSignup />} />
        <Route 
          path="/" 
          element={user.email ? 
            (user.role === 'admin' ? 
              <Navigate to="/admin-dashboard" /> : 
              <Navigate to="/customer-dashboard" />
            ) : 
            <Navigate to="/customer-dashboard" />
          } 
        />
        <Route 
          path="/admin-dashboard/*" 
          element={user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login?mode=login" />} 
        />
        <Route path="/customer-dashboard/*" element={<CustomerDashboard />}>
          <Route index element={<HeroSlider />} />
          <Route path="shop" element={<Shop />} />
          <Route path="product/:id" element={<Product />} />
          <Route path="cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute><Order /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/customer-dashboard/shop" />} />
      </Routes>
    </Router>
  );
}

export default App

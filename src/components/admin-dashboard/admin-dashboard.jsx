import React from 'react';
import { useDispatch } from 'react-redux';
import { logoutUser } from '../../lib/useUserStore';
import { useNavigate, Link, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import CreateProduct from './create/create';
import UpdateProduct from './update/update';
import UpdateForm from './updateform/updateform';
import './admin-dashboard.css';
import { FaShoppingCart } from 'react-icons/fa';

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/');
  };

  return (
    <div className="cus-dashboard">
      <nav className="cus-navbar">
        <div className="nav-left">
          <span className="brand" style={{cursor: 'pointer'}} onClick={() => navigate('/admin-dashboard')}>Admin Panel</span>
        </div>
        <div className="nav-right">
          <Link to="/admin-dashboard/create" className="nav-link">Create</Link>
          <Link to="/admin-dashboard/update" className="nav-link">Update</Link>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>
      <div className="cus-content">
        <Routes>
          <Route path="/" element={<div className="welcome-message">Welcome to Admin Dashboard</div>} />
          <Route path="/create" element={<CreateProduct />} />
          <Route path="/update" element={<UpdateProduct />} />
          <Route path="/update-product/:id" element={<UpdateForm />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminDashboard;

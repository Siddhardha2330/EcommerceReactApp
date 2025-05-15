import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCart, removeFromCart, updateCartQuantity } from '../../../lib/cartStore';
import { addOrder } from '../../../lib/orderStore';
import { useNavigate, useLocation } from 'react-router-dom';
import './checkout.css';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const TAX_RATE = 0.02;

// Helper to decrement product stock
async function decrementProductStock(productId, quantity) {
  const productRef = doc(db, 'products', productId);
  const productSnap = await getDoc(productRef);
  if (productSnap.exists()) {
    const currentStock = productSnap.data().stock || 0;
    const newStock = Math.max(0, currentStock - quantity);
    await updateDoc(productRef, { stock: newStock });
  }
}

const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const productId = params.get('productId');
  const urlQuantity = Number(params.get('quantity')) || 1;
  const user = useSelector(state => state.user);
  const cart = useSelector(state => state.cart.items);
  const products = useSelector(state => state.products.items);
  const cartLoading = useSelector(state => state.cart.loading);
  const [success, setSuccess] = useState(false);
  const [cartProducts, setCartProducts] = useState([]);
  const [cartProductsLoading, setCartProductsLoading] = useState(true);
  // productsLoading is now local state

  // DEBUG LOG
  console.log('Checkout render', { cart, products, cartLoading, user });

  useEffect(() => {
    if (!user.email) {
      navigate('/login?mode=login&redirect=/customer-dashboard/checkout');
      return;
    }
    if (user.email) {
      dispatch(fetchCart(user.email));
    }
  }, [dispatch, user.email, navigate]);

  useEffect(() => {
    const fetchCartProducts = async () => {
      setCartProductsLoading(true);
      const prods = [];
      let directProductFetched = false;
      for (const item of cart) {
        const docSnap = await getDoc(doc(db, 'products', item.productid));
        if (docSnap.exists()) {
          prods.push({ ...docSnap.data(), id: item.productid, cartId: item.id, quantity: item.quantity });
        }
        if (productId && item.productid === productId) directProductFetched = true;
      }
      // If direct order and not in cart, fetch it
      if (productId && !directProductFetched) {
        const docSnap = await getDoc(doc(db, 'products', productId));
        if (docSnap.exists()) {
          prods.unshift({ ...docSnap.data(), id: productId, cartId: 'direct', quantity: urlQuantity });
        }
      }
      setCartProducts(prods);
      setCartProductsLoading(false);
    };
    if (cart.length > 0 || location.search) fetchCartProducts();
    else {
      setCartProducts([]);
      setCartProductsLoading(false);
    }
  }, [cart, location.search]);

  const handleDecrement = (cartId, quantity) => {
    if (quantity > 1) {
      dispatch(updateCartQuantity({ cartId, quantity: quantity - 1 }));
    }
  };
  const handleIncrement = (cartId, quantity, max) => {
    if (quantity < max) {
      dispatch(updateCartQuantity({ cartId, quantity: quantity + 1 }));
    }
  };

  const subtotal = cartProducts.reduce((sum, p) => sum + (p.discount && p.discount > 0
    ? (p.cost - (p.cost * p.discount) / 100) * (p.quantity || 1)
    : p.cost * (p.quantity || 1)), 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (productId) {
      // Direct order: only order the product with cartId 'direct' or matching productId
      const directProduct = cartProducts.find(p => p.id === productId);
      if (directProduct) {
        const qty = directProduct.quantity || urlQuantity || 1;
        await dispatch(addOrder({ userid: user.email, productid: directProduct.id, quantity: qty }));
        await decrementProductStock(directProduct.id, qty);
        // Do NOT remove from cart
      }
    } else {
      // Full cart order: order all products in cart
      for (const product of cartProducts) {
        const qty = product.quantity || 1;
        await dispatch(addOrder({ userid: user.email, productid: product.id, quantity: qty }));
        await decrementProductStock(product.id, qty);
        // Do NOT remove from cart
      }
    }
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      navigate('/customer-dashboard/shop');
    }, 3000);
  };

  // Remove from cart handler with URL param fix
  const handleRemove = (cartId, productIdToRemove) => {
    dispatch(removeFromCart(cartId));
    if (productId && productId === productIdToRemove) {
      navigate('/customer-dashboard/checkout');
    }
  };

  // --- Loading and empty states ---
  if ((cartLoading || cartProductsLoading) && cartProducts.length === 0) {
    return <div className="checkout-container"><div style={{textAlign:'center', fontSize:'1.2rem', fontWeight:'600', marginTop:'2rem'}}>Loading checkout...</div></div>;
  }
  if (!cartProducts.length) {
    return <div className="checkout-container"><div className="empty">Your cart is empty.</div></div>;
  }

  return (
    <div className="checkout-container">
      {success && <div className="checkout-success">Successfully ordered!</div>}
      <div className="checkout-list">
        {cartProducts.map(product => (
          <div className="checkout-item" key={product.cartId + '-' + product.id}>
            <span className="checkout-title" onClick={() => navigate(`/customer-dashboard/product/${product.id}`)} style={{cursor: 'pointer'}}>{product.name}</span>
            <div className="quantity-selector">
              <button
                className="qty-btn"
                onClick={() => handleDecrement(product.cartId, product.quantity)}
                disabled={product.quantity <= 1}
              >
                -
              </button>
              <span className="qty-value">{product.quantity}</span>
              <button
                className="qty-btn"
                onClick={() => handleIncrement(product.cartId, product.quantity, product.stock)}
                disabled={product.quantity >= product.stock}
              >
                +
              </button>
            </div>
            <span style={{color:'#888', fontSize:'0.95rem'}}>max: {product.stock}</span>
            <span className="checkout-price">₹{((product.discount && product.discount > 0
              ? (product.cost - (product.cost * product.discount) / 100)
              : product.cost) * (product.quantity || 1)).toFixed(2)}</span>
            {product.cartId !== 'direct' ? (
              <button className="checkout-remove" onClick={() => handleRemove(product.cartId, product.id)}>Remove</button>
            ) : null}
          </div>
        ))}
      </div>
      <div className="checkout-summary">
        <div>Subtotal: ₹{subtotal.toFixed(2)}</div>
        <div>Tax(2%): ₹{tax.toFixed(2)}</div>
        <div><b>Total Price: ₹{total.toFixed(2)}</b></div>
        <button className="checkout-btn" onClick={handleCheckout} disabled={cartProducts.length === 0}>Checkout</button>
        <button className="checkout-btn" style={{background:'#eee', color:'#232f3e', marginTop:12}} onClick={() => navigate('/customer-dashboard/shop')}>Cancel</button>
      </div>
    </div>
  );
};

export default Checkout;

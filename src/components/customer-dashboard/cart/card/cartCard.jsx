import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateCartQuantity } from '../../../../lib/cartStore';
import { useNavigate } from 'react-router-dom';
import './cartCard.css';

const CartCard = React.memo(({
  product,
  avgRating,
  hasDiscount,
  discountedPrice,
  onRemove,
  onNavigate,
  stock = 1,
  onOrder
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(state => state.user);
  const quantity = product.quantity || 1;
  const [loading, setLoading] = React.useState(false);
  const handleDecrement = async (e) => {
    e.stopPropagation();
    if (!user.email) {
      navigate('/login?mode=login&redirect=/customer-dashboard/cart');
      return;
    }
    if (quantity > 1) {
      setLoading(true);
      await dispatch(updateCartQuantity({ cartId: product.cartId, quantity: quantity - 1 }));
      setLoading(false);
    }
  };
  const handleIncrement = async (e) => {
    e.stopPropagation();
    if (!user.email) {
      navigate('/login?mode=login&redirect=/customer-dashboard/cart');
      return;
    }
    if (quantity < stock) {
      setLoading(true);
      await dispatch(updateCartQuantity({ cartId: product.cartId, quantity: quantity + 1 }));
      setLoading(false);
    }
  };
  const handleOrder = (e) => {
    e.stopPropagation();
    if (!user.email) {
      navigate('/login?mode=login&redirect=/customer-dashboard/cart');
      return;
    }
    onOrder && onOrder(quantity);
  };

  return (
    <div className="shop-card" style={{marginLeft: '0.5rem', width: '23vw', maxWidth: 220, minWidth: 150}}>
      <div className="shop-img-wrap" onClick={onNavigate} style={{cursor: 'pointer'}}>
        {hasDiscount && product.discount > 0 && <span className="shop-tag shop-tag-discount">Discount</span>}
        <img src={product.url} alt={product.name} className="shop-img" />
      </div>
      <div className="shop-name">{product.name}</div>
      <div className="shop-stars">
        {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}
        <span className="shop-avg">({avgRating})</span>
      </div>
      <div className="shop-price-row">
        <span className="shop-price">₹{discountedPrice}</span>
        {hasDiscount && (
          <span className="shop-original">₹{Number(product.cost).toFixed(2)}</span>
        )}
      </div>
      <div style={{width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between'}}>
        <div className="quantity-selector" style={{margin: 0, width: 'auto', flex: 1, minWidth: 0}}>
          <button className="qty-btn" onClick={handleDecrement} disabled={quantity <= 1 || loading}>-</button>
          <span className="qty-value">{quantity}</span>
          <button className="qty-btn" onClick={handleIncrement} disabled={quantity >= stock || loading}>+</button>
        </div>
        <span
          style={{cursor: 'pointer', fontSize: '1.2rem', color: 'red', marginLeft: 8}}
          title="Remove from cart"
          onClick={e => { e.stopPropagation(); onRemove && onRemove(); }}
        >
          🗑️
        </span>
      </div>
      <button className="shop-order-btn" onClick={handleOrder} style={{marginTop:8}}>Order</button>
    </div>
  );
});

export default CartCard;

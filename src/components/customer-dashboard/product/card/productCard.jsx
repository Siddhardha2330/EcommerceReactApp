import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateCartQuantity } from '../../../../lib/cartStore';
import { useNavigate } from 'react-router-dom';
import './productCard.css';

const ProductCard = React.memo(({
  product,
  avgRating,
  hasDiscount,
  discountedPrice,
  inCart,
  isBestSeller,
  isRecentlyAdded,
  onAddToCart,
  onRemove,
  onNavigate,
  stock = 1,
  onOrder
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(state => state.user);
  const quantity = product.quantity || 1;
  const handleDecrement = (e) => {
    e.stopPropagation();
    if (!user.email) {
      navigate('/login?mode=login&redirect=/customer-dashboard/shop');
      return;
    }
    if (quantity > 1) {
      dispatch(updateCartQuantity({ cartId: product.cartId, quantity: quantity - 1 }));
    }
  };
  const handleIncrement = (e) => {
    e.stopPropagation();
    if (!user.email) {
      navigate('/login?mode=login&redirect=/customer-dashboard/shop');
      return;
    }
    if (quantity < stock) {
      dispatch(updateCartQuantity({ cartId: product.cartId, quantity: quantity + 1 }));
    }
  };
  const handleOrder = (e) => {
    e.stopPropagation();
    if (!user.email) {
      navigate('/login?mode=login&redirect=/customer-dashboard/shop');
      return;
    }
    onOrder && onOrder(quantity);
  };
  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (!user.email) {
      navigate('/login?mode=login&redirect=/customer-dashboard/shop');
      return;
    }
    onAddToCart && onAddToCart();
  };

  return (
    <div className="shop-card">
      <div className="shop-img-wrap" onClick={onNavigate} style={{cursor: 'pointer'}}>
        <div className="shop-tags-row">
          {hasDiscount && <span className="shop-tag shop-tag-discount">Discount</span>}
          {isBestSeller && <span className="shop-tag shop-tag-bestseller">Best Seller</span>}
          {isRecentlyAdded && <span className="shop-tag shop-tag-recent">Recently Added</span>}
        </div>
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
      {inCart && product.cartId ? (
        <>
          <div style={{width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between'}}>
            <div className="quantity-selector" style={{margin: 0, width: 'auto', flex: 1, minWidth: 0}}>
              <button className="qty-btn" onClick={handleDecrement} disabled={quantity <= 1}>-</button>
              <span className="qty-value">{quantity}</span>
              <button className="qty-btn" onClick={handleIncrement} disabled={quantity >= stock}>+</button>
            </div>
            <span
              style={{cursor: 'pointer', fontSize: '1.2rem', color: 'red', marginLeft: 8}}
              title="Remove from cart"
              onClick={e => { e.stopPropagation(); onRemove && onRemove(); }}
            >
              🗑️
            </span>
          </div>
          <button className="shop-order-btn" onClick={handleOrder} style={{marginTop: 8, width: '100%'}}>Order</button>
        </>
      ) : (
        <button className="shop-add-cart-btn" onClick={handleAddToCart} style={{marginTop:8}}>
          + Add to Cart
        </button>
      )}
    </div>
  );
});

export default ProductCard;

import React from 'react';
import './orderCard.css';

const OrderCard = React.memo(({
  product,
  avgRating,
  hasDiscount,
  discountedPrice,
  isBestSeller,
  isRecentlyAdded,
  onNavigate,
  onRemove,
  inCart
}) => {
  return (
    <div className="shop-card" style={{marginLeft: '0.5rem', width: '23vw', maxWidth: 220, minWidth: 150, height: 'auto'}}>
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
    </div>
  );
});

export default OrderCard;

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './updateCard.css';
import { useDispatch } from 'react-redux';
import { deleteProduct } from '../../../../lib/productStore';
import { FaTrash } from 'react-icons/fa';

const UpdateCard = React.memo(({ product, onClick, avgRating, hasDiscount, discountedPrice, isBestSeller, isRecentlyAdded }) => {
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  const handleDelete = async (e) => {
    e.stopPropagation();
    setShowModal(true);
  };
  const confirmDelete = async (e) => {
    e.stopPropagation();
    await dispatch(deleteProduct(product.id));
    setShowModal(false);
  };
  const cancelDelete = (e) => {
    e.stopPropagation();
    setShowModal(false);
  };
  return (
    <div className="shop-card" onClick={onClick} style={{height: '260px', marginLeft: '0.5rem', width: '23vw', maxWidth: 220, minWidth: 150, cursor: 'pointer', position: 'relative'}}>
      <div className="shop-img-wrap">
        <div className="shop-tags-row">
          {hasDiscount && <span className="shop-tag shop-tag-discount">Discount</span>}
          {isBestSeller && <span className="shop-tag shop-tag-bestseller">Best Seller</span>}
          {isRecentlyAdded && <span className="shop-tag shop-tag-recent">Recently Added</span>}
        </div>
        <img src={product.url} alt={product.name} className="shop-img" />
      </div>
      <div className="shop-name">{product.name}</div>
      <div className="shop-price-row">
        <span className="shop-price">₹{discountedPrice ?? product.cost}</span>
        {hasDiscount && (
          <span className="shop-original">₹{Number(product.cost).toFixed(2)}</span>
        )}
      </div>
      {product.stock !== undefined && (
        <div style={{fontSize:'0.95rem', color:'#888', marginTop:4}}>Stock: {product.stock}</div>
      )}
      <button style={{position:'absolute', bottom:8, right:90, background:'#fff0f0', color:'#d32f2f', border:'1px solid #d32f2f', borderRadius:90, padding:'0.3rem 0.7rem', fontWeight:600, cursor:'pointer'}} onClick={handleDelete} aria-label="Delete product">
        <FaTrash size={18} />
      </button>
      {showModal && ReactDOM.createPortal(
        <div className="delete-modal-overlay" onClick={cancelDelete}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-title">Delete this product?</div>
            <div className="delete-modal-actions">
              <button className="delete-modal-cancel" onClick={cancelDelete}>Cancel</button>
              <button className="delete-modal-confirm" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

export default UpdateCard;

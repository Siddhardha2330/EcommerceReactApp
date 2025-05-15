import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addProduct } from '../../../lib/productStore';
import { useNavigate } from 'react-router-dom';
import { uploadImage } from '../../../lib/upload';
import './create.css';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const CreateProduct = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const products = useSelector(state => state.products.items);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    url: '',
    cost: '',
    discount: '',
    details: '',
    stock: ''
  });
  const [error, setError] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const categoryInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingCategories, setExistingCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const productsRef = collection(db, 'products');
        const snapshot = await getDocs(productsRef);
        const categories = Array.from(new Set(snapshot.docs.map(doc => doc.data().category).filter(Boolean)));
        setExistingCategories(categories);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const filteredCategories = React.useMemo(() => {
    if (!categoryInput) return existingCategories;
    return existingCategories.filter(cat =>
      cat.toLowerCase().includes(categoryInput.toLowerCase())
    );
  }, [categoryInput, existingCategories]);

 
  const showDropdown = showCategoryDropdown && filteredCategories.length > 0;

 
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        categoryInputRef.current &&
        !categoryInputRef.current.contains(event.target)
      ) {
        setShowCategoryDropdown(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

 
  const handleCategoryInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredCategories.length) {
        setFormData(prev => ({ ...prev, category: filteredCategories[highlightedIndex] }));
      } else {
        setFormData(prev => ({ ...prev, category: categoryInput }));
      }
      setShowCategoryDropdown(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredCategories.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (name === 'category') {
      setCategoryInput(value);
      setShowCategoryDropdown(true);
      setHighlightedIndex(-1);
    }
  };

  const handleCategorySelect = (cat) => {
    setFormData(prev => ({ ...prev, category: cat }));
    setCategoryInput(cat);
    setShowCategoryDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

      // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

   
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

  
    setSelectedFile(file);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name || !formData.category || !selectedFile || !formData.cost || !formData.stock) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsUploading(true);
      
      
      const imageUrl = await uploadImage(selectedFile);
      
      await dispatch(addProduct({
        ...formData,
        url: imageUrl,
        cost: parseFloat(formData.cost),
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        stock: parseInt(formData.stock, 10),
        createdAt: Date.now()
      })).unwrap();

      // Reset form
      setFormData({
        name: '',
        category: '',
        url: '',
        cost: '',
        discount: '',
        details: '',
        stock: ''
      });
      setImagePreview(null);
      setSelectedFile(null);
      navigate('/admin-dashboard/update');
    } catch (err) {
      setError('Failed to add product. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="create-product">
      <h2>Create New Product</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label htmlFor="name">Product Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group category-group">
          <label htmlFor="category">Category *</label>
          <input
            type="text"
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            onFocus={() => setShowCategoryDropdown(true)}
            onKeyDown={handleCategoryInputKeyDown}
            autoComplete="off"
            required
            ref={categoryInputRef}
            placeholder="Type or select a category"
          />
          {showDropdown && (
            <div className="category-dropdown" ref={dropdownRef}>
              {filteredCategories.map((cat, idx) => (
                <div
                  key={cat}
                  className={`category-dropdown-item${idx === highlightedIndex ? ' selected' : ''}`}
                  onClick={() => handleCategorySelect(cat)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  {cat}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="image">Product Image *</label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            required
          />
          {isUploading && <div className="upload-status">Uploading image...</div>}
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="cost">Cost (₹) *</label>
          <input
            type="number"
            id="cost"
            name="cost"
            value={formData.cost}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="discount">Discount (%)</label>
          <input
            type="number"
            id="discount"
            name="discount"
            value={formData.discount}
            onChange={handleChange}
            min="0"
            max="100"
            step="1"
          />
        </div>
 
        <div className="form-group">
          <label htmlFor="stock">Stock</label>
          <input
            type="number"
            id="stock"
            name="stock"
            value={formData.stock}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="details">Product Details</label>
          <textarea
            id="details"
            name="details"
            value={formData.details}
            onChange={handleChange}
            rows="4"
          />
        </div>

        <button type="submit" className="submit-btn" disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Add Product'}
        </button>
      </form>
    </div>
  );
};

export default CreateProduct;

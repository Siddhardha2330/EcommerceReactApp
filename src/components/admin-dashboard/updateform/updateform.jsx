import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { uploadImage } from '../../../lib/upload';
import './updateform.css';
import { collection, getDocs } from 'firebase/firestore';

const UpdateForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    cost: '',
    discount: '',
    details: '',
    stock: '',
    url: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const dropdownRef = useRef(null);
  const [existingCategories, setExistingCategories] = useState([]);

  // Fetch existing categories
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

  // Filtered categories based on input
  const filteredCategories = React.useMemo(() => {
    if (!categoryInput) return existingCategories;
    return existingCategories.filter(cat =>
      cat.toLowerCase().includes(categoryInput.toLowerCase())
    );
  }, [categoryInput, existingCategories]);

  // Show dropdown if there are suggestions
  const showDropdown = showCategoryDropdown && filteredCategories.length > 0;

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            name: data.name || '',
            category: data.category || '',
            cost: data.cost || '',
            discount: data.discount || '',
            details: data.details || '',
            stock: data.stock || '',
            url: data.url || ''
          });
          setPreviewUrl(data.url || '');
        } else {
          setError('Product not found');
        }
      } catch (err) {
        setError('Error fetching product');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategoryInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setFormData(prev => ({ ...prev, category: categoryInput }));
      setShowCategoryDropdown(false);
    }
  };

  const handleCategorySelect = (cat) => {
    setFormData(prev => ({ ...prev, category: cat }));
    setCategoryInput(cat);
    setShowCategoryDropdown(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'category') {
      setCategoryInput(value);
      setShowCategoryDropdown(true);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('File must be an image');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUploading(true);

    try {
      let imageUrl = formData.url;

      // Only upload if a new file was selected
      if (selectedFile) {
        try {
          imageUrl = await uploadImage(selectedFile);
        } catch (uploadError) {
          setError('Error uploading image. Please try again.');
          setUploading(false);
          return;
        }
      }

      const updatedData = {
        ...formData,
        url: imageUrl,
        cost: Number(formData.cost),
        discount: Number(formData.discount),
        stock: Number(formData.stock)
      };

      await updateDoc(doc(db, 'products', id), updatedData);
      navigate('/admin-dashboard/update');
    } catch (err) {
      setError('Error updating product');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        navigate('/admin-dashboard/update');
      } catch (err) {
        setError('Error deleting product');
      }
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="update-form">
      <h2>Update Product</h2>
      {error && <div className="error-message">{error}</div>}
      <form className="product-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Product Name</label>
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
          <label htmlFor="category">Category</label>
          <input
            type="text"
            id="category"
            value={formData.category}
            onChange={(e) => {
              setCategoryInput(e.target.value);
              setFormData(prev => ({ ...prev, category: e.target.value }));
            }}
            onFocus={() => setShowCategoryDropdown(true)}
            required
          />
          {showDropdown && (
            <div className="category-dropdown" ref={dropdownRef}>
              {filteredCategories.map((cat) => (
                <div
                  key={cat}
                  className="category-dropdown-item"
                  onClick={() => handleCategorySelect(cat)}
                >
                  {cat}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="cost">Cost (₹)</label>
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
            required
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
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="details">Details</label>
          <textarea
            id="details"
            name="details"
            value={formData.details}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="image" className="image-upload-label">
            {previewUrl ? 'Change Image' : 'Upload Image'}
          </label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          {previewUrl && (
            <div className="image-preview">
              <img src={previewUrl} alt="Preview" />
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate('/admin-dashboard/update')}>
            Cancel
          </button>
          <button type="submit" className="update-btn" disabled={uploading}>
            {uploading ? 'Updating...' : 'Update Product'}
          </button>
          <button type="button" className="delete-btn" onClick={handleDelete}>
            Delete Product
          </button>
        </div>
      </form>
    </div>
  );
};

export default UpdateForm;

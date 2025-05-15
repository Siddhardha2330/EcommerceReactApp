import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, deleteDoc, orderBy, startAfter, limit } from 'firebase/firestore';
import { db } from './firebase';

// Fetch all products
export const fetchProducts = createAsyncThunk('products/fetchAll', async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
});

// Add new product
export const addProduct = createAsyncThunk('products/add', async (productData) => {
  try {
    const docRef = await addDoc(collection(db, 'products'), productData);
    return { id: docRef.id, ...productData };
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
});

// Update product
export const updateProduct = createAsyncThunk('products/update', async ({ id, ...productData }) => {
  try {
    await updateDoc(doc(db, 'products', id), productData);
    return { id, ...productData };
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
});

// Search products
export const searchProducts = createAsyncThunk('products/search', async (searchTerm) => {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter products based on search term
    const filteredProducts = products.filter(product => 
      product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return filteredProducts;
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
});

// Delete product
export const deleteProduct = createAsyncThunk('products/delete', async (id) => {
  try {
    await deleteDoc(doc(db, 'products', id));
    return id;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
});

// Paginated fetch products with filters
export const fetchProductsPaginated = createAsyncThunk(
  'products/fetchPaginated',
  async ({ filters = {}, lastDoc = null, pageSize = 12 }) => {
    try {
      console.log('Fetching products with filters:', filters);
      let baseQuery = collection(db, 'products');
      const constraints = [];

      // Apply category filter
      if (filters.category) {
        constraints.push(where('category', '==', filters.category));
      }

      // Apply price range filter
      if (filters.minPrice !== undefined && filters.minPrice !== null) {
        constraints.push(where('cost', '>=', filters.minPrice));
      }
      if (filters.maxPrice !== undefined && filters.maxPrice !== null && filters.maxPrice !== Infinity) {
        constraints.push(where('cost', '<=', filters.maxPrice));
      }

      // Apply discount filter
      if (filters.minDiscount !== undefined && filters.minDiscount !== null) {
        constraints.push(where('discount', '>=', filters.minDiscount));
      }

      // Apply ordering based on filters
      if (filters.search) {
        constraints.push(orderBy('name', 'asc'));
      } else if (filters.category) {
        constraints.push(orderBy('category', 'asc'));
        constraints.push(orderBy('cost', 'asc'));
      } else {
        constraints.push(orderBy('cost', 'asc'));
      }

      // Apply pagination
      if (lastDoc) {
        // Create a document reference from the serialized lastDoc
        const lastDocRef = doc(db, 'products', lastDoc.id);
        constraints.push(startAfter(lastDocRef));
      }
      constraints.push(limit(pageSize));

      // Build the final query
      const finalQuery = query(baseQuery, ...constraints);

      console.log('Executing query with constraints:', constraints);
      const snapshot = await getDocs(finalQuery);
      console.log('Query returned', snapshot.docs.length, 'documents');

      let products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply rating filter in memory
      if (filters.minRating !== undefined && filters.minRating !== null) {
        // Fetch all reviews for the products in this batch
        const reviewsSnapshot = await getDocs(collection(db, 'review'));
        const allReviews = reviewsSnapshot.docs.map(doc => doc.data());
        
        // Calculate average rating for each product
        const productsWithRatings = products.map(product => {
          const productReviews = allReviews.filter(review => review.productid === product.id);
          const avgRating = productReviews.length > 0 
            ? productReviews.reduce((acc, review) => acc + Number(review.rating), 0) / productReviews.length 
            : 0;
          return { ...product, avgRating };
        });

        // Filter products based on minimum rating
        products = productsWithRatings.filter(product => product.avgRating >= filters.minRating);
        console.log('After rating filter:', products.length, 'products');
      }

      // Apply search filter in memory
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        products = products.filter(product => 
          product.name.toLowerCase().includes(searchTerm) ||
          product.category.toLowerCase().includes(searchTerm)
        );
        console.log('After search filter:', products.length, 'products');
      }

      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      const hasMore = snapshot.docs.length === pageSize;

      return {
        products,
        hasMore
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    loading: false,
    error: null,
    searchTerm: '',
    lastDoc: null,
    hasMore: true
  },
  reducers: {
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Add Product
      .addCase(addProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(addProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Update Product
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Delete Product
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(item => item.id !== action.payload);
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Search Products
      .addCase(searchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Paginated fetch
      .addCase(fetchProductsPaginated.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductsPaginated.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.products;
        state.hasMore = action.payload.hasMore;
      })
      .addCase(fetchProductsPaginated.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export const { setSearchTerm } = productSlice.actions;
export default productSlice.reducer;

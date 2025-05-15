import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// Add to cart
export const addToCart = createAsyncThunk('cart/add', async ({ userid, productid, quantity = 1 }) => {
  const docRef = await addDoc(collection(db, 'cart'), { userid, productid, quantity });
  return { id: docRef.id, userid, productid, quantity };
});

// Update cart quantity
export const updateCartQuantity = createAsyncThunk('cart/updateQuantity', async ({ cartId, quantity }) => {
  await updateDoc(doc(db, 'cart', cartId), { quantity });
  return { cartId, quantity };
});

// Remove from cart
export const removeFromCart = createAsyncThunk('cart/remove', async (cartId) => {
  await deleteDoc(doc(db, 'cart', cartId));
  return cartId;
});

// Fetch cart for user
export const fetchCart = createAsyncThunk('cart/fetch', async (userid) => {
  const q = query(collection(db, 'cart'), where('userid', '==', userid));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    loading: false,
    error: null,
    initialLoadComplete: false
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.initialLoadComplete = true;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateCartQuantity.fulfilled, (state, action) => {
        const item = state.items.find(i => i.id === action.payload.cartId);
        if (item) item.quantity = action.payload.quantity;
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item.id !== action.payload);
      });
  }
});

export default cartSlice.reducer;

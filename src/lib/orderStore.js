import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

// Add order
export const addOrder = createAsyncThunk('order/add', async ({ userid, productid, quantity = 1 }) => {
  const docRef = await addDoc(collection(db, 'order'), { userid, productid, quantity });
  return { id: docRef.id, userid, productid, quantity };
});

// Fetch orders for user or all orders if no user specified
export const fetchOrders = createAsyncThunk('order/fetch', async (userid) => {
  let q;
  if (userid) {
    q = query(collection(db, 'order'), where('userid', '==', userid));
  } else {
    q = collection(db, 'order');
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});

const orderSlice = createSlice({
  name: 'order',
  initialState: {
    items: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(addOrder.fulfilled, (state, action) => {
        state.items.push(action.payload);
      });
  }
});

export default orderSlice.reducer;

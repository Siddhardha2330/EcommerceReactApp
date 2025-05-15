import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, addDoc, getDocs, query, where, doc as firestoreDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// Add review
export const addReview = createAsyncThunk('review/add', async ({ userid, productid, review, rating }) => {
  const createdAt = Date.now();
  const docRef = await addDoc(collection(db, 'review'), { userid, productid, review, rating, createdAt });
  return { id: docRef.id, userid, productid, review, rating, createdAt };
});

// Delete review
export const deleteReview = createAsyncThunk('review/delete', async (reviewId) => {
  await deleteDoc(firestoreDoc(db, 'review', reviewId));
  return reviewId;
});

// Edit review
export const editReview = createAsyncThunk('review/edit', async ({ id, review, rating }) => {
  const editedAt = Date.now();
  await updateDoc(firestoreDoc(db, 'review', id), { review, rating, editedAt });
  return { id, review, rating, editedAt };
});

// Fetch reviews for product
export const fetchReviews = createAsyncThunk('review/fetch', async (productid) => {
  let querySnapshot;
  if (productid) {
    const q = query(collection(db, 'review'), where('productid', '==', productid));
    querySnapshot = await getDocs(q);
  } else {
    querySnapshot = await getDocs(collection(db, 'review'));
  }
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});

const reviewSlice = createSlice({
  name: 'review',
  initialState: {
    items: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(addReview.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.items = state.items.filter(r => r.id !== action.payload);
      })
      .addCase(editReview.fulfilled, (state, action) => {
        const idx = state.items.findIndex(r => r.id === action.payload.id);
        if (idx !== -1) {
          state.items[idx].review = action.payload.review;
          state.items[idx].rating = action.payload.rating;
          state.items[idx].editedAt = action.payload.editedAt;
        }
      });
  }
});

export default reviewSlice.reducer;

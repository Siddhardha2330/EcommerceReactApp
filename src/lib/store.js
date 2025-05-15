import { configureStore } from '@reduxjs/toolkit';
import userReducer from './useUserStore';
import productsReducer from './productStore';
import cartReducer from './cartStore';
import orderReducer from './orderStore';
import reviewReducer from './reviewStore';

const store = configureStore({
  reducer: {
    user: userReducer,
    products: productsReducer,
    cart: cartReducer,
    order: orderReducer,
    review: reviewReducer,
  },
});

export default store; 
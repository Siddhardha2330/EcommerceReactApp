import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import app from './firebase';

const auth = getAuth(app);
const db = getFirestore(app);

// Add auth state listener
export const initializeAuth = (onReady) => (dispatch) => {
  let first = true;
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is signed in
      const userDoc = await getDoc(doc(db, 'users', user.email));
      const userData = userDoc.data();
      dispatch(setUser({ 
        email: user.email, 
        role: userData.role,
        message: 'Logged in successfully' 
      }));
    } else {
      // User is signed out
      dispatch(setUser({ email: null, role: null, message: '' }));
    }
    if (first && onReady) { onReady(); first = false; }
  });
};

// Add logout action
export const logoutUser = createAsyncThunk('user/logout', async () => {
  try {
    await signOut(auth);
    return { message: 'Logged out successfully' };
  } catch (error) {
    console.error('Logout error:', error);
    return { message: error.message };
  }
});

export const loginUser = createAsyncThunk('user/login', async ({ email, password }) => {
  try {
    console.log('Trying to login with:', email, password);

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get user role from Firestore
    const userDoc = await getDoc(doc(db, 'users', email));
    const userData = userDoc.data();
    
    console.log('Login successful for user:', user.email);
    return { 
      email: user.email, 
      role: userData.role,
      message: 'Logged in successfully' 
    };
  } catch (error) {
    console.error('Login error:', error);
    return { message: error.message };
  }
});

export const signupUser = createAsyncThunk('user/signup', async ({ username, email, password }) => {
  console.log('Parameters received in signupUser:', { username, email, password });
  try {
    console.log('Signup initiated for:', email);
    if (typeof email !== 'string' || !email) {
      console.error('Invalid email:', email);
      return { message: 'Invalid email address' };
    }
    const userDoc = await getDoc(doc(db, 'users', email));
    if (userDoc.exists()) {
      console.log('Email already exists:', email);
      return { message: 'Email already exists' };
    }

    // Create the user on Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('Firebase Auth user created:', userCredential.user.uid);

    // Store user data into Firestore with default role as 'customer'
    const hashedPassword = bcrypt.hashSync(password, 10);
    await setDoc(doc(db, 'users', email), { 
      username, 
      email, 
      password: hashedPassword,
      role: 'customer' // Default role for new users
    });
    console.log('User data stored in Firestore:', email);

    return { message: 'Signed up successfully' };
  } catch (error) {
    console.error('Signup error:', error);
    return { message: error.message };
  }
});

const userSlice = createSlice({
  name: 'user',
  initialState: { 
    email: null, 
    role: null,
    message: '' 
  },
  reducers: {
    setUser: (state, action) => {
      state.email = action.payload.email;
      state.role = action.payload.role;
      state.message = action.payload.message;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.fulfilled, (state, action) => {
        state.email = action.payload.email;
        state.role = action.payload.role;
        state.message = action.payload.message;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.message = action.payload.message;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.email = null;
        state.role = null;
        state.message = '';
      });
  },
});

export const { setUser } = userSlice.actions;
export default userSlice.reducer;

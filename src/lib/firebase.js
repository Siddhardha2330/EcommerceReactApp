// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCn46-Ipn6Jp1sZk7lzV4_pEn7BIoPqLhw",
  authDomain: "ecommerce-8c35e.firebaseapp.com",
  projectId: "ecommerce-8c35e",
  storageBucket: "gs://ecommerce-8c35e.firebasestorage.app",
  messagingSenderId: "314747271554",
  appId: "1:314747271554:web:8522eac6852d000da7379b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
export default app;
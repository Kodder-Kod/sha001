import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth"; 
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBOTT8d5zqMcmGHiDOseQ9NbdugSKyLbtY",
  authDomain: "chisendposproduction008.firebaseapp.com",
  databaseURL: "https://chisendposproduction008-default-rtdb.firebaseio.com",
  projectId: "chisendposproduction008",
  storageBucket: "chisendposproduction008.firebasestorage.app",
  messagingSenderId: "596713428236",
  appId: "1:596713428236:web:6ca0f26618956659032529",
  measurementId: "G-VQEW30YNE5"
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase services using the modular SDK
const db = getDatabase(app);

// Initialize Firebase Auth with React Native persistence
const auth = getAuth(app);

export { db, auth };



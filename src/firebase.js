// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth'; // Import getAuth and GoogleAuthProvider

const firebaseConfig = {
  apiKey: "AIzaSyCo7jgh7Y-vYB13kvP3bp7UCBZL5U_yXdc",
  authDomain: "streeteye-655c7.firebaseapp.com",
  projectId: "streeteye-655c7",
  storageBucket: "streeteye-655c7.firebasestorage.app",
  messagingSenderId: "75316245182",
  appId: "1:75316245182:web:de95ffc384cb02c4de24ef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider(); // Initialize GoogleAuthProvider here

export { db, auth, provider }; // Export db, auth, AND provider
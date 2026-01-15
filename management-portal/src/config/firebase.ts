import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDnwoFporKT4FccRhOOzTrShc-J-5Zwxnk",
  authDomain: "manage-eka.firebaseapp.com",
  projectId: "manage-eka",
  storageBucket: "manage-eka.firebasestorage.app",
  messagingSenderId: "898933805204",
  appId: "1:898933805204:web:b9c933d996fdbc48e76481",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;

import { getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export const createUserAsAdmin = async (
  email: string,
  password: string,
  displayName: string,
  role: 'superadmin' | 'admin' | 'member',
  department: string = ''
) => {
  // Create a secondary Firebase app instance for creating users
  const secondaryApp = getApp();
  const secondaryAuth = getAuth(secondaryApp);
  
  try {
    // Create user with secondary auth
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const newUser = userCredential.user;
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', newUser.uid), {
      email,
      displayName,
      role,
      department,
      createdAt: Timestamp.now(),
    });
    
    // Sign out the new user from secondary auth to prevent auto-login
    await signOut(secondaryAuth);
    
    return newUser.uid;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

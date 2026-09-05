import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBtX3HDnydk_wcf2PkguJ8mtttk4gYx_IE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'tec-events-platform.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tec-events-platform',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'tec-events-platform.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '534782326840',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:534782326840:web:3570e650810052d9394ecd',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export default app;
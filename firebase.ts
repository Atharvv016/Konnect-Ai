
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Using the environment API key as requested. 
// Note: For full functionality, authDomain and projectId must match your actual Firebase Console settings.
const firebaseConfig = {
  apiKey: "AIzaSyCU-wY2-F1Hll9MHmmj7pIsgpMcmMAh7go",
  authDomain: "konnect-ai-orchestrator.firebaseapp.com",
  projectId: "connect-66a5d",
  storageBucket: "connect-66a5d.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider, storage };

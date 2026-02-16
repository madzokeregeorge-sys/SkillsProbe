import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase config keys are designed to be public — security comes from
// Firebase Security Rules (see firestore.rules), not from hiding these.
const firebaseConfig = {
  apiKey: "AIzaSyCZBOQZorev3y6a9Tuvyh8p-nW9sN3jVns",
  authDomain: "skillprobe-app.firebaseapp.com",
  projectId: "skillprobe-app",
  storageBucket: "skillprobe-app.firebasestorage.app",
  messagingSenderId: "728567794062",
  appId: "1:728567794062:web:edbd3ce9e8ffa86450bcdf",
  measurementId: "G-7ZCSC6JX6D"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Always true in production — used by AuthPanel to check config
const isConfigured = true;

export { auth, db, isConfigured };
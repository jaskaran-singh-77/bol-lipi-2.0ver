import { initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredFirebaseKeys = ["apiKey", "authDomain", "projectId", "appId"] as const;
const hasFirebaseConfig = requiredFirebaseKeys.every((key) => Boolean(firebaseConfig[key]));

const firebaseUnavailableReason = hasFirebaseConfig
  ? null
  : "Firebase is not configured. Set the VITE_FIREBASE_* variables in your deployment environment.";

let auth: Auth | null = null;
let db: Firestore | null = null;

if (hasFirebaseConfig) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.warn(firebaseUnavailableReason);
}

export { auth, db, hasFirebaseConfig, firebaseUnavailableReason };

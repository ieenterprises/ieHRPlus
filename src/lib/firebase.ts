// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "projectId": "iefileflow-87306218-73bc1",
  "appId": "1:460549901546:web:cbe9dac181e0b704909b93",
  "storageBucket": "iefileflow-87306218-73bc1.firebasestorage.app",
  "apiKey": "AIzaSyAUaFp1qiGfmpnW7rf5LiLyHntRfMxHjxs",
  "authDomain": "iefileflow-87306218-73bc1.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "460549901546"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Initialize Firestore with multi-tab persistence
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  experimentalForceOwningTab: false, // Ensure this is false for multi-tab
});

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db, {
    forceOwnership: false // Redundant with experimentalForceOwningTab: false, but good for clarity
  })
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        // Silently fail for other tabs.
        console.log("Firestore persistence failed: another tab has it enabled.");
      } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence
        console.log("Firestore persistence is not available in this browser.");
      }
    });
}


export { app, auth, db };

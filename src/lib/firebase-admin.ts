// This file is new
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

// IMPORTANT: Replace the placeholder values with your actual service account credentials
// It is highly recommended to use environment variables to store your credentials securely.
// Do not commit your service account key to your version control system.
const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

/**
 * Initializes the Firebase Admin app if it hasn't been initialized already.
 * This function is idempotent and can be safely called multiple times.
 * @returns {App} The initialized Firebase Admin App instance.
 */
export function initFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

// This file is new
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import 'dotenv/config';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  const missingVars = [
    !projectId && 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    !clientEmail && 'FIREBASE_ADMIN_CLIENT_EMAIL',
    !privateKey && 'FIREBASE_ADMIN_PRIVATE_KEY',
  ].filter(Boolean).join(', ');

  throw new Error(
    `Firebase Admin initialization failed. Missing environment variables: ${missingVars}. Please add them to your .env.local file.`
  );
}

const serviceAccount = {
  projectId,
  clientEmail,
  privateKey,
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

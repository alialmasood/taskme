import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

export const auth = admin.apps[0]?.auth();
export const db = admin.apps[0]?.firestore(); 
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDCAbxKgru2hHOAT_SzSPHGSvSg7_WonLY",
  authDomain: "taskme-844c1.firebaseapp.com",
  projectId: "taskme-844c1",
  storageBucket: "taskme-844c1.firebasestorage.app",
  messagingSenderId: "261297719192",
  appId: "1:261297719192:web:5e749c448e34862c068ded",
  measurementId: "G-XDHTQFXDEZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); 
export const firebaseApp = app;
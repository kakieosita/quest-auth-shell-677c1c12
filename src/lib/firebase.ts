import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const configuredApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const hasUsableApiKey =
  typeof configuredApiKey === "string" &&
  configuredApiKey.startsWith("AIza") &&
  configuredApiKey.length >= 30;

const fallbackFirebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDemoOnlyKeyForPreviewSafety123456789",
  authDomain: "demo.invalid",
  projectId: "demo-preview",
  storageBucket: "demo-preview.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000",
};

const firebaseConfig: FirebaseOptions = hasUsableApiKey
  ? {
      apiKey: configuredApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }
  : fallbackFirebaseConfig;

const appName = "upskill-school-ui";
const app = getApps().some((firebaseApp) => firebaseApp.name === appName)
  ? getApp(appName)
  : initializeApp(firebaseConfig, appName);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const secondaryApp = getApps().some((firebaseApp) => firebaseApp.name === "Secondary")
  ? getApp("Secondary")
  : initializeApp(firebaseConfig, "Secondary");
  
export const secondaryAuth = getAuth(secondaryApp);
export default app;

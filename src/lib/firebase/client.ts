import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseEnv = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

function getFirebaseConfig(): FirebaseOptions {
  const missingKeys = Object.entries(firebaseEnv)
    .filter(([, value]) => !value)
    .map(
      ([key]) =>
        `NEXT_PUBLIC_FIREBASE_${key
          .replace(/[A-Z]/g, (letter) => `_${letter}`)
          .toUpperCase()}`,
    );

  if (missingKeys.length > 0) {
    throw new Error(
      `Firebase 환경변수가 설정되지 않았습니다: ${missingKeys.join(", ")}`,
    );
  }

  return firebaseEnv as FirebaseOptions;
}

export function getFirebaseApp() {
  return getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig());
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyDYbWFN5soRICkfrfLLysO706rA9KyTK4w",
  authDomain: "lectorflow.firebaseapp.com",
  projectId: "lectorflow",
  storageBucket: "lectorflow.firebasestorage.app",
  messagingSenderId: "66446923656",
  appId: "1:66446923656:web:e5120c4ed8712959960c3d",
  webClientId: "66446923656-vj6gcr0gkdt06etvjl157nkci74o5iuf.apps.googleusercontent.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { auth, db };
export const WEB_CLIENT_ID = firebaseConfig.webClientId;

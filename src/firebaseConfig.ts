// src/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Tu configuración exacta de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCwo4-xM4dOoKBoMts8952QHdjfWP1NP6Y",
  authDomain: "working-platform-wt.firebaseapp.com",
  projectId: "working-platform-wt",
  storageBucket: "working-platform-wt.firebasestorage.app",
  messagingSenderId: "753369015554",
  appId: "1:753369015554:web:a605a632e89b4442a5ce1b",
  measurementId: "G-H50LE3STQX" 
};

// Inicializamos la aplicación de Firebase
const app = initializeApp(firebaseConfig);

// Exportamos Auth y Base de Datos para usarlos en nuestras pantallas
export const auth = getAuth(app);
export const db = getFirestore(app);
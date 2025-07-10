import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
// dotenv no se usa directamente en el frontend, las variables se inyectan en el proceso de build
// import dotenv from 'dotenv'; // <<--- REMOVE THIS LINE

// Cargar las variables de entorno desde el archivo .env
// dotenv.config(); // <<--- REMOVE THIS LINE, Quasar/Vite maneja esto de otra forma

// Configuración de Firebase usando variables de entorno
// IMPORTANTE: Quasar/Vite prefiere variables que empiecen con VITE_ o APP_ para el frontend
// Las variables del .env serán process.env.VITE_FIREBASE_API_KEY, etc.
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY, // <<-- CAMBIAR A VITE_FIREBASE_API_KEY
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN, // <<-- CAMBIAR
  projectId: process.env.VITE_FIREBASE_PROJECT_ID, // <<-- CAMBIAR
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET, // <<-- CAMBIAR
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID, // <<-- CAMBIAR
  appId: process.env.VITE_FIREBASE_APP_ID, // <<-- CAMBIAR
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID, // <<-- CAMBIAR
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)

// Inicializar servicios
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

// Exportar los servicios para que estén disponibles en el resto de tu aplicación Quasar
export {
  auth,
  db,
  storage,
  signInWithEmailAndPassword,
  signOut,
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
}

// Los boot files de Quasar exportan una función por defecto
export default ({ app: vueApp }) => {
  // Puedes hacer que Firebase esté disponible globalmente en la instancia de Vue
  vueApp.config.globalProperties.$firebaseAuth = auth
  vueApp.config.globalProperties.$firebaseDb = db
  vueApp.config.globalProperties.$firebaseStorage = storage
}

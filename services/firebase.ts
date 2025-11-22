import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuração manual do Firebase para garantir funcionamento em hospedagens como Cloudflare/Netlify
const firebaseConfig = {
  apiKey: "AIzaSyCXUCGaP3M0j3cPVlrSVFcz57ylHV3afvU",
  authDomain: "pixai-app-d8041.firebaseapp.com",
  projectId: "pixai-app-d8041",
  storageBucket: "pixai-app-d8041.firebasestorage.app",
  messagingSenderId: "358145475484",
  appId: "1:358145475484:web:014e0cb4c76aca626b3e59"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
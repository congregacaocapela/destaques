import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCf6441hETQDUcx0fEHK01-SaTo2kUn0eA',
  authDomain: 'meuep-29295.firebaseapp.com',
  projectId: 'meuep-29295',
  storageBucket: 'meuep-29295.firebasestorage.app',
  messagingSenderId: '34951069719',
  appId: '1:34951069719:web:020ee5896ba0c6679b5c52',
  measurementId: 'G-CKTFHX3Q7R',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const STUDY_APP_ID = firebaseConfig.appId;
export const SPEECHES_APP_ID = 'default-app-id';

export const studyPaths = (uid) => ({
  publicHighlights: `artifacts/${STUDY_APP_ID}/public/data/destaques`,
  privateHighlights: `artifacts/${STUDY_APP_ID}/users/${uid}/destaques`,
  publicResearch: `artifacts/${STUDY_APP_ID}/public/data/pesquisas`,
  privateResearch: `artifacts/${STUDY_APP_ID}/users/${uid}/pesquisas`,
});

export const speechPaths = (uid) => ({
  publicSpeeches: `artifacts/${SPEECHES_APP_ID}/public/data/discursos`,
  privateSpeeches: `artifacts/${SPEECHES_APP_ID}/users/${uid}/discursos`,
});

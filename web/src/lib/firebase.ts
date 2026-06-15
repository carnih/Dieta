import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { get, getDatabase, ref, set } from 'firebase/database';

// Config Firebase: pubblica per design (la protezione è data dalle regole RTDB con
// allowlist, non dalla segretezza della apiKey). Override possibile via env VITE_*.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_APIKEY ?? 'AIzaSyAIhOcx7IPpTIRjnbbmjhKZ2bWRAjt2JT4',
  authDomain: 'dieta-b7804.firebaseapp.com',
  databaseURL:
    import.meta.env.VITE_FB_DB ??
    'https://dieta-b7804-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'dieta-b7804',
  storageBucket: 'dieta-b7804.firebasestorage.app',
  messagingSenderId: '1079631832344',
  appId: '1:1079631832344:web:bc10f2b24f49d55c26aa6d',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

void setPersistence(auth, browserLocalPersistence);

export { signInWithEmailAndPassword, signOut };

/**
 * Unica via di scrittura su Firebase, con gestione errori reale (set() è async:
 * il vecchio try/catch sincrono non catturava i fallimenti). Riusa il contratto
 * di `dbSet` del vecchio index.html.
 */
export async function dbSet(path: string, val: unknown): Promise<void> {
  try {
    await set(ref(db, path), val);
  } catch (e) {
    console.error('dbSet fallita su', path, e);
    throw e;
  }
}

/** Lettura one-shot di un nodo. */
export async function dbGet<T = unknown>(path: string): Promise<T | null> {
  const snap = await get(ref(db, path));
  return snap.exists() ? (snap.val() as T) : null;
}

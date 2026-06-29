import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { get, getDatabase, onValue, ref, set } from 'firebase/database';
import type { AuthUser, Repo } from '@/data/repo';

// Config Firebase: pubblica per design (la protezione è nelle regole RTDB con
// allowlist, non nella segretezza della apiKey). Override via env VITE_*.
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

/** Implementazione del {@link Repo} su Firebase (Realtime DB + Auth). */
export class FirebaseRepo implements Repo {
  private app = initializeApp(firebaseConfig);
  private auth = getAuth(this.app);
  private db = getDatabase(this.app);

  constructor() {
    void setPersistence(this.auth, browserLocalPersistence);
  }

  onAuthChange(cb: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(this.auth, (u) =>
      cb(u ? { uid: u.uid, email: u.email } : null),
    );
  }

  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  subscribe(path: string, cb: (val: unknown) => void): () => void {
    return onValue(ref(this.db, path), (snap) => cb(snap.val()));
  }

  async get<T = unknown>(path: string): Promise<T | null> {
    const snap = await get(ref(this.db, path));
    return snap.exists() ? (snap.val() as T) : null;
  }

  async set(path: string, val: unknown): Promise<void> {
    try {
      await set(ref(this.db, path), val);
    } catch (e) {
      console.error('repo.set fallita su', path, e);
      throw e;
    }
  }
}

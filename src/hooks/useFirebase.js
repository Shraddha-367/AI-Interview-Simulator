import { useCallback, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, googleProvider, db, isFirebaseConfigured } from '../services/firebase';

/** Demo-mode mock user when Firebase is not configured */
const DEMO_USER = {
  uid: 'demo-user',
  displayName: 'Demo User',
  email: 'demo@interview-simulator.local',
  photoURL: null,
};

/**
 * useFirebase
 *
 * Exposes:
 *   user              – Firebase User | null (or demo user if unconfigured)
 *   loading           – true while auth state is resolving
 *   signInWithGoogle() – opens Google sign-in popup
 *   signOut()          – signs the user out
 *   saveSession(data)  – writes to /users/{uid}/sessions
 *   getSessions()      – reads all sessions, newest first
 */
export function useFirebase() {
  const [user, setUser] = useState(isFirebaseConfigured ? null : DEMO_USER);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  /* ── Listen for auth state changes (only if Firebase is configured) ── */
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  /* ── Sign in with Google ── */
  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured) {
      console.warn('[Demo mode] Skipping Google sign-in — no Firebase config.');
      setUser(DEMO_USER);
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google sign-in failed:', err.message);
      throw err;
    }
  }, []);

  /* ── Sign out ── */
  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setUser(null);
      return;
    }
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.error('Sign-out failed:', err.message);
      throw err;
    }
  }, []);

  /* ── Save a session to Firestore ── */
  const saveSession = useCallback(
    async (sessionData) => {
      if (!user) throw new Error('Not authenticated');
      if (!isFirebaseConfigured) {
        console.warn('[Demo mode] saveSession — data not persisted.');
        return 'demo-session-' + Date.now();
      }
      const sessionsRef = collection(db, 'users', user.uid, 'sessions');
      const docRef = await addDoc(sessionsRef, {
        ...sessionData,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    },
    [user]
  );

  /* ── Get all sessions (newest first) ── */
  const getSessions = useCallback(async () => {
    if (!user) return [];
    if (!isFirebaseConfigured) {
      console.warn('[Demo mode] getSessions — returning empty array.');
      return [];
    }
    const sessionsRef = collection(db, 'users', user.uid, 'sessions');
    const q = query(sessionsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }, [user]);

  return {
    user,
    loading,
    signInWithGoogle,
    signOut,
    saveSession,
    getSessions,
  };
}

export default useFirebase;

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
import { auth, googleProvider, db } from '../services/firebase';

/**
 * useFirebase
 *
 * Exposes:
 *   user              – Firebase User | null
 *   loading           – true while auth state is resolving
 *   signInWithGoogle() – opens Google sign-in popup
 *   signOut()          – signs the user out
 *   saveSession(data)  – writes to /users/{uid}/sessions
 *   getSessions()      – reads all sessions, newest first
 */
export function useFirebase() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ── Listen for auth state changes ── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  /* ── Sign in with Google ── */
  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google sign-in failed:', err.message);
      throw err;
    }
  }, []);

  /* ── Sign out ── */
  const signOut = useCallback(async () => {
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


'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc, query, where, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signOut } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  isProfileLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  isProfileLoading: boolean;
  userError: Error | null;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  isProfileLoading: boolean;
  userError: Error | null;
}

export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  isProfileLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const router = useRouter();
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    isProfileLoading: true,
    userError: null,
  });

  useEffect(() => {
    if (!auth) {
      setUserAuthState(prev => ({ ...prev, isUserLoading: false, userError: new Error("Auth service not provided.") }));
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          const email = firebaseUser.email?.toLowerCase() || '';
          if (!email.endsWith('@neu.edu.ph')) {
            await signOut(auth);
            setUserAuthState({ 
              user: null, 
              isUserLoading: false, 
              isProfileLoading: false, 
              userError: new Error("Access Denied: Please use your @neu.edu.ph institutional account.") 
            });
            router.push('/restricted');
            return;
          }

          setUserAuthState(prev => ({ ...prev, user: firebaseUser, isUserLoading: false, isProfileLoading: true }));
          
          const userRef = doc(firestore, 'users', firebaseUser.uid);
          try {
            // 1. Check if UID-based profile already exists
            const docSnap = await getDoc(userRef);
            
            if (!docSnap.exists()) {
              // 2. Profile doesn't exist by UID. Search for pre-registration by email (Handshake)
              const usersCol = collection(firestore, 'users');
              const q = query(usersCol, where('email', '==', email));
              const querySnap = await getDocs(q);

              if (!querySnap.empty) {
                // Pre-registered match found! Link UID to the existing record.
                const existingDoc = querySnap.docs[0];
                const existingData = existingDoc.data();
                
                const profileData = {
                  ...existingData,
                  id: firebaseUser.uid,
                  updatedAt: new Date().toISOString()
                };

                // Link the record to the UID path
                await setDoc(userRef, profileData);

                // Cleanup: Delete the old pre-registered document if IDs were different
                if (existingDoc.id !== firebaseUser.uid) {
                  await deleteDoc(existingDoc.ref);
                }
              } else {
                // 3. No pre-registration match. Create default student profile.
                let roleName: 'admin' | 'faculty' | 'student' = 'student';
                
                // Specific Admin check for institutional requirement
                if (email === 'jcesperanza@neu.edu.ph') {
                  roleName = 'admin';
                } else if (email.includes('admin')) {
                  roleName = 'admin';
                } else if (email.includes('faculty')) {
                  roleName = 'faculty';
                }

                const profileData = {
                  id: firebaseUser.uid,
                  email: email,
                  fullName: firebaseUser.displayName || 'Institutional User',
                  role: roleName,
                  canAddMoa: roleName !== 'student',
                  canEditMoa: roleName !== 'student',
                  canDeleteMoa: roleName === 'admin',
                  isBlocked: false,
                  createdAt: new Date().toISOString()
                };

                await setDoc(userRef, profileData);
              }
            }
          } catch (err: any) {
            const permissionError = new FirestorePermissionError({
              path: userRef.path,
              operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
          } finally {
            setUserAuthState(prev => ({ ...prev, isProfileLoading: false }));
          }
        } else {
          setUserAuthState({ user: null, isUserLoading: false, isProfileLoading: false, userError: null });
        }
      },
      (error) => {
        setUserAuthState({ user: null, isUserLoading: false, isProfileLoading: false, userError: error });
      }
    );
    return () => unsubscribe();
  }, [auth, firestore, router]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      isProfileLoading: userAuthState.isProfileLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available.');
  }
  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    isProfileLoading: context.isProfileLoading,
    userError: context.userError,
  };
};

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T & {__memo?: boolean} {
  const memoized = useMemo(factory, deps);
  if(typeof memoized !== 'object' || memoized === null) return memoized as any;
  (memoized as any).__memo = true;
  return memoized as any;
}

export const useUser = (): UserHookResult => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider.');
  }
  return { 
    user: context.user, 
    isUserLoading: context.isUserLoading, 
    isProfileLoading: context.isProfileLoading,
    userError: context.userError 
  };
};

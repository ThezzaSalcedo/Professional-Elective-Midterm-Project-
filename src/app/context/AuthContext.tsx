
"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../lib/types';
import { useFirebase, useUser } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

type AuthContextType = {
  user: User | null;
  firebaseUser: any | null;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { auth, firestore } = useFirebase();
  const { user: firebaseUser, isUserLoading } = useUser();
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function setupProfileListener() {
      if (firebaseUser && firestore) {
        setIsLoadingProfile(true);
        const docRef = doc(firestore, 'users', firebaseUser.uid);
        
        // Real-time listener ensures role and permission changes are reflected immediately
        unsubscribe = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const role = (data.role as string || 'student').toLowerCase() as Role;
            
            // Re-map profile state with updated institutional rights
            setProfile({
              id: firebaseUser.uid,
              fullName: data.fullName || firebaseUser.displayName || 'User',
              email: data.email || firebaseUser.email || '',
              role: role,
              // Admin role always overrides individual flags for system integrity
              canAddMoa: role === 'admin' || !!data.canAddMoa,
              canEditMoa: role === 'admin' || !!data.canEditMoa,
              canDeleteMoa: role === 'admin' || !!data.canDeleteMoa,
              isBlocked: data.isBlocked === true,
              createdAt: data.createdAt,
            });
          } else {
            setProfile(null);
          }
          setIsLoadingProfile(false);
        }, (error) => {
          console.error("AuthContext: Profile sync error", error);
          setIsLoadingProfile(false);
        });
      } else {
        setProfile(null);
        setIsLoadingProfile(false);
      }
    }

    if (!isUserLoading) {
      setupProfileListener();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [firebaseUser, isUserLoading, firestore]);

  const logout = () => {
    auth?.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user: profile, 
      firebaseUser,
      logout, 
      isLoading: isUserLoading || isLoadingProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

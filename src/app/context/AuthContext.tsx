
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
        
        // Determine collection based on institutional email patterns
        const lowerEmail = firebaseUser.email?.toLowerCase() || '';
        let collectionName = 'students';
        if (lowerEmail.includes('admin')) {
          collectionName = 'admins';
        } else if (lowerEmail.includes('faculty')) {
          collectionName = 'faculty';
        }

        const docRef = doc(firestore, collectionName, firebaseUser.uid);
        
        // Use real-time listener for instant updates during registration
        unsubscribe = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setProfile({
              id: firebaseUser.uid,
              name: data.fullName || firebaseUser.displayName || 'User',
              email: data.email || firebaseUser.email || '',
              role: data.role as Role,
              canEdit: !!data.canEditMoa || (data.role === 'Admin'),
              isBlocked: data.isBlocked === true,
            });
          } else {
            setProfile(null);
          }
          setIsLoadingProfile(false);
        }, (error) => {
          console.error("AuthContext: Profile listener error:", error);
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

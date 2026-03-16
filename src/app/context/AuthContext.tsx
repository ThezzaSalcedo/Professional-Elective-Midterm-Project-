
"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../lib/types';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

type AuthContextType = {
  user: User | null;
  login: (email: string) => void;
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
    async function fetchProfile() {
      if (firebaseUser && firestore) {
        // Try to find the user in one of the three collections
        const collections: Role[] = ['Admin', 'Faculty', 'Student'];
        let found = false;

        for (const role of collections) {
          const path = role === 'Admin' ? 'admins' : role.toLowerCase() + (role === 'Faculty' ? '' : 's');
          // Adjusting for our specific paths: admins, faculty, students
          const actualPath = role === 'Admin' ? 'admins' : (role === 'Faculty' ? 'faculty' : 'students');
          
          const docRef = doc(firestore, actualPath, firebaseUser.uid);
          const snap = await getDoc(docRef);
          
          if (snap.exists()) {
            const data = snap.data();
            setProfile({
              id: firebaseUser.uid,
              name: data.fullName || firebaseUser.displayName || 'User',
              email: data.email || firebaseUser.email || '',
              role: data.role as Role,
              canEdit: data.canEditMoa || (data.role === 'Admin'),
              isBlocked: data.isActive === false,
            });
            found = true;
            break;
          }
        }
        
        if (!found) {
          // Default profile if not found in collections (unlikely in prod)
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setIsLoadingProfile(false);
    }

    if (!isUserLoading) {
      fetchProfile();
    }
  }, [firebaseUser, isUserLoading, firestore]);

  const login = (email: string) => {
    // In a real Firebase app, you'd use signInWithEmailAndPassword or GoogleAuthProvider
    // For this MVP, we are assuming the login is handled by the page component
  };

  const logout = () => {
    auth?.signOut();
  };

  return (
    <AuthContext.Provider value={{ user: profile, login, logout, isLoading: isUserLoading || isLoadingProfile }}>
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

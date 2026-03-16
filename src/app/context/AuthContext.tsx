
"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../lib/types';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
    async function fetchProfile() {
      if (firebaseUser && firestore) {
        setIsLoadingProfile(true);
        
        const roles: { collection: string; role: Role }[] = [
          { collection: 'admins', role: 'Admin' },
          { collection: 'faculty', role: 'Faculty' },
          { collection: 'students', role: 'Student' }
        ];

        let foundProfile: User | null = null;

        try {
          for (const r of roles) {
            const docRef = doc(firestore, r.collection, firebaseUser.uid);
            const snap = await getDoc(docRef);
            
            if (snap.exists()) {
              const data = snap.data();
              foundProfile = {
                id: firebaseUser.uid,
                name: data.fullName || firebaseUser.displayName || 'User',
                email: data.email || firebaseUser.email || '',
                role: data.role as Role,
                canEdit: !!data.canEditMoa || (data.role === 'Admin'),
                isBlocked: data.isBlocked === true,
              };
              break;
            }
          }
        } catch (error) {
          console.error("AuthContext: Error fetching user profile:", error);
        }
        
        setProfile(foundProfile);
      } else {
        setProfile(null);
      }
      setIsLoadingProfile(false);
    }

    if (!isUserLoading) {
      fetchProfile();
    }
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

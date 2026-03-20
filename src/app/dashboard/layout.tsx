
"use client"

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Basic session guard
    if (!isLoading && !user) {
      router.push('/');
    }

    // Admin route protection
    if (!isLoading && user && pathname.startsWith('/dashboard/admin') && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, isLoading, router, pathname]);

  // Show a clean loading state while verifying permissions
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Verifying Credentials...</p>
      </div>
    );
  }

  // Handle Blocked Users
  if (user?.isBlocked) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-muted/30 p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl border max-w-md">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Account Restricted</h1>
          <p className="text-muted-foreground mb-6">
            Your institutional access has been suspended by the system administrator. 
            Please contact the University IT Services for clarification.
          </p>
          <Button onClick={logout} variant="outline" className="w-full">Sign Out</Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="h-full px-8 py-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

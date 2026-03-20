
"use client"

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Loader2, ShieldAlert, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // If not loading and no user, send to login
    if (!isLoading && !user) {
      router.push('/');
      return;
    }

    // Role-based route guard: If role changes and user is on a restricted path, redirect
    if (!isLoading && user) {
      const isAdminRoute = pathname.startsWith('/dashboard/admin');
      if (isAdminRoute && user.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router, pathname]);

  // Close mobile menu on path change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Synchronizing Institutional Profile...</p>
      </div>
    );
  }

  // Handle blocked accounts immediately
  if (user?.isBlocked) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-muted/30 p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl border max-w-md w-full">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Account Restricted</h1>
          <p className="text-muted-foreground mb-6 text-sm">
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
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar (Sheet) */}
      <div className="lg:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64 border-none">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Access dashboard, partnership registry, and system settings.</SheetDescription>
            </SheetHeader>
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b bg-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1 rounded-md">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-primary">MOA Track</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

"use client"

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { ShieldX, Menu, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

const NEU_LOGO_URL = "https://upload.wikimedia.org/wikipedia/en/c/c6/New_Era_University.svg";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
      return;
    }

    if (!isLoading && user) {
      const isAdminRoute = pathname.startsWith('/dashboard/admin');
      if (isAdminRoute && user.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router, pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
        <div className="relative">
          <div className="absolute -inset-8 bg-primary/5 blur-3xl rounded-full" />
          <img 
            src={NEU_LOGO_URL} 
            alt="NEU Logo" 
            className="w-24 h-24 sm:w-32 sm:h-32 animate-institutional-pulse relative"
          />
        </div>
        <div className="mt-12 flex flex-col items-center space-y-2">
          <p className="text-primary font-black uppercase tracking-[0.3em] text-xs animate-pulse">Synchronizing Registry</p>
          <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-[loading-bar_1.5s_infinite_ease-in-out]" style={{ width: '40%' }} />
          </div>
        </div>
        <style jsx>{`
          @keyframes loading-bar {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(250%); }
          }
        `}</style>
      </div>
    );
  }

  if (user?.isBlocked) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-muted/30 p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-destructive/20 max-w-md w-full animate-in zoom-in duration-300">
          <ShieldX className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Terminated</h1>
          <p className="text-muted-foreground mb-6 text-sm">
            Your institutional account has been blocked by the system administrator. 
            Any active sessions have been restricted.
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
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="lg:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64 border-none">
            <SheetHeader className="sr-only">
              <SheetTitle>Institutional Navigation</SheetTitle>
              <SheetDescription>Access dashboard modules and registry management.</SheetDescription>
            </SheetHeader>
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden h-16 border-b bg-white flex items-center justify-between px-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <img src={NEU_LOGO_URL} alt="NEU Logo" className="w-8 h-8" />
            <span className="font-black text-primary tracking-tighter uppercase text-sm">MOA Management</span>
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
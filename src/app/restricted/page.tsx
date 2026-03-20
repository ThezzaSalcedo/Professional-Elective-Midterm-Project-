
"use client"

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert, LogIn, ChevronLeft } from 'lucide-react';

export default function RestrictedAccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-destructive/10 p-8 text-center animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        
        <h1 className="text-3xl font-bold text-foreground mb-4">Access Restricted</h1>
        
        <p className="text-muted-foreground mb-8 leading-relaxed">
          The MOA Track system is exclusive to the <strong>New Era University</strong> community. 
          Please ensure you are using your official <strong>@neu.edu.ph</strong> institutional account to sign in.
        </p>

        <div className="space-y-4">
          <Button asChild className="w-full h-12 text-base font-bold gap-2">
            <Link href="/">
              <LogIn className="w-5 h-5" />
              Return to Login
            </Link>
          </Button>
          
          <Button asChild variant="ghost" className="w-full gap-2 text-muted-foreground">
            <Link href="/">
              <ChevronLeft className="w-4 h-4" />
              Back to Homepage
            </Link>
          </Button>
        </div>

        <div className="mt-12 pt-8 border-t">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
            Institutional Security Policy Enforced
          </p>
        </div>
      </div>
    </div>
  );
}

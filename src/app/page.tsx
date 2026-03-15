"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { user, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleLogin = (roleEmail: string) => {
    login(roleEmail);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F3F6] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-white/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white mb-4 shadow-lg shadow-primary/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">MOA Track</h1>
          <p className="text-muted-foreground mt-2 font-medium">NEU MOA Monitoring System</p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-center text-muted-foreground mb-6">
            Sign in with your institutional Google account
          </p>
          
          <Button 
            className="w-full h-12 bg-white text-foreground border-2 hover:bg-muted font-semibold transition-all"
            onClick={() => handleLogin('admin@neu.edu.ph')}
          >
            <div className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Admin Sign In
            </div>
          </Button>

          <Button 
            className="w-full h-12 bg-white text-foreground border-2 hover:bg-muted font-semibold transition-all"
            onClick={() => handleLogin('faculty@neu.edu.ph')}
          >
            Faculty Sign In
          </Button>

          <Button 
            className="w-full h-12 bg-white text-foreground border-2 hover:bg-muted font-semibold transition-all"
            onClick={() => handleLogin('student@neu.edu.ph')}
          >
            Student Sign In
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Strict institutional access only. All actions are audited.
          </p>
        </div>
      </div>
    </div>
  );
}
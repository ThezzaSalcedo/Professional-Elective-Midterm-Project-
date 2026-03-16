
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { useFirebase } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function HomePage() {
  const { user } = useAuth();
  const { auth } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    if (!email.endsWith('@neu.edu.ph')) {
      toast({
        title: "Invalid Email",
        description: "Please use your @neu.edu.ph institutional account.",
        variant: "destructive"
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      initiateEmailSignIn(auth, email, password);
      // The actual redirect happens via the useEffect watching the 'user' state from AuthContext
    } catch (error: any) {
      setIsLoggingIn(false);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMockLogin = (roleEmail: string) => {
    setIsLoggingIn(true);
    // In this app, mock logins are handled by using a known password or 
    // simply triggering the sign-in if the account exists.
    // For MVP, we'll use a default mock password 'password123'
    initiateEmailSignIn(auth, roleEmail, 'password123');
  };

  if (!hasMounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F3F6] px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-white/20 animate-pulse">
          <div className="h-16 w-16 bg-muted rounded-2xl mx-auto mb-4" />
          <div className="h-8 w-48 bg-muted rounded mx-auto mb-2" />
          <div className="h-4 w-64 bg-muted rounded mx-auto mb-8" />
          <div className="space-y-4">
            <div className="h-10 bg-muted rounded w-full" />
            <div className="h-10 bg-muted rounded w-full" />
            <div className="h-10 bg-muted rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

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

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold">Institutional Email</Label>
            <Input 
              id="email"
              type="email" 
              placeholder="name@neu.edu.ph" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              disabled={isLoggingIn}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-10"
                disabled={isLoggingIn}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 bg-primary hover:bg-primary/90 font-semibold"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
          </Button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground font-medium">Quick Access Mock Roles</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-[10px] text-muted-foreground uppercase font-bold border border-dashed hover:bg-muted/50"
            onClick={() => handleMockLogin('admin@neu.edu.ph')}
            disabled={isLoggingIn}
          >
            Admin Mock
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-[10px] text-muted-foreground uppercase font-bold border border-dashed hover:bg-muted/50"
            onClick={() => handleMockLogin('faculty@neu.edu.ph')}
            disabled={isLoggingIn}
          >
            Faculty Mock
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="col-span-2 text-[10px] text-muted-foreground uppercase font-bold border border-dashed hover:bg-muted/50"
            onClick={() => handleMockLogin('student@neu.edu.ph')}
            disabled={isLoggingIn}
          >
            Student Mock
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Strict institutional access only. Use your NEU credentials.
          </p>
        </div>
      </div>
    </div>
  );
}

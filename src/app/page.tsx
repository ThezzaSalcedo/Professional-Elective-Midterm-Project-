
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { useFirebase } from '@/firebase';
import { initiateEmailSignIn, initiateGoogleSignIn } from '@/firebase/non-blocking-login';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Loader2, Eye, EyeOff, Beaker } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function HomePage() {
  const { user } = useAuth();
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoggingIn(true);
    try {
      await initiateEmailSignIn(auth, email, password);
    } catch (error: any) {
      setIsLoggingIn(false);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleGoogleLogin = () => {
    setIsLoggingIn(true);
    try {
      initiateGoogleSignIn(auth);
    } catch (error: any) {
      setIsLoggingIn(false);
      toast({
        title: "Google Login Failed",
        description: error.message || "Could not connect to Google.",
        variant: "destructive"
      });
    }
  };

  const seedFacultyAccount = async () => {
    if (!auth || !firestore) return;
    setIsSeeding(true);
    const facultyEmail = "Faculty1.@neu.edu.ph";
    const facultyPass = "faculty1";

    try {
      // Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, facultyEmail, facultyPass);
      const uid = userCredential.user.uid;

      // Create Firestore Profile
      await setDoc(doc(firestore, 'faculty', uid), {
        id: uid,
        email: facultyEmail,
        fullName: "Primary Faculty Admin",
        role: "Faculty",
        canAddMoa: true,
        canEditMoa: true,
        canDeleteMoa: true
      });

      toast({
        title: "Success",
        description: `Account ${facultyEmail} created! You can now log in.`,
      });
      setEmail(facultyEmail);
      setPassword(facultyPass);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({ title: "Account Exists", description: "This demo account is already registered." });
        setEmail(facultyEmail);
        setPassword(facultyPass);
      } else {
        toast({ title: "Seeding Failed", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsSeeding(false);
    }
  };

  if (!hasMounted) return null;

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
            {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In with Email"}
          </Button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground font-medium">Or continue with</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full h-11 gap-2 font-semibold border-2" 
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign In with Google
        </Button>

        <div className="mt-8 space-y-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs gap-2 text-accent"
            onClick={seedFacultyAccount}
            disabled={isSeeding}
          >
            {isSeeding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Beaker className="w-3 h-3" />}
            Development: Create Faculty Demo Account
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Institutional access only. Use your NEU credentials.
          </p>
        </div>
      </div>
    </div>
  );
}

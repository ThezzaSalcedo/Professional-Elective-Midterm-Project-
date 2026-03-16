
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { useFirebase } from '@/firebase';
import { initiateEmailSignIn, initiateEmailSignUp, initiateGoogleSignIn } from '@/firebase/non-blocking-login';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Loader2, Eye, EyeOff, AlertCircle, UserPlus, LogIn, LogOut, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function HomePage() {
  const { user, firebaseUser, isLoading: isAuthLoading, logout } = useAuth();
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
    if (user && !isAuthLoading) {
      router.push('/dashboard');
    }
  }, [user, isAuthLoading, router]);

  const createProfile = async (uid: string, userEmail: string, name: string) => {
    const lowerEmail = userEmail.toLowerCase();
    let roleName: 'admin' | 'faculty' | 'student' = 'student';

    if (lowerEmail.includes('admin')) {
      roleName = 'admin';
    } else if (lowerEmail.includes('faculty')) {
      roleName = 'faculty';
    }

    await setDoc(doc(firestore, 'users', uid), {
      id: uid,
      email: userEmail,
      fullName: name,
      role: roleName,
      canAddMoa: roleName !== 'student',
      canEditMoa: roleName !== 'student',
      canDeleteMoa: roleName === 'admin',
      isBlocked: false,
      createdAt: new Date().toISOString()
    });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email || !password) return;
    
    setIsProcessing(true);
    try {
      await initiateEmailSignIn(auth, email, password);
    } catch (error: any) {
      setIsProcessing(false);
      let msg = "Invalid email or password.";
      if (error.code === 'auth/user-not-found') msg = "No account found with this email.";
      if (error.code === 'auth/wrong-password') msg = "Incorrect password.";
      setErrorMessage(msg);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email || !password || !fullName) return;

    if (!email.toLowerCase().endsWith('@neu.edu.ph')) {
      setErrorMessage("Institutional email (@neu.edu.ph) is required.");
      return;
    }

    setIsProcessing(true);
    try {
      const cred = await initiateEmailSignUp(auth, email, password);
      await createProfile(cred.user.uid, email, fullName);
    } catch (error: any) {
      setIsProcessing(false);
      setErrorMessage(error.message || "Failed to create account.");
    }
  };

  const handleFinishProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !fullName) return;
    setIsProcessing(true);
    try {
      await createProfile(firebaseUser.uid, firebaseUser.email!, fullName);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage("Failed to save profile.");
    }
  };

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    try {
      await initiateGoogleSignIn(auth);
    } catch (error: any) {
      setIsProcessing(false);
      if (error.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(error.message || "Could not connect to Google.");
      }
    }
  };

  if (!hasMounted || (isAuthLoading && !firebaseUser)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (firebaseUser && !user && !isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border">
          <h2 className="text-2xl font-bold text-center mb-6">Complete Your Profile</h2>
          <form onSubmit={handleFinishProfile} className="space-y-4">
            <Label>Full Name</Label>
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Button className="w-full" disabled={isProcessing}>Finish Registration</Button>
            <Button variant="ghost" className="w-full" onClick={logout}>Sign Out</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border">
        <div className="text-center mb-8">
          <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold">MOA Track</h1>
          <p className="text-muted-foreground">NEU Partnership Monitoring System</p>
        </div>

        {errorMessage && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <Label htmlFor="email">Email (@neu.edu.ph)</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="submit" className="w-full" disabled={isProcessing}>Sign In</Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <Label>Full Name</Label>
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <Label>Email (@neu.edu.ph)</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Label>Password</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="submit" className="w-full" disabled={isProcessing}>Create Account</Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative my-8">
          <Separator />
          <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-muted-foreground">OR</span>
        </div>

        <Button variant="outline" className="w-full gap-2" onClick={handleGoogleLogin} disabled={isProcessing}>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google Institutional Login
        </Button>
      </div>
    </div>
  );
}

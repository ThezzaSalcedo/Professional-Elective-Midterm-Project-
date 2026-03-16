
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
import { doc, setDoc } from 'firebase/firestore';

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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email || !password) return;
    
    setIsProcessing(true);
    try {
      await initiateEmailSignIn(auth, email, password);
      toast({ title: "Connecting...", description: "Verifying credentials" });
    } catch (error: any) {
      setIsProcessing(false);
      let msg = "Invalid email or password.";
      if (error.code === 'auth/user-not-found') msg = "No account found with this email.";
      if (error.code === 'auth/wrong-password') msg = "Incorrect password.";
      if (error.code === 'auth/invalid-credential') msg = "Incorrect credentials. Check email and password.";
      
      setErrorMessage(msg);
      toast({ title: "Login Failed", description: msg, variant: "destructive" });
    }
  };

  const createProfile = async (uid: string, userEmail: string, name: string) => {
    const lowerEmail = userEmail.toLowerCase();
    let collectionName = 'students';
    let roleName: 'Admin' | 'Faculty' | 'Student' = 'Student';

    if (lowerEmail.includes('admin')) {
      collectionName = 'admins';
      roleName = 'Admin';
    } else if (lowerEmail.includes('faculty')) {
      collectionName = 'faculty';
      roleName = 'Faculty';
    }

    await setDoc(doc(firestore, collectionName, uid), {
      id: uid,
      email: userEmail,
      fullName: name,
      role: roleName,
      canAddMoa: roleName !== 'Student',
      canEditMoa: roleName !== 'Student',
      canDeleteMoa: roleName === 'Admin',
      createdAt: new Date().toISOString()
    });
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email || !password || !fullName) return;

    if (!email.toLowerCase().endsWith('@neu.edu.ph')) {
      setErrorMessage("Institutional email (@neu.edu.ph) is required.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsProcessing(true);
    try {
      const cred = await initiateEmailSignUp(auth, email, password);
      await createProfile(cred.user.uid, email, fullName);
      toast({ title: "Account Created", description: `Welcome, ${fullName}!` });
      router.push('/dashboard');
    } catch (error: any) {
      setIsProcessing(false);
      let msg = error.message || "Failed to create account.";
      if (error.code === 'auth/email-already-in-use') {
        msg = "This email is already registered. Please sign in instead.";
      }
      setErrorMessage(msg);
    }
  };

  const handleFinishProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !fullName) return;
    setIsProcessing(true);
    try {
      await createProfile(firebaseUser.uid, firebaseUser.email, fullName);
      toast({ title: "Profile Set Up", description: "You can now access the dashboard." });
      router.push('/dashboard');
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage("Failed to save profile. Please try again.");
    }
  };

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await initiateGoogleSignIn(auth);
    } catch (error: any) {
      setIsProcessing(false);
      setErrorMessage(error.message || "Could not connect to Google.");
    }
  };

  if (!hasMounted) return null;

  // Case where user is logged into Auth but missing Firestore data
  if (firebaseUser && !user && !isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F3F6] px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border">
          <div className="text-center mb-6">
            <UserCircle className="w-16 h-16 text-accent mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-primary">Finish Registration</h2>
            <p className="text-muted-foreground text-sm mt-2">
              We found your account ({firebaseUser.email}), but your profile data is missing.
            </p>
          </div>
          <form onSubmit={handleFinishProfile} className="space-y-4">
            <div className="space-y-2">
              <Label>Your Full Name</Label>
              <Input 
                placeholder="Enter your name" 
                required 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
              />
            </div>
            <Button className="w-full bg-accent hover:bg-accent/90" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Complete Profile"}
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={logout} type="button">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F3F6] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white mb-4 shadow-lg shadow-primary/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">MOA Track</h1>
          <p className="text-muted-foreground mt-2 font-medium">NEU Partnership Monitoring System</p>
        </div>

        {errorMessage && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>System Alert</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="login" className="gap-2">
              <LogIn className="w-4 h-4" /> Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="gap-2">
              <UserPlus className="w-4 h-4" /> Register
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Institutional Email</Label>
                <Input 
                  id="email"
                  type="email" 
                  placeholder="faculty1@neu.edu.ph" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
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
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-primary hover:bg-primary/90 font-semibold"
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name">Full Name</Label>
                <Input 
                  id="reg-name"
                  placeholder="Enter your full name" 
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">Work/Student Email (@neu.edu.ph)</Label>
                <Input 
                  id="reg-email"
                  type="email" 
                  placeholder="faculty1@neu.edu.ph" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password (min. 6 chars)</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 bg-accent hover:bg-accent/90 text-white font-semibold"
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground font-medium">Or</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full h-11 gap-2 font-semibold border-2" 
          onClick={handleGoogleLogin}
          disabled={isProcessing}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Institutional Google Account
        </Button>
      </div>
    </div>
  );
}

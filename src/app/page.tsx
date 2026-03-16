
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
import { ShieldCheck, Loader2, Eye, EyeOff, AlertCircle, UserPlus, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doc, setDoc } from 'firebase/firestore';

export default function HomePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
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
      toast({ title: "Welcome Back", description: "Signing you in..." });
    } catch (error: any) {
      setIsProcessing(false);
      let msg = "Invalid email or password.";
      if (error.code === 'auth/user-not-found') msg = "No account found with this email. Please register first.";
      if (error.code === 'auth/wrong-password') msg = "Incorrect password. Please try again.";
      if (error.code === 'auth/invalid-credential') msg = "Incorrect email or password. Please verify your credentials.";
      
      setErrorMessage(msg);
      toast({
        title: "Login Failed",
        description: msg,
        variant: "destructive"
      });
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
      
      // Determine collection based on email keywords
      const lowerEmail = email.toLowerCase();
      let collectionName = 'students';
      let roleName: 'Admin' | 'Faculty' | 'Student' = 'Student';

      if (lowerEmail.includes('admin')) {
        collectionName = 'admins';
        roleName = 'Admin';
      } else if (lowerEmail.includes('faculty')) {
        collectionName = 'faculty';
        roleName = 'Faculty';
      }

      // Create the profile document
      await setDoc(doc(firestore, collectionName, cred.user.uid), {
        id: cred.user.uid,
        email: email,
        fullName: fullName,
        role: roleName,
        canAddMoa: roleName !== 'Student',
        canEditMoa: roleName !== 'Student',
        canDeleteMoa: roleName === 'Admin',
        createdAt: new Date().toISOString()
      });

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

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await initiateGoogleSignIn(auth);
    } catch (error: any) {
      setIsProcessing(false);
      const msg = error.message || "Could not connect to Google.";
      setErrorMessage(msg);
      toast({
        title: "Google Login Failed",
        description: msg,
        variant: "destructive"
      });
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
                  placeholder="name@neu.edu.ph" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  disabled={isProcessing}
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
                    disabled={isProcessing}
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
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">Work/Student Email</Label>
                <Input 
                  id="reg-email"
                  type="email" 
                  placeholder="e.g. faculty1@neu.edu.ph" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  disabled={isProcessing}
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
            <span className="bg-white px-2 text-muted-foreground font-medium">Or continue with</span>
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

        <div className="mt-8">
          <p className="text-[10px] text-muted-foreground text-center">
            Institutional access restricted to NEU domains.
          </p>
        </div>
      </div>
    </div>
  );
}


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
import { ShieldCheck, Loader2, AlertCircle, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doc, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { user, firebaseUser, isLoading: isAuthLoading, logout } = useAuth();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (user && !isAuthLoading && hasMounted) {
      router.push('/dashboard');
    }
  }, [user, isAuthLoading, router, hasMounted]);

  const validateDomain = (emailToTest: string) => {
    const lower = emailToTest.toLowerCase().trim();
    if (!lower.endsWith('@neu.edu.ph')) {
      setErrorMessage("Please use your official university email.");
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const createProfile = async (uid: string, userEmail: string, name: string) => {
    const lowerEmail = userEmail.toLowerCase();
    
    if (!lowerEmail.endsWith('@neu.edu.ph')) {
      router.push('/restricted');
      throw new Error("Access Denied: Please use your @neu.edu.ph institutional account.");
    }

    let roleName: 'admin' | 'faculty' | 'student' = 'student';
    if (lowerEmail.includes('admin')) roleName = 'admin';
    else if (lowerEmail.includes('faculty')) roleName = 'faculty';

    const userRef = doc(firestore, 'users', uid);
    await setDoc(userRef, {
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
    if (!validateDomain(email)) return;
    
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
    if (!validateDomain(email)) return;
    if (!fullName || !password) return;

    setIsProcessing(true);
    try {
      const cred = await initiateEmailSignUp(auth, email, password);
      await createProfile(cred.user.uid, email, fullName);
    } catch (error: any) {
      setIsProcessing(false);
      setErrorMessage(error.message || "Failed to create account.");
    }
  };

  const handleGoogleLogin = async () => {
    // If they typed an email, check it first as a hint
    if (email && !validateDomain(email)) return;

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

  const handleForgotPassword = async () => {
    if (!validateDomain(email)) return;
    setIsProcessing(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Reset Link Sent",
        description: `Check ${email} for password recovery instructions.`
      });
      setErrorMessage(null);
    } catch (error: any) {
      setErrorMessage("Failed to send reset email. Verify your address.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!hasMounted) return null;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background Layer with NEU Theme */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1541339907198-e08756ebafe3?q=80&w=2070&auto=format&fit=crop")',
          filter: 'blur(10px) brightness(0.6)'
        }}
      />

      {/* Main Login Card - Glassmorphism */}
      <div className="relative z-10 max-w-md w-full bg-white/80 backdrop-blur-[15px] rounded-[2.5rem] shadow-2xl p-8 border border-white/20 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#800000] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <GraduationCap className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">NEU Library</h1>
          <p className="text-[#004d00] font-bold text-sm uppercase tracking-widest mt-1">MOA Portal</p>
        </div>

        {errorMessage && (
          <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 font-medium">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="login" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:text-[#800000]">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:text-[#800000]">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Institutional Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="name@neu.edu.ph" 
                  className="h-12 rounded-xl bg-white border-muted focus-visible:ring-[#800000] transition-all"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" title="Password must be institutional" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                  <button type="button" onClick={handleForgotPassword} className="text-[10px] font-black uppercase text-[#800000] hover:underline">Forgot?</button>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="h-12 rounded-xl bg-white border-muted focus-visible:ring-[#800000] transition-all"
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl bg-[#800000] hover:bg-[#600000] font-bold text-base shadow-lg transition-all" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Access Portal"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleEmailSignUp} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Full Legal Name</Label>
                <Input 
                  required 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="e.g. Juan Dela Cruz" 
                  className="h-12 rounded-xl bg-white border-muted focus-visible:ring-[#800000]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Institutional Email</Label>
                <Input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="name@neu.edu.ph" 
                  className="h-12 rounded-xl bg-white border-muted focus-visible:ring-[#800000]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Set Password</Label>
                <Input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="h-12 rounded-xl bg-white border-muted focus-visible:ring-[#800000]"
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl bg-[#004d00] hover:bg-[#003300] font-bold text-base shadow-lg" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative my-10">
          <Separator className="bg-muted-foreground/20" />
          <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-transparent px-4 text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Institutional Access</span>
        </div>

        <Button 
          variant="outline" 
          className="w-full h-12 rounded-xl gap-3 border-muted-foreground/20 bg-white/50 hover:bg-white font-bold transition-all shadow-sm" 
          onClick={handleGoogleLogin} 
          disabled={isProcessing}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google Institutional Login
        </Button>
        
        <p className="mt-8 text-center text-[10px] text-muted-foreground/60 font-medium tracking-tight leading-relaxed">
          BY ACCESSING THIS PORTAL, YOU AGREE TO THE UNIVERSITY'S DATA PRIVACY POLICY AND ACCEPT RESPONSIBILITY FOR INSTITUTIONAL DATA INTEGRITY.
        </p>
      </div>
    </div>
  );
}

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
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doc, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';

const NEU_LOGO_URL = "https://upload.wikimedia.org/wikipedia/en/c/c6/New_Era_University.svg";

export default function HomePage() {
  const { user, isAuthLoading } = useAuth();
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
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background Layer (NEU Campus) */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("https://media.licdn.com/dms/image/v2/C4E1BAQF0X2-Pil2iag/company-background_10000/company-background_10000/0/1645461279672/new_era_university_qc_main_cover?e=2147483647&v=beta&t=W6qIZJWlKZS6mWA4ozpu_7zSMtSnOtt9Myf64qdMYUA")',
          filter: 'blur(4px) brightness(0.7)',
          backgroundAttachment: 'fixed'
        }}
      />

      {/* Institutional Logo Header */}
      <div className="relative z-10 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="relative group">
          <div className="absolute -inset-4 bg-white/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <img 
            src={NEU_LOGO_URL} 
            alt="New Era University Logo" 
            className="w-32 h-32 sm:w-40 sm:h-40 relative drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
          />
        </div>
      </div>

      {/* Main Login Card - High-end Glassmorphism */}
      <div className="relative z-10 max-w-md w-full bg-white/80 backdrop-blur-[15px] rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 sm:p-10 border border-white/40 animate-in fade-in zoom-in duration-700">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">NEU Library</h1>
          <p className="text-[#004d00] font-black text-xs uppercase tracking-[0.2em] mt-2">MOA Portal</p>
        </div>

        {errorMessage && (
          <Alert variant="destructive" className="mb-6 bg-red-50/80 border-red-200 backdrop-blur-sm">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 font-bold text-sm leading-tight">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-black/5 p-1 rounded-2xl">
            <TabsTrigger value="login" className="rounded-xl font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-[#800000] data-[state=active]:shadow-lg">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-xl font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-[#004d00] data-[state=active]:shadow-lg">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Institutional Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="name@neu.edu.ph" 
                  className="h-12 rounded-xl bg-white/60 border-white/50 focus-visible:ring-[#800000] focus-visible:bg-white transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Security Password</Label>
                  <button type="button" onClick={handleForgotPassword} className="text-[10px] font-black uppercase text-[#800000] hover:underline decoration-2 underline-offset-4">Reset Credentials</button>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="h-12 rounded-xl bg-white/60 border-white/50 focus-visible:ring-[#800000] focus-visible:bg-white transition-all"
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl bg-[#800000] hover:bg-[#600000] font-bold text-sm uppercase tracking-widest shadow-xl transition-all hover:shadow-[#800000]/20" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Access System"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleEmailSignUp} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Legal Name</Label>
                <Input 
                  required 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="e.g. Juan Dela Cruz" 
                  className="h-12 rounded-xl bg-white/60 border-white/50 focus-visible:ring-[#004d00] focus-visible:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Official NEU Email</Label>
                <Input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="name@neu.edu.ph" 
                  className="h-12 rounded-xl bg-white/60 border-white/50 focus-visible:ring-[#004d00] focus-visible:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Create Password</Label>
                <Input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="h-12 rounded-xl bg-white/60 border-white/50 focus-visible:ring-[#004d00] focus-visible:bg-white"
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl bg-[#004d00] hover:bg-[#003300] font-bold text-sm uppercase tracking-widest shadow-xl transition-all hover:shadow-[#004d00]/20" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Initialize Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative my-10">
          <Separator className="bg-black/10" />
          <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] whitespace-nowrap">or</span>
        </div>

        <Button 
          variant="outline" 
          className="w-full h-12 rounded-xl gap-3 border-white/50 bg-white/40 hover:bg-white font-bold transition-all shadow-sm group" 
          onClick={handleGoogleLogin} 
          disabled={isProcessing}
          title="Strictly @neu.edu.ph institutional accounts only."
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="group-hover:text-[#800000] transition-colors">Sign In with Google</span>
        </Button>
        
        <p className="mt-8 text-center text-[9px] text-muted-foreground/80 font-bold tracking-tight leading-relaxed uppercase">
          Unauthorized access is strictly prohibited. All sessions are monitored for institutional security compliance.
        </p>
      </div>
    </div>
  );
}

"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { classifyMoaIndustry } from '@/ai/flows/moa-industry-classifier';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { MOAStatus, AuditEntry } from '@/app/lib/types';
import { Loader2, Sparkles, ChevronLeft, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

export default function NewMoaPage() {
  const { user, firebaseUser, isLoading } = useAuth();
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    hteId: '',
    companyName: '',
    address: '',
    contactPerson: '',
    contactEmail: '',
    industryType: '',
    effectiveDate: '',
    college: '',
    status: 'PROCESSING: Awaiting signature' as MOAStatus
  });

  useEffect(() => {
    if (!isLoading && user && !user.canAddMoa) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleClassify = async () => {
    if (!formData.companyName) {
      toast({ title: "Error", description: "Please enter a company name first.", variant: "destructive" });
      return;
    }
    
    setIsClassifying(true);
    try {
      const result = await classifyMoaIndustry({ companyName: formData.companyName });
      setFormData(prev => ({ ...prev, industryType: result.industryType }));
      toast({ title: "AI Suggested", description: `Suggested industry: ${result.industryType}` });
    } catch (error) {
      toast({ title: "AI Error", description: "Failed to suggest industry type.", variant: "destructive" });
    } finally {
      setIsClassifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firebaseUser || !firestore) return;
    
    setIsSubmitting(true);
    const moaId = Math.random().toString(36).substr(2, 9);
    const moaRef = doc(firestore, 'moas', moaId);

    const auditEntry: AuditEntry = {
      userId: firebaseUser.uid,
      userName: user.fullName || 'User',
      timestamp: new Date().toISOString(),
      operation: 'INSERT'
    };

    const finalData = {
      ...formData,
      id: moaId,
      isDeleted: false,
      auditTrail: [auditEntry],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDoc(moaRef, finalData)
      .then(() => {
        toast({ title: "Success", description: "MOA has been successfully added to the registry." });
        router.push('/dashboard/moas');
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: moaRef.path,
          operation: 'create',
          requestResourceData: finalData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setIsSubmitting(false));
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying institutional rights...</p>
      </div>
    );
  }

  if (!user?.canAddMoa) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <ShieldAlert className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-xl font-bold">Rights Restricted</h2>
        <p className="text-muted-foreground max-w-sm text-sm">You do not have the institutional rights required to create new partnership agreements.</p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8">
      <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
        <ChevronLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <Card className="shadow-lg border-none overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground">
          <CardTitle className="text-xl sm:text-2xl flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            New Partnership Agreement
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6 sm:pt-8 px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="hteId">HTE ID</Label>
                <Input id="hteId" placeholder="e.g. HTE-2024-001" required value={formData.hteId} onChange={e => setFormData({...formData, hteId: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveDate">Effective Date</Label>
                <Input id="effectiveDate" type="date" required value={formData.effectiveDate} onChange={e => setFormData({...formData, effectiveDate: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input id="companyName" className="flex-1" placeholder="Enter company name" required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                <Button type="button" variant="outline" onClick={handleClassify} disabled={isClassifying} className="gap-2 border-accent text-accent hover:bg-accent/10 w-full sm:w-auto shrink-0">
                  {isClassifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Classify
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="industryType">Industry Type</Label>
                <Select value={formData.industryType} onValueChange={(val) => setFormData({...formData, industryType: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Telecom">Telecom</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Services">Services</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="college">Endorsed by College</Label>
                <Input id="college" placeholder="e.g. College of Computer Studies" required value={formData.college} onChange={e => setFormData({...formData, college: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Company Address</Label>
              <Input id="address" placeholder="Full business address" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input id="contactPerson" placeholder="Full name of representative" required value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email Address</Label>
                <Input id="contactEmail" type="email" placeholder="representative@company.com" required value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Initial Status</Label>
              <Select value={formData.status} onValueChange={(val: MOAStatus) => setFormData({...formData, status: val})}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROCESSING: Awaiting signature">PROCESSING: Awaiting signature</SelectItem>
                  <SelectItem value="PROCESSING: Sent to Legal">PROCESSING: Sent to Legal</SelectItem>
                  <SelectItem value="PROCESSING: Sent to VPAA/OP">PROCESSING: Sent to VPAA/OP</SelectItem>
                  <SelectItem value="APPROVED: Signed by President">APPROVED: Signed by President</SelectItem>
                  <SelectItem value="APPROVED: On-going notarization">APPROVED: On-going notarization</SelectItem>
                  <SelectItem value="APPROVED: No notarization needed">APPROVED: No notarization needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col-reverse sm:flex-row justify-end gap-3 pb-8 px-4 sm:px-6 pt-4">
            <Button variant="ghost" type="button" onClick={() => router.back()} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 w-full sm:w-auto min-w-[140px]">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Save Agreement"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

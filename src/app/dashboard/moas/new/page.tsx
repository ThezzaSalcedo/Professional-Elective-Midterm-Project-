"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useMoaStore } from '@/app/lib/store';
import { classifyMoaIndustry } from '@/ai/flows/moa-industry-classifier';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { MOAStatus } from '@/app/lib/types';
import { Loader2, Sparkles, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function NewMoaPage() {
  const { user } = useAuth();
  const { addMoa } = useMoaStore();
  const router = useRouter();
  const { toast } = useToast();
  const [isClassifying, setIsClassifying] = useState(false);

  const [formData, setFormData] = useState({
    hteId: '',
    companyName: '',
    address: '',
    contactPerson: '',
    email: '',
    industryType: '',
    effectiveDate: '',
    college: '',
    status: 'PROCESSING: Awaiting signature' as MOAStatus
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    addMoa(formData, user.name);
    toast({ title: "Success", description: "MOA has been successfully added to the registry." });
    router.push('/dashboard/moas');
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
        <ChevronLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <Card className="shadow-lg border-none">
        <CardHeader className="bg-primary text-primary-foreground rounded-t-xl">
          <CardTitle className="text-2xl flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            New Partnership Agreement
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-8">
            <div className="grid grid-cols-2 gap-6">
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
              <div className="flex gap-2">
                <Input id="companyName" className="flex-1" placeholder="Enter company name" required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                <Button type="button" variant="outline" onClick={handleClassify} disabled={isClassifying} className="gap-2 border-accent text-accent hover:bg-accent/10">
                  {isClassifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Classify
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="industryType">Industry Type</Label>
                <Input id="industryType" placeholder="e.g. Telecom, Finance..." value={formData.industryType} onChange={e => setFormData({...formData, industryType: e.target.value})} />
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

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input id="contactPerson" placeholder="Full name of representative" required value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="representative@company.com" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
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
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 pb-8">
            <Button variant="ghost" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 px-8">Save Agreement</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
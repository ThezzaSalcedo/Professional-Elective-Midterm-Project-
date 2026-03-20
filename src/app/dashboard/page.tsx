
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFirebase, useMoaCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc } from 'firebase/firestore';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileX2, 
  Search,
  Loader2,
  Database,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { MOA, AuditEntry } from '../lib/types';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { user, firebaseUser, isLoading: isAuthLoading } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    setNow(new Date());
  }, []);

  const moaQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const base = collection(firestore, 'moas');
    
    if (user.role === 'admin') return base;
    
    if (user.role === 'student') {
      return query(base, 
        where('isDeleted', '==', false),
        where('status', '>=', 'APPROVED'),
        where('status', '<', 'APPROVEE')
      );
    }
    
    return query(base, where('isDeleted', '==', false));
  }, [firestore, user?.role]);

  const { data: moas, isLoading: isMoaLoading, error, isIndexBuilding } = useMoaCollection<MOA>(moaQuery);

  const activeInstitutionalMoas = useMemo(() => {
    if (!moas) return [];
    return moas.filter(m => !m.isDeleted);
  }, [moas]);

  const stats = useMemo(() => {
    if (!activeInstitutionalMoas) return [];
    
    const active = activeInstitutionalMoas.filter(m => m.status?.startsWith('APPROVED')).length;
    const processing = activeInstitutionalMoas.filter(m => m.status?.startsWith('PROCESSING')).length;
    
    const expiringSoon = activeInstitutionalMoas.filter(m => {
      if (!m.effectiveDate || !m.status?.startsWith('APPROVED')) return false;
      const expiry = new Date(m.effectiveDate);
      expiry.setFullYear(expiry.getFullYear() + 1); 
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 60;
    }).length;

    const expired = activeInstitutionalMoas.filter(m => m.status === 'EXPIRED').length;

    const allStats = [
      { title: 'Active Agreements', value: active, icon: CheckCircle2, color: 'bg-green-500' },
      { title: 'In Process', value: processing, icon: Clock, color: 'bg-blue-500' },
      { title: 'Expiring Soon', value: expiringSoon, icon: AlertTriangle, color: 'bg-orange-500' },
      { title: 'Expired', value: expired, icon: FileX2, color: 'bg-red-500' },
    ];

    // Faculty requested to only see Active and In Process
    if (user?.role === 'faculty') {
      return allStats.slice(0, 2);
    }

    // Students strictly see only authorized content, which usually only includes Approved anyway
    if (user?.role === 'student') {
      return allStats.filter(s => s.title === 'Active Agreements');
    }

    return allStats;
  }, [activeInstitutionalMoas, now, user?.role]);

  const visibleMoas = useMemo(() => {
    if (!activeInstitutionalMoas) return [];
    
    const q = search.toLowerCase();
    return activeInstitutionalMoas.filter(m => 
      m.companyName.toLowerCase().includes(q) ||
      m.college.toLowerCase().includes(q) ||
      m.hteId.toLowerCase().includes(q) ||
      m.industryType.toLowerCase().includes(q) ||
      m.address.toLowerCase().includes(q)
    );
  }, [activeInstitutionalMoas, search]);

  const handleSeedData = async () => {
    if (!firestore || !user || !firebaseUser) return;
    setIsSeeding(true);
    
    const statuses: any[] = [
      'APPROVED: Signed by President',
      'PROCESSING: Sent to Legal',
      'APPROVED: No notarization needed'
    ];

    for (const status of statuses) {
      const id = Math.random().toString(36).substr(2, 9);
      const ref = doc(firestore, 'moas', id);
      const audit: AuditEntry = {
        userId: firebaseUser.uid,
        userName: user.fullName || 'User',
        operation: 'INSERT',
        timestamp: new Date().toISOString()
      };
      
      const sampleMoa = {
        id,
        hteId: `HTE-2024-${Math.floor(Math.random() * 1000)}`,
        companyName: status.startsWith('APPROVED') ? 'Approved Partner Corp' : 'Pending Partner Inc',
        address: 'Academic District, Quezon City',
        contactPerson: 'Institutional Liaison',
        contactEmail: 'liaison@partner.com',
        industryType: 'Education',
        effectiveDate: new Date().toISOString(),
        college: 'University Center',
        status: status,
        isDeleted: false,
        auditTrail: [audit],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(ref, sampleMoa);
    }
    
    toast({ title: "Registry Seeded", description: "Sample institutional agreements added for testing visibility." });
    setIsSeeding(false);
  };

  if (isAuthLoading || (isMoaLoading && !isIndexBuilding)) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Synchronizing Partnership Registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">System Overview</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Institutional access for <span className="font-semibold text-primary capitalize">{user?.role}</span> account: <span className="font-bold">{user?.fullName}</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {user?.role === 'admin' && (
            <Button variant="outline" size="sm" onClick={handleSeedData} disabled={isSeeding} className="gap-2">
              <Database className="w-4 h-4" />
              Seed Registry
            </Button>
          )}
          {user?.canAddMoa && (
            <Button asChild size="sm">
              <Link href="/dashboard/moas/new">Create Agreement</Link>
            </Button>
          )}
        </div>
      </header>

      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Security Warning</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {isIndexBuilding && (
        <Alert className="bg-blue-50 border-blue-200">
          <Database className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Optimizing Database</AlertTitle>
          <AlertDescription className="text-blue-700">
            The dashboard is currently optimizing its database for your role. This may take a few minutes.
          </AlertDescription>
        </Alert>
      )}

      <div className={cn(
        "grid gap-4 sm:gap-6",
        stats.length === 1 ? "grid-cols-1" :
        stats.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      )}>
        {stats.map((s) => (
          <StatsCard key={s.title} {...s} colorClass={s.color} />
        ))}
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-primary">Institutional Partnerships</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {user?.role === 'student' 
                ? "Visibility restricted to Approved partnerships only." 
                : "Showing active institutional records matching your profile."
              }
            </p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-10 h-9 text-sm border-primary/20 focus:ring-primary" placeholder="Filter agreements..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm min-w-[600px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left font-semibold">Partner Company</th>
                <th className="px-4 sm:px-6 py-3 text-left font-semibold">College</th>
                <th className="px-4 sm:px-6 py-3 text-left font-semibold">Industry</th>
                <th className="px-4 sm:px-6 py-3 text-left font-semibold">Status</th>
                <th className="px-4 sm:px-6 py-3 text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleMoas.length > 0 ? visibleMoas.map(m => (
                <tr key={m.id} className="hover:bg-muted/5 transition-colors">
                  <td className="px-4 sm:px-6 py-4">
                    <div className="font-semibold line-clamp-1">{m.companyName}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{m.hteId}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-xs font-medium">{m.college}</td>
                  <td className="px-4 sm:px-6 py-4 text-xs uppercase text-muted-foreground font-semibold">{m.industryType}</td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase whitespace-nowrap",
                      m.status.startsWith('APPROVED') ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {m.status.split(':')[0]}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary">
                      <Link href="/dashboard/moas"><ArrowRight className="w-4 h-4" /></Link>
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-6 py-12 text-center text-muted-foreground italic">
                    {isMoaLoading ? "Synchronizing records..." : "No authorized agreements found matching your institutional filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

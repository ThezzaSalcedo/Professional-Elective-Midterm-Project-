
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
  ArrowRight
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
    return query(base, where('isDeleted', '==', false));
  }, [firestore, user]);

  const { data: moas, isLoading: isMoaLoading, error, isIndexBuilding } = useMoaCollection<MOA>(moaQuery);

  const visibleMoas = useMemo(() => {
    if (!moas) return [];
    let filtered = moas;
    if (user?.role === 'student') {
      filtered = filtered.filter(m => m.status && m.status.startsWith('APPROVED'));
    }

    if (!search) return filtered;
    const q = search.toLowerCase();
    return filtered.filter(m => 
      m.companyName.toLowerCase().includes(q) ||
      m.college.toLowerCase().includes(q) ||
      m.hteId.toLowerCase().includes(q) ||
      m.industryType.toLowerCase().includes(q) ||
      m.address.toLowerCase().includes(q)
    );
  }, [moas, search, user?.role]);

  const stats = useMemo(() => {
    if (!moas) return [];
    const sourceSet = user?.role === 'student' 
      ? moas.filter(m => m.status?.startsWith('APPROVED'))
      : moas.filter(m => !m.isDeleted);
    
    const active = sourceSet.filter(m => m.status?.startsWith('APPROVED')).length;
    const processing = sourceSet.filter(m => m.status?.startsWith('PROCESSING')).length;
    
    const expiringSoon = sourceSet.filter(m => {
      if (!m.effectiveDate) return false;
      const expiry = new Date(m.effectiveDate);
      expiry.setFullYear(expiry.getFullYear() + 1); 
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 60;
    }).length;

    const expired = sourceSet.filter(m => m.status === 'EXPIRED').length;

    return [
      { title: 'Active Agreements', value: active, icon: CheckCircle2, color: 'bg-green-500' },
      { title: 'In Process', value: processing, icon: Clock, color: 'bg-blue-500' },
      { title: 'Expiring Soon', value: expiringSoon, icon: AlertTriangle, color: 'bg-orange-500' },
      { title: 'Expired', value: expired, icon: FileX2, color: 'bg-red-500' },
    ];
  }, [moas, user?.role, now]);

  const handleSeedData = async () => {
    if (!firestore || !user || !firebaseUser) return;
    setIsSeeding(true);
    const sampleMoas = [
      {
        hteId: 'HTE-2024-001',
        companyName: 'Global Technology Solutions',
        address: '123 Innovation Way, Makati City',
        contactPerson: 'Maria Rodriguez',
        contactEmail: 'm.rodriguez@globaltech.com',
        industryType: 'Technology',
        effectiveDate: new Date().toISOString(),
        college: 'College of Computer Studies',
        status: 'APPROVED: Signed by President',
        isDeleted: false,
      }
    ];
    try {
      for (const item of sampleMoas) {
        const id = Math.random().toString(36).substr(2, 9);
        const ref = doc(firestore, 'moas', id);
        const audit: AuditEntry = {
          userId: firebaseUser.uid,
          userName: user.name,
          operation: 'INSERT',
          timestamp: new Date().toISOString()
        };
        await setDoc(ref, {
          ...item,
          id,
          auditTrail: [audit],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      toast({ title: "Seeding Complete" });
    } catch (err) {
      toast({ title: "Seeding Failed", variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">System Overview</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Authorized access for <span className="font-semibold text-primary capitalize">{user?.role}</span> accounts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {user?.role === 'admin' && (
            <Button variant="outline" size="sm" onClick={handleSeedData} disabled={isSeeding}>
              {isSeeding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Seed Registry"}
            </Button>
          )}
          {user?.role !== 'student' && (
            <Button asChild size="sm">
              <Link href="/dashboard/moas/new">Create Agreement</Link>
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((s) => (
          <StatsCard key={s.title} {...s} colorClass={s.color} />
        ))}
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base sm:text-lg">Institutional Partnerships</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Showing authorized records matching your filter.</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-10 h-9 text-sm" placeholder="Filter agreements..." value={search} onChange={e => setSearch(e.target.value)} />
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
                    <div className="text-[10px] text-muted-foreground">{m.hteId}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-xs font-medium">{m.college}</td>
                  <td className="px-4 sm:px-6 py-4 text-xs">{m.industryType}</td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase whitespace-nowrap",
                      m.status.startsWith('APPROVED') ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {m.status.split(':')[0]}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                      <Link href="/dashboard/moas"><ArrowRight className="w-4 h-4" /></Link>
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-6 py-12 text-center text-muted-foreground">
                    {isMoaLoading ? "Synchronizing records..." : "No agreements found matching your criteria."}
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

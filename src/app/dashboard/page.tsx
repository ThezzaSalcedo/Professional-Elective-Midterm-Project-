"use client"

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { MOA, AuditEntry } from '../lib/types';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { user, firebaseUser } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  const moaQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const base = collection(firestore, 'moas');
    
    if (user.role === 'admin') return base;
    
    if (user.role === 'faculty') {
      return query(base, where('isDeleted', '==', false));
    }
    
    // Students query: Must exactly match document-level security constraints
    if (user.role === 'student') {
      return query(
        base, 
        where('isDeleted', '==', false),
        where('status', '>=', 'APPROVED'),
        where('status', '<', 'APPROVEE')
      );
    }
    
    return null;
  }, [firestore, user]);

  const { data: moas, isLoading } = useMoaCollection<MOA>(moaQuery);

  const visibleMoas = useMemo(() => {
    if (!moas) return [];
    let base = moas;
    
    if (search) {
      const q = search.toLowerCase();
      base = base.filter(m => 
        m.companyName.toLowerCase().includes(q) ||
        m.college.toLowerCase().includes(q) ||
        m.industryType.toLowerCase().includes(q)
      );
    }

    return base;
  }, [moas, search]);

  const stats = useMemo(() => {
    if (!moas) return [];
    const active = moas.filter(m => (m as any).status?.startsWith('APPROVED')).length;
    const processing = moas.filter(m => (m as any).status?.startsWith('PROCESSING')).length;
    const expiring = moas.filter(m => (m as any).status === 'EXPIRING').length;
    const expired = moas.filter(m => (m as any).status === 'EXPIRED').length;

    return [
      { title: 'Active MOAs', value: active, icon: CheckCircle2, color: 'bg-green-500' },
      { title: 'Processing', value: processing, icon: Clock, color: 'bg-blue-500' },
      { title: 'Expiring Soon', value: expiring, icon: AlertTriangle, color: 'bg-orange-500' },
      { title: 'Expired', value: expired, icon: FileX2, color: 'bg-red-500' },
    ];
  }, [moas]);

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
        industryType: 'Tech',
        effectiveDate: '2024-01-15',
        college: 'College of Computer Studies',
        status: 'APPROVED: Signed by President',
        isDeleted: false,
      },
      {
        hteId: 'HTE-2024-002',
        companyName: 'Lumina Finance Group',
        address: '88 Banking Tower, BGC Taguig',
        contactPerson: 'Robert Tan',
        contactEmail: 'rtan@luminafinance.com',
        industryType: 'Finance',
        effectiveDate: '2024-02-10',
        college: 'College of Business Administration',
        status: 'PROCESSING: Sent to Legal',
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

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-3">
          {user?.role === 'admin' && (
            <Button variant="outline" onClick={handleSeedData} disabled={isSeeding}>Seed Data</Button>
          )}
          {user?.role !== 'student' && (
            <Button asChild><Link href="/dashboard/moas/new">New Agreement</Link></Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((s) => (
          <StatsCard key={s.title} {...s} colorClass={s.color} />
        ))}
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="font-bold">Institutional Partnerships</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Filter agreements..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-4 text-left">Company</th>
              <th className="px-6 py-4 text-left">College</th>
              <th className="px-6 py-4 text-left">Industry</th>
              <th className="px-6 py-4 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visibleMoas.map(m => (
              <tr key={m.id}>
                <td className="px-6 py-4 font-medium">{m.companyName}</td>
                <td className="px-6 py-4">{m.college}</td>
                <td className="px-6 py-4">{m.industryType}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    m.status.startsWith('APPROVED') ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {m.status.split(':')[0]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
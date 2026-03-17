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
  AlertCircle,
  Database
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
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

  // Queries are now strictly aligned with security rules to prevent permission denials.
  const moaQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const base = collection(firestore, 'moas');
    
    // Super-admins can list everything
    if (user.role === 'admin') return base;
    
    // Faculty restricted to non-deleted records
    if (user.role === 'faculty') {
      return query(base, where('isDeleted', '==', false));
    }
    
    // Students restricted to approved AND non-deleted records
    if (user.role === 'student') {
      return query(
        base, 
        where('isDeleted', '==', false),
        where('status', '>=', 'APPROVED'),
        where('status', '<', 'APPROVEE')
      );
    }
    
    return base;
  }, [firestore, user]);

  const { data: moas, isLoading: isMoaLoading, error, isIndexBuilding } = useMoaCollection<MOA>(moaQuery);

  const visibleMoas = useMemo(() => {
    if (!moas) return [];
    if (!search) return moas;
    
    const q = search.toLowerCase();
    return moas.filter(m => 
      m.companyName.toLowerCase().includes(q) ||
      m.college.toLowerCase().includes(q) ||
      m.industryType.toLowerCase().includes(q)
    );
  }, [moas, search]);

  const stats = useMemo(() => {
    if (!moas) return [];
    const sourceSet = moas;
    
    const active = sourceSet.filter(m => m.status?.startsWith('APPROVED')).length;
    const processing = sourceSet.filter(m => m.status?.startsWith('PROCESSING')).length;
    const expiring = sourceSet.filter(m => m.status === 'EXPIRING').length;
    const expired = sourceSet.filter(m => m.status === 'EXPIRED').length;

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
        <p className="text-muted-foreground animate-pulse">Synchronizing MOA Registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System authorization confirmed for <span className="font-semibold text-primary capitalize">{user?.role}</span> access.
          </p>
        </div>
        <div className="flex gap-3">
          {user?.role === 'admin' && (
            <Button variant="outline" onClick={handleSeedData} disabled={isSeeding}>Seed Data</Button>
          )}
          {user?.role !== 'student' && (
            <Button asChild><Link href="/dashboard/moas/new">New Agreement</Link></Button>
          )}
        </div>
      </header>

      {isIndexBuilding && (
        <Alert variant="default" className="bg-blue-50 border-blue-200">
          <Database className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 font-bold">Building Database Indexes</AlertTitle>
          <AlertDescription className="text-blue-700">
            The dashboard is currently optimizing its database. This may take a few minutes. 
            Check your console for the link to create the required composite index.
          </AlertDescription>
        </Alert>
      )}

      {error && !isIndexBuilding && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.message}
          </AlertDescription>
        </Alert>
      )}

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
            {visibleMoas.length > 0 ? visibleMoas.map(m => (
              <tr key={m.id} className="hover:bg-muted/5 transition-colors">
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
            )) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                  {isMoaLoading ? "Synchronizing records..." : "No agreements found matching your criteria."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
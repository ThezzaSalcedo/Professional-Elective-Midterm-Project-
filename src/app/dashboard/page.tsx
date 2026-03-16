"use client"

import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileX2, 
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { MOA } from '../lib/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const [search, setSearch] = useState('');

  const moaQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const base = collection(firestore, 'moas');
    
    if (user.role === 'Student') {
      return query(base, where('isSoftDeleted', '==', false));
    } else if (user.role === 'Faculty') {
      return query(base, where('isSoftDeleted', '==', false));
    }
    return base;
  }, [firestore, user]);

  const { data: moas, isLoading } = useCollection<MOA>(moaQuery);

  const visibleMoas = useMemo(() => {
    if (!moas) return [];
    let base = moas;
    
    if (user?.role === 'Student') {
      base = base.filter(m => m.status.startsWith('APPROVED'));
    }

    if (search) {
      const q = search.toLowerCase();
      base = base.filter(m => 
        m.companyName.toLowerCase().includes(q) ||
        m.college.toLowerCase().includes(q) ||
        m.industryType.toLowerCase().includes(q)
      );
    }

    return base;
  }, [moas, user, search]);

  const stats = useMemo(() => {
    if (!moas) return [];
    const active = moas.filter(m => !m.isSoftDeleted && m.status.startsWith('APPROVED')).length;
    const processing = moas.filter(m => !m.isSoftDeleted && m.status.startsWith('PROCESSING')).length;
    const expiring = moas.filter(m => !m.isSoftDeleted && m.status === 'EXPIRING').length;
    const expired = moas.filter(m => !m.isSoftDeleted && m.status === 'EXPIRED').length;

    return [
      { title: 'Active MOAs', value: active, icon: CheckCircle2, color: 'bg-green-500' },
      { title: 'Processing', value: processing, icon: Clock, color: 'bg-blue-500' },
      { title: 'Expiring Soon', value: expiring, icon: AlertTriangle, color: 'bg-orange-500' },
      { title: 'Expired', value: expired, icon: FileX2, color: 'bg-red-500' },
    ];
  }, [moas]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
        <p className="text-muted-foreground animate-pulse font-medium">Synchronizing Partnership Data...</p>
      </div>
    );
  }

  if (user?.role === 'Student') {
    return (
      <div className="space-y-12 pb-20">
        <section className="text-center space-y-6 pt-10">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
            Find your next <span className="text-primary">Internship Partner</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
            Explore our network of industry partners with active Memorandums of Agreement (MOA). Verified and approved for student placement.
          </p>
          
          <div className="max-w-2xl mx-auto relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search by company, industry, or location..." 
              className="pl-12 h-14 bg-white border-slate-200 shadow-sm text-lg rounded-xl focus-visible:ring-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </section>

        <div className="space-y-6">
          <div className="flex items-end justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Approved Partnerships</h2>
              <p className="text-sm text-muted-foreground">Showing only verified institutional agreements</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5 text-left font-bold text-slate-500 uppercase tracking-wider text-[11px]">Company Name</th>
                    <th className="px-6 py-5 text-left font-bold text-slate-500 uppercase tracking-wider text-[11px]">Address</th>
                    <th className="px-6 py-5 text-left font-bold text-slate-500 uppercase tracking-wider text-[11px]">Contact Person</th>
                    <th className="px-6 py-5 text-left font-bold text-slate-500 uppercase tracking-wider text-[11px]">Email Address</th>
                    <th className="px-6 py-5 text-right font-bold text-slate-500 uppercase tracking-wider text-[11px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visibleMoas.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{m.companyName}</td>
                      <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{m.address}</td>
                      <td className="px-6 py-4 text-slate-600">{m.contactPerson}</td>
                      <td className="px-6 py-4">
                        <a href={`mailto:${m.contactEmail}`} className="text-primary hover:underline font-medium">
                          {m.contactEmail}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 tracking-wide">
                          Approved
                        </span>
                      </td>
                    </tr>
                  ))}
                  {visibleMoas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="w-8 h-8 opacity-20" />
                          <p className="font-medium italic">No internship partners found matching your search.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1 font-medium">Monitoring NEU's institutional partnerships</p>
        </div>
        
        {user?.role !== 'Student' && (user?.role === 'Admin' || user?.canEdit) && (
          <Button asChild className="gap-2 bg-accent hover:bg-accent/90">
            <Link href="/dashboard/moas/new">
              <Plus className="w-4 h-4" />
              New Agreement
            </Link>
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <StatsCard 
            key={s.title} 
            title={s.title} 
            value={s.value} 
            icon={s.icon} 
            colorClass={s.color} 
          />
        ))}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/20">
          <h3 className="font-semibold text-foreground">Recent Activity</h3>
          <Link href="/dashboard/moas" className="text-sm font-medium text-accent hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Company Name</th>
                <th className="px-6 py-4 text-left font-semibold">College</th>
                <th className="px-6 py-4 text-left font-semibold">Industry</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleMoas.slice(0, 5).map((m) => (
                <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium">{m.companyName}</td>
                  <td className="px-6 py-4 text-muted-foreground">{m.college}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider">
                      {m.industryType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide",
                      m.status.startsWith('APPROVED') ? "bg-green-100 text-green-700" :
                      m.status.startsWith('PROCESSING') ? "bg-blue-100 text-blue-700" :
                      "bg-orange-100 text-orange-700"
                    )}>
                      {m.status.split(':')[0]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/moas`}>View</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


"use client"

import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMoaStore } from '../lib/store';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileX2, 
  Search,
  Filter,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const { moas } = useMoaStore();
  const [search, setSearch] = useState('');

  // Visibility logic based on RBAC
  const visibleMoas = useMemo(() => {
    let base = moas;
    
    // Students see only APPROVED and not deleted
    if (user?.role === 'Student') {
      base = base.filter(m => m.status.startsWith('APPROVED') && !m.isDeleted);
    } 
    // Faculty see all active non-deleted
    else if (user?.role === 'Faculty') {
      base = base.filter(m => !m.isDeleted);
    }
    // Admins see all (including deleted)

    if (search) {
      const q = search.toLowerCase();
      base = base.filter(m => 
        m.companyName.toLowerCase().includes(q) ||
        m.college.toLowerCase().includes(q) ||
        m.industryType.toLowerCase().includes(q) ||
        m.contactPerson.toLowerCase().includes(q) ||
        m.address.toLowerCase().includes(q)
      );
    }

    return base;
  }, [moas, user, search]);

  const stats = useMemo(() => {
    const active = moas.filter(m => !m.isDeleted && m.status.startsWith('APPROVED')).length;
    const processing = moas.filter(m => !m.isDeleted && m.status.startsWith('PROCESSING')).length;
    const expiring = moas.filter(m => !m.isDeleted && m.status === 'EXPIRING').length;
    const expired = moas.filter(m => !m.isDeleted && m.status === 'EXPIRED').length;

    return [
      { title: 'Active MOAs', value: active, icon: CheckCircle2, color: 'bg-green-500' },
      { title: 'Processing', value: processing, icon: Clock, color: 'bg-blue-500' },
      { title: 'Expiring Soon', value: expiring, icon: AlertTriangle, color: 'bg-orange-500' },
      { title: 'Expired', value: expired, icon: FileX2, color: 'bg-red-500' },
    ];
  }, [moas]);

  // Student specific view matching the reference UI
  if (user?.role === 'Student') {
    return (
      <div className="space-y-12 pb-20">
        {/* Hero Section */}
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

        {/* Partnerships List */}
        <div className="space-y-6">
          <div className="flex items-end justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Approved Partnerships</h2>
              <p className="text-sm text-muted-foreground">Showing all currently valid agreements</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2 rounded-lg border-slate-200">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="gap-2 rounded-lg border-slate-200">
                <Plus className="w-4 h-4 rotate-45" />
                Export
              </Button>
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
                        <a href={`mailto:${m.email}`} className="text-primary hover:underline font-medium">
                          {m.email}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 tracking-wide">
                          Active
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

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 pt-4">
             <p className="text-sm text-muted-foreground mr-4">Showing <span className="font-bold text-slate-900">{Math.min(visibleMoas.length, 5)}</span> of <span className="font-bold text-slate-900">{visibleMoas.length}</span> results</p>
             <div className="flex items-center gap-1">
               <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200">
                 <ChevronLeft className="w-4 h-4" />
               </Button>
               <Button variant="default" className="h-9 w-9 px-0">1</Button>
               <Button variant="ghost" className="h-9 w-9 px-0">2</Button>
               <Button variant="ghost" className="h-9 w-9 px-0">3</Button>
               <span className="px-2 text-muted-foreground">...</span>
               <Button variant="ghost" className="h-9 w-9 px-0">9</Button>
               <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200">
                 <ChevronRight className="w-4 h-4" />
               </Button>
             </div>
          </div>
        </div>

        {/* Footer info matching reference style */}
        <footer className="pt-20 border-t flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
             <div className="bg-primary/10 p-1.5 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-primary" />
             </div>
             <span className="font-bold text-slate-900">NEU MOA Monitoring</span>
          </div>
          <nav className="flex gap-8 font-medium">
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-primary transition-colors">Contact Support</Link>
          </nav>
          <p>© 2024 New Era University. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  // Admin/Faculty View
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

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by Company, College, Contact, or Industry..." 
              className="pl-10 h-11 border-none bg-muted/50 focus-visible:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-11 gap-2 shrink-0 border-dashed">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/20">
              <h3 className="font-semibold text-foreground">Recent MOAs</h3>
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
                          m.status === 'EXPIRED' ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
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
                  {visibleMoas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                        No agreements found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

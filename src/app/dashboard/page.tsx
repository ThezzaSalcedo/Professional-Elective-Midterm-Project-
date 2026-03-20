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
  MapPin,
  Mail,
  User,
  ShieldCheck,
  LayoutDashboard,
  FileText,
  Settings,
  Check
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { MOA, AuditEntry } from '../lib/types';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, formatDistanceToNow } from 'date-fns';

const NEU_LOGO_URL = "https://upload.wikimedia.org/wikipedia/en/c/c6/New_Era_University.svg";

export default function DashboardPage() {
  const { user, firebaseUser, isLoading: isAuthLoading } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('All Sectors');
  const [isSeeding, setIsSeeding] = useState(false);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
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

  const { data: moas, isLoading: isMoaLoading, isIndexBuilding } = useMoaCollection<MOA>(moaQuery);

  const activeInstitutionalMoas = useMemo(() => {
    if (!moas) return [];
    return moas.filter(m => !m.isDeleted);
  }, [moas]);

  const stats = useMemo(() => {
    if (!activeInstitutionalMoas) return [];
    const active = activeInstitutionalMoas.filter(m => m.status?.startsWith('APPROVED')).length;
    const processing = activeInstitutionalMoas.filter(m => m.status?.startsWith('PROCESSING')).length;
    const expiringSoon = activeInstitutionalMoas.filter(m => {
      if (!m.expirationDate || !m.status?.startsWith('APPROVED')) return false;
      const expiry = new Date(m.expirationDate);
      const daysLeft = differenceInDays(expiry, now);
      return daysLeft >= 0 && daysLeft <= 60;
    }).length;
    const expired = activeInstitutionalMoas.filter(m => {
      if (!m.expirationDate) return false;
      return differenceInDays(new Date(m.expirationDate), now) < 0;
    }).length;

    return [
      { title: 'Active Agreements', value: active, icon: CheckCircle2, color: 'bg-[#006400]' },
      { title: 'In Process', value: processing, icon: Clock, color: 'bg-[#800000]' },
      { title: 'Expiring Soon', value: expiringSoon, icon: AlertTriangle, color: 'bg-[#FFD700]' },
      { title: 'Expired', value: expired, icon: FileX2, color: 'bg-red-600' },
    ];
  }, [activeInstitutionalMoas, now]);

  const sectors = ['All Sectors', 'Technology', 'Finance', 'Healthcare', 'Creative', 'Education', 'Services'];

  const visibleMoas = useMemo(() => {
    if (!activeInstitutionalMoas) return [];
    const q = search.toLowerCase();
    return activeInstitutionalMoas.filter(m => {
      const matchesSearch = 
        m.companyName.toLowerCase().includes(q) ||
        m.college.toLowerCase().includes(q) ||
        m.hteId.toLowerCase().includes(q) ||
        m.industryType.toLowerCase().includes(q);
      const matchesSector = selectedSector === 'All Sectors' || m.industryType === selectedSector;
      return matchesSearch && matchesSector;
    });
  }, [activeInstitutionalMoas, search, selectedSector]);

  const handleSeedData = async () => {
    if (!firestore || !user || !firebaseUser) return;
    setIsSeeding(true);
    const samples = [
      { name: 'Global Tech Solutions Inc.', industry: 'Technology', address: '123 Innovation Drive, Silicon Valley, CA 94043' },
      { name: 'Stellar Finance Group', industry: 'Finance', address: 'Level 42, International Financial Center, NY 10004' },
      { name: 'BioHealth Research Lab', industry: 'Healthcare', address: '88 Medical Plaza Parkway, Boston, MA 02118' },
    ];
    const today = new Date();
    for (const sample of samples) {
      const id = Math.random().toString(36).substr(2, 9);
      const ref = doc(firestore, 'moas', id);
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 1);
      await setDoc(ref, {
        id,
        hteId: `HTE-2024-${Math.floor(Math.random() * 1000)}`,
        companyName: sample.name,
        address: sample.address,
        contactPerson: 'Institutional Liaison',
        contactEmail: 'liaison@partner.com',
        industryType: sample.industry,
        effectiveDate: today.toISOString(),
        expirationDate: expDate.toISOString(),
        college: 'University Center',
        status: 'APPROVED: Signed by President',
        isDeleted: false,
        auditTrail: [{ userId: firebaseUser.uid, userName: user.fullName, operation: 'INSERT', timestamp: today.toISOString() }],
        createdAt: today.toISOString(),
        updatedAt: today.toISOString()
      });
    }
    toast({ title: "Registry Seeded" });
    setIsSeeding(false);
  };

  if (isAuthLoading || (isMoaLoading && !isIndexBuilding)) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <img src={NEU_LOGO_URL} alt="NEU Logo" className="w-20 h-20 animate-institutional-pulse" />
        <p className="text-primary font-black uppercase tracking-widest text-xs animate-pulse">Synchronizing Registry</p>
      </div>
    );
  }

  if (user?.role === 'student') {
    return (
      <div className="min-h-full flex flex-col space-y-8 animate-in fade-in duration-500">
        <header className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#0f172a]">Partner Organizations</h1>
              <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed font-medium">
                Verified university partners for institutional collaborations and internships.
              </p>
            </div>
            <div className="shrink-0">
              <div className="flex items-center gap-2 bg-[#006400]/5 text-[#006400] px-4 py-2 rounded-full border border-[#006400]/10 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#006400] animate-pulse" />
                Verified Institutional Registry
              </div>
            </div>
          </div>
        </header>

        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-primary/5 border border-muted/50 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                className="pl-14 h-14 bg-muted/30 border-none rounded-2xl text-base focus-visible:ring-primary/20" 
                placeholder="Search partner organizations..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
              {sectors.map((sector) => (
                <Button 
                  key={sector} 
                  variant={selectedSector === sector ? "default" : "secondary"}
                  className={cn(
                    "rounded-2xl h-14 px-8 font-black text-xs shrink-0 uppercase tracking-widest transition-all",
                    selectedSector === sector ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                  onClick={() => setSelectedSector(sector)}
                >
                  {sector}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {visibleMoas.length > 0 ? visibleMoas.map((m) => (
            <div key={m.id} className="group bg-white rounded-[2.5rem] p-10 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border border-muted/50 relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
              
              <div className="flex items-center justify-between mb-8">
                <Badge className="bg-[#006400]/10 text-[#006400] border-none font-black text-[9px] tracking-[0.2em] px-4 py-1.5 uppercase flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#006400]" />
                  NEU Approved
                </Badge>
                <div className="bg-accent rounded-full p-2 text-accent-foreground shadow-sm">
                  <Check className="w-4 h-4" strokeWidth={4} />
                </div>
              </div>

              <div className="space-y-6 flex-1">
                <h3 className="text-2xl font-black tracking-tighter text-[#0f172a] group-hover:text-primary transition-colors line-clamp-2 leading-tight">{m.companyName}</h3>
                
                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="w-5 h-5 mt-1 shrink-0 text-primary/40" />
                  <p className="text-sm font-bold leading-relaxed line-clamp-2 uppercase tracking-tight">{m.address}</p>
                </div>

                <div className="bg-primary/[0.02] rounded-[2rem] p-8 space-y-5 border border-primary/5">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14 border-4 border-white shadow-md">
                      <AvatarFallback className="bg-primary text-white font-black text-xl">
                        {m.contactPerson?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-black text-[#0f172a] text-sm leading-none">{m.contactPerson}</p>
                      <p className="text-[10px] text-primary font-black uppercase tracking-[0.1em] mt-1.5">{m.industryType} LIAISON</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[#1e293b] pt-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="text-sm font-black truncate tracking-tight">{m.contactEmail}</span>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileX2 className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">No Partnerships Found</h3>
              <p className="text-muted-foreground font-medium">Try adjusting your filters or institutional keywords.</p>
            </div>
          )}
        </div>

        <footer className="pt-16 pb-12 border-t flex flex-col md:flex-row items-center justify-between gap-8 text-muted-foreground text-[10px] font-black tracking-[0.3em] uppercase opacity-60">
          <div className="flex items-center gap-4">
            <img src={NEU_LOGO_URL} alt="NEU" className="w-8 h-8 grayscale contrast-125" />
            <p>© 2024 NEW ERA UNIVERSITY MOA PORTAL</p>
          </div>
          <div className="flex items-center gap-12">
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Compliance</Link>
            <Link href="#" className="hover:text-primary transition-colors">Technical Support</Link>
          </div>
        </footer>
      </div>
    );
  }

  const filteredStats = user?.role === 'faculty' ? stats.slice(0, 2) : stats;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <img src={NEU_LOGO_URL} alt="NEU Logo" className="w-16 h-16 sm:w-20 sm:h-20" />
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-[#0f172a] uppercase">Institutional Overview</h1>
            <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">
              Authenticated: <span className="text-primary">{user?.fullName}</span> <span className="mx-2 opacity-20">|</span> Role: <span className="text-primary">{user?.role}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {user?.role === 'admin' && (
            <Button variant="outline" size="sm" onClick={handleSeedData} disabled={isSeeding} className="gap-2 font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl border-2">
              <Database className="w-4 h-4" />
              Seed Registry
            </Button>
          )}
          {user?.canAddMoa && (
            <Button asChild size="sm" className="h-10 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
              <Link href="/dashboard/moas/new">Initialize MOA</Link>
            </Button>
          )}
        </div>
      </header>

      <div className={cn(
        "grid gap-6",
        filteredStats.length === 1 ? "grid-cols-1" :
        filteredStats.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      )}>
        {filteredStats.map((s) => (
          <StatsCard key={s.title} {...s} colorClass={s.color} />
        ))}
      </div>

      <div className="bg-white border-2 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-8 border-b flex flex-col md:flex-row md:items-center justify-between gap-6 bg-primary/[0.02]">
          <div>
            <h3 className="font-black text-xl text-[#0f172a] uppercase tracking-tighter">Institutional Partnerships</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">
              Active records with real-time validity tracking
            </p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-11 h-11 text-sm border-2 rounded-xl focus:ring-primary/20" placeholder="Search institutional records..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm min-w-[750px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-8 py-5 text-left font-black uppercase tracking-widest text-[10px]">Partner Organization</th>
                <th className="px-8 py-5 text-left font-black uppercase tracking-widest text-[10px]">Agreement Validity</th>
                <th className="px-8 py-5 text-left font-black uppercase tracking-widest text-[10px]">Institutional College</th>
                <th className="px-8 py-5 text-left font-black uppercase tracking-widest text-[10px]">Status</th>
                <th className="px-8 py-5 text-right w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleMoas.length > 0 ? visibleMoas.map(m => {
                const expiry = m.expirationDate ? new Date(m.expirationDate) : null;
                const daysLeft = expiry ? differenceInDays(expiry, now) : null;
                const isExpired = daysLeft !== null && daysLeft < 0;

                return (
                  <tr key={m.id} className="hover:bg-primary/[0.01] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-black text-base text-[#0f172a] group-hover:text-primary transition-colors leading-tight">{m.companyName}</div>
                      <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-60">{m.hteId}</div>
                    </td>
                    <td className="px-8 py-6">
                      {expiry ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-[#0f172a]">{expiry.toLocaleDateString()}</span>
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest mt-1",
                            isExpired ? "text-destructive" : daysLeft! <= 60 ? "text-orange-500" : "text-[#006400]"
                          )}>
                            {isExpired ? "EXPIRED" : `${formatDistanceToNow(expiry)} REMAINING`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[10px] font-bold">DATE NOT INITIALIZED</span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-[11px] font-black uppercase tracking-tight text-[#0f172a] opacity-80">{m.college}</td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap border",
                        m.status.startsWith('APPROVED') ? "bg-[#006400]/5 text-[#006400] border-[#006400]/20" : "bg-[#800000]/5 text-[#800000] border-[#800000]/20"
                      )}>
                        {m.status.split(':')[0]}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <Button variant="ghost" size="sm" asChild className="h-10 w-10 p-0 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm">
                        <Link href="/dashboard/moas"><ArrowRight className="w-5 h-5" /></Link>
                      </Button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="text-muted-foreground font-black uppercase tracking-[0.3em] text-[10px] opacity-40">No institutional matches found</div>
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
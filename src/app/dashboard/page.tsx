
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
      { title: 'Active Agreements', value: active, icon: CheckCircle2, color: 'bg-green-500' },
      { title: 'In Process', value: processing, icon: Clock, color: 'bg-blue-500' },
      { title: 'Expiring Soon', value: expiringSoon, icon: AlertTriangle, color: 'bg-orange-500' },
      { title: 'Expired', value: expired, icon: FileX2, color: 'bg-red-500' },
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
      { name: 'Apex Creative Studio', industry: 'Creative', address: 'The Arts District, 505 Gallery Row, LA 90012' },
      { name: 'Urban Logistics Corp', industry: 'Services', address: 'Industrial Hub South, Building 12, Chicago, IL 60609' },
      { name: 'EcoWorld Non-Profit', industry: 'Services', address: 'Sustainability Center, Suite 10, Portland, OR 97201' },
    ];

    const today = new Date();

    for (const sample of samples) {
      const id = Math.random().toString(36).substr(2, 9);
      const ref = doc(firestore, 'moas', id);
      const audit: AuditEntry = {
        userId: firebaseUser.uid,
        userName: user.fullName || 'User',
        operation: 'INSERT',
        timestamp: today.toISOString()
      };
      
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 1);
      
      const sampleMoa = {
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
        auditTrail: [audit],
        createdAt: today.toISOString(),
        updatedAt: today.toISOString()
      };

      await setDoc(ref, sampleMoa);
    }
    
    toast({ title: "Registry Seeded", description: "Standardized partner organizations added." });
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

  // Student Dashboard UI
  if (user?.role === 'student') {
    return (
      <div className="min-h-full flex flex-col space-y-8 animate-in fade-in duration-500">
        {/* Hero Section */}
        <header className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">Partner Organizations</h1>
              <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                Discover and connect with verified university partners for internships and professional collaborations.
              </p>
            </div>
            <div className="shrink-0">
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full border border-green-100 text-xs font-black uppercase tracking-widest shadow-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                All MOAs Verified
              </div>
            </div>
          </div>
        </header>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-md border border-muted/50 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                className="pl-12 h-12 bg-muted/30 border-none rounded-xl text-base focus-visible:ring-primary/20" 
                placeholder="Search partner companies, sectors, or locations..." 
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
                    "rounded-xl h-10 px-6 font-bold text-xs shrink-0",
                    selectedSector === sector ? "bg-[#0f172a] hover:bg-[#1e293b]" : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
                  )}
                  onClick={() => setSelectedSector(sector)}
                >
                  {sector}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Partner Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {visibleMoas.length > 0 ? visibleMoas.map((m) => (
            <div key={m.id} className="group bg-white rounded-[2rem] p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-muted/50 relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#10b981]" />
              
              <div className="flex items-center justify-between mb-6">
                <Badge className="bg-[#ecfdf5] text-[#10b981] border-none font-black text-[10px] tracking-widest px-3 py-1 uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  Approved Partner
                </Badge>
                <div className="bg-[#10b981] rounded-full p-1 text-white shadow-sm">
                  <Check className="w-3.5 h-3.5" strokeWidth={4} />
                </div>
              </div>

              <div className="space-y-4 flex-1">
                <h3 className="text-2xl font-bold tracking-tight text-[#0f172a] group-hover:text-primary transition-colors line-clamp-1">{m.companyName}</h3>
                
                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="w-5 h-5 mt-0.5 shrink-0" />
                  <p className="text-sm font-medium leading-relaxed line-clamp-2">{m.address}</p>
                </div>

                <div className="bg-[#f8fafc] rounded-2xl p-6 space-y-4 border border-[#f1f5f9]">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                      <AvatarFallback className="bg-[#dbeafe] text-[#1d4ed8] font-bold text-lg">
                        {m.contactPerson?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-[#0f172a] text-sm">{m.contactPerson}</p>
                      <p className="text-[11px] text-[#64748b] font-medium uppercase tracking-wider">{m.industryType} Representative</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[#1e293b]">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm font-bold truncate">{m.contactEmail}</span>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileX2 className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-bold">No Partners Found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search keywords.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="pt-12 pb-8 border-t flex flex-col md:flex-row items-center justify-between gap-6 text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          <p>© 2024 NEU MOA STUDENT PORTAL. ALL PARTNER ORGANIZATIONS ARE UNIVERSITY VERIFIED.</p>
          <div className="flex items-center gap-8">
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms of Collaboration</Link>
            <Link href="#" className="hover:text-primary transition-colors">Support</Link>
          </div>
        </footer>
      </div>
    );
  }

  // Admin / Faculty Dashboard UI
  const filteredStats = user?.role === 'faculty' ? stats.slice(0, 2) : stats;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">System Overview</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Institutional access for <span className="font-semibold text-primary capitalize">{user?.role}</span>: <span className="font-bold">{user?.fullName}</span>.
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

      <div className={cn(
        "grid gap-4 sm:gap-6",
        filteredStats.length === 1 ? "grid-cols-1" :
        filteredStats.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      )}>
        {filteredStats.map((s) => (
          <StatsCard key={s.title} {...s} colorClass={s.color} />
        ))}
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-primary">Institutional Partnerships</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Active institutional records with validity tracking.
            </p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-10 h-9 text-sm border-primary/20 focus:ring-primary" placeholder="Filter agreements..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm min-w-[650px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left font-semibold">Partner Company</th>
                <th className="px-4 sm:px-6 py-3 text-left font-semibold">Validity</th>
                <th className="px-4 sm:px-6 py-3 text-left font-semibold">Industry</th>
                <th className="px-4 sm:px-6 py-3 text-left font-semibold">Status</th>
                <th className="px-4 sm:px-6 py-3 text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleMoas.length > 0 ? visibleMoas.map(m => {
                const expiry = m.expirationDate ? new Date(m.expirationDate) : null;
                const daysLeft = expiry ? differenceInDays(expiry, now) : null;
                const isExpired = daysLeft !== null && daysLeft < 0;

                return (
                  <tr key={m.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="font-semibold line-clamp-1">{m.companyName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{m.hteId}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      {expiry ? (
                        <div className="flex flex-col">
                          <span className="text-xs">{expiry.toLocaleDateString()}</span>
                          <span className={cn(
                            "text-[9px] font-bold uppercase",
                            isExpired ? "text-destructive" : daysLeft! <= 60 ? "text-orange-500" : "text-green-600"
                          )}>
                            {isExpired ? "Expired" : `${formatDistanceToNow(expiry)} remaining`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[10px]">No date set</span>
                      )}
                    </td>
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
                );
              }) : (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-6 py-12 text-center text-muted-foreground italic">
                    {isMoaLoading ? "Synchronizing records..." : "No authorized agreements found."}
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

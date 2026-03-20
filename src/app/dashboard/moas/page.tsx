
"use client"

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useFirebase, useMoaCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { 
  Search, 
  Eye, 
  History, 
  RotateCcw, 
  Trash2, 
  Loader2, 
  Database, 
  AlertCircle,
  Filter,
  FileText,
  Building2,
  Calendar,
  Mail,
  User,
  MapPin
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MOA, AuditEntry } from '@/app/lib/types';

export default function MoaListPage() {
  const { user, firebaseUser } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedMoa, setSelectedMoa] = useState<MOA | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const moaQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const base = collection(firestore, 'moas');
    
    // Admins see everything (for local tab filtering)
    if (user.role === 'admin') return base;
    
    // Students only see APPROVED active records
    if (user.role === 'student') {
      return query(base, 
        where('isDeleted', '==', false), 
        where('status', '>=', 'APPROVED'),
        where('status', '<', 'APPROVEE')
      );
    }
    
    // Faculty see non-deleted records
    return query(base, where('isDeleted', '==', false));
  }, [firestore, user]);

  const { data: moas, isLoading, error, isIndexBuilding } = useMoaCollection<MOA>(moaQuery);

  const filteredMoas = useMemo(() => {
    if (!moas) return [];
    
    let result = moas;

    // Tab filtering (Local)
    if (user?.role === 'admin') {
      if (activeTab === 'active') result = result.filter(m => !m.isDeleted);
      if (activeTab === 'trash') result = result.filter(m => m.isDeleted);
    }

    // Search filtering (Local)
    const q = search.toLowerCase();
    return result.filter(m => 
      m.companyName.toLowerCase().includes(q) ||
      m.hteId.toLowerCase().includes(q) ||
      m.college.toLowerCase().includes(q) ||
      m.industryType.toLowerCase().includes(q) ||
      m.contactPerson.toLowerCase().includes(q) ||
      m.address.toLowerCase().includes(q)
    );
  }, [moas, search, activeTab, user?.role]);

  const handleSoftDelete = async (id: string) => {
    if (!firestore || !user || !firebaseUser) return;
    const ref = doc(firestore, 'moas', id);
    const audit: AuditEntry = {
      userId: firebaseUser.uid,
      userName: user.name,
      operation: 'SOFT-DELETE',
      timestamp: new Date().toISOString()
    };
    updateDoc(ref, { 
      isDeleted: true, 
      deletedAt: new Date().toISOString(),
      auditTrail: arrayUnion(audit) 
    });
    toast({ title: "Record moved to trash" });
  };

  const handleRecover = async (id: string) => {
    if (!firestore || !user || !firebaseUser) return;
    const ref = doc(firestore, 'moas', id);
    const audit: AuditEntry = {
      userId: firebaseUser.uid,
      userName: user.name,
      operation: 'RECOVER',
      timestamp: new Date().toISOString()
    };
    updateDoc(ref, { 
      isDeleted: false, 
      auditTrail: arrayUnion(audit) 
    });
    toast({ title: "Record recovered" });
  };

  if (isLoading && !isIndexBuilding) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
        <p className="text-sm text-muted-foreground font-medium">Synchronizing Partnership Registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partnership Registry</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Institutional {user?.role} repository. Use search to filter specific records.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10 h-10" placeholder="Search across all fields..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {user?.role === 'admin' && (
        <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
            <TabsTrigger value="all">All Records</TabsTrigger>
            <TabsTrigger value="active">Active Only</TabsTrigger>
            <TabsTrigger value="trash">Trash Bin</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {error && !isIndexBuilding && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Partner Details</th>
              <th className="px-6 py-4 text-left font-semibold">College & Industry</th>
              <th className="px-6 py-4 text-left font-semibold">Current Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredMoas.length > 0 ? filteredMoas.map(m => (
              <tr key={m.id} className={cn("hover:bg-muted/5 transition-colors", m.isDeleted && "bg-muted/30 opacity-60")}>
                <td className="px-6 py-4">
                  <div className="font-bold flex items-center gap-2">
                    {m.companyName}
                    {m.isDeleted && <span className="bg-destructive/10 text-destructive text-[8px] px-1.5 py-0.5 rounded uppercase font-bold">Trash</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase font-medium">{m.hteId}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-xs">{m.college}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.industryType}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    m.status.startsWith('APPROVED') ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {m.status.split(':')[0]}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedMoa(m)}><Eye className="w-4 h-4" /></Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Agreement Details
                          </DialogTitle>
                        </DialogHeader>
                        {selectedMoa && (
                          <div className="space-y-6 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                              <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <Building2 className="w-4 h-4 text-muted-foreground mt-1" />
                                  <div>
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Partner Entity</Label>
                                    <div className="font-semibold text-base">{selectedMoa.companyName}</div>
                                    <div className="text-xs text-muted-foreground">HTE ID: {selectedMoa.hteId}</div>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                                  <div>
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Office Address</Label>
                                    <div className="text-xs leading-relaxed">{selectedMoa.address}</div>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <User className="w-4 h-4 text-muted-foreground mt-1" />
                                  <div>
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Contact Representative</Label>
                                    <div className="font-medium">{selectedMoa.contactPerson}</div>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                                  <div>
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Direct Email</Label>
                                    <div className="text-xs">{selectedMoa.contactEmail}</div>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <Calendar className="w-4 h-4 text-muted-foreground mt-1" />
                                  <div>
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Effective Date</Label>
                                    <div className="text-xs font-medium">{new Date(selectedMoa.effectiveDate).toLocaleDateString()}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {user?.role === 'admin' && selectedMoa.auditTrail && (
                              <div className="border-t pt-4">
                                <div className="flex items-center gap-2 font-bold mb-4 text-primary text-sm uppercase tracking-tight">
                                  <History className="w-4 h-4" /> System Audit Trail
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                  {selectedMoa.auditTrail.map((a, i) => (
                                    <div key={i} className="flex justify-between items-center text-[11px] p-2 bg-muted/30 rounded border border-border/50">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-foreground">{a.userName}</span>
                                        <span className="text-[9px] text-muted-foreground italic">{new Date(a.timestamp).toLocaleString()}</span>
                                      </div>
                                      <span className={cn(
                                        "px-2 py-0.5 rounded font-black text-[9px] uppercase",
                                        a.operation === 'INSERT' ? "bg-green-100 text-green-700" :
                                        a.operation === 'EDIT' ? "bg-blue-100 text-blue-700" :
                                        "bg-red-100 text-red-700"
                                      )}>
                                        {a.operation}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    {(user?.role === 'admin' || (user?.role === 'faculty' && user.canEdit)) && !m.isDeleted && (
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleSoftDelete(m.id)} title="Soft Delete"><Trash2 className="w-4 h-4" /></Button>
                    )}

                    {user?.role === 'admin' && m.isDeleted && (
                      <Button variant="ghost" size="icon" className="text-green-600 hover:bg-green-50" onClick={() => handleRecover(m.id)} title="Recover Record"><RotateCcw className="w-4 h-4" /></Button>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                  {activeTab === 'trash' ? "Trash bin is currently empty." : "No partnership records match your search criteria."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

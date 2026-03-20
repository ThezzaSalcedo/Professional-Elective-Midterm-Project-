
"use client"

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useFirebase, useMoaCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { 
  Search, 
  Eye, 
  RotateCcw, 
  Trash2, 
  Loader2, 
  FileText,
  Building2,
  Calendar,
  Mail,
  User,
  MapPin,
  History,
  Plus,
  Edit2,
  Sparkles,
  Save
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MOA, AuditEntry, MOAStatus } from '@/app/lib/types';
import { classifyMoaIndustry } from '@/ai/flows/moa-industry-classifier';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function MoaListPage() {
  const { user, firebaseUser } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedMoa, setSelectedMoa] = useState<MOA | null>(null);
  const [editMoa, setEditMoa] = useState<MOA | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isClassifying, setIsClassifying] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Dynamic real-time query based on user role
  const moaQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const base = collection(firestore, 'moas');
    
    // Admins see all records for full oversight
    if (user.role === 'admin') return base;
    
    // Students see only approved, non-deleted records
    if (user.role === 'student') {
      return query(base, 
        where('isDeleted', '==', false), 
        where('status', '>=', 'APPROVED'),
        where('status', '<', 'APPROVEE')
      );
    }
    
    // Faculty see all active records
    return query(base, where('isDeleted', '==', false));
  }, [firestore, user?.role, user?.id]);

  // useMoaCollection handles the real-time onSnapshot synchronization
  const { data: moas, isLoading, isIndexBuilding } = useMoaCollection<MOA>(moaQuery);

  const filteredMoas = useMemo(() => {
    if (!moas) return [];
    
    let result = moas;

    // Admin view can filter between active and trash
    if (user?.role === 'admin') {
      if (activeTab === 'active') result = result.filter(m => !m.isDeleted);
      if (activeTab === 'trash') result = result.filter(m => m.isDeleted);
    }

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
      userName: user.fullName || 'User',
      operation: 'SOFT-DELETE',
      timestamp: new Date().toISOString()
    };
    updateDoc(ref, { 
      isDeleted: true, 
      deletedAt: new Date().toISOString(),
      auditTrail: arrayUnion(audit),
      updatedAt: new Date().toISOString()
    });
    toast({ title: "Record moved to trash" });
  };

  const handleRecover = async (id: string) => {
    if (!firestore || !user || !firebaseUser) return;
    const ref = doc(firestore, 'moas', id);
    const audit: AuditEntry = {
      userId: firebaseUser.uid,
      userName: user.fullName || 'User',
      operation: 'RECOVER',
      timestamp: new Date().toISOString()
    };
    updateDoc(ref, { 
      isDeleted: false, 
      auditTrail: arrayUnion(audit),
      updatedAt: new Date().toISOString()
    });
    toast({ title: "Record recovered" });
  };

  const handleClassify = async () => {
    if (!editMoa?.companyName) return;
    setIsClassifying(true);
    try {
      const result = await classifyMoaIndustry({ companyName: editMoa.companyName });
      setEditMoa(prev => prev ? { ...prev, industryType: result.industryType } : null);
      toast({ title: "AI Suggested", description: `Industry: ${result.industryType}` });
    } catch (e) {
      toast({ title: "AI Suggestion Failed", variant: "destructive" });
    } finally {
      setIsClassifying(false);
    }
  };

  const handleUpdateMoa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMoa || !firestore || !user || !firebaseUser) return;
    
    setIsUpdating(true);
    const ref = doc(firestore, 'moas', editMoa.id);
    const audit: AuditEntry = {
      userId: firebaseUser.uid,
      userName: user.fullName || 'User',
      operation: 'EDIT',
      timestamp: new Date().toISOString()
    };

    const { id, ...updateData } = editMoa;
    const finalUpdate = {
      ...updateData,
      auditTrail: arrayUnion(audit),
      updatedAt: new Date().toISOString()
    };

    updateDoc(ref, finalUpdate)
      .then(() => {
        toast({ title: "Agreement Updated", description: "Changes synchronized in real-time." });
        setEditMoa(null);
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: ref.path,
          operation: 'update',
          requestResourceData: finalUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setIsUpdating(false));
  };

  if (isLoading && !isIndexBuilding) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
        <p className="text-sm text-muted-foreground font-medium">Synchronizing Registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">MOA Management</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Institutional repository for partnership agreements. Changes are pushed in real-time.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-10 h-10 text-sm" placeholder="Search registry..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {user?.canAddMoa && (
            <Button asChild className="gap-2">
              <Link href="/dashboard/moas/new">
                <Plus className="w-4 h-4" />
                Add Agreement
              </Link>
            </Button>
          )}
        </div>
      </div>

      {user?.role === 'admin' && (
        <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
            <TabsTrigger value="trash" className="text-xs">Trash</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm min-w-[700px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Partner Details</th>
                <th className="px-6 py-4 text-left font-semibold">College & Industry</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredMoas.length > 0 ? filteredMoas.map(m => (
                <tr key={m.id} className={cn("hover:bg-muted/5 transition-colors", m.isDeleted && "bg-muted/30 opacity-60")}>
                  <td className="px-6 py-4">
                    <div className="font-bold flex items-center gap-2 truncate max-w-[200px]">
                      {m.companyName}
                      {m.isDeleted && <span className="bg-destructive/10 text-destructive text-[8px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0">Trash</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase font-medium">{m.hteId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-xs truncate max-w-[150px]">{m.college}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.industryType}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap",
                      m.status.startsWith('APPROVED') ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {m.status.split(':')[0]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedMoa(m)} className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl w-[95vw] sm:w-full overflow-y-auto max-h-[90vh]">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-primary" />
                              Agreement Details
                            </DialogTitle>
                          </DialogHeader>
                          {selectedMoa && (
                            <div className="space-y-6 pt-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                <div className="space-y-4">
                                  <div className="flex items-start gap-3">
                                    <Building2 className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                                    <div>
                                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Partner Entity</Label>
                                      <div className="font-semibold text-base leading-tight">{selectedMoa.companyName}</div>
                                      <div className="text-xs text-muted-foreground mt-1">HTE ID: {selectedMoa.hteId}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <MapPin className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                                    <div>
                                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Office Address</Label>
                                      <div className="text-xs leading-relaxed mt-1">{selectedMoa.address}</div>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                                    <div>
                                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Contact Representative</Label>
                                      <div className="font-medium mt-1">{selectedMoa.contactPerson}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <Mail className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                                    <div>
                                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Direct Email</Label>
                                      <div className="text-xs mt-1">{selectedMoa.contactEmail}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <Calendar className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                                    <div>
                                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Effective Date</Label>
                                      <div className="text-xs font-medium mt-1">{new Date(selectedMoa.effectiveDate).toLocaleDateString()}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {user?.role === 'admin' && selectedMoa.auditTrail && (
                                <div className="border-t pt-4">
                                  <div className="flex items-center gap-2 font-bold mb-4 text-primary text-[11px] uppercase tracking-tight">
                                    <History className="w-4 h-4" /> System Audit Trail
                                  </div>
                                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {selectedMoa.auditTrail.map((a, i) => (
                                      <div key={i} className="flex justify-between items-center text-[11px] p-2 bg-muted/30 rounded border border-border/50">
                                        <div className="flex flex-col">
                                          <span className="font-bold text-foreground truncate max-w-[120px]">{a.userName}</span>
                                          <span className="text-[9px] text-muted-foreground italic">{new Date(a.timestamp).toLocaleString()}</span>
                                        </div>
                                        <span className={cn(
                                          "px-2 py-0.5 rounded font-black text-[9px] uppercase shrink-0",
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

                      {user?.canEditMoa && !m.isDeleted && (
                        <Dialog open={!!editMoa && editMoa.id === m.id} onOpenChange={(open) => setEditMoa(open ? m : null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary"><Edit2 className="w-4 h-4" /></Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl w-[95vw] sm:w-full overflow-y-auto max-h-[90vh]">
                            <DialogHeader>
                              <DialogTitle>Edit Institutional Agreement</DialogTitle>
                            </DialogHeader>
                            {editMoa && (
                              <form onSubmit={handleUpdateMoa} className="space-y-4 pt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>HTE ID</Label>
                                    <Input required value={editMoa.hteId} onChange={e => setEditMoa({...editMoa, hteId: e.target.value})} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Effective Date</Label>
                                    <Input type="date" required value={editMoa.effectiveDate.split('T')[0]} onChange={e => setEditMoa({...editMoa, effectiveDate: new Date(e.target.value).toISOString()})} />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Company Name</Label>
                                  <div className="flex gap-2">
                                    <Input required className="flex-1" value={editMoa.companyName} onChange={e => setEditMoa({...editMoa, companyName: e.target.value})} />
                                    <Button type="button" variant="outline" size="icon" onClick={handleClassify} disabled={isClassifying}>
                                      {isClassifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Industry Type</Label>
                                    <Select value={editMoa.industryType} onValueChange={v => setEditMoa({...editMoa, industryType: v})}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Telecom">Telecom</SelectItem>
                                        <SelectItem value="Food">Food</SelectItem>
                                        <SelectItem value="Services">Services</SelectItem>
                                        <SelectItem value="Technology">Technology</SelectItem>
                                        <SelectItem value="Finance">Finance</SelectItem>
                                        <SelectItem value="Education">Education</SelectItem>
                                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>College</Label>
                                    <Input required value={editMoa.college} onChange={e => setEditMoa({...editMoa, college: e.target.value})} />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Address</Label>
                                  <Input required value={editMoa.address} onChange={e => setEditMoa({...editMoa, address: e.target.value})} />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Contact Person</Label>
                                    <Input required value={editMoa.contactPerson} onChange={e => setEditMoa({...editMoa, contactPerson: e.target.value})} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Contact Email</Label>
                                    <Input type="email" required value={editMoa.contactEmail} onChange={e => setEditMoa({...editMoa, contactEmail: e.target.value})} />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Agreement Status</Label>
                                  <Select value={editMoa.status} onValueChange={(v: MOAStatus) => setEditMoa({...editMoa, status: v})}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PROCESSING: Awaiting signature">PROCESSING: Awaiting signature</SelectItem>
                                      <SelectItem value="PROCESSING: Sent to Legal">PROCESSING: Sent to Legal</SelectItem>
                                      <SelectItem value="PROCESSING: Sent to VPAA/OP">PROCESSING: Sent to VPAA/OP</SelectItem>
                                      <SelectItem value="APPROVED: Signed by President">APPROVED: Signed by President</SelectItem>
                                      <SelectItem value="APPROVED: On-going notarization">APPROVED: On-going notarization</SelectItem>
                                      <SelectItem value="APPROVED: No notarization needed">APPROVED: No notarization needed</SelectItem>
                                      <SelectItem value="EXPIRED">EXPIRED</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <DialogFooter className="pt-4">
                                  <Button type="submit" disabled={isUpdating} className="w-full gap-2">
                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                  </Button>
                                </DialogFooter>
                              </form>
                            )}
                          </DialogContent>
                        </Dialog>
                      )}

                      {user?.canDeleteMoa && !m.isDeleted && (
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => handleSoftDelete(m.id)} title="Soft Delete"><Trash2 className="w-4 h-4" /></Button>
                      )}

                      {user?.role === 'admin' && m.isDeleted && (
                        <Button variant="ghost" size="icon" className="text-green-600 hover:bg-green-50 h-8 w-8" onClick={() => handleRecover(m.id)} title="Recover Record"><RotateCcw className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                    {activeTab === 'trash' ? "Trash bin is empty." : "No records found."}
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

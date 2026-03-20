
"use client"

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useFirebase, useMoaCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, arrayUnion, addDoc } from 'firebase/firestore';
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
  Plus,
  Edit2,
  Sparkles,
  Save,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MOA, AuditEntry, MOAStatus, SystemLog } from '@/app/lib/types';
import { classifyMoaIndustry } from '@/ai/flows/moa-industry-classifier';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { formatDistanceToNow, differenceInDays } from 'date-fns';

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
  }, [firestore, user?.role, user?.id]);

  const { data: moas, isLoading, error, isIndexBuilding } = useMoaCollection<MOA>(moaQuery);

  const filteredMoas = useMemo(() => {
    if (!moas) return [];
    let result = moas;
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

  const getExpirationDisplay = (dateStr: string) => {
    if (!dateStr) return <span className="text-muted-foreground italic text-[10px]">No date set</span>;
    const date = new Date(dateStr);
    const now = new Date();
    const daysLeft = differenceInDays(date, now);
    const isExpired = daysLeft < 0;

    return (
      <div className="flex flex-col">
        <div className="text-xs font-medium">{date.toLocaleDateString()}</div>
        <div className={cn(
          "text-[10px] font-bold uppercase tracking-tighter",
          isExpired ? "text-destructive" : daysLeft <= 60 ? "text-orange-500" : "text-green-600"
        )}>
          {isExpired ? "Expired" : `${formatDistanceToNow(date)} remaining`}
        </div>
      </div>
    );
  };

  const logOperation = async (operation: SystemLog['operation'], moa: MOA, details?: string) => {
    if (!firestore || !user || !firebaseUser) return;
    const logRef = collection(firestore, 'audit_logs');
    const logData: Omit<SystemLog, 'id'> = {
      userId: firebaseUser.uid,
      userName: user.fullName || 'User',
      operation,
      targetId: moa.id,
      targetName: moa.companyName,
      hteId: moa.hteId,
      timestamp: new Date().toISOString(),
      details
    };
    addDoc(logRef, logData);
  };

  const handleSoftDelete = async (moa: MOA) => {
    if (!firestore || !user || !firebaseUser) return;
    const ref = doc(firestore, 'moas', moa.id);
    const timestamp = new Date().toISOString();
    const audit: AuditEntry = {
      userId: firebaseUser.uid,
      userName: user.fullName || 'User',
      operation: 'SOFT-DELETE',
      timestamp
    };
    updateDoc(ref, { 
      isDeleted: true, 
      deletedAt: timestamp,
      auditTrail: arrayUnion(audit),
      updatedAt: timestamp
    });
    logOperation('SOFT-DELETE', moa, "Agreement moved to institutional trash.");
    toast({ title: "Record moved to trash" });
  };

  const handleRecover = async (moa: MOA) => {
    if (!firestore || !user || !firebaseUser) return;
    const ref = doc(firestore, 'moas', moa.id);
    const timestamp = new Date().toISOString();
    const audit: AuditEntry = {
      userId: firebaseUser.uid,
      userName: user.fullName || 'User',
      operation: 'RECOVER',
      timestamp
    };
    updateDoc(ref, { 
      isDeleted: false, 
      auditTrail: arrayUnion(audit),
      updatedAt: timestamp
    });
    logOperation('RECOVER', moa, "Agreement recovered from institutional trash.");
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
    const timestamp = new Date().toISOString();
    const audit: AuditEntry = {
      userId: firebaseUser.uid,
      userName: user.fullName || 'User',
      operation: 'EDIT',
      timestamp
    };

    const { id, ...updateData } = editMoa;
    const finalUpdate = {
      ...updateData,
      isDeleted: editMoa.isDeleted ?? false,
      status: editMoa.status,
      auditTrail: arrayUnion(audit),
      updatedAt: timestamp
    };

    updateDoc(ref, finalUpdate)
      .then(() => {
        logOperation('EDIT', editMoa, `Updated agreement details for ${editMoa.companyName}.`);
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
            Institutional repository for partnership agreements with validity tracking.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-10 h-10 text-sm border-primary/20" placeholder="Search registry..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {user?.canAddMoa && (
            <Button asChild className="gap-2 shadow-md">
              <Link href="/dashboard/moas/new">
                <Plus className="w-4 h-4" />
                Add Agreement
              </Link>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Synchronization Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

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
          <table className="w-full text-xs sm:text-sm min-w-[850px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Partner Details</th>
                <th className="px-6 py-4 text-left font-semibold">College & Industry</th>
                <th className="px-6 py-4 text-left font-semibold">Validity</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredMoas.length > 0 ? filteredMoas.map(m => (
                <tr key={m.id} className={cn("hover:bg-muted/5 transition-colors", m.isDeleted && "bg-muted/30 opacity-60")}>
                  <td className="px-6 py-4">
                    <div className="font-bold flex items-center gap-2 truncate max-w-[200px] text-foreground">
                      {m.companyName}
                      {m.isDeleted && <span className="bg-destructive/10 text-destructive text-[8px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0">Trash</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase font-mono">{m.hteId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-xs truncate max-w-[150px]">{m.college}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{m.industryType}</div>
                  </td>
                  <td className="px-6 py-4">
                    {getExpirationDisplay(m.expirationDate)}
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
                          <Button variant="ghost" size="icon" onClick={() => setSelectedMoa(m)} className="h-8 w-8 hover:bg-primary/10 hover:text-primary"><Eye className="w-4 h-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl w-[95vw] sm:w-full overflow-y-auto max-h-[90vh]">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-primary">
                              <FileText className="w-5 h-5" />
                              Agreement Details
                            </DialogTitle>
                          </DialogHeader>
                          {selectedMoa && (
                            <div className="space-y-6 pt-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                <div className="space-y-4">
                                  <div className="flex items-start gap-3">
                                    <Building2 className="w-4 h-4 text-primary mt-1 shrink-0" />
                                    <div>
                                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Partner Entity</Label>
                                      <div className="font-semibold text-base leading-tight">{selectedMoa.companyName}</div>
                                      <div className="text-xs text-muted-foreground mt-1">HTE ID: {selectedMoa.hteId}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <MapPin className="w-4 h-4 text-primary mt-1 shrink-0" />
                                    <div>
                                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Office Address</Label>
                                      <div className="text-xs leading-relaxed mt-1">{selectedMoa.address}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <Clock className="w-4 h-4 text-primary mt-1 shrink-0" />
                                    <div>
                                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Agreement Validity</Label>
                                      <div className="flex items-center gap-2 mt-1">
                                        {getExpirationDisplay(selectedMoa.expirationDate)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 text-primary mt-1 shrink-0" />
                                    <div>
                                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Contact Representative</Label>
                                      <div className="font-medium mt-1">{selectedMoa.contactPerson}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <Mail className="w-4 h-4 text-primary mt-1 shrink-0" />
                                    <div>
                                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Direct Email</Label>
                                      <div className="text-xs mt-1">{selectedMoa.contactEmail}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <Calendar className="w-4 h-4 text-primary mt-1 shrink-0" />
                                    <div>
                                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Effective Date</Label>
                                      <div className="text-xs font-medium mt-1">{new Date(selectedMoa.effectiveDate).toLocaleDateString()}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      {user?.canEditMoa && !m.isDeleted && (
                        <Dialog open={!!editMoa && editMoa.id === m.id} onOpenChange={(open) => setEditMoa(open ? m : null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10"><Edit2 className="w-4 h-4" /></Button>
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
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                      <Label>Effective Date</Label>
                                      <Input type="date" required value={editMoa.effectiveDate?.split('T')[0] || ''} onChange={e => setEditMoa({...editMoa, effectiveDate: new Date(e.target.value).toISOString()})} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Expiration Date</Label>
                                      <Input type="date" required value={editMoa.expirationDate?.split('T')[0] || ''} onChange={e => setEditMoa({...editMoa, expirationDate: new Date(e.target.value).toISOString()})} />
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Company Name</Label>
                                  <div className="flex gap-2">
                                    <Input required className="flex-1" value={editMoa.companyName} onChange={e => setEditMoa({...editMoa, companyName: e.target.value})} />
                                    <Button type="button" variant="outline" size="icon" onClick={handleClassify} disabled={isClassifying} className="border-primary text-primary hover:bg-primary/5">
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
                                        <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                                        <SelectItem value="Retail">Retail</SelectItem>
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
                                  <Button type="submit" disabled={isUpdating} className="w-full gap-2 shadow-md">
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
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => handleSoftDelete(m)} title="Soft Delete"><Trash2 className="w-4 h-4" /></Button>
                      )}

                      {user?.role === 'admin' && m.isDeleted && (
                        <Button variant="ghost" size="icon" className="text-green-600 hover:bg-green-50 h-8 w-8" onClick={() => handleRecover(m)} title="Recover Record"><RotateCcw className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                    {activeTab === 'trash' ? "Trash bin is empty." : "No authorized records found."}
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

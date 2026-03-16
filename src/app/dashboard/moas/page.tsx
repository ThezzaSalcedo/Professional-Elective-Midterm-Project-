"use client"

import React, { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  doc, 
  updateDoc, 
  arrayUnion,
  Firestore
} from 'firebase/firestore';
import { 
  Search, 
  Trash2, 
  RefreshCcw, 
  Eye, 
  Edit3, 
  History,
  Archive,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MOA, AuditLog } from '@/app/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function MoaListPage() {
  const { user, firebaseUser } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedMoa, setSelectedMoa] = useState<MOA | null>(null);

  const moaQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const base = collection(firestore, 'moas');
    
    if (user.role === 'Student') {
      // Students only see APPROVED and NOT deleted
      return query(
        base, 
        where('isSoftDeleted', '==', false),
        // Note: Complex where filters usually require indexes.
        // For standard list, we'll refine APPROVED in UI if index isn't ready
      );
    } else if (user.role === 'Faculty') {
      // Faculty see all NOT deleted
      return query(base, where('isSoftDeleted', '==', false));
    }
    // Admins see all
    return base;
  }, [firestore, user]);

  const { data: rawMoas, isLoading } = useCollection<MOA>(moaQuery);

  const filteredMoas = React.useMemo(() => {
    if (!rawMoas) return [];
    let result = rawMoas;

    // Student status filtering (backend + UI safety)
    if (user?.role === 'Student') {
      result = result.filter(m => m.status.startsWith('APPROVED'));
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m => 
        m.companyName.toLowerCase().includes(q) ||
        m.contactPerson.toLowerCase().includes(q) ||
        m.hteId.toLowerCase().includes(q)
      );
    }

    return result;
  }, [rawMoas, user, search]);

  const handleSoftDelete = (id: string) => {
    if (!user || !firebaseUser || !firestore) return;
    const docRef = doc(firestore, 'moas', id);
    
    const auditEntry: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId: firebaseUser.uid,
      userName: user.name,
      timestamp: new Date().toISOString(),
      operation: 'Soft-Delete'
    };

    updateDoc(docRef, {
      isSoftDeleted: true,
      auditTrail: arrayUnion(auditEntry),
      updatedAt: new Date().toISOString()
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: { isSoftDeleted: true }
      }));
    });
    
    toast({ title: "Archived", description: "Agreement moved to archive." });
  };

  const handleRecover = (id: string) => {
    if (!user || !firebaseUser || !firestore) return;
    const docRef = doc(firestore, 'moas', id);
    
    const auditEntry: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId: firebaseUser.uid,
      userName: user.name,
      timestamp: new Date().toISOString(),
      operation: 'Recover'
    };

    updateDoc(docRef, {
      isSoftDeleted: false,
      auditTrail: arrayUnion(auditEntry),
      updatedAt: new Date().toISOString()
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: { isSoftDeleted: false }
      }));
    });

    toast({ title: "Recovered", description: "Agreement restored to active registry." });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading MOA Registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Agreement Registry</h1>
          <p className="text-sm text-muted-foreground">Manage and track institutional memorandums.</p>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search partnerships..." 
            className="pl-10 h-10 shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Company</th>
              <th className="px-6 py-4 text-left font-semibold">Contact</th>
              <th className="px-6 py-4 text-left font-semibold">College</th>
              <th className="px-6 py-4 text-left font-semibold">Status</th>
              {user?.role === 'Admin' && <th className="px-6 py-4 text-left font-semibold">Visibility</th>}
              <th className="px-6 py-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredMoas.map((m) => (
              <tr key={m.id} className={cn("hover:bg-muted/5 transition-colors", m.isSoftDeleted && "bg-red-50/50 opacity-80")}>
                <td className="px-6 py-4">
                  <div className="font-semibold text-foreground">{m.companyName}</div>
                  <div className="text-xs text-muted-foreground">{m.hteId}</div>
                </td>
                <td className="px-6 py-4">
                  <div>{m.contactPerson}</div>
                  <div className="text-xs text-muted-foreground">{m.contactEmail}</div>
                </td>
                <td className="px-6 py-4 text-muted-foreground">{m.college}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                    m.status.startsWith('APPROVED') ? "bg-green-100 text-green-700" :
                    m.status.startsWith('PROCESSING') ? "bg-blue-100 text-blue-700" :
                    m.status === 'EXPIRED' ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {m.status.split(':')[0]}
                  </span>
                </td>
                {user?.role === 'Admin' && (
                  <td className="px-6 py-4">
                    {m.isSoftDeleted ? (
                      <span className="flex items-center gap-1 text-destructive font-bold text-[10px] uppercase">
                        <Archive className="w-3 h-3" /> Soft-Deleted
                      </span>
                    ) : (
                      <span className="text-green-600 font-bold text-[10px] uppercase">Active</span>
                    )}
                  </td>
                )}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedMoa(m)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Agreement Details</DialogTitle>
                          <DialogDescription>Full record for {selectedMoa?.companyName}</DialogDescription>
                        </DialogHeader>
                        {selectedMoa && (
                          <div className="grid grid-cols-2 gap-6 mt-4">
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-muted-foreground uppercase">HTE ID</p>
                              <p className="font-medium">{selectedMoa.hteId}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-muted-foreground uppercase">College</p>
                              <p className="font-medium">{selectedMoa.college}</p>
                            </div>
                            <div className="col-span-2 space-y-1">
                              <p className="text-xs font-bold text-muted-foreground uppercase">Address</p>
                              <p className="font-medium">{selectedMoa.address}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-muted-foreground uppercase">Contact</p>
                              <p className="font-medium">{selectedMoa.contactPerson}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-muted-foreground uppercase">Email</p>
                              <p className="font-medium">{selectedMoa.contactEmail}</p>
                            </div>
                            
                            {user?.role === 'Admin' && (
                              <div className="col-span-2 mt-6 pt-6 border-t">
                                <h4 className="flex items-center gap-2 font-bold mb-4 text-primary">
                                  <History className="w-4 h-4" /> Audit Trail
                                </h4>
                                <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                                  {selectedMoa.auditTrail?.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between bg-muted/30 p-2 rounded-md border text-xs">
                                      <div className="font-medium">{log.userName}</div>
                                      <div className="px-2 py-0.5 rounded bg-accent/20 text-accent font-bold uppercase">{log.operation}</div>
                                      <div className="text-muted-foreground italic">{new Date(log.timestamp).toLocaleString()}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    {user?.role !== 'Student' && (user?.role === 'Admin' || user?.canEdit) && !m.isSoftDeleted && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleSoftDelete(m.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}

                    {user?.role === 'Admin' && m.isSoftDeleted && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-accent hover:bg-accent/10"
                        onClick={() => handleRecover(m.id)}
                        title="Recover Record"
                      >
                        <RefreshCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

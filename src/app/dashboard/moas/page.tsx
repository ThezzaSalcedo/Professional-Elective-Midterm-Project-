
"use client"

import React, { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Search, Eye, History, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MOA, AuditEntry } from '@/app/lib/types';

export default function MoaListPage() {
  const { user, firebaseUser } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedMoa, setSelectedMoa] = useState<MOA | null>(null);

  const moaQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const base = collection(firestore, 'moas');
    
    if (user.role === 'admin') return base;
    
    if (user.role === 'faculty') {
      return query(base, where('isDeleted', '==', false));
    }
    
    return query(
      base, 
      where('isDeleted', '==', false),
      where('status', '>=', 'APPROVED'),
      where('status', '<', 'APPROVEE')
    );
  }, [firestore, user]);

  const { data: moas, isLoading } = useCollection<MOA>(moaQuery);

  const filteredMoas = (moas || []).filter(m => 
    m.companyName.toLowerCase().includes(search.toLowerCase()) ||
    m.hteId.toLowerCase().includes(search.toLowerCase())
  );

  const handleSoftDelete = async (id: string) => {
    if (!firestore || !user || !firebaseUser) return;
    const ref = doc(firestore, 'moas', id);
    const audit: AuditEntry = {
      userId: firebaseUser.uid,
      userName: user.name,
      operation: 'SOFT-DELETE',
      timestamp: new Date().toISOString()
    };
    await updateDoc(ref, { isDeleted: true, auditTrail: arrayUnion(audit) });
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
    await updateDoc(ref, { isDeleted: false, auditTrail: arrayUnion(audit) });
    toast({ title: "Record recovered" });
  };

  if (isLoading) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Partnership Registry</h1>
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search HTE ID or Company..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-4 text-left">Company Details</th>
              <th className="px-6 py-4 text-left">College</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredMoas.map(m => (
              <tr key={m.id} className={cn(m.isDeleted && "bg-muted/30 opacity-60")}>
                <td className="px-6 py-4">
                  <div className="font-bold">{m.companyName}</div>
                  <div className="text-xs text-muted-foreground">{m.hteId}</div>
                </td>
                <td className="px-6 py-4">{m.college}</td>
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
                          <DialogTitle>Partnership Details</DialogTitle>
                        </DialogHeader>
                        {selectedMoa && (
                          <div className="space-y-6 pt-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div><Label className="text-muted-foreground">HTE ID</Label><div>{selectedMoa.hteId}</div></div>
                              <div><Label className="text-muted-foreground">Effective Date</Label><div>{selectedMoa.effectiveDate}</div></div>
                              <div className="col-span-2"><Label className="text-muted-foreground">Address</Label><div>{selectedMoa.address}</div></div>
                              <div><Label className="text-muted-foreground">Contact</Label><div>{selectedMoa.contactPerson}</div></div>
                              <div><Label className="text-muted-foreground">Email</Label><div>{selectedMoa.contactEmail}</div></div>
                            </div>
                            
                            {user?.role === 'admin' && (
                              <div className="border-t pt-4">
                                <div className="flex items-center gap-2 font-bold mb-4"><History className="w-4 h-4" /> Audit History</div>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {selectedMoa.auditTrail?.map((a, i) => (
                                    <div key={i} className="flex justify-between text-xs p-2 bg-muted/50 rounded border">
                                      <span>{a.userName}</span>
                                      <span className="font-bold">{a.operation}</span>
                                      <span className="text-muted-foreground italic">{new Date(a.timestamp).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    {user?.role !== 'student' && !m.isDeleted && (
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleSoftDelete(m.id)}><Trash2 className="w-4 h-4" /></Button>
                    )}

                    {user?.role === 'admin' && m.isDeleted && (
                      <Button variant="ghost" size="icon" className="text-green-600 hover:bg-green-50" onClick={() => handleRecover(m.id)}><RotateCcw className="w-4 h-4" /></Button>
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

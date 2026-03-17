
"use client"

import React, { useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useMoaCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { History, FileText, User, Calendar, Loader2, ShieldCheck } from 'lucide-react';
import { MOA, AuditEntry } from '@/app/lib/types';
import { cn } from '@/lib/utils';

type FlattenedAudit = AuditEntry & { moaName: string; hteId: string };

export default function AuditLogsPage() {
  const { user } = useAuth();
  const { firestore } = useFirebase();

  const moaQuery = useMemoFirebase(() => {
    if (!firestore || user?.role !== 'admin') return null;
    return collection(firestore, 'moas');
  }, [firestore, user]);

  const { data: moas, isLoading } = useMoaCollection<MOA>(moaQuery);

  const allLogs = useMemo(() => {
    if (!moas) return [];
    
    const flattened: FlattenedAudit[] = [];
    moas.forEach(moa => {
      if (moa.auditTrail) {
        moa.auditTrail.forEach(trail => {
          flattened.push({
            ...trail,
            moaName: moa.companyName,
            hteId: moa.hteId
          });
        });
      }
    });

    return flattened.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [moas]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <ShieldCheck className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Only super administrators can access system audit logs.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
        <p className="text-sm text-muted-foreground">Aggregating system logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">System Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Chronological record of all partnership modifications.</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Timestamp</th>
              <th className="px-6 py-4 text-left font-semibold">User</th>
              <th className="px-6 py-4 text-left font-semibold">Operation</th>
              <th className="px-6 py-4 text-left font-semibold">Agreement</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {allLogs.length > 0 ? allLogs.map((log, i) => (
              <tr key={i} className="hover:bg-muted/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 font-medium">
                    <User className="w-3.5 h-3.5 text-primary" />
                    {log.userName}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    log.operation === 'INSERT' ? "bg-green-100 text-green-700" :
                    log.operation === 'EDIT' ? "bg-blue-100 text-blue-700" :
                    log.operation === 'SOFT-DELETE' ? "bg-red-100 text-red-700" :
                    "bg-orange-100 text-orange-700"
                  )}>
                    {log.operation}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs">{log.moaName}</span>
                    <span className="text-[10px] text-muted-foreground">{log.hteId}</span>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                  No activity logs found in the system.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


"use client"

import React from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { FileText, User, Calendar, Loader2, ShieldCheck, Activity } from 'lucide-react';
import { SystemLog } from '@/app/lib/types';
import { cn } from '@/lib/utils';

export default function AuditLogsPage() {
  const { user } = useAuth();
  const { firestore } = useFirebase();

  // Primary data stream from dedicated audit logs collection
  const logsQuery = useMemoFirebase(() => {
    if (!firestore || user?.role !== 'admin') return null;
    return query(collection(firestore, 'audit_logs'), orderBy('timestamp', 'desc'));
  }, [firestore, user]);

  const { data: logs, isLoading } = useCollection<SystemLog>(logsQuery);

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
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Institutional System Logs</h1>
          <p className="text-sm text-muted-foreground">A persistent, immutable record of all partnership modifications.</p>
        </div>
        <div className="bg-muted/50 px-4 py-2 rounded-lg border flex items-center gap-3">
          <Activity className="w-4 h-4 text-primary" />
          <div className="text-xs">
            <span className="font-bold text-primary">{logs?.length || 0}</span> Total Events Recorded
          </div>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Timestamp</th>
                <th className="px-6 py-4 text-left font-semibold">Institutional Actor</th>
                <th className="px-6 py-4 text-left font-semibold">Operation</th>
                <th className="px-6 py-4 text-left font-semibold">Agreement Context</th>
                <th className="px-6 py-4 text-left font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs && logs.length > 0 ? logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 font-semibold">
                        <User className="w-3.5 h-3.5 text-primary" />
                        {log.userName}
                      </div>
                      <span className="text-[10px] text-muted-foreground ml-5 truncate max-w-[150px]">{log.userId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
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
                      <span className="font-bold text-xs truncate max-w-[200px]">{log.targetName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{log.hteId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-muted-foreground italic leading-tight">
                      {log.details || "No additional details provided."}
                    </p>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                    No activity logs found in the institutional registry.
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

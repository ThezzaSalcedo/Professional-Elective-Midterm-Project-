
"use client"

import React from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { 
  ShieldCheck, 
  Ban, 
  Unlock, 
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || currentUser?.role !== 'admin') return null;
    return collection(firestore, 'users');
  }, [firestore, currentUser]);

  const { data: users, isLoading } = useCollection(usersQuery);

  const toggleBlock = async (userId: string, currentStatus: boolean, name: string) => {
    if (!firestore) return;
    const ref = doc(firestore, 'users', userId);
    await updateDoc(ref, { isBlocked: !currentStatus });
    toast({ 
      title: !currentStatus ? "User Blocked" : "User Unblocked", 
      description: `${name} status updated.` 
    });
  };

  const toggleCanEdit = async (userId: string, currentStatus: boolean, name: string) => {
    if (!firestore) return;
    const ref = doc(firestore, 'users', userId);
    await updateDoc(ref, { canEditMoa: !currentStatus });
    toast({ 
      title: "Permission Updated", 
      description: `${name} can now ${!currentStatus ? 'edit' : 'only view'} MOAs.` 
    });
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <ShieldCheck className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground max-w-sm">Only super administrators can access this module.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
        <p className="text-sm text-muted-foreground">Synchronizing user registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-primary">System Users</h1>
        <p className="text-sm text-muted-foreground">Manage roles, permissions, and access control.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm min-w-[800px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">User Details</th>
                <th className="px-6 py-4 text-left font-semibold">Role</th>
                <th className="px-6 py-4 text-center font-semibold">Can Edit</th>
                <th className="px-6 py-4 text-center font-semibold">Status</th>
                <th className="px-6 py-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users?.map((u: any) => (
                <tr key={u.id} className={cn("hover:bg-muted/5 transition-colors", u.isBlocked && "bg-muted/50")}>
                  <td className="px-6 py-4">
                    <div className="font-semibold">{u.fullName || 'Unnamed User'}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap",
                      u.role === 'admin' ? "bg-red-100 text-red-700" :
                      u.role === 'faculty' ? "bg-blue-100 text-blue-700" : "bg-muted text-foreground"
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {u.role === 'faculty' ? (
                      <div className="flex justify-center">
                        <Switch 
                          checked={u.canEditMoa} 
                          onCheckedChange={() => toggleCanEdit(u.id, !!u.canEditMoa, u.fullName)}
                          disabled={u.isBlocked}
                        />
                      </div>
                    ) : u.role === 'admin' ? (
                      <span className="text-green-600 font-bold text-[10px] uppercase">Super User</span>
                    ) : (
                      <span className="text-muted-foreground italic text-[10px] uppercase">View Only</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {u.isBlocked ? (
                        <span className="flex items-center gap-1 text-destructive text-[10px] font-bold uppercase whitespace-nowrap">
                          <XCircle className="w-3 h-3" /> Blocked
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold uppercase whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.id !== currentUser.id && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toggleBlock(u.id, !!u.isBlocked, u.fullName)}
                        className={cn(
                          "text-[10px] h-8",
                          u.isBlocked ? "border-green-200 text-green-600 hover:bg-green-50" : "border-red-200 text-red-600 hover:bg-red-50"
                        )}
                      >
                        {u.isBlocked ? (
                          <div className="flex items-center gap-1.5"><Unlock className="w-3 h-3" /> Unblock</div>
                        ) : (
                          <div className="flex items-center gap-1.5"><Ban className="w-3 h-3" /> Block</div>
                        )}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

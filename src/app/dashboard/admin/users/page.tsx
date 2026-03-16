"use client"

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { User } from '@/app/lib/types';
import { mockUsers } from '@/app/lib/mock-data';
import { 
  Users, 
  ShieldCheck, 
  Ban, 
  Unlock, 
  UserPlus,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Check if current user is admin
    if (currentUser?.role !== 'admin') return;
    
    const stored = localStorage.getItem('moa_user_list');
    if (stored) {
      setUsers(JSON.parse(stored));
    } else {
      setUsers(mockUsers);
      localStorage.setItem('moa_user_list', JSON.stringify(mockUsers));
    }
  }, [currentUser]);

  const updateUsers = (newList: User[]) => {
    setUsers(newList);
    localStorage.setItem('moa_user_list', JSON.stringify(newList));
  };

  const toggleBlock = (userId: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        const newState = !u.isBlocked;
        toast({ title: newState ? "User Blocked" : "User Unblocked", description: `${u.name} status updated.` });
        return { ...u, isBlocked: newState };
      }
      return u;
    });
    updateUsers(updated);
  };

  const toggleCanEdit = (userId: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        const newState = !u.canEdit;
        toast({ title: "Permission Updated", description: `${u.name} can now ${newState ? 'edit' : 'only view'} MOAs.` });
        return { ...u, canEdit: newState };
      }
      return u;
    });
    updateUsers(updated);
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <ShieldCheck className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Only super administrators can access this module.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">System Users</h1>
          <p className="text-sm text-muted-foreground">Manage roles, permissions, and access control.</p>
        </div>
        <Button className="gap-2">
          <UserPlus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
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
            {users.map((u) => (
              <tr key={u.id} className={cn("hover:bg-muted/5 transition-colors", u.isBlocked && "bg-muted/50")}>
                <td className="px-6 py-4">
                  <div className="font-semibold">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
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
                        checked={u.canEdit} 
                        onCheckedChange={() => toggleCanEdit(u.id)}
                        disabled={u.isBlocked}
                      />
                    </div>
                  ) : u.role === 'admin' ? (
                    <span className="text-green-600 font-bold text-[10px] uppercase">Always Enabled</span>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">View Only</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    {u.isBlocked ? (
                      <span className="flex items-center gap-1 text-destructive text-[10px] font-bold uppercase">
                        <XCircle className="w-3 h-3" /> Blocked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold uppercase">
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
                      onClick={() => toggleBlock(u.id)}
                      className={cn(u.isBlocked ? "border-green-200 text-green-600 hover:bg-green-50" : "border-red-200 text-red-600 hover:bg-red-50")}
                    >
                      {u.isBlocked ? (
                        <div className="flex items-center gap-2"><Unlock className="w-4 h-4" /> Unblock</div>
                      ) : (
                        <div className="flex items-center gap-2"><Ban className="w-4 h-4" /> Block</div>
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
  );
}
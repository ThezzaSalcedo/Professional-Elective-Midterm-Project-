
"use client"

import React, { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, setDoc } from 'firebase/firestore';
import { 
  ShieldCheck, 
  Ban, 
  Unlock, 
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Edit2,
  UserPlus,
  ShieldAlert,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { User, Role } from '@/app/lib/types';

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'student' as Role,
    canAddMoa: false,
    canEditMoa: false,
    canDeleteMoa: false
  });

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || currentUser?.role !== 'admin') return null;
    return collection(firestore, 'users');
  }, [firestore, currentUser]);

  const { data: users, isLoading } = useCollection(usersQuery);

  const handleToggle = async (userId: string, field: string, value: boolean, name: string) => {
    if (!firestore) return;
    const ref = doc(firestore, 'users', userId);
    await updateDoc(ref, { [field]: value });
    toast({ 
      title: "Settings Updated", 
      description: `Permissions for ${name} have been synchronized.` 
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    try {
      if (selectedUser) {
        // Edit existing
        const ref = doc(firestore, 'users', selectedUser.id);
        await updateDoc(ref, {
          fullName: formData.fullName,
          role: formData.role,
          canAddMoa: formData.canAddMoa,
          canEditMoa: formData.canEditMoa,
          canDeleteMoa: formData.canDeleteMoa
        });
        toast({ title: "User Updated", description: `${formData.fullName}'s profile has been saved.` });
      } else {
        // Create new
        const id = Math.random().toString(36).substr(2, 9);
        const ref = doc(firestore, 'users', id);
        await setDoc(ref, {
          ...formData,
          id,
          isBlocked: false,
          createdAt: new Date().toISOString()
        });
        toast({ title: "User Created", description: `${formData.fullName} added to the registry.` });
      }
      setIsAdding(false);
      setIsEditing(false);
      resetForm();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save user data.", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      role: 'student',
      canAddMoa: false,
      canEditMoa: false,
      canDeleteMoa: false
    });
    setSelectedUser(null);
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      canAddMoa: user.canAddMoa,
      canEditMoa: user.canEditMoa,
      canDeleteMoa: user.canDeleteMoa
    });
    setIsEditing(true);
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <ShieldAlert className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground max-w-sm text-sm">Only super administrators can access this module.</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">System Registry</h1>
          <p className="text-sm text-muted-foreground">Manage roles, permissions, and security policies.</p>
        </div>
        <Dialog open={isAdding} onOpenChange={(open) => { setIsAdding(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <UserPlus className="w-4 h-4" />
              Add Institutional User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveUser} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="Full legal name" />
              </div>
              <div className="space-y-2">
                <Label>Institutional Email</Label>
                <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="user@neu.edu.ph" />
              </div>
              <div className="space-y-2">
                <Label>Primary Role</Label>
                <Select value={formData.role} onValueChange={(val: Role) => setFormData({...formData, role: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="faculty">Faculty Member</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full">Initialize Account</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm min-w-[900px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">User Details</th>
                <th className="px-6 py-4 text-left font-semibold">Role</th>
                <th className="px-6 py-4 text-center font-semibold">Rights (Add/Edit/Del)</th>
                <th className="px-6 py-4 text-center font-semibold">Access Status</th>
                <th className="px-6 py-4 text-right font-semibold">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users?.map((u: any) => (
                <tr key={u.id} className={cn("hover:bg-muted/5 transition-colors", u.isBlocked && "bg-muted/30 opacity-70")}>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{u.fullName || 'Unnamed User'}</div>
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
                  <td className="px-6 py-4">
                    <div className="flex justify-center items-center gap-4">
                      {u.role === 'faculty' ? (
                        <>
                          <div className="flex flex-col items-center gap-1">
                            <Label className="text-[8px] uppercase font-bold text-muted-foreground">Add</Label>
                            <Switch checked={u.canAddMoa} onCheckedChange={(v) => handleToggle(u.id, 'canAddMoa', v, u.fullName)} />
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <Label className="text-[8px] uppercase font-bold text-muted-foreground">Edit</Label>
                            <Switch checked={u.canEditMoa} onCheckedChange={(v) => handleToggle(u.id, 'canEditMoa', v, u.fullName)} />
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <Label className="text-[8px] uppercase font-bold text-muted-foreground">Del</Label>
                            <Switch checked={u.canDeleteMoa} onCheckedChange={(v) => handleToggle(u.id, 'canDeleteMoa', v, u.fullName)} />
                          </div>
                        </>
                      ) : u.role === 'admin' ? (
                        <div className="text-[10px] font-bold text-green-600 uppercase tracking-tighter">Full Administrative Rights</div>
                      ) : (
                        <div className="text-[10px] font-medium text-muted-foreground uppercase italic">Institutional Viewer</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      {u.isBlocked ? (
                        <span className="flex items-center gap-1 text-destructive text-[10px] font-bold uppercase whitespace-nowrap bg-destructive/10 px-2 py-0.5 rounded">
                          <XCircle className="w-3 h-3" /> Account Blocked
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold uppercase whitespace-nowrap bg-green-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> System Active
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {u.id !== currentUser.id && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleToggle(u.id, 'isBlocked', !u.isBlocked, u.fullName)}
                          className={cn(
                            "h-8 w-8",
                            u.isBlocked ? "text-green-600 hover:bg-green-50" : "text-destructive hover:bg-destructive/5"
                          )}
                        >
                          {u.isBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
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

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveUser} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="opacity-50">Institutional Email (Read-only)</Label>
              <Input disabled value={formData.email} className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Role Assignment</Label>
              <Select value={formData.role} onValueChange={(val: Role) => setFormData({...formData, role: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="faculty">Faculty Member</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full gap-2">
                <Save className="w-4 h-4" />
                Synchronize Profile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

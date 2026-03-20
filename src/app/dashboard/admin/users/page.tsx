
"use client"

import React, { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { 
  ShieldCheck, 
  Ban, 
  Unlock, 
  CheckCircle2,
  XCircle,
  Loader2,
  UserPlus,
  ShieldAlert,
  Save,
  Edit2,
  Trash2,
  KeyRound,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { User, Role } from '@/app/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type AccessLevel = 'VIEWER' | 'CONTRIBUTOR' | 'EDITOR' | 'MANAGER';

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { firestore, auth } = useFirebase();
  const { toast } = useToast();
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'student' as Role,
    accessLevel: 'VIEWER' as AccessLevel
  });

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || currentUser?.role !== 'admin') return null;
    return collection(firestore, 'users');
  }, [firestore, currentUser]);

  const { data: users, isLoading } = useCollection(usersQuery);

  const getAccessLevel = (u: any): AccessLevel => {
    if (u.canDeleteMoa) return 'MANAGER';
    if (u.canEditMoa) return 'EDITOR';
    if (u.canAddMoa) return 'CONTRIBUTOR';
    return 'VIEWER';
  };

  const handleSendResetEmail = (email: string, name: string) => {
    if (!auth) return;
    sendPasswordResetEmail(auth, email)
      .then(() => {
        toast({
          title: "Recovery Email Sent",
          description: `An institutional password reset link has been dispatched to ${name}.`
        });
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Synchronization Error",
          description: "Could not initiate password reset for this account."
        });
      });
  };

  const handleAccessLevelChange = async (userId: string, level: AccessLevel, name: string) => {
    if (!firestore) return;
    const ref = doc(firestore, 'users', userId);
    
    const updates = {
      canAddMoa: level !== 'VIEWER',
      canEditMoa: level === 'EDITOR' || level === 'MANAGER',
      canDeleteMoa: level === 'MANAGER'
    };

    updateDoc(ref, updates)
      .then(() => {
        toast({ 
          title: "Permissions Synchronized", 
          description: `${name} is now designated as ${level}.` 
        });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: ref.path,
          operation: 'update',
          requestResourceData: updates,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleToggleBlock = async (userId: string, isBlocked: boolean, name: string) => {
    if (!firestore) return;
    const ref = doc(firestore, 'users', userId);
    updateDoc(ref, { isBlocked })
      .then(() => {
        toast({ 
          title: isBlocked ? "Access Suspended" : "Access Restored", 
          description: `Institutional account for ${name} has been ${isBlocked ? 'blocked' : 'unblocked'}.` 
        });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: ref.path,
          operation: 'update',
          requestResourceData: { isBlocked },
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!firestore) return;
    if (userId === currentUser?.id) {
      toast({ title: "Operation Restricted", description: "You cannot remove your own administrative account.", variant: "destructive" });
      return;
    }

    const ref = doc(firestore, 'users', userId);
    deleteDoc(ref)
      .then(() => {
        toast({ title: "User Removed", description: `${name} has been purged from the institutional registry.` });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: ref.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    const accessFlags = {
      canAddMoa: formData.accessLevel !== 'VIEWER',
      canEditMoa: formData.accessLevel === 'EDITOR' || formData.accessLevel === 'MANAGER',
      canDeleteMoa: formData.accessLevel === 'MANAGER'
    };

    if (selectedUser) {
      const ref = doc(firestore, 'users', selectedUser.id);
      const updates = {
        fullName: formData.fullName,
        role: formData.role,
        ...accessFlags
      };
      updateDoc(ref, updates)
        .then(() => {
          toast({ title: "Profile Synchronized", description: `${formData.fullName}'s institutional record has been updated.` });
          setIsEditing(false);
          resetForm();
        })
        .catch(async (error) => {
          const permissionError = new FirestorePermissionError({
            path: ref.path,
            operation: 'update',
            requestResourceData: updates,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      const ref = doc(firestore, 'users', id);
      const finalData = {
        id,
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        ...accessFlags,
        isBlocked: false,
        createdAt: new Date().toISOString()
      };
      setDoc(ref, finalData)
        .then(() => {
          toast({ title: "User Registered", description: `${formData.fullName} has been added to the institutional registry.` });
          setIsAdding(false);
          resetForm();
        })
        .catch(async (error) => {
          const permissionError = new FirestorePermissionError({
            path: ref.path,
            operation: 'create',
            requestResourceData: finalData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      role: 'student',
      accessLevel: 'VIEWER'
    });
    setSelectedUser(null);
  };

  const openEdit = (u: any) => {
    setSelectedUser(u);
    setFormData({
      fullName: u.fullName || '',
      email: u.email || '',
      role: u.role || 'student',
      accessLevel: getAccessLevel(u)
    });
    setIsEditing(true);
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <ShieldAlert className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground max-w-sm text-sm">Only super administrators can access the system registry.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
        <p className="text-sm text-muted-foreground">Synchronizing institutional registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">System Registry</h1>
          <p className="text-sm text-muted-foreground">Manage institutional roles, access levels, and security policies.</p>
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
              <DialogTitle>Register New User</DialogTitle>
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
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select value={formData.accessLevel} onValueChange={(val: AccessLevel) => setFormData({...formData, accessLevel: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                      <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                      <SelectItem value="EDITOR">Editor</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
          <table className="w-full text-xs sm:text-sm min-w-[950px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Institutional User</th>
                <th className="px-6 py-4 text-left font-semibold">Role</th>
                <th className="px-6 py-4 text-center font-semibold">Registry Access Level</th>
                <th className="px-6 py-4 text-center font-semibold">System Status</th>
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
                    <div className="flex justify-center">
                      {u.role === 'faculty' ? (
                        <Select 
                          value={getAccessLevel(u)} 
                          onValueChange={(val: AccessLevel) => handleAccessLevelChange(u.id, val, u.fullName)}
                        >
                          <SelectTrigger className="w-40 h-8 text-[11px] font-bold uppercase tracking-tighter">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VIEWER">VIEWER (Read Only)</SelectItem>
                            <SelectItem value="CONTRIBUTOR">CONTRIBUTOR (Add)</SelectItem>
                            <SelectItem value="EDITOR">EDITOR (Add/Edit)</SelectItem>
                            <SelectItem value="MANAGER">MANAGER (Add/Edit/Del)</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : u.role === 'admin' ? (
                        <div className="text-[10px] font-bold text-green-600 uppercase tracking-tighter bg-green-50 px-3 py-1 rounded border border-green-100">Full Institutional Manager</div>
                      ) : (
                        <div className="text-[10px] font-medium text-muted-foreground uppercase italic bg-muted/50 px-3 py-1 rounded">Institutional Viewer</div>
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
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleSendResetEmail(u.email, u.fullName)} title="Send Password Reset">
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      
                      {u.id !== currentUser?.id && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleToggleBlock(u.id, !u.isBlocked, u.fullName)}
                            className={cn(
                              "h-8 w-8",
                              u.isBlocked ? "text-green-600 hover:bg-green-50" : "text-destructive hover:bg-destructive/5"
                            )}
                          >
                            {u.isBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Purge User Record?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove <strong>{u.fullName}</strong> from the institutional registry. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteUser(u.id, u.fullName)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete Permanently
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
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
            <DialogTitle>Update Institutional Profile</DialogTitle>
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
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select value={formData.accessLevel} onValueChange={(val: AccessLevel) => setFormData({...formData, accessLevel: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                    <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                    <SelectItem value="EDITOR">Editor</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

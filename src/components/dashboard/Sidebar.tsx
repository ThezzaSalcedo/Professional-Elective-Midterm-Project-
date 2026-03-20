
"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  LogOut, 
  ShieldCheck,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Navigation items are calculated dynamically based on the current user's role
  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'MOA List', href: '/dashboard/moas', icon: FileText },
  ];

  if (user?.role === 'admin') {
    navItems.push({ label: 'User Registry', href: '/dashboard/admin/users', icon: Users });
    navItems.push({ label: 'System Logs', href: '/dashboard/admin/audit-logs', icon: History });
  }

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r shadow-sm">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">MOA Track</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t space-y-4">
        <div className="px-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Profile</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shadow-inner">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate text-foreground">{user?.fullName}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3 border-none hover:bg-destructive/5 hover:text-destructive transition-colors"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

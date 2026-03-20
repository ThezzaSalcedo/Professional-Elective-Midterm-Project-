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

const NEU_LOGO_URL = "https://upload.wikimedia.org/wikipedia/en/c/c6/New_Era_University.svg";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'MOA Management', href: '/dashboard/moas', icon: FileText },
  ];

  if (user?.role === 'admin') {
    navItems.push({ label: 'User Registry', href: '/dashboard/admin/users', icon: Users });
    navItems.push({ label: 'System Logs', href: '/dashboard/admin/audit-logs', icon: History });
  }

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r shadow-sm">
      <div className="flex h-20 items-center px-6 border-b bg-primary/5">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute -inset-1 bg-primary/10 blur rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <img src={NEU_LOGO_URL} alt="NEU Logo" className="w-10 h-10 relative" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-tighter text-primary leading-none">MOA</span>
            <span className="text-sm font-bold tracking-tight text-[#0f172a]">Management</span>
          </div>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-accent" : "text-muted-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t space-y-4">
        <div className="px-3">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Institutional Profile</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground text-sm font-black shadow-inner border-2 border-primary-foreground/20">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate text-foreground">{user?.fullName}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3 border-none hover:bg-destructive/5 hover:text-destructive transition-colors font-bold text-xs uppercase tracking-widest"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
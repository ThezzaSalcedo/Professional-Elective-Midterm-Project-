import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  colorClass: string;
}

export function StatsCard({ title, value, icon: Icon, colorClass }: StatsCardProps) {
  return (
    <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex items-stretch">
          <div className={cn("w-2", colorClass)} />
          <div className="flex-1 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
              <h3 className="text-3xl font-bold mt-1 text-foreground">{value}</h3>
            </div>
            <div className={cn("p-3 rounded-xl bg-muted text-foreground", colorClass.replace('bg-', 'text-'))}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
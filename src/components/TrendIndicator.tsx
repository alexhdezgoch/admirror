'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  trend: 'rising' | 'stable' | 'declining';
  size?: 'sm' | 'md';
}

const trendConfig = {
  rising: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100', label: 'Rising' },
  stable: { icon: Minus, color: 'text-slate-500', bg: 'bg-slate-100', label: 'Stable' },
  declining: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-100', label: 'Declining' }
};

export function TrendIndicator({ trend, size = 'sm' }: TrendIndicatorProps) {
  const config = trendConfig[trend];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${config.bg} ${config.color} ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {config.label}
    </span>
  );
}

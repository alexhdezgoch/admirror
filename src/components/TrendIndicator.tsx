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
  const config = trendConfig[trend] || trendConfig.stable;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${config.bg} ${config.color} ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {config.label}
    </span>
  );
}

// Week-over-Week change indicator with percentage
interface WoWChangeProps {
  change: number; // Percentage change (e.g., 12 for +12%, -8 for -8%)
  size?: 'sm' | 'md';
  showLabel?: boolean;
  neutral?: boolean; // If true, don't color based on positive/negative
}

export function WoWChange({ change, size = 'sm', showLabel = false, neutral = false }: WoWChangeProps) {
  if (change === 0 || !isFinite(change)) {
    return (
      <span className={`inline-flex items-center gap-1 text-slate-500 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        <Minus className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        {showLabel && 'No change'}
      </span>
    );
  }

  const isPositive = change > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  // For neutral mode, always use slate colors
  // Otherwise, green for positive, red for negative
  const colorClass = neutral
    ? 'text-slate-600'
    : isPositive
    ? 'text-green-600'
    : 'text-red-500';

  const bgClass = neutral
    ? 'bg-slate-100'
    : isPositive
    ? 'bg-green-50'
    : 'bg-red-50';

  const formattedChange = Math.abs(change).toFixed(1);
  const sign = isPositive ? '+' : '-';

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${bgClass} ${colorClass} ${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {sign}{formattedChange}%
      {showLabel && <span className="text-slate-400 font-normal ml-0.5">WoW</span>}
    </span>
  );
}

// Helper to calculate WoW change percentage
export function calculateWoWChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

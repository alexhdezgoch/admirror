'use client';

import { AdFormat } from '@/types';
import { Video, Image, LayoutGrid } from 'lucide-react';

interface FormatBadgeProps {
  format: AdFormat;
  duration?: number;
}

const formatConfig: Record<AdFormat, { label: string; icon: typeof Video }> = {
  video: { label: 'Video', icon: Video },
  static: { label: 'Static', icon: Image },
  carousel: { label: 'Carousel', icon: LayoutGrid }
};

export function FormatBadge({ format, duration }: FormatBadgeProps) {
  const config = formatConfig[format];
  const Icon = config.icon;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5">
      <Icon className="w-3 h-3" />
      {config.label}
      {duration && <span>· {duration}s</span>}
    </span>
  );
}

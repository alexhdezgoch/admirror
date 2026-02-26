'use client';

import { ConfidenceLevel } from '@/types/playbook';
import { CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react';

interface Props {
  level: ConfidenceLevel;
  reason?: string;
  showReason?: boolean;
  size?: 'sm' | 'md';
}

const confidenceStyles = {
  high: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: CheckCircle2,
    label: 'High Confidence',
  },
  medium: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: AlertCircle,
    label: 'Medium Confidence',
  },
  hypothesis: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-300 border-dashed',
    icon: Lightbulb,
    label: 'Hypothesis',
  },
};

export function ConfidenceBadge({ level, reason, showReason = false, size = 'sm' }: Props) {
  const style = confidenceStyles[level] || confidenceStyles.medium;
  const Icon = style.icon;

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-sm';

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses} ${style.bg} ${style.text} border ${style.border}`}
      >
        <Icon className={iconSize} />
        {style.label}
      </span>
      {showReason && reason && (
        <span className="text-xs text-slate-500 italic">{reason}</span>
      )}
    </div>
  );
}

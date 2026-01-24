'use client';

interface EffortBadgeProps {
  effort: 'low' | 'medium' | 'high';
}

const effortConfig = {
  low: { label: 'Low Effort', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  medium: { label: 'Medium Effort', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
  high: { label: 'High Effort', bgColor: 'bg-red-100', textColor: 'text-red-700' }
};

export function EffortBadge({ effort }: EffortBadgeProps) {
  const config = effortConfig[effort];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      {config.label}
    </span>
  );
}

'use client';

import { VelocityTier, VelocitySignal, VelocityMetrics, AdScore, AdGrade } from '@/types';
import { TrendingUp, FlaskConical, Sparkles, Flame, DollarSign, Ghost, Star, Beaker, Trophy, Medal, Target, AlertTriangle, XCircle } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface VelocityBadgeProps {
  tier?: VelocityTier;
  velocity?: VelocityMetrics;
  score?: number;
  showScore?: boolean;
  showSignal?: boolean;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const signalTooltipContent: Record<VelocitySignal, { meaning: string; spendSignal: string; action: string }> = {
  cash_cow: {
    meaning: 'Proven winner with sustained ad spend',
    spendSignal: 'High confidence spend - running 30+ days with multiple variations',
    action: 'Study these closely - they work. Adapt the hook and format for your clients.'
  },
  rising_star: {
    meaning: 'Early winner showing momentum',
    spendSignal: 'Increasing spend - brand is scaling up variations (2-4 weeks old)',
    action: 'Watch these - they may become Cash Cows. Good for timely inspiration.'
  },
  burn_test: {
    meaning: 'Aggressive testing with rapid iteration',
    spendSignal: 'Testing budget - multiple variations in under 2 weeks',
    action: 'Interesting creative direction, but unproven. Note the hooks being tested.'
  },
  zombie: {
    meaning: 'Old ad that may be forgotten',
    spendSignal: 'Likely low/no spend - running 30+ days but never iterated',
    action: 'Probably ignore. May be leftover from past campaigns.'
  },
  standard: {
    meaning: 'Regular ad without strong signals',
    spendSignal: 'Unknown spend pattern - not enough data to classify',
    action: 'Evaluate on creative merit alone.'
  }
};

const tierConfig: Record<VelocityTier, { label: string; bgColor: string; textColor: string; icon: typeof TrendingUp }> = {
  scaling: {
    label: 'Scaling',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    icon: TrendingUp
  },
  testing: {
    label: 'Testing',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    icon: FlaskConical
  },
  new: {
    label: 'New',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-600',
    icon: Sparkles
  }
};

const signalConfig: Record<VelocitySignal, { label: string; emoji: string; bgColor: string; textColor: string; icon: typeof TrendingUp }> = {
  burn_test: {
    label: 'Burn Test',
    emoji: '🔥',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    icon: Flame
  },
  cash_cow: {
    label: 'Cash Cow',
    emoji: '💰',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    icon: DollarSign
  },
  zombie: {
    label: 'Zombie',
    emoji: '👻',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-500',
    icon: Ghost
  },
  rising_star: {
    label: 'Rising Star',
    emoji: '🚀',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    icon: Star
  },
  standard: {
    label: 'Standard',
    emoji: '➖',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-600',
    icon: Beaker
  }
};

const sizeConfig = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5'
};

export function VelocityBadge({
  tier,
  velocity,
  score,
  showScore = false,
  showSignal = false,
  showTooltip = false,
  size = 'sm'
}: VelocityBadgeProps) {
  // Determine which config to use
  const actualTier = velocity?.tier ?? tier ?? 'new';
  const actualSignal = velocity?.signal;
  const actualScore = velocity?.score ?? score;

  // Use signal config if showSignal is true and we have signal data
  const useSignalDisplay = showSignal && actualSignal;
  const config = useSignalDisplay && actualSignal
    ? signalConfig[actualSignal]
    : tierConfig[actualTier];

  const Icon = config.icon;

  const badge = (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeConfig[size]} ${showTooltip && actualSignal ? 'cursor-help' : ''}`}>
      {useSignalDisplay && actualSignal ? (
        <span>{signalConfig[actualSignal].emoji}</span>
      ) : (
        <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'} />
      )}
      {config.label}
      {showScore && actualScore !== undefined && (
        <span className="ml-1 opacity-75">({actualScore})</span>
      )}
    </span>
  );

  // If showTooltip is true and we have a signal, wrap with tooltip
  if (showTooltip && actualSignal) {
    const tooltipData = signalTooltipContent[actualSignal];
    return (
      <Tooltip
        position="bottom"
        content={
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium border-b border-slate-700 pb-2">
              <Icon className="w-4 h-4" />
              <span>{config.label}</span>
            </div>
            <div>
              <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">What it means</div>
              <div className="text-slate-100">{tooltipData.meaning}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Spend signal</div>
              <div className="text-slate-100">{tooltipData.spendSignal}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">What to do</div>
              <div className="text-slate-100">{tooltipData.action}</div>
            </div>
          </div>
        }
      >
        {badge}
      </Tooltip>
    );
  }

  return badge;
}

// Grade badge component for displaying A+, A, B, C, D grades
interface GradeBadgeProps {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  size?: 'sm' | 'md' | 'lg';
  score?: AdScore; // Pass score to enable tooltip
}

const gradeConfig: Record<string, { bgColor: string; textColor: string }> = {
  'A+': { bgColor: 'bg-green-100', textColor: 'text-green-800' },
  'A': { bgColor: 'bg-green-50', textColor: 'text-green-700' },
  'B': { bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
  'C': { bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
  'D': { bgColor: 'bg-red-50', textColor: 'text-red-700' }
};

const gradeTooltipContent: Record<AdGrade, { icon: typeof Trophy; meaning: string; quality: string; action: string }> = {
  'A+': {
    icon: Trophy,
    meaning: 'Exceptional creative excellence',
    quality: 'Top 5% - Strong hook, clear value prop, compelling CTA, polished execution',
    action: 'These are gold. Break down every element and adapt for your clients.'
  },
  'A': {
    icon: Medal,
    meaning: 'High-quality, effective creative',
    quality: 'Top 20% - Solid fundamentals with professional execution',
    action: 'Worth studying. Good templates for proven approaches.'
  },
  'B': {
    icon: Target,
    meaning: 'Competent creative with room to improve',
    quality: 'Average performer - Meets basic standards but lacks standout elements',
    action: 'Can work, but look for A/A+ versions of similar concepts.'
  },
  'C': {
    icon: AlertTriangle,
    meaning: 'Below average with notable weaknesses',
    quality: 'Underperforming - Missing key elements or poor execution',
    action: 'Skip unless studying what NOT to do.'
  },
  'D': {
    icon: XCircle,
    meaning: 'Poor creative that likely underperforms',
    quality: 'Bottom tier - Multiple issues with hook, messaging, or production',
    action: 'Avoid. These rarely convert well.'
  }
};

export function GradeBadge({ grade, size = 'sm', score }: GradeBadgeProps) {
  const config = gradeConfig[grade];
  const tooltipData = gradeTooltipContent[grade];
  const Icon = tooltipData.icon;

  const badge = (
    <span className={`inline-flex items-center justify-center rounded-full font-bold ${config.bgColor} ${config.textColor} ${sizeConfig[size]} ${score ? 'cursor-help' : ''}`}>
      {grade}
    </span>
  );

  // If score is provided, wrap with tooltip
  if (score) {
    return (
      <Tooltip
        position="bottom"
        content={
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium border-b border-slate-700 pb-2">
              <Icon className="w-4 h-4" />
              <span>Grade {grade}</span>
              <span className="ml-auto text-slate-400">Score: {score.final}</span>
            </div>
            <div>
              <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">What it means</div>
              <div className="text-slate-100">{tooltipData.meaning}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Quality level</div>
              <div className="text-slate-100">{tooltipData.quality}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">What to do</div>
              <div className="text-slate-100">{tooltipData.action}</div>
            </div>
          </div>
        }
      >
        {badge}
      </Tooltip>
    );
  }

  return badge;
}

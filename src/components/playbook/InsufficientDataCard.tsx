'use client';

import { AlertTriangle, TrendingUp, Users, RefreshCw } from 'lucide-react';
import { InsufficientDataDetails } from '@/types/playbook';

interface Props {
  type: 'insufficient_client_data' | 'insufficient_competitor_data';
  details: InsufficientDataDetails;
  onRetry?: () => void;
}

export function InsufficientDataCard({ type, details, onRetry }: Props) {
  const isClientData = type === 'insufficient_client_data';

  // Calculate progress
  let progress = 0;
  let label = '';
  let currentValue = 0;
  let targetValue = 0;

  if (isClientData) {
    if (details.currentSpend !== undefined && details.requiredSpend !== undefined) {
      currentValue = details.currentSpend;
      targetValue = details.requiredSpend;
      progress = Math.min((currentValue / targetValue) * 100, 100);
      label = `$${currentValue.toLocaleString()} / $${targetValue.toLocaleString()} ad spend`;
    } else if (details.currentAds !== undefined && details.requiredAds !== undefined) {
      currentValue = details.currentAds;
      targetValue = details.requiredAds;
      progress = Math.min((currentValue / targetValue) * 100, 100);
      label = `${currentValue} / ${targetValue} ads analyzed`;
    }
  } else {
    if (details.currentCompetitors !== undefined && details.requiredCompetitors !== undefined) {
      currentValue = details.currentCompetitors;
      targetValue = details.requiredCompetitors;
      progress = Math.min((currentValue / targetValue) * 100, 100);
      label = `${currentValue} / ${targetValue} competitors tracked`;
    } else if (details.currentAds !== undefined && details.requiredAds !== undefined) {
      currentValue = details.currentAds;
      targetValue = details.requiredAds;
      progress = Math.min((currentValue / targetValue) * 100, 100);
      label = `${currentValue} / ${targetValue} competitor ads`;
    }
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-200">
      <div className="text-center max-w-lg mx-auto">
        {/* Icon */}
        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          {isClientData ? (
            <TrendingUp className="w-8 h-8 text-amber-600" />
          ) : (
            <Users className="w-8 h-8 text-amber-600" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {isClientData ? 'More Performance Data Needed' : 'More Competitor Data Needed'}
        </h2>

        {/* Message */}
        <p className="text-slate-600 mb-6">{details.message}</p>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-500">{label}</span>
            <span className="font-medium text-slate-700">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-amber-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* What's Needed */}
        <div className="bg-white/60 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-slate-900 mb-1">Why this matters</p>
              <p className="text-sm text-slate-600">
                {isClientData
                  ? 'Playbooks need enough performance data to identify what works for YOUR brand. Without this, recommendations would be based only on competitor patterns.'
                  : 'Pattern detection requires enough competitors to separate real trends from individual brand quirks. With more data, recommendations become more reliable.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {isClientData ? 'Sync More Ads' : 'Add Competitors'}
          </button>
        )}
      </div>
    </div>
  );
}

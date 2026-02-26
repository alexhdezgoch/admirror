'use client';

import { PlaybookContent, StopDoingPattern } from '@/types/playbook';
import { ConfidenceBadge } from '../ConfidenceBadge';
import { XCircle, AlertTriangle } from 'lucide-react';

interface Props {
  data: PlaybookContent['stopDoing'];
}

export function StopDoing({ data }: Props) {
  if (!data.patterns || data.patterns.length === 0) {
    return (
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <XCircle className="w-6 h-6 text-red-500" />
            Stop Doing
          </h2>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-500">
            Connect your Meta account to identify underperforming patterns.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <XCircle className="w-6 h-6 text-red-500" />
          Stop Doing
        </h2>
        <p className="text-slate-600">{data.summary}</p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
        <div className="divide-y divide-red-200">
          {data.patterns.map((pattern, index) => (
            <StopDoingItem key={index} pattern={pattern} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StopDoingItem({ pattern }: { pattern: StopDoingPattern }) {
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-slate-900">{pattern.pattern}</h3>
            <p className="text-sm text-slate-700 mt-1">{pattern.reason}</p>
          </div>
        </div>
        {pattern.confidence && (
          <ConfidenceBadge level={pattern.confidence} size="sm" />
        )}
      </div>

      {/* Confidence Reason */}
      {pattern.confidenceReason && (
        <p className="text-xs text-slate-500 italic mb-3 ml-8">{pattern.confidenceReason}</p>
      )}

      <div className="grid md:grid-cols-2 gap-3 mt-4">
        <div className="bg-white/70 rounded-lg p-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Your Performance
          </span>
          <p className="text-sm text-slate-700 mt-1">{pattern.yourData}</p>
        </div>
        <div className="bg-white/70 rounded-lg p-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Competitor Comparison
          </span>
          <p className="text-sm text-slate-700 mt-1">{pattern.competitorComparison}</p>
        </div>
      </div>
    </div>
  );
}

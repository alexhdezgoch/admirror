'use client';

import { PlaybookContent, StopDoingPattern } from '@/types/playbook';
import { XCircle, AlertTriangle } from 'lucide-react';

interface Props {
  data: PlaybookContent['stopDoing'];
}

export function StopDoing({ data }: Props) {
  if (!data.patterns || data.patterns.length === 0) {
    return null;
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
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-slate-900">{pattern.pattern}</h3>
          <p className="text-sm text-slate-700 mt-1">{pattern.reason}</p>
        </div>
      </div>

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

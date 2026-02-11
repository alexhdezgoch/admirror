'use client';

import { Benchmark } from '@/types/playbook';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface Props {
  benchmark: Benchmark;
  compact?: boolean;
}

export function BenchmarkRow({ benchmark, compact = false }: Props) {
  const { metric, yourValue, competitorAvg, multiplier, interpretation } = benchmark;

  // Determine if you're ahead, behind, or neutral
  let status: 'ahead' | 'behind' | 'neutral' = 'neutral';
  if (multiplier > 0) {
    if (multiplier > 1.2) status = 'behind';
    else if (multiplier < 0.8) status = 'ahead';
  }

  const statusStyles = {
    ahead: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    behind: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    neutral: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  };

  const style = statusStyles[status];

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-2 rounded-lg ${style.bg} border ${style.border}`}>
        <span className="text-sm font-medium text-slate-700">{metric}</span>
        <div className="flex items-center gap-2">
          {multiplier > 0 && (
            <span className={`text-sm font-semibold ${style.text}`}>
              {multiplier > 1 ? `${multiplier.toFixed(1)}x` : `${(1/multiplier).toFixed(1)}x`}
              {status === 'ahead' ? ' ahead' : status === 'behind' ? ' behind' : ''}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl ${style.bg} border ${style.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-slate-900">{metric}</span>
        {status === 'ahead' && <ArrowUp className="w-4 h-4 text-green-600" />}
        {status === 'behind' && <ArrowDown className="w-4 h-4 text-red-600" />}
        {status === 'neutral' && <Minus className="w-4 h-4 text-slate-400" />}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className="text-lg font-bold text-slate-900">
            {typeof yourValue === 'number' ? (yourValue > 0 ? yourValue : 'N/A') : yourValue}
          </div>
          <div className="text-xs text-slate-500">Your value</div>
        </div>
        <div className="text-center border-x border-slate-200">
          <div className="text-lg font-bold text-indigo-600">{typeof competitorAvg === 'number' ? (competitorAvg > 0 ? competitorAvg : 'N/A') : competitorAvg}</div>
          <div className="text-xs text-slate-500">Competitor avg</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold ${style.text}`}>
            {multiplier > 0 ? `${multiplier.toFixed(1)}x` : '-'}
          </div>
          <div className="text-xs text-slate-500">Multiplier</div>
        </div>
      </div>

      <p className="text-sm text-slate-600">{interpretation}</p>
    </div>
  );
}

interface BenchmarkGridProps {
  benchmarks: Benchmark[];
}

export function BenchmarkGrid({ benchmarks }: BenchmarkGridProps) {
  if (!benchmarks || benchmarks.length === 0) {
    return null;
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      {benchmarks.map((benchmark, index) => (
        <BenchmarkRow key={index} benchmark={benchmark} />
      ))}
    </div>
  );
}

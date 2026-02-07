'use client';

import { PlaybookContent } from '@/types/playbook';
import { Sparkles, TrendingUp, AlertTriangle, Zap } from 'lucide-react';

interface Props {
  data: PlaybookContent['executiveSummary'];
}

export function ExecutiveSummary({ data }: Props) {
  return (
    <section className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-8 border border-indigo-100">
      {/* Top Insight */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-indigo-600 uppercase tracking-wide mb-1">
            Key Insight
          </h2>
          <p className="text-xl font-semibold text-slate-900">
            {data.topInsight}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Strengths */}
        <div className="bg-white/60 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-slate-900">Your Strengths</h3>
          </div>
          <ul className="space-y-2">
            {data.yourStrengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 shrink-0" />
                {strength}
              </li>
            ))}
          </ul>
        </div>

        {/* Gaps */}
        <div className="bg-white/60 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-slate-900">Biggest Gaps</h3>
          </div>
          <ul className="space-y-2">
            {data.biggestGaps.map((gap, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                {gap}
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Wins */}
        <div className="bg-white/60 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Quick Wins</h3>
          </div>
          <ul className="space-y-2">
            {data.quickWins.map((win, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                {win}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

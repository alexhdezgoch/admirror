'use client';

import { PlaybookContent, HookToTest } from '@/types/playbook';
import { MessageSquare, CheckCircle2, Lightbulb } from 'lucide-react';

interface Props {
  data: PlaybookContent['hookStrategy'];
}

const priorityColors = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

const sourceLabels = {
  competitor_trend: 'From Competitors',
  your_winners: 'Your Winners',
  gap_analysis: 'Gap Opportunity',
};

export function HookStrategy({ data }: Props) {
  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Hook Strategy</h2>
        <p className="text-slate-600">{data.summary}</p>
      </div>

      {/* Hooks to Test */}
      <div className="space-y-4 mb-8">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Hooks to Test
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {data.toTest.map((hook, index) => (
            <HookCard key={index} hook={hook} />
          ))}
        </div>
      </div>

      {/* Winning Hooks */}
      {data.yourWinningHooks.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-slate-900">Keep Using These</h3>
          </div>
          <ul className="space-y-2">
            {data.yourWinningHooks.map((hook, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 shrink-0" />
                {hook}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function HookCard({ hook }: { hook: HookToTest }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[hook.priority]}`}>
            {hook.priority} priority
          </span>
        </div>
        <span className="text-xs text-slate-500">
          {sourceLabels[hook.source]}
        </span>
      </div>

      {/* Hook Template */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-3">
        <p className="text-sm font-medium text-indigo-900">
          &ldquo;{hook.hookTemplate}&rdquo;
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <span className="font-medium text-slate-500 shrink-0">Type:</span>
          <span className="text-slate-700 capitalize">{hook.hookType.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <span className="text-slate-600">{hook.whyItWorks}</span>
        </div>
      </div>

      {hook.exampleAdIds.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Examples: {hook.exampleAdIds.slice(0, 2).join(', ')}
            {hook.exampleAdIds.length > 2 && ` +${hook.exampleAdIds.length - 2} more`}
          </span>
        </div>
      )}
    </div>
  );
}

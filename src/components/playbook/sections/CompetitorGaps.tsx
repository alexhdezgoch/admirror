'use client';

import { PlaybookContent, CompetitorOpportunity } from '@/types/playbook';
import { ConfidenceBadge } from '../ConfidenceBadge';
import { AdReferenceGrid } from '../AdReferenceGrid';
import { Target, Users, ArrowRight } from 'lucide-react';

interface Props {
  data: PlaybookContent['competitorGaps'];
}

const severityStyles = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: 'Critical Gap' },
  moderate: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', label: 'Moderate Gap' },
  minor: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', label: 'Minor Gap' },
};

export function CompetitorGaps({ data }: Props) {
  if (!data.opportunities || data.opportunities.length === 0) {
    return (
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Competitor Opportunities</h2>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-500">
            Need more competitor data to identify gaps.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Competitor Opportunities</h2>
        <p className="text-slate-600">{data.summary}</p>
      </div>

      <div className="space-y-4">
        {data.opportunities.map((opportunity, index) => (
          <OpportunityCard key={index} opportunity={opportunity} />
        ))}
      </div>
    </section>
  );
}

function OpportunityCard({ opportunity }: { opportunity: CompetitorOpportunity }) {
  const severity = severityStyles[opportunity.gapSeverity];

  return (
    <div className={`bg-white border ${severity.border} rounded-xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">{opportunity.patternName}</h3>
        </div>
        <div className="flex items-center gap-2">
          {opportunity.confidence && (
            <ConfidenceBadge level={opportunity.confidence} size="sm" />
          )}
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${severity.bg} ${severity.text}`}>
            {severity.label}
          </span>
        </div>
      </div>

      {/* Confidence Reason */}
      {opportunity.confidenceReason && (
        <p className="text-xs text-slate-500 italic mb-3">{opportunity.confidenceReason}</p>
      )}

      <p className="text-sm text-slate-700 mb-4">{opportunity.description}</p>

      {/* Competitors Using */}
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-600">
          Used by: <span className="font-medium">{opportunity.competitorsUsing.join(', ')}</span>
        </span>
      </div>

      {/* Adaptation Suggestion */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <ArrowRight className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
              How to Adapt
            </span>
            <p className="text-sm text-slate-700 mt-1">
              {opportunity.adaptationSuggestion}
            </p>
          </div>
        </div>
      </div>

      {/* Example Ads Grid */}
      {opportunity.exampleAds && opportunity.exampleAds.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-500 mb-2 block">Reference Ads</span>
          <AdReferenceGrid ads={opportunity.exampleAds} maxVisible={4} />
        </div>
      )}
    </div>
  );
}

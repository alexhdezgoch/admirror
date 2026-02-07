'use client';

import { PlaybookContent, FormatRecommendation } from '@/types/playbook';
import { ConfidenceBadge } from '../ConfidenceBadge';
import { AdReferenceGrid } from '../AdReferenceGrid';
import { Film, Image, LayoutGrid, TrendingUp, Beaker, TrendingDown } from 'lucide-react';

interface Props {
  data: PlaybookContent['formatStrategy'];
}

const formatIcons = {
  video: Film,
  static: Image,
  carousel: LayoutGrid,
};

const actionColors = {
  scale: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: TrendingUp },
  test: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Beaker },
  reduce: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: TrendingDown },
};

export function FormatStrategy({ data }: Props) {
  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Format Strategy</h2>
        <p className="text-slate-600">{data.summary}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {data.recommendations.map((rec, index) => (
          <FormatCard key={index} recommendation={rec} />
        ))}
      </div>
    </section>
  );
}

function FormatCard({ recommendation }: { recommendation: FormatRecommendation }) {
  const FormatIcon = formatIcons[recommendation.format] || Image;
  const actionStyle = actionColors[recommendation.action];
  const ActionIcon = actionStyle.icon;

  return (
    <div className={`bg-white border ${actionStyle.border} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FormatIcon className="w-5 h-5 text-slate-600" />
          <span className="font-semibold text-slate-900 capitalize">
            {recommendation.format}
          </span>
        </div>
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${actionStyle.bg} ${actionStyle.text}`}>
          <ActionIcon className="w-3 h-3" />
          {recommendation.action}
        </span>
      </div>

      {/* Confidence Badge */}
      {recommendation.confidence && (
        <div className="mb-3">
          <ConfidenceBadge
            level={recommendation.confidence}
            reason={recommendation.confidenceReason}
            showReason
          />
        </div>
      )}

      <p className="text-sm text-slate-700 mb-4">{recommendation.rationale}</p>

      <div className="space-y-2 text-xs">
        <div className="bg-slate-50 rounded-lg p-2.5">
          <span className="font-medium text-slate-500">Your Data:</span>
          <p className="text-slate-700 mt-0.5">{recommendation.yourData}</p>
        </div>
        <div className="bg-indigo-50 rounded-lg p-2.5">
          <span className="font-medium text-indigo-600">Competitors:</span>
          <p className="text-slate-700 mt-0.5">{recommendation.competitorData}</p>
        </div>
      </div>

      {/* Example Ads Grid */}
      {recommendation.exampleAds && recommendation.exampleAds.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-500 mb-2 block">Example Ads</span>
          <AdReferenceGrid ads={recommendation.exampleAds} maxVisible={2} />
        </div>
      )}
    </div>
  );
}

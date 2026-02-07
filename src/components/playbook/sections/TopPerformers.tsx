'use client';

import { PlaybookContent, TopCompetitorAd } from '@/types/playbook';
import { Trophy, Lightbulb } from 'lucide-react';

interface Props {
  data: PlaybookContent['topPerformers'];
}

export function TopPerformers({ data }: Props) {
  if (!data.competitorAds || data.competitorAds.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" />
          Top Performers to Study
        </h2>
        <p className="text-slate-600">
          These competitor ads are worth studying for creative inspiration.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {data.competitorAds.map((ad, index) => (
          <TopAdCard key={index} ad={ad} />
        ))}
      </div>
    </section>
  );
}

function TopAdCard({ ad }: { ad: TopCompetitorAd }) {
  return (
    <div className="bg-white border border-amber-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-slate-900">{ad.competitorName}</span>
        <span className="text-xs text-slate-500 font-mono">{ad.adId.slice(0, 8)}...</span>
      </div>

      <p className="text-sm text-slate-700 mb-4">{ad.whyItWorks}</p>

      {/* Stealable Elements */}
      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
            Elements to Adapt
          </span>
        </div>
        <ul className="space-y-1">
          {ad.stealableElements.map((element, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
              {element}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

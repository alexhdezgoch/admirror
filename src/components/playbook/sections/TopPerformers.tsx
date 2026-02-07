'use client';

import { PlaybookContent, TopCompetitorAd } from '@/types/playbook';
import { Trophy, Lightbulb, Film, Image, LayoutGrid, Play } from 'lucide-react';

interface Props {
  data: PlaybookContent['topPerformers'];
}

const formatIcons = {
  video: Film,
  static: Image,
  carousel: LayoutGrid,
};

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
  const adRef = ad.adReference;
  const FormatIcon = adRef?.format ? formatIcons[adRef.format] : Image;

  return (
    <div className="bg-white border border-amber-200 rounded-xl overflow-hidden">
      {/* Ad Visual */}
      {adRef && (
        <div className="relative">
          {adRef.thumbnailUrl ? (
            <div className="aspect-video bg-slate-100 relative">
              <img
                src={adRef.thumbnailUrl}
                alt={adRef.headline || 'Ad thumbnail'}
                className="w-full h-full object-cover"
              />
              {adRef.format === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  </div>
                </div>
              )}
              {/* Format & Days Active badges */}
              <div className="absolute top-2 left-2 flex gap-1">
                <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded capitalize">
                  {adRef.format}
                </span>
                {adRef.daysActive !== undefined && (
                  <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">
                    {adRef.daysActive}d active
                  </span>
                )}
              </div>
              {/* Score badge */}
              {adRef.score !== undefined && (
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-0.5 bg-amber-500 text-white text-xs rounded font-medium">
                    Score: {adRef.score}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video bg-slate-100 flex items-center justify-center">
              <FormatIcon className="w-12 h-12 text-slate-300" />
            </div>
          )}

          {/* Hook text overlay */}
          {adRef.hookText && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <p className="text-white text-sm line-clamp-2">
                &ldquo;{adRef.hookText}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-slate-900">{ad.competitorName}</span>
          {!adRef && (
            <span className="text-xs text-slate-500 font-mono">{ad.adId.slice(0, 8)}...</span>
          )}
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
    </div>
  );
}

'use client';

import { useState } from 'react';
import { AdReference } from '@/types/playbook';
import { Film, Image, LayoutGrid, Play, ExternalLink } from 'lucide-react';

interface Props {
  ads: AdReference[];
  maxVisible?: number;
  showCompetitor?: boolean;
}

const formatIcons = {
  video: Film,
  static: Image,
  carousel: LayoutGrid,
};

export function AdReferenceGrid({ ads, maxVisible = 4, showCompetitor = true }: Props) {
  const [hoveredAd, setHoveredAd] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  if (!ads || ads.length === 0) {
    return null;
  }

  const visibleAds = showAll ? ads : ads.slice(0, maxVisible);
  const remainingCount = ads.length - maxVisible;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {visibleAds.map((ad) => {
          const FormatIcon = formatIcons[ad.format] || Image;
          const isHovered = hoveredAd === ad.id;

          return (
            <div
              key={ad.id}
              className="relative group"
              onMouseEnter={() => setHoveredAd(ad.id)}
              onMouseLeave={() => setHoveredAd(null)}
            >
              {/* Thumbnail or Placeholder */}
              <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                {ad.thumbnailUrl && !imgError[ad.id] ? (
                  <img
                    src={ad.thumbnailUrl}
                    alt={ad.headline || 'Ad thumbnail'}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(prev => ({ ...prev, [ad.id]: true }))}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FormatIcon className="w-8 h-8 text-slate-400" />
                  </div>
                )}

                {/* Video indicator */}
                {ad.format === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </div>
                )}

                {/* Format badge */}
                <div className="absolute top-1.5 left-1.5">
                  <span className="px-1.5 py-0.5 bg-black/60 text-white text-xs rounded capitalize">
                    {ad.format}
                  </span>
                </div>

                {/* Competitor badge */}
                {showCompetitor && ad.competitorName && (
                  <div className="absolute bottom-1.5 left-1.5 right-1.5">
                    <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-xs rounded truncate block">
                      {ad.competitorName}
                    </span>
                  </div>
                )}
              </div>

              {/* Hover overlay with hook text */}
              {isHovered && (ad.hookText || ad.headline) && (
                <div className="absolute inset-0 bg-slate-900/90 rounded-lg p-2 flex flex-col justify-between z-10">
                  <div className="overflow-hidden">
                    {ad.hookText && (
                      <p className="text-xs text-white line-clamp-3 mb-1">
                        &ldquo;{ad.hookText}&rdquo;
                      </p>
                    )}
                    {ad.headline && (
                      <p className="text-xs text-slate-300 line-clamp-2">
                        {ad.headline}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    {ad.daysActive !== undefined && (
                      <span>{ad.daysActive}d active</span>
                    )}
                    {ad.score !== undefined && (
                      <span>Score: {ad.score}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show more/less */}
      {remainingCount > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          +{remainingCount} more ads
        </button>
      )}
      {showAll && ads.length > maxVisible && (
        <button
          onClick={() => setShowAll(false)}
          className="text-xs text-slate-500 hover:text-slate-700 font-medium"
        >
          Show less
        </button>
      )}
    </div>
  );
}

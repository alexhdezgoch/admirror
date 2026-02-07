'use client';

import { Ad } from '@/types';
import { VelocityBadge, GradeBadge } from './VelocityBadge';
import { FormatBadge } from './FormatBadge';
import { Clock, Copy, Play, ChevronRight, Archive } from 'lucide-react';

interface AdCardProps {
  ad: Ad;
  view?: 'grid' | 'list';
  onViewDetail?: (ad: Ad) => void;
}

export function AdCard({ ad, view = 'grid', onViewDetail }: AdCardProps) {
  if (view === 'list') {
    // Only show as archived if explicitly false (not undefined/null)
    const isArchived = ad.isActive === false;
    return (
      <div
        className={`group flex items-center gap-5 p-5 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-md shadow-sm cursor-pointer ${isArchived ? 'opacity-60' : ''}`}
        onClick={() => onViewDetail?.(ad)}
      >
        {/* Thumbnail */}
        <div className="relative w-24 h-24 flex-shrink-0 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl overflow-hidden">
          {ad.thumbnail && ad.thumbnail.startsWith('http') ? (
            <img
              src={ad.thumbnail}
              alt={`${ad.competitorName} ad`}
              className={`absolute inset-0 w-full h-full object-cover ${isArchived ? 'grayscale' : ''}`}
              onError={(e) => {
                // Fallback to logo on error
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`absolute inset-0 flex items-center justify-center text-4xl ${ad.thumbnail && ad.thumbnail.startsWith('http') ? 'hidden' : ''}`}>
            {ad.competitorLogo}
          </div>
          {ad.isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-slate-900">{ad.competitorName}</span>
            {isArchived && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-slate-200 text-slate-600 rounded-full"
                title="This ad is no longer active in Meta Ads Library"
              >
                <Archive className="w-3 h-3" />
                Archived
              </span>
            )}
            <VelocityBadge velocity={ad.scoring.velocity} showSignal showTooltip />
            <GradeBadge grade={ad.scoring.grade} score={ad.scoring} />
            <FormatBadge format={ad.format} duration={ad.videoDuration} />
          </div>
          <p className="text-sm text-slate-600 line-clamp-2 mb-2">{ad.hookText}</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {ad.daysActive} days
            </span>
            <span className="flex items-center gap-1">
              <Copy className="w-3 h-3" />
              {ad.variationCount} variations
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
      </div>
    );
  }

  // Grid view (default)
  // Only show as archived if explicitly false (not undefined/null)
  const isArchived = ad.isActive === false;
  return (
    <div
      className={`group bg-white border border-slate-100 rounded-2xl overflow-hidden hover:border-slate-200 hover:shadow-lg shadow-sm cursor-pointer ${isArchived ? 'opacity-60' : ''}`}
      onClick={() => onViewDetail?.(ad)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/5] bg-gradient-to-br from-slate-50 to-slate-100">
        {ad.thumbnail && ad.thumbnail.startsWith('http') ? (
          <img
            src={ad.thumbnail}
            alt={`${ad.competitorName} ad`}
            className={`absolute inset-0 w-full h-full object-cover ${isArchived ? 'grayscale' : ''}`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`absolute inset-0 flex items-center justify-center text-6xl ${ad.thumbnail && ad.thumbnail.startsWith('http') ? 'hidden' : ''}`}>
          {ad.competitorLogo}
        </div>
        {ad.isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-6 h-6 text-slate-900 fill-slate-900 ml-1" />
            </div>
          </div>
        )}

        {/* Archived overlay */}
        {isArchived && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <span
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-slate-800/80 text-white rounded-full backdrop-blur-sm"
              title="This ad is no longer active in Meta Ads Library"
            >
              <Archive className="w-4 h-4" />
              Archived
            </span>
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <div className="flex items-center gap-1">
            <VelocityBadge velocity={ad.scoring.velocity} showSignal showTooltip />
            <GradeBadge grade={ad.scoring.grade} score={ad.scoring} />
          </div>
        </div>

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center gap-2">
            <FormatBadge format={ad.format} duration={ad.videoDuration} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-lg">{ad.competitorLogo}</span>
          <span className="font-medium text-slate-900">{ad.competitorName}</span>
        </div>

        <p className="text-sm text-slate-600 line-clamp-2 mb-4 min-h-[40px] leading-relaxed">
          {ad.hookText}
        </p>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {ad.daysActive}d active
          </span>
          <span className="flex items-center gap-1.5">
            <Copy className="w-3 h-3" />
            {ad.variationCount} vars
          </span>
        </div>
      </div>
    </div>
  );
}

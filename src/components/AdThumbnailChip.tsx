'use client';

import { Image as ImageIcon } from 'lucide-react';

interface AdThumbnailChipProps {
  ad: {
    id: string;
    name: string;
    thumbnailUrl?: string;
    imageUrl?: string;
    roas?: number;
  };
  onClick?: () => void;
  showRoas?: boolean;
  size?: 'sm' | 'md';
}

export function AdThumbnailChip({
  ad,
  onClick,
  showRoas = false,
  size = 'sm',
}: AdThumbnailChipProps) {
  const thumbnailSize = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const maxNameWidth = size === 'sm' ? 'max-w-[100px]' : 'max-w-[140px]';

  const thumbnailUrl = ad.thumbnailUrl || ad.imageUrl;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      {/* Thumbnail */}
      <div className={`${thumbnailSize} rounded bg-slate-200 overflow-hidden shrink-0`}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div
          className={`w-full h-full flex items-center justify-center ${
            thumbnailUrl ? 'hidden' : ''
          }`}
        >
          <ImageIcon className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Name */}
      <span className={`${textSize} text-slate-700 truncate ${maxNameWidth}`}>
        {ad.name || 'Untitled'}
      </span>

      {/* ROAS badge */}
      {showRoas && ad.roas !== undefined && ad.roas > 0 && (
        <span
          className={`${textSize} font-medium px-1.5 py-0.5 rounded ${
            ad.roas >= 2
              ? 'bg-green-100 text-green-700'
              : ad.roas >= 1
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {ad.roas.toFixed(1)}x
        </span>
      )}
    </button>
  );
}

// Compact version for pattern cards - just thumbnail with tooltip
interface AdThumbnailMiniProps {
  ad: {
    id: string;
    name: string;
    thumbnailUrl?: string;
    imageUrl?: string;
  };
  onClick?: () => void;
}

export function AdThumbnailMini({ ad, onClick }: AdThumbnailMiniProps) {
  const thumbnailUrl = ad.thumbnailUrl || ad.imageUrl;

  return (
    <button
      onClick={onClick}
      title={ad.name || 'Untitled'}
      className="w-8 h-8 rounded bg-slate-200 overflow-hidden shrink-0 hover:ring-2 hover:ring-indigo-300 transition-all cursor-pointer"
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <div
        className={`w-full h-full flex items-center justify-center ${
          thumbnailUrl ? 'hidden' : ''
        }`}
      >
        <ImageIcon className="w-3 h-3 text-slate-400" />
      </div>
    </button>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { ads } from '@/data/mockData';
import { Ad } from '@/types';
import { AdCard } from '@/components/AdCard';
import { AdDetailModal } from '@/components/AdDetailModal';
import { Bookmark, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function SwipeFilePage() {
  const [adsState, setAdsState] = useState(ads);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);

  // Get swipe file ads
  const swipeFileAds = useMemo(() => {
    return adsState.filter(ad => ad.inSwipeFile);
  }, [adsState]);

  const toggleSwipeFile = (ad: Ad) => {
    setAdsState(prev =>
      prev.map(a =>
        a.id === ad.id ? { ...a, inSwipeFile: !a.inSwipeFile } : a
      )
    );
    if (selectedAd?.id === ad.id) {
      setSelectedAd(prev => prev ? { ...prev, inSwipeFile: !prev.inSwipeFile } : null);
    }
  };

  const clearSwipeFile = () => {
    setAdsState(prev =>
      prev.map(a => ({ ...a, inSwipeFile: false }))
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/gallery"
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Bookmark className="w-6 h-6 text-indigo-600" />
              Swipe File
            </h1>
            <p className="text-slate-600">
              Your curated collection of ads to reference and adapt.
            </p>
          </div>
        </div>

        {swipeFileAds.length > 0 && (
          <button
            onClick={clearSwipeFile}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Stats */}
      {swipeFileAds.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-2xl font-semibold text-slate-900">{swipeFileAds.length}</div>
            <div className="text-sm text-slate-500">Saved Ads</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-2xl font-semibold text-slate-900">
              {new Set(swipeFileAds.map(a => a.competitorId)).size}
            </div>
            <div className="text-sm text-slate-500">Brands</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-2xl font-semibold text-slate-900">
              {swipeFileAds.filter(a => a.scoring.velocity.tier === 'scaling').length}
            </div>
            <div className="text-sm text-slate-500">Scaling Ads</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-2xl font-semibold text-slate-900">
              {swipeFileAds.filter(a => a.format === 'video').length}
            </div>
            <div className="text-sm text-slate-500">Videos</div>
          </div>
        </div>
      )}

      {/* Content */}
      {swipeFileAds.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {swipeFileAds.map(ad => (
            <AdCard
              key={ad.id}
              ad={ad}
              view="grid"
              onViewDetail={setSelectedAd}
              onToggleSwipeFile={toggleSwipeFile}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Your swipe file is empty</h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Browse the Ad Gallery and click the bookmark icon on any ad to save it to your swipe file for later reference.
          </p>
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Browse Ad Gallery
          </Link>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          onClose={() => setSelectedAd(null)}
          onToggleSwipeFile={toggleSwipeFile}
        />
      )}
    </div>
  );
}

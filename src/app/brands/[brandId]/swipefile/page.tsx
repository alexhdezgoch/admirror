'use client';

import { useState, useMemo } from 'react';
import { useBrandContext, useCurrentBrand } from '@/context/BrandContext';
import { Ad } from '@/types';
import { AdCard } from '@/components/AdCard';
import { AdDetailModal } from '@/components/AdDetailModal';
import { Bookmark, ArrowLeft, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: { brandId: string };
}

export default function BrandSwipeFilePage({ params }: Props) {
  const { brandId } = params;
  const brand = useCurrentBrand(brandId);
  const { getAdsForBrand, toggleSwipeFile, allAds } = useBrandContext();

  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // Get ads for this brand
  const brandAds = useMemo(() => getAdsForBrand(brandId), [brandId, getAdsForBrand, allAds]);

  // Get swipe file ads
  const swipeFileAds = useMemo(() => {
    return brandAds.filter(ad => ad.inSwipeFile);
  }, [brandAds]);

  const handleToggleSwipeFile = (ad: Ad) => {
    toggleSwipeFile(ad.id);
    if (selectedAd?.id === ad.id) {
      setSelectedAd(prev => prev ? { ...prev, inSwipeFile: !prev.inSwipeFile } : null);
    }
  };

  const clearSwipeFile = async () => {
    if (isClearing) return;
    setIsClearing(true);
    try {
      // Remove each ad from swipe file
      for (const ad of swipeFileAds) {
        await toggleSwipeFile(ad.id);
      }
    } finally {
      setIsClearing(false);
    }
  };

  // Show error if brand not found
  if (!brand) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Brand not found</h1>
        <p className="text-slate-600 mb-4">The brand you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href={`/brands/${brandId}/gallery`}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="text-2xl">{brand.logo}</span>
              <Bookmark className="w-6 h-6 text-indigo-600" />
              Swipe File
            </h1>
            <p className="text-slate-600">
              Your curated collection of competitor ads for {brand.name}.
            </p>
          </div>
        </div>

        {swipeFileAds.length > 0 && (
          <button
            onClick={clearSwipeFile}
            disabled={isClearing}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {isClearing ? 'Clearing...' : 'Clear All'}
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
            <div className="text-sm text-slate-500">Competitors</div>
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
              onToggleSwipeFile={handleToggleSwipeFile}
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
            href={`/brands/${brandId}/gallery`}
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
          onToggleSwipeFile={handleToggleSwipeFile}
        />
      )}
    </div>
  );
}

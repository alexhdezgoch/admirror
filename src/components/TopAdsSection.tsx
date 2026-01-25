'use client';

import { useState, useEffect, useMemo } from 'react';
import { useBrandContext, AdWithAnalysis } from '@/context/BrandContext';
import { Ad } from '@/types';
import { VelocityBadge, GradeBadge } from './VelocityBadge';
import { AdDetailModal } from './AdDetailModal';
import {
  Trophy,
  CheckCircle,
  Clock,
  ChevronRight,
  Play,
  Sparkles,
  Users
} from 'lucide-react';
import Link from 'next/link';

interface TopAdsSectionProps {
  brandId: string;
}

export function TopAdsSection({ brandId }: TopAdsSectionProps) {
  const { getAnalyzedAds, allAds, getAdsForBrand } = useBrandContext();
  const [analyzedAds, setAnalyzedAds] = useState<AdWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);

  // Get all ads for this brand (to show total count)
  const brandAds = useMemo(() => getAdsForBrand(brandId), [brandId, getAdsForBrand, allAds]);

  // Fetch analyzed ads
  useEffect(() => {
    const fetchAds = async () => {
      setLoading(true);
      const ads = await getAnalyzedAds(brandId);
      setAnalyzedAds(ads);
      setLoading(false);
    };
    fetchAds();
  }, [brandId, getAnalyzedAds]);

  // Get top 10 overall ads by score
  const topOverallAds = useMemo(() => {
    return [...analyzedAds]
      .sort((a, b) => (b.scoring?.final || 0) - (a.scoring?.final || 0))
      .slice(0, 10);
  }, [analyzedAds]);

  // Get top ad per competitor
  const topPerCompetitor = useMemo(() => {
    const competitorMap = new Map<string, AdWithAnalysis>();

    // Sort by score first
    const sortedAds = [...analyzedAds].sort((a, b) =>
      (b.scoring?.final || 0) - (a.scoring?.final || 0)
    );

    // Take top ad per competitor
    sortedAds.forEach(ad => {
      if (!competitorMap.has(ad.competitorId)) {
        competitorMap.set(ad.competitorId, ad);
      }
    });

    // Convert to array and sort by score
    return Array.from(competitorMap.values())
      .sort((a, b) => (b.scoring?.final || 0) - (a.scoring?.final || 0));
  }, [analyzedAds]);

  // Count analyzed ads
  const analyzedCount = useMemo(() => {
    return analyzedAds.filter(ad => ad.analysis).length;
  }, [analyzedAds]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-slate-600">Loading top ads...</span>
        </div>
      </div>
    );
  }

  if (brandAds.length === 0) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-8 text-center">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-6 h-6 text-amber-600" />
        </div>
        <h3 className="font-semibold text-slate-900 mb-2">No ads synced yet</h3>
        <p className="text-sm text-slate-600 mb-4">
          Add competitors and sync their ads to see top performers with AI analysis.
        </p>
        <Link
          href={`/brands/${brandId}/competitors`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Users className="w-4 h-4" />
          Add Competitors
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Top Performing Ads</h2>
            <p className="text-sm text-slate-500">
              Based on {brandAds.length} synced ads • {analyzedCount} analyzed
            </p>
          </div>
        </div>
        <Link
          href={`/brands/${brandId}/gallery`}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
        >
          View all ads
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Top 10 Overall */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="font-medium text-slate-900">Top 10 Overall</h3>
            <span className="text-xs text-slate-500">Highest scored ads across all competitors</span>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {topOverallAds.map((ad, index) => (
              <TopAdCard
                key={ad.id}
                ad={ad}
                rank={index + 1}
                isAnalyzed={!!ad.analysis}
                onViewDetail={setSelectedAd}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Top Ad Per Competitor */}
      {topPerCompetitor.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <h3 className="font-medium text-slate-900">Top Ad Per Competitor</h3>
              <span className="text-xs text-slate-500">Best performer from each competitor</span>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topPerCompetitor.map((ad) => (
                <CompetitorTopAdCard
                  key={ad.id}
                  ad={ad}
                  isAnalyzed={!!ad.analysis}
                  onViewDetail={setSelectedAd}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          onClose={() => setSelectedAd(null)}
        />
      )}
    </div>
  );
}

// Top Ad Card component (compact grid view)
interface TopAdCardProps {
  ad: AdWithAnalysis;
  rank: number;
  isAnalyzed: boolean;
  onViewDetail: (ad: Ad) => void;
}

function TopAdCard({ ad, rank, isAnalyzed, onViewDetail }: TopAdCardProps) {
  return (
    <div
      className="group bg-slate-50 border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => onViewDetail(ad)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200">
        {ad.thumbnail && ad.thumbnail.startsWith('http') ? (
          <img
            src={ad.thumbnail}
            alt={`${ad.competitorName} ad`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`absolute inset-0 flex items-center justify-center text-3xl ${ad.thumbnail && ad.thumbnail.startsWith('http') ? 'hidden' : ''}`}>
          {ad.competitorLogo}
        </div>

        {ad.isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        )}

        {/* Rank badge */}
        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center">
          <span className={`text-xs font-bold ${rank <= 3 ? 'text-amber-600' : 'text-slate-600'}`}>
            {rank}
          </span>
        </div>

        {/* Analyzed badge */}
        <div className="absolute top-2 right-2">
          {isAnalyzed ? (
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center" title="AI Analyzed">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center" title="Analysis Pending">
              <Clock className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

      </div>

      {/* Content */}
      <div className="p-2">
        <div className="flex items-center gap-1 mb-1">
          <VelocityBadge velocity={ad.scoring.velocity} size="sm" showSignal />
          <GradeBadge grade={ad.scoring.grade} score={ad.scoring} size="sm" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600 truncate">{ad.competitorName}</span>
          <span className="text-xs font-semibold text-slate-900">{ad.scoring.final}</span>
        </div>
      </div>
    </div>
  );
}

// Competitor Top Ad Card (larger, horizontal)
interface CompetitorTopAdCardProps {
  ad: AdWithAnalysis;
  isAnalyzed: boolean;
  onViewDetail: (ad: Ad) => void;
}

function CompetitorTopAdCard({ ad, isAnalyzed, onViewDetail }: CompetitorTopAdCardProps) {
  return (
    <div
      className="group flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => onViewDetail(ad)}
    >
      {/* Thumbnail */}
      <div className="relative w-16 h-16 flex-shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-hidden">
        {ad.thumbnail && ad.thumbnail.startsWith('http') ? (
          <img
            src={ad.thumbnail}
            alt={`${ad.competitorName} ad`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`absolute inset-0 flex items-center justify-center text-2xl ${ad.thumbnail && ad.thumbnail.startsWith('http') ? 'hidden' : ''}`}>
          {ad.competitorLogo}
        </div>
        {ad.isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Play className="w-4 h-4 text-white fill-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{ad.competitorLogo}</span>
          <span className="font-medium text-slate-900 truncate">{ad.competitorName}</span>
        </div>
        <div className="flex items-center gap-2">
          <VelocityBadge velocity={ad.scoring.velocity} size="sm" showSignal />
          <GradeBadge grade={ad.scoring.grade} score={ad.scoring} size="sm" />
          {isAnalyzed ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">
              <Sparkles className="w-3 h-3" />
              Analyzed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-500">
              <Clock className="w-3 h-3" />
              Pending
            </span>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="text-right">
        <div className="text-lg font-bold text-slate-900">{ad.scoring.final}</div>
        <div className="text-xs text-slate-500">score</div>
      </div>
    </div>
  );
}

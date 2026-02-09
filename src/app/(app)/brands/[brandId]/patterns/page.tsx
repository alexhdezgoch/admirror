'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCurrentBrand } from '@/context/BrandContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MetaConnectionStatus } from '@/components/MetaConnectionStatus';
import { DataQualityBanner } from '@/components/DataQualityBanner';
import { AdThumbnailMini } from '@/components/AdThumbnailChip';
import { ClientAdDetailModal } from '@/components/ClientAdDetailModal';
import { WoWChange } from '@/components/TrendIndicator';
import { MyPatternAnalysis, Pattern, Recommendation, TestIdea, PatternAdDetail } from '@/types/meta';
import { ClientAd } from '@/types';
import {
  AlertCircle,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Zap,
  XCircle,
  Beaker,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: { brandId: string };
}

export default function PatternsPage({ params }: Props) {
  const { brandId } = params;
  const brand = useCurrentBrand(brandId);

  const [metaConnected, setMetaConnected] = useState(false);
  const [analysis, setAnalysis] = useState<MyPatternAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [selectedAd, setSelectedAd] = useState<PatternAdDetail | null>(null);

  const checkMetaStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/meta/status?brandId=${brandId}`);
      const data = await res.json();
      setMetaConnected(data.connected && !!data.adAccountId);
    } catch {
      // Ignore
    }
  }, [brandId]);

  const fetchAnalysis = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/analyze/my-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, forceRefresh }),
      });

      const data = await res.json();

      if (data.success) {
        setAnalysis(data.analysis);
        setCached(data.cached || false);
      } else {
        setError(data.error || 'Failed to analyze patterns');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    checkMetaStatus();
  }, [checkMetaStatus]);

  useEffect(() => {
    if (metaConnected) {
      fetchAnalysis();
    }
  }, [metaConnected, fetchAnalysis]);

  if (!brand) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Brand not found</h1>
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
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Lightbulb className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-slate-900">What&apos;s Working</h1>
          </div>
          <p className="text-slate-500">
            AI-powered pattern analysis based on your ad performance
            {analysis && (
              <span className="text-slate-400 ml-2">
                ({analysis.adsAnalyzed} ads analyzed)
              </span>
            )}
          </p>
        </div>

        {metaConnected && !loading && (
          <button
            onClick={() => fetchAnalysis(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Analysis
          </button>
        )}
      </div>

      {/* Cached indicator */}
      {cached && analysis && (
        <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Using cached analysis from{' '}
          {new Date(analysis.analyzedAt).toLocaleDateString()}. Click refresh for new insights.
        </div>
      )}

      {/* Meta Connection Status - Show if not connected */}
      {!metaConnected && (
        <div className="mb-8">
          <MetaConnectionStatus brandId={brandId} showSyncButton={false} />
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <p className="text-slate-600">
              Connect your Meta Ads account and sync your ads to see pattern analysis.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="Analyzing your ad patterns with AI..." />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-900 mb-2">Analysis Error</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => fetchAnalysis(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !loading && !error && (
        <div className="space-y-8">
          {/* Data Quality Banner */}
          {analysis.dataQuality && !analysis.dataQuality.isReliable && (
            <DataQualityBanner
              daysOfData={analysis.dataQuality.daysOfData}
              adsAnalyzed={analysis.dataQuality.adsAnalyzed}
            />
          )}

          {/* Summary */}
          {analysis.summary && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                <div>
                  <h2 className="font-semibold text-slate-900 mb-1">Key Insights</h2>
                  <p className="text-slate-700">{analysis.summary}</p>
                </div>
              </div>
            </div>
          )}

          {/* Two Column Layout: Winning & Losing Patterns */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Winning Patterns */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Winning Patterns
              </h2>
              {analysis.winningPatterns.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500">
                  Not enough data to identify winning patterns yet
                </div>
              ) : (
                <div className="space-y-4">
                  {analysis.winningPatterns.map((pattern, index) => (
                    <PatternCard
                      key={index}
                      pattern={pattern}
                      type="winning"
                      accountAvgRoas={analysis.accountAvgRoas}
                      onAdClick={setSelectedAd}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Losing Patterns */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                Avoid These
              </h2>
              {analysis.losingPatterns.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500">
                  Not enough data to identify losing patterns yet
                </div>
              ) : (
                <div className="space-y-4">
                  {analysis.losingPatterns.map((pattern, index) => (
                    <PatternCard
                      key={index}
                      pattern={pattern}
                      type="losing"
                      accountAvgRoas={analysis.accountAvgRoas}
                      onAdClick={setSelectedAd}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Double Down Recommendations */}
          {analysis.doubleDown.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Double Down
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.doubleDown.map((rec, index) => (
                  <RecommendationCard key={index} recommendation={rec} />
                ))}
              </div>
            </section>
          )}

          {/* Stop Doing */}
          {analysis.stopDoing.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                Stop Doing
              </h2>
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <ul className="space-y-3">
                  {analysis.stopDoing.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Test Next */}
          {analysis.testNext.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Beaker className="w-5 h-5 text-blue-500" />
                Test Next
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {analysis.testNext.map((idea, index) => (
                  <TestIdeaCard key={index} idea={idea} />
                ))}
              </div>
            </section>
          )}

          {/* Quick Link to Performance */}
          <section>
            <Link
              href={`/brands/${brandId}/performance`}
              className="flex items-center justify-between p-6 bg-slate-50 border border-slate-200 rounded-xl hover:shadow-md transition-shadow group"
            >
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  View Full Performance Data
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  See detailed metrics, spend breakdowns, and top performers
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </section>
        </div>
      )}

      {/* Ad Detail Modal */}
      {selectedAd && (
        <ClientAdDetailModal
          ad={convertPatternAdToClientAd(selectedAd)}
          onClose={() => setSelectedAd(null)}
          accountAvgRoas={analysis?.accountAvgRoas}
        />
      )}
    </div>
  );
}

// Helper to convert PatternAdDetail to minimal ClientAd for modal
function convertPatternAdToClientAd(ad: PatternAdDetail): ClientAd {
  return {
    id: ad.id,
    clientBrandId: '',
    metaAdId: ad.id,
    name: ad.name,
    status: 'ACTIVE',
    effectiveStatus: 'ACTIVE',
    thumbnailUrl: ad.thumbnailUrl,
    impressions: 0,
    clicks: 0,
    spend: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
    conversions: 0,
    revenue: 0,
    roas: ad.roas,
    cpa: 0,
    syncedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Pattern Card Component
function PatternCard({
  pattern,
  type,
  accountAvgRoas,
  onAdClick,
}: {
  pattern: Pattern;
  type: 'winning' | 'losing';
  accountAvgRoas?: number;
  onAdClick?: (ad: PatternAdDetail) => void;
}) {
  const isWinning = type === 'winning';

  // Calculate comparison to account average
  const roasComparison =
    accountAvgRoas && accountAvgRoas > 0 && pattern.avgRoas > 0
      ? pattern.avgRoas - accountAvgRoas
      : null;

  // Don't show 0.0x ROAS - show dash instead
  const displayRoas = pattern.avgRoas > 0 ? `${pattern.avgRoas.toFixed(1)}x` : '—';

  return (
    <div
      className={`bg-white border rounded-xl p-5 ${
        isWinning ? 'border-green-200' : 'border-red-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isWinning ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <h3 className="font-semibold text-slate-900">{pattern.name}</h3>
        </div>
        <div className="text-right">
          <div
            className={`text-sm font-bold ${
              isWinning ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {displayRoas}
          </div>
          {roasComparison !== null && pattern.avgRoas > 0 && (
            <div className={`text-xs ${roasComparison >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {roasComparison >= 0 ? '+' : ''}{roasComparison.toFixed(1)}x vs avg
            </div>
          )}
          {roasComparison === null && pattern.avgRoas > 0 && (
            <div className="text-xs text-slate-500">avg ROAS</div>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-3">{pattern.description}</p>

      {/* Creative Attributes */}
      {pattern.creativeAttributes && pattern.creativeAttributes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {pattern.creativeAttributes.map((attr, i) => (
            <span
              key={i}
              className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
            >
              {attr}
            </span>
          ))}
        </div>
      )}

      {/* Competitor Insight */}
      {pattern.competitorInsight && (
        <div className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 px-2 py-1.5 rounded mb-3">
          <Users className="w-3 h-3" />
          {pattern.competitorInsight}
        </div>
      )}

      {/* Ad Thumbnails */}
      {pattern.exampleAds && pattern.exampleAds.length > 0 && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
          {pattern.exampleAds.slice(0, 4).map((ad) => (
            <AdThumbnailMini
              key={ad.id}
              ad={ad}
              onClick={() => onAdClick?.(ad)}
            />
          ))}
          {pattern.exampleAds.length > 4 && (
            <span className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs text-slate-500 font-medium">
              +{pattern.exampleAds.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-slate-500 mt-3">
        <span>{pattern.adCount} ads</span>
        <span>${pattern.avgSpend.toFixed(0)} avg spend</span>
        {pattern.wowChange !== undefined && pattern.wowChange !== 0 && (
          <WoWChange change={pattern.wowChange} size="sm" />
        )}
      </div>
    </div>
  );
}

// Recommendation Card Component
function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const priorityColors = {
    high: 'bg-amber-100 text-amber-700',
    medium: 'bg-blue-100 text-blue-700',
    low: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="bg-white border border-amber-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-slate-900">{recommendation.title}</h3>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            priorityColors[recommendation.priority]
          }`}
        >
          {recommendation.priority}
        </span>
      </div>

      <p className="text-sm text-slate-600 mb-3">{recommendation.description}</p>

      {recommendation.expectedLift && (
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span className="text-green-700 font-medium">{recommendation.expectedLift}</span>
        </div>
      )}
    </div>
  );
}

// Test Idea Card Component
function TestIdeaCard({ idea }: { idea: TestIdea }) {
  return (
    <div className="bg-white border border-blue-200 rounded-xl p-5">
      <div className="flex items-start gap-3 mb-3">
        <Beaker className="w-5 h-5 text-blue-500 shrink-0" />
        <h3 className="font-semibold text-slate-900">{idea.title}</h3>
      </div>

      <p className="text-sm text-slate-600 mb-3">{idea.description}</p>

      <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
        <span className="font-medium">Based on:</span> {idea.basis}
      </div>
    </div>
  );
}

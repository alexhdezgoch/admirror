'use client';

import { useState, useMemo } from 'react';
import { useBrandContext } from '@/context/BrandContext';
import {
  detectCreativePatterns,
  generateRecommendations,
  generateABTests,
} from '@/lib/analytics';
import { EffortBadge } from '@/components/EffortBadge';
import { TrendIndicator } from '@/components/TrendIndicator';
import { GradeBadge } from '@/components/VelocityBadge';
import {
  Zap,
  Target,
  FlaskConical,
  Bookmark,
  ArrowRight,
  Lightbulb,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Users,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function PlaybookPage() {
  const { allAds, clientBrands } = useBrandContext();
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generate real insights from all ads
  const creativePatterns = useMemo(() => detectCreativePatterns(allAds), [allAds]);
  const recommendations = useMemo(() => generateRecommendations(allAds), [allAds]);
  const abTests = useMemo(() => generateABTests(allAds), [allAds]);

  const quickWins = recommendations.filter(r => r.category === 'quick_win');
  const patterns = creativePatterns.filter(p => p.trend !== 'declining').slice(0, 4);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Get swipe file ads from all brands
  const swipeFileAds = allAds.filter(ad => ad.inSwipeFile).slice(0, 6);

  // Empty state when no ads synced
  if (allAds.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Strategic Playbook</h1>
          <p className="text-slate-600">
            Data-driven recommendations on what to create next. Each insight is backed by evidence from your competitive analysis.
          </p>
        </div>

        {/* Empty State */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">No competitor ads synced yet</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Create a brand, add competitors, and sync their ads to get personalized recommendations, pattern detection, and A/B test suggestions.
          </p>
          {clientBrands.length > 0 ? (
            <Link
              href={`/brands/${clientBrands[0].id}/competitors`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <Users className="w-4 h-4" />
              Add Competitors
            </Link>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Create a Brand
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Minimal data state (less than 5 ads)
  const hasMinimalData = allAds.length < 5;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Strategic Playbook</h1>
        <p className="text-slate-600">
          Data-driven recommendations on what to create next.
          <span className="text-green-600 font-medium ml-1">Based on {allAds.length} real ads across {clientBrands.length} brands.</span>
        </p>
      </div>

      {/* Minimal Data Warning */}
      {hasMinimalData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
          <div>
            <p className="text-amber-800 font-medium">Limited data available</p>
            <p className="text-amber-600 text-sm mt-1">
              Sync more competitor ads for better recommendations. Currently analyzing {allAds.length} ads.
            </p>
          </div>
        </div>
      )}

      {/* Quick Wins Section */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Quick Wins</h2>
            <p className="text-sm text-slate-500">High-impact opportunities you can execute this week</p>
          </div>
        </div>

        {quickWins.length > 0 ? (
          <div className="grid gap-4">
            {quickWins.map((rec, index) => (
              <div
                key={rec.id}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-semibold">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="font-semibold text-slate-900">{rec.title}</h3>
                      <EffortBadge effort={rec.effort} />
                    </div>
                    <p className="text-slate-600 mb-4">{rec.description}</p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-green-700">Why this works</span>
                          <p className="text-sm text-green-800 mt-1">{rec.proof}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-8 text-center">
            <Zap className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">No quick wins detected yet</p>
            <p className="text-sm text-slate-400">
              Sync more competitor ads to generate personalized recommendations.
            </p>
          </div>
        )}
      </section>

      {/* Top Patterns Section */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Top Patterns to Test</h2>
            <p className="text-sm text-slate-500">Creative patterns showing up across multiple top performers</p>
          </div>
        </div>

        {patterns.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {patterns.map(pattern => (
              <div
                key={pattern.name}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">{pattern.name}</h3>
                  <TrendIndicator trend={pattern.trend} />
                </div>
                <p className="text-sm text-slate-600 mb-4">{pattern.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${pattern.adoptionRate}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{pattern.adoptionRate}% adoption</span>
                  </div>
                  <div className="flex -space-x-2">
                    {pattern.exampleAds.slice(0, 3).map((adId) => {
                      const ad = allAds.find(a => a.id === adId);
                      return ad ? (
                        <div
                          key={adId}
                          className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-sm"
                          title={ad.competitorName}
                        >
                          {ad.competitorLogo}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-8 text-center">
            <Target className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">No patterns detected yet</p>
            <p className="text-sm text-slate-400">
              Sync more competitor ads to identify creative patterns.
            </p>
          </div>
        )}
      </section>

      {/* A/B Testing Roadmap */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">A/B Testing Roadmap</h2>
            <p className="text-sm text-slate-500">Structured tests with hypotheses backed by competitive data</p>
          </div>
        </div>

        {abTests.length > 0 ? (
          <div className="space-y-4">
            {abTests.map((test, index) => (
              <div
                key={test.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-amber-600 font-semibold">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 line-clamp-1">Test #{index + 1}</h3>
                      <p className="text-sm text-slate-500 line-clamp-1">{test.hypothesis.substring(0, 80)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <EffortBadge effort={test.effort} />
                    {expandedTest === test.id ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {expandedTest === test.id && (
                  <div className="px-6 pb-6 border-t border-slate-100">
                    <div className="pt-4 space-y-4">
                      {/* Hypothesis */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-xs font-medium text-amber-700">Hypothesis</span>
                              <p className="text-sm text-amber-900 mt-1">{test.hypothesis}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard(test.hypothesis, test.id + '-hyp')}
                            className="p-1 text-amber-600 hover:bg-amber-100 rounded transition-colors"
                          >
                            {copiedId === test.id + '-hyp' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Control vs Variant */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4">
                          <span className="text-xs font-medium text-slate-500 uppercase">Control</span>
                          <p className="text-sm text-slate-700 mt-1">{test.control}</p>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-4">
                          <span className="text-xs font-medium text-indigo-600 uppercase">Variant</span>
                          <p className="text-sm text-slate-700 mt-1">{test.variant}</p>
                        </div>
                      </div>

                      {/* Evidence */}
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Evidence: {test.evidence}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-8 text-center">
            <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">No A/B tests suggested yet</p>
            <p className="text-sm text-slate-400">
              Sync more competitor ads to generate test hypotheses.
            </p>
          </div>
        )}
      </section>

      {/* Swipe File Summary */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Swipe File Summary</h2>
              <p className="text-sm text-slate-500">Curated &ldquo;steal these&rdquo; ads with adaptation notes</p>
            </div>
          </div>
          <Link
            href="/swipefile"
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {swipeFileAds.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {swipeFileAds.map(ad => (
              <div
                key={ad.id}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                    {ad.competitorLogo}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900">{ad.competitorName}</h4>
                      <GradeBadge grade={ad.scoring?.grade || 'B'} />
                    </div>
                    <p className="text-xs text-slate-500 truncate">{ad.format} · {ad.scoring?.velocity?.label || 'Standard'} · {ad.daysActive}d</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 mb-3">{ad.hookText}</p>
                <div className="bg-purple-50 rounded-lg p-3">
                  <span className="text-xs font-medium text-purple-700">Steal this:</span>
                  <p className="text-xs text-purple-800 mt-1">
                    Adapt the {ad.hookType?.replace('_', ' ') || 'statement'} hook for your brand. Test with {ad.format} format.
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-8 text-center">
            <Bookmark className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">Your swipe file is empty</p>
            <p className="text-sm text-slate-400">
              Browse the Ad Gallery and bookmark ads you want to reference later.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { useBrandContext } from '@/context/BrandContext';
import {
  calculateFormatDistribution,
  calculateVelocityDistribution,
  calculateSignalDistribution,
  calculateGradeDistribution,
  calculateHookTypeDistribution,
  extractHookLibrary,
  detectTrendPatterns,
} from '@/lib/analytics';
import { TrendIndicator } from '@/components/TrendIndicator';
import { AdDetailModal } from '@/components/AdDetailModal';
import { HookType, Competitor, Ad } from '@/types';
import {
  TrendingUp,
  PieChart,
  Activity,
  MessageSquare,
  ChevronRight,
  BarChart3,
  Award,
  Users
} from 'lucide-react';
import Link from 'next/link';

export default function TrendsPage() {
  const { allAds, clientBrands } = useBrandContext();
  const [selectedHookType, setSelectedHookType] = useState<HookType | 'all'>('all');
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);

  // Calculate real distributions from all ads
  const formatDistribution = useMemo(() => calculateFormatDistribution(allAds), [allAds]);
  const velocityDistribution = useMemo(() => calculateVelocityDistribution(allAds), [allAds]);
  const signalDistribution = useMemo(() => calculateSignalDistribution(allAds), [allAds]);
  const gradeDistribution = useMemo(() => calculateGradeDistribution(allAds), [allAds]);
  const hookTypeDistribution = useMemo(() => calculateHookTypeDistribution(allAds), [allAds]);
  const hookLibrary = useMemo(() => extractHookLibrary(allAds), [allAds]);
  const trendCards = useMemo(() => detectTrendPatterns(allAds), [allAds]);

  // Get all competitors across all brands
  const allCompetitors: Competitor[] = useMemo(() => {
    const competitors: Competitor[] = [];
    clientBrands.forEach(brand => {
      if (brand.competitors) {
        competitors.push(...brand.competitors);
      }
    });
    return competitors;
  }, [clientBrands]);

  // Filter hooks by type
  const filteredHooks = selectedHookType === 'all'
    ? hookLibrary
    : hookLibrary.filter(h => h.type === selectedHookType);

  // Calculate hook type labels
  const hookTypeLabels: Record<HookType, string> = {
    question: 'Question',
    statement: 'Statement',
    social_proof: 'Social Proof',
    urgency: 'Urgency'
  };

  // Empty state when no ads synced
  if (allAds.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Trends Dashboard</h1>
          <p className="text-slate-600">
            Bird&apos;s-eye view of what&apos;s happening in the competitive landscape.
          </p>
        </div>

        {/* Empty State */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">No competitor ads synced yet</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Create a brand, add competitors, and sync their ads to see real trends, format distributions, hook patterns, and more.
          </p>
          {clientBrands.length > 0 ? (
            <Link
              href={`/brands/${clientBrands[0].id}/competitors`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Users className="w-4 h-4" />
              Add Competitors
            </Link>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create a Brand
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Trends Dashboard</h1>
        <p className="text-slate-600">
          Bird&apos;s-eye view of what&apos;s happening in the competitive landscape.
          <span className="text-indigo-600 font-medium ml-1">Aggregated from {allAds.length} real ads across {clientBrands.length} brands.</span>
        </p>
      </div>

      {/* Trend Cards */}
      {trendCards.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Emerging Patterns</h2>
              <p className="text-sm text-slate-500">Trends detected across the competitive set</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendCards.map(trend => (
              <div
                key={trend.id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">{trend.patternName}</h3>
                  <TrendIndicator trend={trend.trend} />
                </div>
                <p className="text-sm text-slate-600 mb-4">{trend.description}</p>

                {/* Adoption bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">Adoption rate</span>
                    <span className="font-medium text-slate-700">{trend.adoptionRate}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        trend.trend === 'rising' ? 'bg-green-500' :
                        trend.trend === 'stable' ? 'bg-indigo-500' : 'bg-red-400'
                      }`}
                      style={{ width: `${trend.adoptionRate}%` }}
                    />
                  </div>
                </div>

                {/* Example thumbnails */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Examples:</span>
                  <div className="flex -space-x-2">
                    {trend.exampleAds.slice(0, 4).map((adId) => {
                      const ad = allAds.find(a => a.id === adId);
                      return ad ? (
                        <button
                          key={adId}
                          onClick={() => setSelectedAd(ad)}
                          className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs hover:border-indigo-400 hover:bg-indigo-50 hover:z-10 transition-colors cursor-pointer relative"
                          title={`${ad.competitorName} (Click to view)`}
                        >
                          {ad.competitorLogo}
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        {/* Format Distribution */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <PieChart className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Format Distribution</h2>
          </div>

          <div className="flex items-center gap-8">
            {/* Simple pie chart visualization */}
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {formatDistribution.reduce((acc, item, index) => {
                  const total = formatDistribution.reduce((sum, i) => sum + i.value, 0);
                  if (total === 0) return acc;
                  const startAngle = acc.angle;
                  const angle = (item.value / total) * 360;
                  const endAngle = startAngle + angle;

                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;

                  const x1 = 50 + 40 * Math.cos(startRad);
                  const y1 = 50 + 40 * Math.sin(startRad);
                  const x2 = 50 + 40 * Math.cos(endRad);
                  const y2 = 50 + 40 * Math.sin(endRad);

                  const largeArc = angle > 180 ? 1 : 0;

                  acc.elements.push(
                    <path
                      key={index}
                      d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={item.color}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  );
                  acc.angle = endAngle;
                  return acc;
                }, { elements: [] as JSX.Element[], angle: 0 }).elements}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-3">
              {formatDistribution.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Velocity Distribution */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Velocity Distribution</h2>
          </div>

          <div className="space-y-4">
            {velocityDistribution.map(item => (
              <div key={item.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600">{item.name}</span>
                  <span className="font-medium text-slate-900">{item.value}%</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-4">
            {velocityDistribution.find(v => v.name === 'Scaling')?.value || 0}% of ads are actively scaling, indicating strong product-market fit signals.
          </p>
        </section>
      </div>

      {/* Signal and Grade Distribution */}
      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        {/* Signal Distribution */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Signal Classification</h2>
          </div>

          <div className="space-y-3">
            {signalDistribution.map(item => (
              <div key={item.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600">{item.name}</span>
                  <span className="font-medium text-slate-900">{item.value}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(item.value, 2)}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-4">
            Scaling and Hot Start ads represent proven performers worth studying.
          </p>
        </section>

        {/* Grade Distribution */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Grade Distribution</h2>
          </div>

          <div className="space-y-3">
            {gradeDistribution.map(item => (
              <div key={item.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{item.name}</span>
                  <span className="font-medium text-slate-900">{item.value}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(item.value, 2)}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-4">
            {gradeDistribution.filter(g => g.name === 'A+' || g.name === 'A').reduce((sum, g) => sum + g.value, 0)}% of ads score A or higher. Focus on these for insights.
          </p>
        </section>
      </div>

      {/* Competitor Pacing */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <h2 className="font-semibold text-slate-900">Competitor Pacing</h2>
          <span className="text-sm text-slate-500 ml-auto">Ads launched per week (avg)</span>
        </div>

        {allCompetitors.length > 0 ? (
          <div className="space-y-4">
            {allCompetitors.sort((a, b) => b.avgAdsPerWeek - a.avgAdsPerWeek).slice(0, 10).map(comp => (
              <div key={comp.id} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32">
                  <span className="text-xl">{comp.logo}</span>
                  <span className="text-sm font-medium text-slate-900 truncate">{comp.name}</span>
                </div>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${Math.min((comp.avgAdsPerWeek / 5) * 100, 100)}%` }}
                  >
                    <span className="text-xs font-medium text-amber-900">
                      {comp.avgAdsPerWeek}/wk
                    </span>
                  </div>
                </div>
                <span className="text-sm text-slate-500 w-20 text-right">
                  {comp.totalAds} total
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">
            No competitors added yet. Add competitors to your brands to see pacing data.
          </p>
        )}
      </section>

      {/* Hook Library */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Hook Library</h2>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setSelectedHookType('all')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedHookType === 'all'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All
            </button>
            {Object.entries(hookTypeLabels).map(([type, label]) => (
              <button
                key={type}
                onClick={() => setSelectedHookType(type as HookType)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedHookType === type
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Hook type distribution mini chart */}
        <div className="flex items-center gap-2 mb-6 p-4 bg-slate-50 rounded-lg">
          <span className="text-xs text-slate-500">Distribution:</span>
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden flex">
            {hookTypeDistribution.map((item, index) => (
              <div
                key={index}
                className="h-full"
                style={{
                  width: `${item.value}%`,
                  backgroundColor: item.color
                }}
                title={`${item.name}: ${item.value}%`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 ml-4">
            {hookTypeDistribution.map(item => (
              <div key={item.name} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-500">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hooks list */}
        {filteredHooks.length > 0 ? (
          <div className="space-y-3">
            {filteredHooks.map((hook, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm text-slate-900 mb-1">&ldquo;{hook.text}&rdquo;</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                    hook.type === 'question' ? 'bg-blue-100 text-blue-700' :
                    hook.type === 'statement' ? 'bg-green-100 text-green-700' :
                    hook.type === 'social_proof' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {hook.type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-semibold text-slate-900">{hook.frequency}</div>
                    <div className="text-xs text-slate-500">uses</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>No hooks found for the selected filter.</p>
          </div>
        )}
      </section>

      {/* Ad Detail Modal */}
      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          onClose={() => setSelectedAd(null)}
        />
      )}
    </div>
  );
}

'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useBrandContext, useCurrentBrand } from '@/context/BrandContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MetaConnectionStatus } from '@/components/MetaConnectionStatus';
import { DataQualityBanner } from '@/components/DataQualityBanner';
import { WoWChange } from '@/components/TrendIndicator';
import { ClientAdDetailModal } from '@/components/ClientAdDetailModal';
import { ClientAd } from '@/types';
import {
  AlertCircle,
  DollarSign,
  Eye,
  MousePointerClick,
  TrendingUp,
  ArrowUpRight,
  BarChart3,
  RefreshCw,
  Loader2,
  Play,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

// Industry benchmarks (hardcoded for now - can be made dynamic later)
const BENCHMARKS = {
  dtc: { avgCtr: 1.5, avgRoas: 2.0 },
  ecommerce: { avgCtr: 1.2, avgRoas: 1.8 },
  default: { avgCtr: 1.3, avgRoas: 1.8 },
};

interface Props {
  params: { brandId: string };
}

export default function PerformancePage({ params }: Props) {
  const { brandId } = params;
  const brand = useCurrentBrand(brandId);
  const { loading, error, clientAds, getClientAdsForBrand, syncMetaAds } = useBrandContext();

  const [metaConnected, setMetaConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7' | '30' | '60' | '90'>('30');
  const [selectedAd, setSelectedAd] = useState<ClientAd | null>(null);

  const clientAdsForBrand = useMemo(
    () => getClientAdsForBrand(brandId),
    [brandId, getClientAdsForBrand, clientAds]
  );

  const checkMetaStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/meta/status?brandId=${brandId}`);
      const data = await res.json();
      setMetaConnected(data.connected && !!data.adAccountId);
    } catch {
      // Ignore
    }
  }, [brandId]);

  useEffect(() => {
    checkMetaStatus();
  }, [checkMetaStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncMetaAds(brandId);
      if (result.success) {
        setSyncResult(`Synced ${result.count || 0} ads`);
        await checkMetaStatus();
      } else {
        setSyncResult(result.error || 'Sync failed');
      }
    } catch {
      setSyncResult('An error occurred');
    } finally {
      setSyncing(false);
    }
  };

  // Calculate data quality metrics
  const dataQuality = useMemo(() => {
    const ads = clientAdsForBrand;
    if (ads.length === 0) {
      return { daysOfData: 0, adsAnalyzed: 0, isReliable: false };
    }

    // Find oldest synced ad to estimate days of data
    const oldestSync = ads.reduce((oldest, ad) => {
      const syncDate = new Date(ad.syncedAt).getTime();
      return syncDate < oldest ? syncDate : oldest;
    }, Date.now());

    const daysOfData = Math.floor((Date.now() - oldestSync) / (1000 * 60 * 60 * 24));
    const adsWithSpend = ads.filter(ad => ad.spend > 0).length;

    return {
      daysOfData: Math.max(1, daysOfData),
      adsAnalyzed: adsWithSpend,
      isReliable: daysOfData >= 7 && adsWithSpend >= 5,
    };
  }, [clientAdsForBrand]);

  // Calculate performance metrics
  const metrics = useMemo(() => {
    const ads = clientAdsForBrand;
    if (ads.length === 0) {
      return {
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalRevenue: 0,
        avgCtr: 0,
        avgRoas: 0,
        avgCpa: 0,
      };
    }

    const totalSpend = ads.reduce((sum, ad) => sum + ad.spend, 0);
    const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
    const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks, 0);
    const totalConversions = ads.reduce((sum, ad) => sum + ad.conversions, 0);
    const totalRevenue = ads.reduce((sum, ad) => sum + ad.revenue, 0);

    return {
      totalSpend,
      totalImpressions,
      totalClicks,
      totalConversions,
      totalRevenue,
      avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      avgRoas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      avgCpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
    };
  }, [clientAdsForBrand]);

  // Simulated WoW changes (in real implementation, would compare to previous period data)
  const wowChanges = useMemo(() => {
    // For now, return placeholder values. In production, calculate from historical data.
    const hasEnoughData = dataQuality.daysOfData >= 14;
    return {
      spend: hasEnoughData ? 8.5 : 0,
      ctr: hasEnoughData ? -2.3 : 0,
      roas: hasEnoughData ? 15.2 : 0,
      impressions: hasEnoughData ? 12.1 : 0,
    };
  }, [dataQuality.daysOfData]);

  // Industry benchmark for comparison
  const benchmark = BENCHMARKS.default;

  // Top performers by ROAS
  const topPerformers = useMemo(() => {
    return [...clientAdsForBrand]
      .filter(ad => ad.spend > 0 && ad.roas > 0)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 5);
  }, [clientAdsForBrand]);

  // Breakdown by format (based on ad names - simplified)
  const formatBreakdown = useMemo(() => {
    const breakdown: Record<string, { spend: number; count: number; roas: number }> = {
      video: { spend: 0, count: 0, roas: 0 },
      static: { spend: 0, count: 0, roas: 0 },
      carousel: { spend: 0, count: 0, roas: 0 },
    };

    clientAdsForBrand.forEach(ad => {
      const name = ad.name?.toLowerCase() || '';
      let format = 'static';
      if (name.includes('video') || name.includes('vid')) format = 'video';
      else if (name.includes('carousel') || name.includes('caro')) format = 'carousel';

      breakdown[format].spend += ad.spend;
      breakdown[format].count += 1;
      if (ad.spend > 0) {
        breakdown[format].roas += ad.revenue;
      }
    });

    // Calculate average ROAS per format
    Object.keys(breakdown).forEach(key => {
      if (breakdown[key].spend > 0) {
        breakdown[key].roas = breakdown[key].roas / breakdown[key].spend;
      }
    });

    const total = Object.values(breakdown).reduce((sum, b) => sum + b.spend, 0);

    return Object.entries(breakdown)
      .filter(([, data]) => data.count > 0)
      .map(([format, data]) => ({
        format,
        ...data,
        percentage: total > 0 ? (data.spend / total) * 100 : 0,
      }))
      .sort((a, b) => b.spend - a.spend);
  }, [clientAdsForBrand]);

  // Format helpers
  const formatMoney = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;

  const formatNumber = (n: number) =>
    n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" message="Loading performance data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Data</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

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
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">Your Ad Performance</h1>
          </div>
          <p className="text-slate-500">Track and analyze your Meta ad performance</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </select>

          {metaConnected && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </div>
      </div>

      {/* Sync result message */}
      {syncResult && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          {syncResult}
        </div>
      )}

      {/* Meta Connection Status - Show if not connected */}
      {!metaConnected && (
        <div className="mb-8">
          <MetaConnectionStatus brandId={brandId} showSyncButton={false} />
        </div>
      )}

      {/* No data state */}
      {metaConnected && clientAdsForBrand.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center mb-8">
          <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No Performance Data Yet</h2>
          <p className="text-slate-500 mb-4">
            Sync your ads from Meta to see performance metrics here.
          </p>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Meta'}
          </button>
        </div>
      )}

      {/* Performance Dashboard */}
      {clientAdsForBrand.length > 0 && (
        <>
          {/* Data Quality Banner */}
          {!dataQuality.isReliable && (
            <DataQualityBanner
              daysOfData={dataQuality.daysOfData}
              adsAnalyzed={dataQuality.adsAnalyzed}
            />
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              icon={DollarSign}
              label="Total Spend"
              value={metrics.totalSpend > 0 ? formatMoney(metrics.totalSpend) : '—'}
              color="indigo"
              wowChange={wowChanges.spend}
            />
            <MetricCard
              icon={Eye}
              label="Impressions"
              value={metrics.totalImpressions > 0 ? formatNumber(metrics.totalImpressions) : '—'}
              color="blue"
              wowChange={wowChanges.impressions}
            />
            <MetricCard
              icon={MousePointerClick}
              label="CTR"
              value={metrics.avgCtr > 0 ? `${metrics.avgCtr.toFixed(2)}%` : '—'}
              color="purple"
              wowChange={wowChanges.ctr}
              benchmark={
                metrics.avgCtr > 0 && benchmark.avgCtr > 0
                  ? `${((metrics.avgCtr / benchmark.avgCtr - 1) * 100).toFixed(0)}% vs industry`
                  : undefined
              }
              benchmarkPositive={metrics.avgCtr >= benchmark.avgCtr}
            />
            <MetricCard
              icon={TrendingUp}
              label="ROAS"
              value={metrics.avgRoas > 0 ? `${metrics.avgRoas.toFixed(2)}x` : '—'}
              color="green"
              highlight={metrics.avgRoas >= 2}
              wowChange={wowChanges.roas}
              benchmark={
                metrics.avgRoas > 0 && benchmark.avgRoas > 0
                  ? `${((metrics.avgRoas / benchmark.avgRoas - 1) * 100).toFixed(0)}% vs industry`
                  : undefined
              }
              benchmarkPositive={metrics.avgRoas >= benchmark.avgRoas}
            />
          </div>

          {/* Two-column layout */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Top Performers */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Top Performers
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {topPerformers.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    No ads with ROAS data yet
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {topPerformers.map((ad, index) => (
                      <TopPerformerRow
                        key={ad.id}
                        ad={ad}
                        rank={index + 1}
                        accountAvgRoas={metrics.avgRoas}
                        onClick={() => setSelectedAd(ad)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Format Breakdown */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                Spend by Format
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                {formatBreakdown.length === 0 ? (
                  <div className="text-center text-slate-500">No format data</div>
                ) : (
                  <div className="space-y-4">
                    {formatBreakdown.map((item) => (
                      <FormatBreakdownRow key={item.format} {...item} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Additional Stats */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Conversion Metrics</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">Total Clicks</div>
                <div className="text-2xl font-bold text-slate-900">
                  {metrics.totalClicks > 0 ? formatNumber(metrics.totalClicks) : '—'}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">Conversions</div>
                <div className="text-2xl font-bold text-slate-900">
                  {metrics.totalConversions > 0 ? formatNumber(metrics.totalConversions) : '—'}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">Revenue</div>
                <div className="text-2xl font-bold text-slate-900">
                  {metrics.totalRevenue > 0 ? formatMoney(metrics.totalRevenue) : '—'}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">Cost per Acquisition</div>
                <div className="text-2xl font-bold text-slate-900">
                  {metrics.avgCpa > 0 ? formatMoney(metrics.avgCpa) : '—'}
                </div>
              </div>
            </div>
          </section>

          {/* Quick Link to Patterns */}
          <section className="mt-8">
            <Link
              href={`/brands/${brandId}/patterns`}
              className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl hover:shadow-md transition-shadow group"
            >
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  Discover What&apos;s Working
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  AI-powered pattern analysis to identify winning creative strategies
                </p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-indigo-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </section>
        </>
      )}

      {/* Ad Detail Modal */}
      {selectedAd && (
        <ClientAdDetailModal
          ad={selectedAd}
          onClose={() => setSelectedAd(null)}
          accountAvgRoas={metrics.avgRoas}
        />
      )}
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  icon: typeof DollarSign;
  label: string;
  value: string;
  color: 'indigo' | 'blue' | 'purple' | 'green';
  highlight?: boolean;
  wowChange?: number;
  benchmark?: string;
  benchmarkPositive?: boolean;
}

function MetricCard({ icon: Icon, label, value, color, highlight, wowChange, benchmark, benchmarkPositive }: MetricCardProps) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className={`bg-white border rounded-xl p-4 ${highlight ? 'border-green-300 ring-1 ring-green-100' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        {wowChange !== undefined && wowChange !== 0 && (
          <WoWChange change={wowChange} size="sm" />
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
      {benchmark && (
        <div className={`text-xs mt-1 ${benchmarkPositive ? 'text-green-600' : 'text-red-500'}`}>
          {benchmarkPositive ? '+' : ''}{benchmark}
        </div>
      )}
    </div>
  );
}

// Top Performer Row Component
function TopPerformerRow({
  ad,
  rank,
  accountAvgRoas,
  onClick,
}: {
  ad: ClientAd;
  rank: number;
  accountAvgRoas?: number;
  onClick?: () => void;
}) {
  const formatMoney = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;

  const roasComparison =
    accountAvgRoas && accountAvgRoas > 0 && ad.roas > 0
      ? ((ad.roas - accountAvgRoas) / accountAvgRoas) * 100
      : null;

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 ${
        onClick ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''
      }`}
      onClick={onClick}
    >
      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
        {rank}
      </div>
      <div className="w-10 h-10 rounded bg-slate-100 overflow-hidden shrink-0">
        {ad.thumbnailUrl || ad.imageUrl ? (
          <img
            src={ad.thumbnailUrl || ad.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-slate-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 truncate">
          {ad.name || 'Untitled'}
        </div>
        <div className="text-xs text-slate-500">{formatMoney(ad.spend)} spend</div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-bold ${ad.roas >= 2 ? 'text-green-600' : ad.roas >= 1 ? 'text-amber-600' : 'text-slate-600'}`}>
          {ad.roas > 0 ? `${ad.roas.toFixed(2)}x` : '—'}
        </div>
        {roasComparison !== null && (
          <div className={`text-xs ${roasComparison >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {roasComparison >= 0 ? '+' : ''}{roasComparison.toFixed(0)}% vs avg
          </div>
        )}
        {roasComparison === null && <div className="text-xs text-slate-500">ROAS</div>}
      </div>
    </div>
  );
}

// Format Breakdown Row Component
interface FormatBreakdownProps {
  format: string;
  spend: number;
  count: number;
  roas: number;
  percentage: number;
}

function FormatBreakdownRow({ format, spend, count, roas, percentage }: FormatBreakdownProps) {
  const formatMoney = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;

  const icons: Record<string, typeof Play> = {
    video: Play,
    static: ImageIcon,
    carousel: Layers,
  };

  const Icon = icons[format] || ImageIcon;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-900 capitalize">{format}</span>
          <span className="text-xs text-slate-400">({count} ads)</span>
        </div>
        <div className="text-sm font-medium text-slate-900">{formatMoney(spend)}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-slate-500 w-12 text-right">{percentage.toFixed(0)}%</span>
        {roas > 0 && (
          <span className={`text-xs font-medium ${roas >= 1 ? 'text-green-600' : 'text-slate-500'}`}>
            {roas.toFixed(1)}x
          </span>
        )}
      </div>
    </div>
  );
}

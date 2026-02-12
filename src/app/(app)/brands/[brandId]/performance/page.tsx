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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
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
  ChevronDown,
  Info,
  Users as UsersIcon,
  Globe,
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
  const [syncTokenExpired, setSyncTokenExpired] = useState(false);

  const [selectedAd, setSelectedAd] = useState<ClientAd | null>(null);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());

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
    setSyncTokenExpired(false);
    try {
      const result = await syncMetaAds(brandId);
      if (result.success) {
        setSyncResult(`Synced ${result.count || 0} ads`);
        await checkMetaStatus();
      } else if (result.tokenExpired) {
        setSyncTokenExpired(true);
        setSyncResult(null);
        setMetaConnected(false);
      } else {
        setSyncResult(result.error || 'Sync failed');
      }
    } catch {
      setSyncResult('An error occurred');
    } finally {
      setSyncing(false);
    }
  };

  const toggleCampaign = useCallback((campaignKey: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      if (next.has(campaignKey)) {
        next.delete(campaignKey);
      } else {
        next.add(campaignKey);
      }
      return next;
    });
  }, []);

  const toggleAdSet = useCallback((adSetKey: string) => {
    setExpandedAdSets(prev => {
      const next = new Set(prev);
      if (next.has(adSetKey)) {
        next.delete(adSetKey);
      } else {
        next.add(adSetKey);
      }
      return next;
    });
  }, []);

  // Calculate data quality metrics
  const dataQuality = useMemo(() => {
    const ads = clientAdsForBrand;
    if (ads.length === 0) {
      return { daysOfData: 0, adsAnalyzed: 0, isReliable: false };
    }

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

  const wowChanges = useMemo(() => ({
    spend: 0, ctr: 0, roas: 0, impressions: 0,
  }), []);

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

  // Chart data — distribute total spend across the selected date range
  const chartData = useMemo(() => {
    const ads = clientAdsForBrand.filter(ad => ad.spend > 0);
    if (ads.length === 0) return [];

    const days = 30;
    const totalSpend = ads.reduce((sum, ad) => sum + ad.spend, 0);
    const totalRevenue = ads.reduce((sum, ad) => sum + ad.revenue, 0);
    const dailyAvgSpend = totalSpend / days;
    const dailyAvgRevenue = totalRevenue / days;

    const data: { date: string; spend: number; roas: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const daySpend = dailyAvgSpend;
      const dayRevenue = dailyAvgRevenue;
      data.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        spend: Math.round(daySpend * 100) / 100,
        roas: daySpend > 0 ? Math.round((dayRevenue / daySpend) * 100) / 100 : 0,
      });
    }
    return data;
  }, [clientAdsForBrand]);

  const hasChartData = chartData.length > 0;

  // Campaign hierarchy — group ads by campaign name prefix
  const campaignHierarchy = useMemo(() => {
    const ads = clientAdsForBrand.filter(ad => ad.spend > 0);
    if (ads.length === 0) return [];

    const campaigns = new Map<string, {
      name: string;
      ads: ClientAd[];
      adSets: Map<string, { name: string; ads: ClientAd[] }>;
      spend: number;
      revenue: number;
      conversions: number;
    }>();

    ads.forEach(ad => {
      const parts = (ad.name || 'Untitled').split(/[_\-|]/);
      const campaignName = parts[0]?.trim() || 'Default Campaign';
      const adSetName = parts.length > 1 ? parts[1]?.trim() || 'Default Ad Set' : 'Default Ad Set';

      if (!campaigns.has(campaignName)) {
        campaigns.set(campaignName, {
          name: campaignName,
          ads: [],
          adSets: new Map(),
          spend: 0,
          revenue: 0,
          conversions: 0,
        });
      }

      const campaign = campaigns.get(campaignName)!;
      campaign.ads.push(ad);
      campaign.spend += ad.spend;
      campaign.revenue += ad.revenue;
      campaign.conversions += ad.conversions;

      if (!campaign.adSets.has(adSetName)) {
        campaign.adSets.set(adSetName, { name: adSetName, ads: [] });
      }
      campaign.adSets.get(adSetName)!.ads.push(ad);
    });

    return Array.from(campaigns.values())
      .map(c => ({
        ...c,
        roas: c.spend > 0 ? c.revenue / c.spend : 0,
        cpa: c.conversions > 0 ? c.spend / c.conversions : 0,
        adSets: Array.from(c.adSets.values()).map(as => {
          const asSpend = as.ads.reduce((s, a) => s + a.spend, 0);
          const asRevenue = as.ads.reduce((s, a) => s + a.revenue, 0);
          const asConversions = as.ads.reduce((s, a) => s + a.conversions, 0);
          return {
            ...as,
            spend: asSpend,
            revenue: asRevenue,
            conversions: asConversions,
            roas: asSpend > 0 ? asRevenue / asSpend : 0,
            cpa: asConversions > 0 ? asSpend / asConversions : 0,
          };
        }),
      }))
      .sort((a, b) => b.spend - a.spend);
  }, [clientAdsForBrand]);

  // Estimated audience spend distribution (industry averages, not from Meta API)
  const audienceSegments = useMemo(() => {
    const ads = clientAdsForBrand.filter(ad => ad.spend > 0);
    if (ads.length === 0) return { age: [], gender: [], platform: [] };

    const totalSpend = ads.reduce((s, a) => s + a.spend, 0);

    const buildRows = (segments: { name: string; pct: number }[]) =>
      segments.map(seg => ({
        name: seg.name,
        spend: totalSpend * seg.pct,
        pct: seg.pct,
      }));

    return {
      age: buildRows([
        { name: '18-24', pct: 0.15 },
        { name: '25-34', pct: 0.35 },
        { name: '35-44', pct: 0.25 },
        { name: '45-54', pct: 0.15 },
        { name: '55+', pct: 0.10 },
      ]),
      gender: buildRows([
        { name: 'Female', pct: 0.55 },
        { name: 'Male', pct: 0.42 },
        { name: 'Other', pct: 0.03 },
      ]),
      platform: buildRows([
        { name: 'Facebook', pct: 0.45 },
        { name: 'Instagram', pct: 0.40 },
        { name: 'Audience Network', pct: 0.10 },
        { name: 'Messenger', pct: 0.05 },
      ]),
    };
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

      {/* Token expired banner */}
      {syncTokenExpired && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Meta access token expired</p>
            <p className="text-sm text-red-600 mt-1">Your Meta connection has expired. Please reconnect your Meta account using the button below to resume syncing ads.</p>
          </div>
        </div>
      )}

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

          {/* Info Banner — Meta 30-day aggregate note */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Estimated data — not precise daily figures</p>
              <p className="text-sm text-blue-800 mt-1">
                Meta provides aggregated last-30-day totals. The daily breakdown in the chart below is
                an estimate distributed from that aggregate. For precise daily spend and ROAS,
                use Meta Ads Manager&apos;s native reporting.
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              icon={DollarSign}
              label="Total Spend"
              value={metrics.totalSpend > 0 ? formatMoney(metrics.totalSpend) : '—'}
              color="indigo"
              wowChange={wowChanges.spend}
              secondary={metrics.avgCpa > 0 ? `CPA: ${formatMoney(metrics.avgCpa)}` : undefined}
            />
            <MetricCard
              icon={Eye}
              label="Impressions"
              value={metrics.totalImpressions > 0 ? formatNumber(metrics.totalImpressions) : '—'}
              color="blue"
              wowChange={wowChanges.impressions}
              secondary={metrics.totalConversions > 0 && metrics.totalClicks > 0
                ? `Conv Rate: ${((metrics.totalConversions / metrics.totalClicks) * 100).toFixed(1)}%`
                : undefined}
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

          {/* Spend & ROAS Chart */}
          {hasChartData && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Estimated Daily Spend &amp; ROAS
              </h2>
              <p className="text-xs text-slate-500 mb-4 ml-7">(from 30-day aggregate)</p>
              <div className="bg-white border border-dashed border-slate-200 rounded-xl p-6">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      yAxisId="spend"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}`}
                      label={{ value: 'Daily Spend ($)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#94a3b8' } }}
                    />
                    <YAxis
                      yAxisId="roas"
                      orientation="right"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${v.toFixed(1)}x`}
                      label={{ value: 'ROAS (x)', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: '#94a3b8' } }}
                    />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'spend') return [`$${value.toFixed(2)}`, 'Daily Spend'];
                        return [`${value.toFixed(2)}x`, 'ROAS'];
                      }}
                    />
                    <Legend
                      formatter={(value: string) => (value === 'spend' ? 'Daily Spend' : 'ROAS')}
                    />
                    <Line
                      yAxisId="spend"
                      type="monotone"
                      dataKey="spend"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="roas"
                      type="monotone"
                      dataKey="roas"
                      stroke="#22c55e"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Two-column layout: Top Performers + Format Breakdown */}
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

          {/* Campaign Drill-Down */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Campaign Drill-Down
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {campaignHierarchy.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  No campaign data available
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-600">Spend</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-600">ROAS</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-600">CPA</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-600">Conversions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {campaignHierarchy.map(campaign => (
                        <CampaignRows
                          key={campaign.name}
                          campaign={campaign}
                          expandedCampaigns={expandedCampaigns}
                          expandedAdSets={expandedAdSets}
                          toggleCampaign={toggleCampaign}
                          toggleAdSet={toggleAdSet}
                          onAdClick={setSelectedAd}
                          formatMoney={formatMoney}
                          formatNumber={formatNumber}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Audience Segments (estimated from industry averages) */}
          {audienceSegments.age.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-1">
                <UsersIcon className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-slate-900">Estimated Audience Spend</h2>
              </div>
              <p className="text-xs text-slate-500 mb-4 ml-7">Based on industry averages, not Meta audience data. For real breakdowns, use Meta Ads Manager.</p>
              <div className="grid md:grid-cols-3 gap-6">
                <AudienceSpendCard
                  title="Age"
                  icon={<UsersIcon className="w-4 h-4" />}
                  rows={audienceSegments.age}
                  formatMoney={formatMoney}
                />
                <AudienceSpendCard
                  title="Gender"
                  icon={<UsersIcon className="w-4 h-4" />}
                  rows={audienceSegments.gender}
                  formatMoney={formatMoney}
                />
                <AudienceSpendCard
                  title="Platform"
                  icon={<Globe className="w-4 h-4" />}
                  rows={audienceSegments.platform}
                  formatMoney={formatMoney}
                />
              </div>
            </section>
          )}

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
  secondary?: string;
}

function MetricCard({ icon: Icon, label, value, color, highlight, wowChange, benchmark, benchmarkPositive, secondary }: MetricCardProps) {
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
      {secondary && (
        <div className="text-xs text-slate-400 mt-1">{secondary}</div>
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

// Campaign Drill-Down Row Components
interface CampaignData {
  name: string;
  spend: number;
  revenue: number;
  conversions: number;
  roas: number;
  cpa: number;
  adSets: {
    name: string;
    spend: number;
    revenue: number;
    conversions: number;
    roas: number;
    cpa: number;
    ads: ClientAd[];
  }[];
  ads: ClientAd[];
}

function CampaignRows({
  campaign,
  expandedCampaigns,
  expandedAdSets,
  toggleCampaign,
  toggleAdSet,
  onAdClick,
  formatMoney,
  formatNumber,
}: {
  campaign: CampaignData;
  expandedCampaigns: Set<string>;
  expandedAdSets: Set<string>;
  toggleCampaign: (key: string) => void;
  toggleAdSet: (key: string) => void;
  onAdClick: (ad: ClientAd) => void;
  formatMoney: (n: number) => string;
  formatNumber: (n: number) => string;
}) {
  const isExpanded = expandedCampaigns.has(campaign.name);

  return (
    <>
      {/* Campaign row */}
      <tr
        className="cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => toggleCampaign(campaign.name)}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
            <span className="font-semibold text-slate-900">{campaign.name}</span>
            <span className="text-xs text-slate-400">({campaign.ads.length} ads)</span>
          </div>
        </td>
        <td className="py-3 px-4 text-right font-semibold text-slate-900">{formatMoney(campaign.spend)}</td>
        <td className="py-3 px-4 text-right">
          <RoasBadge roas={campaign.roas} />
        </td>
        <td className="py-3 px-4 text-right text-slate-700">{campaign.cpa > 0 ? formatMoney(campaign.cpa) : '—'}</td>
        <td className="py-3 px-4 text-right text-slate-700">{campaign.conversions > 0 ? formatNumber(campaign.conversions) : '—'}</td>
      </tr>

      {/* Ad Set rows */}
      {isExpanded && campaign.adSets.map(adSet => {
        const adSetKey = `${campaign.name}::${adSet.name}`;
        const isAdSetExpanded = expandedAdSets.has(adSetKey);

        return (
          <AdSetRows
            key={adSetKey}
            adSet={adSet}
            adSetKey={adSetKey}
            isAdSetExpanded={isAdSetExpanded}
            toggleAdSet={toggleAdSet}
            onAdClick={onAdClick}
            formatMoney={formatMoney}
            formatNumber={formatNumber}
          />
        );
      })}
    </>
  );
}

function AdSetRows({
  adSet,
  adSetKey,
  isAdSetExpanded,
  toggleAdSet,
  onAdClick,
  formatMoney,
  formatNumber,
}: {
  adSet: CampaignData['adSets'][0];
  adSetKey: string;
  isAdSetExpanded: boolean;
  toggleAdSet: (key: string) => void;
  onAdClick: (ad: ClientAd) => void;
  formatMoney: (n: number) => string;
  formatNumber: (n: number) => string;
}) {
  return (
    <>
      <tr
        className="cursor-pointer hover:bg-slate-50 transition-colors bg-slate-50/50"
        onClick={() => toggleAdSet(adSetKey)}
      >
        <td className="py-2.5 px-4 pl-10">
          <div className="flex items-center gap-2">
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isAdSetExpanded ? '' : '-rotate-90'}`} />
            <span className="font-medium text-slate-700">{adSet.name}</span>
            <span className="text-xs text-slate-400">({adSet.ads.length})</span>
          </div>
        </td>
        <td className="py-2.5 px-4 text-right text-slate-700">{formatMoney(adSet.spend)}</td>
        <td className="py-2.5 px-4 text-right">
          <RoasBadge roas={adSet.roas} />
        </td>
        <td className="py-2.5 px-4 text-right text-slate-600">{adSet.cpa > 0 ? formatMoney(adSet.cpa) : '—'}</td>
        <td className="py-2.5 px-4 text-right text-slate-600">{adSet.conversions > 0 ? formatNumber(adSet.conversions) : '—'}</td>
      </tr>

      {/* Ad rows */}
      {isAdSetExpanded && adSet.ads.map(ad => (
        <tr
          key={ad.id}
          className="cursor-pointer hover:bg-indigo-50/50 transition-colors"
          onClick={() => onAdClick(ad)}
        >
          <td className="py-2 px-4 pl-16">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-slate-100 overflow-hidden shrink-0">
                {ad.thumbnailUrl || ad.imageUrl ? (
                  <img src={ad.thumbnailUrl || ad.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-3 h-3 text-slate-400" />
                  </div>
                )}
              </div>
              <span className="text-slate-600 truncate max-w-[200px]">{ad.name || 'Untitled'}</span>
            </div>
          </td>
          <td className="py-2 px-4 text-right text-slate-600">{formatMoney(ad.spend)}</td>
          <td className="py-2 px-4 text-right">
            <RoasBadge roas={ad.roas} />
          </td>
          <td className="py-2 px-4 text-right text-slate-500">{ad.cpa > 0 ? formatMoney(ad.cpa) : '—'}</td>
          <td className="py-2 px-4 text-right text-slate-500">{ad.conversions > 0 ? ad.conversions.toString() : '—'}</td>
        </tr>
      ))}
    </>
  );
}

// Audience Spend Card — shows estimated spend distribution only (no ROAS/CPA)
function AudienceSpendCard({
  title,
  icon,
  rows,
  formatMoney,
}: {
  title: string;
  icon: React.ReactNode;
  rows: { name: string; spend: number; pct: number }[];
  formatMoney: (n: number) => string;
}) {
  const maxSpend = Math.max(...rows.map(r => r.spend));

  return (
    <div className="bg-slate-50/50 border border-dashed border-slate-300 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-purple-600">{icon}</div>
        <h3 className="font-medium text-slate-900">{title}</h3>
      </div>
      <div className="space-y-3">
        {rows.map(row => (
          <div key={row.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-700">{row.name}</span>
              <span className="text-xs text-slate-500">{formatMoney(row.spend)} ({(row.pct * 100).toFixed(0)}%)</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-300 rounded-full transition-all"
                style={{ width: `${maxSpend > 0 ? (row.spend / maxSpend) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoasBadge({ roas }: { roas: number }) {
  if (roas <= 0) return <span className="text-slate-400">—</span>;
  const color = roas >= 2 ? 'text-green-600' : roas >= 1 ? 'text-amber-600' : 'text-red-500';
  return <span className={`font-medium ${color}`}>{roas.toFixed(2)}x</span>;
}


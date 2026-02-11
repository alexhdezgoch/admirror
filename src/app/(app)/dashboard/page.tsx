'use client';

import { useMemo, useState } from 'react';
import { useBrandContext } from '@/context/BrandContext';
import { BrandCard } from '@/components/BrandCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ClientBrand, ClientAd, Ad } from '@/types';
import {
  AlertCircle,
  Plus,
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Zap,
  Activity,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

// --- Types ---

type SortKey = 'name' | 'spend' | 'roas' | 'cpa' | 'conversions' | 'status';
type SortDir = 'asc' | 'desc';

interface ClientRow {
  brand: ClientBrand;
  ads: ClientAd[];
  spend7d: number;
  roas7d: number;
  cpa7d: number;
  conversions7d: number;
  avgRoas7d: number; // rolling 7-day average for alert comparison
  todaySpend: number;
  status: 'scaling' | 'stable' | 'dropping' | 'critical';
  statusLabel: string;
  hasMetaConnected: boolean;
}

interface Alert {
  type: 'roas_drop' | 'zero_spend';
  brandId: string;
  brandName: string;
  message: string;
}

// --- Helpers ---

function getDateDaysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function adsInWindow(ads: ClientAd[], days: number): ClientAd[] {
  const cutoff = getDateDaysAgo(days);
  return ads.filter(ad => new Date(ad.syncedAt) >= cutoff);
}

function calcWeightedRoas(ads: ClientAd[]): number {
  const totalSpend = ads.reduce((s, a) => s + a.spend, 0);
  if (totalSpend === 0) return 0;
  const totalRevenue = ads.reduce((s, a) => s + a.revenue, 0);
  return totalRevenue / totalSpend;
}

function calcCpa(ads: ClientAd[]): number {
  const totalSpend = ads.reduce((s, a) => s + a.spend, 0);
  const totalConv = ads.reduce((s, a) => s + a.conversions, 0);
  return totalConv > 0 ? totalSpend / totalConv : 0;
}

function determineStatus(roas7d: number, roasPrev7d: number): ClientRow['status'] {
  if (roas7d === 0) return 'critical';
  if (roasPrev7d === 0) return 'stable';
  const change = (roas7d - roasPrev7d) / roasPrev7d;
  if (change > 0.15) return 'scaling';
  if (change < -0.3) return 'critical';
  if (change < -0.1) return 'dropping';
  return 'stable';
}

const STATUS_CONFIG = {
  scaling: { emoji: '\uD83D\uDD25', label: 'Scaling', cls: 'text-orange-600 bg-orange-50' },
  stable: { emoji: '\u2705', label: 'Stable', cls: 'text-green-700 bg-green-50' },
  dropping: { emoji: '\u26A0\uFE0F', label: 'Dropping', cls: 'text-amber-700 bg-amber-50' },
  critical: { emoji: '\uD83D\uDD34', label: 'Critical', cls: 'text-red-700 bg-red-50' },
} as const;

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}

// --- Component ---

export default function AgencyCommandCenter() {
  const { clientBrands, allAds, clientAds, loading, error, getClientAdsForBrand } = useBrandContext();
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Build client rows with 7d metrics
  const { rows, alerts, connectedCount, disconnectedBrands } = useMemo(() => {
    const rows: ClientRow[] = [];
    const alerts: Alert[] = [];
    let connectedCount = 0;
    const disconnectedBrands: ClientBrand[] = [];

    for (const brand of clientBrands) {
      const brandAds = getClientAdsForBrand(brand.id);
      const hasMetaConnected = brandAds.length > 0;

      if (!hasMetaConnected) {
        disconnectedBrands.push(brand);
        continue;
      }

      connectedCount++;

      const ads7d = adsInWindow(brandAds, 7);
      const adsPrev7d = adsInWindow(brandAds, 14).filter(
        a => new Date(a.syncedAt) < getDateDaysAgo(7)
      );

      const spend7d = ads7d.reduce((s, a) => s + a.spend, 0);
      const roas7d = calcWeightedRoas(ads7d);
      const cpa7d = calcCpa(ads7d);
      const conversions7d = ads7d.reduce((s, a) => s + a.conversions, 0);
      const roasPrev7d = calcWeightedRoas(adsPrev7d);
      const todayAds = brandAds.filter(a => isToday(a.syncedAt));
      const todaySpend = todayAds.reduce((s, a) => s + a.spend, 0);

      const status = determineStatus(roas7d, roasPrev7d);

      // Alert: ROAS dropped >30% vs 7-day average
      if (roasPrev7d > 0 && roas7d > 0) {
        const roasChange = (roas7d - roasPrev7d) / roasPrev7d;
        if (roasChange < -0.3) {
          alerts.push({
            type: 'roas_drop',
            brandId: brand.id,
            brandName: brand.name,
            message: `ROAS dropped ${Math.abs(roasChange * 100).toFixed(0)}% vs 7-day avg (${roasPrev7d.toFixed(2)}x \u2192 ${roas7d.toFixed(2)}x)`,
          });
        }
      }

      // Alert: 0 spend today
      if (todaySpend === 0) {
        alerts.push({
          type: 'zero_spend',
          brandId: brand.id,
          brandName: brand.name,
          message: 'No spend recorded today \u2014 possible broken campaign',
        });
      }

      rows.push({
        brand,
        ads: brandAds,
        spend7d,
        roas7d,
        cpa7d,
        conversions7d,
        avgRoas7d: roasPrev7d,
        todaySpend,
        status,
        statusLabel: STATUS_CONFIG[status].label,
        hasMetaConnected,
      });
    }

    return { rows, alerts, connectedCount, disconnectedBrands };
  }, [clientBrands, clientAds, getClientAdsForBrand]);

  // Snapshot metrics across all connected clients
  const snapshot = useMemo(() => {
    const allConnectedAds = rows.flatMap(r => r.ads);
    const totalSpend = allConnectedAds.reduce((s, a) => s + a.spend, 0);
    const weightedRoas = calcWeightedRoas(allConnectedAds);
    return { totalSpend, weightedRoas, connectedCount, alertCount: alerts.length };
  }, [rows, alerts, connectedCount]);

  // Competitor pulse: quick insights from recent competitor ads
  const competitorPulse = useMemo(() => {
    const insights: { text: string; brandId: string; brandName: string }[] = [];
    const oneWeekAgo = getDateDaysAgo(7);

    for (const brand of clientBrands) {
      const brandCompetitorAds = allAds.filter(
        ad => ad.clientBrandId === brand.id && new Date(ad.lastSeenAt) >= oneWeekAgo
      );

      if (brandCompetitorAds.length === 0) continue;

      // New video hooks this week
      const newVideoAds = brandCompetitorAds.filter(
        a => a.isVideo && a.daysActive <= 7
      );
      if (newVideoAds.length > 0) {
        const uniqueCompetitors = new Set(newVideoAds.map(a => a.competitorName));
        insights.push({
          text: `${uniqueCompetitors.size} competitor${uniqueCompetitors.size > 1 ? 's' : ''} launched ${newVideoAds.length} new video ad${newVideoAds.length > 1 ? 's' : ''} this week`,
          brandId: brand.id,
          brandName: brand.name,
        });
      }

      // High-scoring new ads (A+ or A grade)
      const highScoring = brandCompetitorAds.filter(
        a => a.daysActive <= 7 && a.scoring?.grade && ['A+', 'A'].includes(a.scoring.grade)
      );
      if (highScoring.length > 0) {
        insights.push({
          text: `${highScoring.length} high-scoring new ad${highScoring.length > 1 ? 's' : ''} detected across ${brand.name}'s competitors`,
          brandId: brand.id,
          brandName: brand.name,
        });
      }

      // Cash cow signals (long-running, high-variation)
      const cashCows = brandCompetitorAds.filter(
        a => a.scoring?.velocity?.signal === 'cash_cow'
      );
      if (cashCows.length >= 3) {
        insights.push({
          text: `${cashCows.length} competitor ads showing "cash cow" signals for ${brand.name}`,
          brandId: brand.id,
          brandName: brand.name,
        });
      }
    }

    return insights.slice(0, 5);
  }, [clientBrands, allAds]);

  // Sorting
  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.brand.name.localeCompare(b.brand.name); break;
        case 'spend': cmp = a.spend7d - b.spend7d; break;
        case 'roas': cmp = a.roas7d - b.roas7d; break;
        case 'cpa': cmp = a.cpa7d - b.cpa7d; break;
        case 'conversions': cmp = a.conversions7d - b.conversions7d; break;
        case 'status': {
          const order = { critical: 0, dropping: 1, stable: 2, scaling: 3 };
          cmp = order[a.status] - order[b.status];
          break;
        }
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [rows, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" message="Loading command center..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Data</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state — no brands at all
  if (clientBrands.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Activity className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No brands yet</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Create your first client brand to start tracking competitors and monitoring performance.
          </p>
          <Link
            href="/brands/new"
            className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Your First Brand
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Command Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Agency performance across all clients
          </p>
        </div>
        <Link
          href="/brands/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </Link>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SnapshotCard
          label="Total Spend"
          value={snapshot.totalSpend > 0 ? formatMoney(snapshot.totalSpend) : '\u2014'}
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          sub="All-time across clients"
        />
        <SnapshotCard
          label="Avg ROAS"
          value={snapshot.weightedRoas > 0 ? `${snapshot.weightedRoas.toFixed(2)}x` : '\u2014'}
          icon={TrendingUp}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          sub="Weighted by spend"
          highlight={snapshot.weightedRoas >= 2}
        />
        <SnapshotCard
          label="Active Clients"
          value={String(snapshot.connectedCount)}
          icon={Users}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          sub="Meta connected"
        />
        <SnapshotCard
          label="Alerts"
          value={String(snapshot.alertCount)}
          icon={AlertTriangle}
          iconBg={snapshot.alertCount > 0 ? 'bg-red-50' : 'bg-slate-50'}
          iconColor={snapshot.alertCount > 0 ? 'text-red-600' : 'text-slate-400'}
          sub={snapshot.alertCount > 0 ? 'Needs attention' : 'All clear'}
          highlight={snapshot.alertCount > 0}
          highlightColor="red"
        />
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="mb-6 bg-red-50/60 border border-red-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-red-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alerts ({alerts.length})
          </h2>
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <Link
                key={i}
                href={`/brands/${alert.brandId}/performance`}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100 hover:border-red-200 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-700 whitespace-nowrap">
                    {alert.type === 'roas_drop' ? 'ROAS' : 'SPEND'}
                  </span>
                  <span className="text-sm font-medium text-slate-900 truncate">{alert.brandName}</span>
                  <span className="text-sm text-slate-600 truncate hidden sm:inline">{alert.message}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 shrink-0 ml-2" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Client Performance Table */}
      {sortedRows.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">
            Client Performance
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <SortableHeader label="Client" sortKey="name" currentKey={sortKey} dir={sortDir} onSort={handleSort} align="left" />
                    <SortableHeader label="Spend (7d)" sortKey="spend" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="ROAS (7d)" sortKey="roas" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="CPA (7d)" sortKey="cpa" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Conv (7d)" sortKey="conversions" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Status" sortKey="status" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedRows.map(row => (
                    <ClientTableRow key={row.brand.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Disconnected brands — show BrandCards */}
      {disconnectedBrands.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">
            Not Connected to Meta
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {disconnectedBrands.map(brand => (
              <BrandCard
                key={brand.id}
                brand={brand}
                adCount={allAds.filter(ad => ad.clientBrandId === brand.id).length}
              />
            ))}
          </div>
        </div>
      )}

      {/* Competitor Pulse */}
      {competitorPulse.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Competitor Pulse
          </h2>
          <div className="bg-slate-900 rounded-xl p-5">
            <div className="space-y-3">
              {competitorPulse.map((insight, i) => (
                <Link
                  key={i}
                  href={`/brands/${insight.brandId}/trends`}
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors truncate">
                      {insight.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-3 shrink-0">
                    <span className="text-xs text-slate-500">{insight.brandName}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function SnapshotCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  sub,
  highlight,
  highlightColor,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  iconBg: string;
  iconColor: string;
  sub: string;
  highlight?: boolean;
  highlightColor?: 'green' | 'red';
}) {
  const borderClass = highlight
    ? highlightColor === 'red'
      ? 'border-red-200 ring-1 ring-red-100'
      : 'border-green-200 ring-1 ring-green-100'
    : 'border-slate-200';

  return (
    <div className={`bg-white border rounded-xl p-4 ${borderClass}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{sub}</div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
  align = 'right',
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const isActive = currentKey === sortKey;
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-900 transition-colors ${
        align === 'left' ? 'text-left' : 'text-right'
      }`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          dir === 'desc'
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronUp className="w-3 h-3" />
        )}
      </span>
    </th>
  );
}

function ClientTableRow({ row }: { row: ClientRow }) {
  const config = STATUS_CONFIG[row.status];

  return (
    <tr className="group hover:bg-slate-50/50 transition-colors">
      <td className="px-4 py-3">
        <Link
          href={`/brands/${row.brand.id}/performance`}
          className="flex items-center gap-3 group/link"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: `${row.brand.color}15` }}
          >
            {row.brand.logo}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-900 group-hover/link:text-indigo-600 transition-colors truncate">
              {row.brand.name}
            </div>
            <div className="text-xs text-slate-400 truncate">{row.brand.industry}</div>
          </div>
        </Link>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-mono font-medium text-slate-900">
          {row.spend7d > 0 ? formatMoney(row.spend7d) : '\u2014'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`text-sm font-mono font-medium ${
          row.roas7d >= 2 ? 'text-green-600' : row.roas7d >= 1 ? 'text-slate-900' : row.roas7d > 0 ? 'text-red-600' : 'text-slate-400'
        }`}>
          {row.roas7d > 0 ? `${row.roas7d.toFixed(2)}x` : '\u2014'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-mono font-medium text-slate-900">
          {row.cpa7d > 0 ? formatMoney(row.cpa7d) : '\u2014'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-mono font-medium text-slate-900">
          {row.conversions7d > 0 ? formatNumber(row.conversions7d) : '\u2014'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.cls}`}>
          <span>{config.emoji}</span>
          {config.label}
        </span>
      </td>
    </tr>
  );
}

'use client';

import { ClientAd } from '@/types';
import {
  X,
  Image as ImageIcon,
  DollarSign,
  Eye,
  MousePointerClick,
  TrendingUp,
  Activity,
  FileText,
  Tag,
} from 'lucide-react';

interface ClientAdDetailModalProps {
  ad: ClientAd;
  onClose: () => void;
  accountAvgRoas?: number;
}

export function ClientAdDetailModal({ ad, onClose, accountAvgRoas }: ClientAdDetailModalProps) {
  const formatMoney = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;

  const formatNumber = (n: number) =>
    n >= 1000000
      ? `${(n / 1000000).toFixed(1)}M`
      : n >= 1000
      ? `${(n / 1000).toFixed(1)}k`
      : n.toFixed(0);

  const thumbnailUrl = ad.thumbnailUrl || ad.imageUrl;

  // Calculate comparison to account average
  const roasComparison =
    accountAvgRoas && accountAvgRoas > 0 && ad.roas > 0
      ? ((ad.roas - accountAvgRoas) / accountAvgRoas) * 100
      : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900 truncate">
                  {ad.name || 'Untitled Ad'}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ad.effectiveStatus === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : ad.effectiveStatus === 'PAUSED'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {ad.effectiveStatus || ad.status}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Thumbnail Preview */}
            {thumbnailUrl && (
              <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden">
                <img
                  src={thumbnailUrl}
                  alt={ad.name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricBox
                icon={DollarSign}
                label="Spend"
                value={formatMoney(ad.spend)}
                color="indigo"
              />
              <MetricBox
                icon={Eye}
                label="Impressions"
                value={formatNumber(ad.impressions)}
                color="blue"
              />
              <MetricBox
                icon={MousePointerClick}
                label="CTR"
                value={ad.ctr > 0 ? `${ad.ctr.toFixed(2)}%` : '—'}
                color="purple"
              />
              <MetricBox
                icon={TrendingUp}
                label="ROAS"
                value={ad.roas > 0 ? `${ad.roas.toFixed(2)}x` : '—'}
                color="green"
                highlight={ad.roas >= 2}
                subtext={
                  roasComparison !== null
                    ? `${roasComparison >= 0 ? '+' : ''}${roasComparison.toFixed(0)}% vs avg`
                    : undefined
                }
                subtextColor={
                  roasComparison !== null && roasComparison >= 0
                    ? 'text-green-600'
                    : 'text-red-500'
                }
              />
            </div>

            {/* Conversion Metrics */}
            <div className="bg-slate-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Conversion Metrics</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-slate-500">Clicks</div>
                  <div className="text-lg font-semibold text-slate-900">
                    {formatNumber(ad.clicks)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Conversions</div>
                  <div className="text-lg font-semibold text-slate-900">
                    {ad.conversions > 0 ? formatNumber(ad.conversions) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Revenue</div>
                  <div className="text-lg font-semibold text-slate-900">
                    {ad.revenue > 0 ? formatMoney(ad.revenue) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">CPA</div>
                  <div className="text-lg font-semibold text-slate-900">
                    {ad.cpa > 0 ? formatMoney(ad.cpa) : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Efficiency Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">CPC</div>
                <div className="text-xl font-semibold text-slate-900">
                  {ad.cpc > 0 ? formatMoney(ad.cpc) : '—'}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">CPM</div>
                <div className="text-xl font-semibold text-slate-900">
                  {ad.cpm > 0 ? formatMoney(ad.cpm) : '—'}
                </div>
              </div>
            </div>

            {/* Ad Copy */}
            {(ad.title || ad.body) && (
              <div className="bg-slate-50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-900">Ad Copy</h3>
                </div>
                <div className="space-y-3">
                  {ad.title && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1">
                        Headline
                      </div>
                      <p className="text-sm text-slate-900">{ad.title}</p>
                    </div>
                  )}
                  {ad.body && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1">
                        Primary Text
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {ad.body}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pattern Tags */}
            {(ad.emotionalAngle || ad.narrativeStructure) && (
              <div className="bg-slate-50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-900">Creative Patterns</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ad.emotionalAngle && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {ad.emotionalAngle}
                    </span>
                  )}
                  {ad.narrativeStructure && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {ad.narrativeStructure}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100">
              <span>Last synced: {new Date(ad.syncedAt).toLocaleDateString()}</span>
              <span>Created: {new Date(ad.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric Box Component
interface MetricBoxProps {
  icon: typeof DollarSign;
  label: string;
  value: string;
  color: 'indigo' | 'blue' | 'purple' | 'green';
  highlight?: boolean;
  subtext?: string;
  subtextColor?: string;
}

function MetricBox({
  icon: Icon,
  label,
  value,
  color,
  highlight,
  subtext,
  subtextColor,
}: MetricBoxProps) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div
      className={`bg-white border rounded-xl p-4 ${
        highlight ? 'border-green-300 ring-1 ring-green-100' : 'border-slate-200'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colorClasses[color]}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
      {subtext && (
        <div className={`text-xs mt-1 ${subtextColor || 'text-slate-400'}`}>
          {subtext}
        </div>
      )}
    </div>
  );
}

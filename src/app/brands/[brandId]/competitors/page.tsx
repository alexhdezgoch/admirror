'use client';

import { useState, useMemo, useEffect } from 'react';
import { useBrandContext, useCurrentBrand } from '@/context/BrandContext';
import { Competitor } from '@/types';
import {
  Plus,
  Trash2,
  ExternalLink,
  AlertCircle,
  Users,
  FileImage,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { UpgradeModal } from '@/components/UpgradeModal';

interface Props {
  params: { brandId: string };
}

interface SyncStatus {
  competitorId: string;
  status: 'loading' | 'success' | 'error';
  message?: string;
  newAds?: number;
  updatedAds?: number;
  archivedAds?: number;
}

export default function BrandCompetitorsPage({ params }: Props) {
  const { brandId } = params;
  const brand = useCurrentBrand(brandId);
  const { addCompetitor, removeCompetitor, getAdsForBrand, allAds, syncCompetitorAds, getSubscriptionInfo } = useBrandContext();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({
    name: '',
    logo: '',
    url: ''
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeInfo, setUpgradeInfo] = useState<{ current: number; limit: number } | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ competitorLimit: number; competitorCount: number; isPaid: boolean } | null>(null);

  useEffect(() => {
    getSubscriptionInfo(brandId).then(info => {
      if (info) setSubscriptionInfo(info);
    });
  }, [brandId, getSubscriptionInfo]);

  // Get ads for this brand
  const brandAds = useMemo(() => getAdsForBrand(brandId), [brandId, getAdsForBrand, allAds]);

  // Get ad count per competitor
  const getAdCountForCompetitor = (competitorId: string) => {
    return brandAds.filter(ad => ad.competitorId === competitorId).length;
  };

  // Get active ad count per competitor (treat undefined/null as active)
  const getActiveAdCountForCompetitor = (competitorId: string) => {
    return brandAds.filter(ad => ad.competitorId === competitorId && ad.isActive !== false).length;
  };

  // Format relative time for last synced
  const formatLastSynced = (lastSyncedAt: string | undefined): string => {
    if (!lastSyncedAt) return 'Never synced';

    const now = new Date();
    const synced = new Date(lastSyncedAt);
    const diffMs = now.getTime() - synced.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return synced.toLocaleDateString();
  };

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompetitor.name.trim() || isAddingCompetitor) return;

    setIsAddingCompetitor(true);
    try {
      const result = await addCompetitor(brandId, {
        name: newCompetitor.name.trim(),
        logo: newCompetitor.logo || '🏢',
        url: newCompetitor.url.trim(),
        totalAds: 0,
        avgAdsPerWeek: 0
      });

      if (result.error === 'COMPETITOR_LIMIT_REACHED') {
        setUpgradeInfo({ current: result.current || 0, limit: result.limit || 1 });
        setShowUpgradeModal(true);
        return;
      }

      if (result.success) {
        setNewCompetitor({ name: '', logo: '', url: '' });
        setShowAddForm(false);
      }
    } finally {
      setIsAddingCompetitor(false);
    }
  };

  const handleRemoveCompetitor = async (competitorId: string) => {
    if (confirm('Are you sure you want to remove this competitor? All associated ads will also be removed.')) {
      await removeCompetitor(brandId, competitorId);
    }
  };

  const handleSyncAds = async (competitorId: string) => {
    setSyncStatus({ competitorId, status: 'loading' });

    const result = await syncCompetitorAds(brandId, competitorId);

    if (result.success) {
      // Build descriptive message based on what happened
      const { newAds = 0, updatedAds = 0, archivedAds = 0 } = result;
      let message = '';

      if (newAds > 0 && updatedAds > 0) {
        message = `Found ${newAds} new ad${newAds !== 1 ? 's' : ''}, updated ${updatedAds}`;
      } else if (newAds > 0) {
        message = `Found ${newAds} new ad${newAds !== 1 ? 's' : ''}`;
      } else if (updatedAds > 0) {
        message = `No new ads. ${updatedAds} ad${updatedAds !== 1 ? 's' : ''} refreshed`;
      } else {
        message = 'No ads found';
      }

      if (archivedAds > 0) {
        message += `, ${archivedAds} archived`;
      }

      setSyncStatus({
        competitorId,
        status: 'success',
        message,
        newAds,
        updatedAds,
        archivedAds
      });
      // Clear success status after 4 seconds
      setTimeout(() => setSyncStatus(null), 4000);
    } else {
      setSyncStatus({
        competitorId,
        status: 'error',
        message: result.error || 'Sync failed'
      });
      // Clear error status after 5 seconds
      setTimeout(() => setSyncStatus(null), 5000);
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

  const competitors = brand.competitors || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{brand.logo}</span>
            <h1 className="text-2xl font-bold text-slate-900">Manage Competitors</h1>
          </div>
          <p className="text-slate-600">
            Add and manage competitors to track for {brand.name}.
          </p>
        </div>
        <button
          onClick={() => {
            const limit = subscriptionInfo?.competitorLimit ?? 10;
            if (subscriptionInfo && competitors.length >= limit) {
              setUpgradeInfo({ current: competitors.length, limit });
              setShowUpgradeModal(true);
            } else {
              setShowAddForm(true);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Competitor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{competitors.length}</div>
              <div className="text-sm text-slate-500">Competitors ({competitors.length}/{subscriptionInfo?.competitorLimit ?? 10})</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <FileImage className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{brandAds.length}</div>
              <div className="text-sm text-slate-500">Total Ads Tracked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Banner for Free Tier */}
      {subscriptionInfo && !subscriptionInfo.isPaid && competitors.length >= 1 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">You&apos;re on the free plan ({competitors.length} competitor)</p>
              <p className="text-sm text-slate-600">Upgrade to track up to 10 competitors &mdash; $500/mo</p>
            </div>
          </div>
          <button
            onClick={() => {
              setUpgradeInfo({ current: competitors.length, limit: subscriptionInfo.competitorLimit });
              setShowUpgradeModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            Upgrade
          </button>
        </div>
      )}

      {/* Add Competitor Form */}
      {showAddForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Add New Competitor</h3>
          <form onSubmit={handleAddCompetitor} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Competitor Name *
                </label>
                <input
                  type="text"
                  value={newCompetitor.name}
                  onChange={(e) => setNewCompetitor(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Bark Box"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Logo (emoji)
                </label>
                <input
                  type="text"
                  value={newCompetitor.logo}
                  onChange={(e) => setNewCompetitor(prev => ({ ...prev, logo: e.target.value }))}
                  placeholder="e.g., 🐕"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  maxLength={2}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Meta Ad Library URL
              </label>
              <input
                type="url"
                value={newCompetitor.url}
                onChange={(e) => setNewCompetitor(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://www.facebook.com/ads/library/?..."
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCompetitor({ name: '', logo: '', url: '' });
                }}
                disabled={isAddingCompetitor}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAddingCompetitor}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAddingCompetitor && <Loader2 className="w-4 h-4 animate-spin" />}
                {isAddingCompetitor ? 'Adding...' : 'Add Competitor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Competitors List */}
      {competitors.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {competitors.map(competitor => (
            <div
              key={competitor.id}
              className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
                  {competitor.logo}
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">{competitor.name}</h3>
                  <p className="text-sm text-slate-500">
                    {getActiveAdCountForCompetitor(competitor.id)} active ads
                    {getAdCountForCompetitor(competitor.id) - getActiveAdCountForCompetitor(competitor.id) > 0 && (
                      <span className="text-slate-400"> · {getAdCountForCompetitor(competitor.id) - getActiveAdCountForCompetitor(competitor.id)} archived</span>
                    )}
                  </p>
                  {competitor.lastSyncedAt && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      Last synced {formatLastSynced(competitor.lastSyncedAt)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Sync Status Message */}
                {syncStatus?.competitorId === competitor.id && syncStatus.status !== 'loading' && (
                  <div className={`flex items-center gap-1 text-sm ${
                    syncStatus.status === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {syncStatus.status === 'success' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>{syncStatus.message}</span>
                  </div>
                )}
                {/* Sync Ads Button */}
                {competitor.url && (
                  <button
                    onClick={() => handleSyncAds(competitor.id)}
                    disabled={syncStatus?.competitorId === competitor.id && syncStatus.status === 'loading'}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Sync ads from Meta Ad Library"
                  >
                    <RefreshCw className={`w-4 h-4 ${
                      syncStatus?.competitorId === competitor.id && syncStatus.status === 'loading' ? 'animate-spin' : ''
                    }`} />
                    {syncStatus?.competitorId === competitor.id && syncStatus.status === 'loading' ? 'Syncing...' : 'Sync Ads'}
                  </button>
                )}
                {competitor.url && (
                  <a
                    href={competitor.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                    title="View in Meta Ad Library"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
                <button
                  onClick={() => handleRemoveCompetitor(competitor.id)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Remove competitor"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No competitors yet</h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Add competitors to start tracking their ads and get competitive insights.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Your First Competitor
          </button>
        </div>
      )}

      {/* Competitor Limit Notice */}
      {competitors.length > 0 && (
        <p className="text-center text-sm text-slate-500 mt-4">
          You can track up to {subscriptionInfo?.competitorLimit ?? 10} competitors per brand. ({competitors.length}/{subscriptionInfo?.competitorLimit ?? 10} used)
        </p>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentCount={upgradeInfo?.current || 0}
        limit={upgradeInfo?.limit || 1}
        brandId={brandId}
        brandName={brand?.name || ''}
        returnUrl={typeof window !== 'undefined' ? window.location.href : undefined}
      />
    </div>
  );
}

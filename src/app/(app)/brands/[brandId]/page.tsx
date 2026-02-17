'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useBrandContext, useCurrentBrand } from '@/context/BrandContext';
import { TopAdsSection } from '@/components/TopAdsSection';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  AlertCircle,
  LayoutGrid,
  TrendingUp,
  Bookmark,
  Users,
  ArrowRight,
  BarChart3,
  RefreshCw,
  Loader2,
  Trash2,
  Pencil,
  ExternalLink,
  Check,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GenerateReportButton } from '@/components/reports/GenerateReportButton';

interface Props {
  params: { brandId: string };
}

export default function BrandDashboardPage({ params }: Props) {
  const { brandId } = params;
  const brand = useCurrentBrand(brandId);
  const { getAdsForBrand, allAds, loading, error, updateClientBrand, deleteClientBrand, refreshData } = useBrandContext();
  const router = useRouter();

  // Get ads for this brand
  const brandAds = useMemo(() => getAdsForBrand(brandId), [brandId, getAdsForBrand, allAds]);

  // Get client ads count
  const clientAdCount = useMemo(() => brandAds.filter(ad => ad.isClientAd).length, [brandAds]);

  // Get swipe file count
  const swipeFileCount = useMemo(() => brandAds.filter(ad => ad.inSwipeFile).length, [brandAds]);

  // Sync client ads
  const [isSyncingClientAds, setIsSyncingClientAds] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Brand settings state
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(brand?.adsLibraryUrl ?? '');
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);

  useEffect(() => {
    fetch(`/api/meta/status?brandId=${brandId}`)
      .then(res => res.json())
      .then(data => setMetaConnected(data.connected && !!data.adAccountId))
      .catch(() => {});
  }, [brandId]);

  const syncClientAds = useCallback(async () => {
    if (!brand?.adsLibraryUrl) return;
    setIsSyncingClientAds(true);
    setSyncMessage(null);

    try {
      const response = await fetch('/api/apify/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientBrandId: brandId,
          competitorId: 'client',
          competitorName: brand.name,
          competitorLogo: brand.logo,
          competitorUrl: brand.adsLibraryUrl,
          isClientAd: true,
          maxResults: 50,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSyncMessage(`Synced ${data.count} of your ads`);
        await refreshData();
      } else {
        setSyncMessage(data.error || 'Failed to sync your ads');
      }
    } catch {
      setSyncMessage('Failed to sync your ads');
    } finally {
      setIsSyncingClientAds(false);
    }
  }, [brand?.adsLibraryUrl, brand?.name, brand?.logo, brandId, refreshData]);

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" message="Loading dashboard..." />
      </div>
    );
  }

  // Show error state
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
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{brand.logo}</span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{brand.name}</h1>
              <p className="text-slate-500">{brand.industry}</p>
            </div>
          </div>
          <GenerateReportButton
            brandId={brandId}
            brandName={brand.name}
            industry={brand.industry}
            metaConnected={clientAdCount > 0}
          />
        </div>
      </div>

      {/* Client Ad Sync */}
      {brand.adsLibraryUrl && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 mb-8 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Your Ads</h3>
            <p className="text-sm text-slate-600">
              {clientAdCount > 0
                ? `${clientAdCount} ads synced`
                : 'Sync your ads for personalized gap analysis'}
            </p>
            {syncMessage && (
              <p className="text-sm text-indigo-600 mt-1">{syncMessage}</p>
            )}
          </div>
          <button
            onClick={syncClientAds}
            disabled={isSyncingClientAds}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSyncingClientAds ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sync My Ads
              </>
            )}
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <QuickStatCard
          icon={Users}
          label="Competitors"
          value={brand.competitors.length}
          href={`/brands/${brandId}/competitors`}
          color="indigo"
        />
        <QuickStatCard
          icon={LayoutGrid}
          label="Total Ads"
          value={brandAds.length}
          href={`/brands/${brandId}/gallery`}
          color="purple"
        />
        <QuickStatCard
          icon={Bookmark}
          label="Swipe File"
          value={swipeFileCount}
          href={`/brands/${brandId}/swipefile`}
          color="amber"
        />
        <QuickStatCard
          icon={TrendingUp}
          label="Trends"
          value={brandAds.length > 0 ? 'View' : '—'}
          href={`/brands/${brandId}/trends`}
          color="green"
        />
      </div>

      {/* Top Ads Section */}
      <section className="mb-8">
        <TopAdsSection brandId={brandId} />
      </section>

      {/* Quick Actions */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickActionCard
          icon={BarChart3}
          title="View Trends"
          description="AI-powered analysis of creative patterns across all your competitor ads"
          href={`/brands/${brandId}/trends`}
          color="purple"
        />
        <QuickActionCard
          icon={LayoutGrid}
          title="Browse Gallery"
          description="Filter, sort, and explore all synced ads with advanced filters"
          href={`/brands/${brandId}/gallery`}
          color="indigo"
        />
      </section>

      {/* Generate Report */}
      <section className="mt-8">
        <GenerateReportButton
          brandId={brandId}
          brandName={brand.name}
          industry={brand.industry}
          metaConnected={metaConnected}
        />
      </section>

      {/* Brand Settings */}
      <section className="mt-12 border-t border-slate-200 pt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Brand Settings</h2>

        {/* Ads Library URL */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <ExternalLink className="w-4 h-4 text-slate-500" />
            <h3 className="font-medium text-slate-900">Meta Ads Library URL</h3>
          </div>

          {isEditingUrl ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://www.facebook.com/ads/library/..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
              <button
                disabled={isSavingUrl}
                onClick={async () => {
                  setIsSavingUrl(true);
                  await updateClientBrand(brandId, { adsLibraryUrl: urlDraft || undefined });
                  setIsSavingUrl(false);
                  setIsEditingUrl(false);
                }}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSavingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setUrlDraft(brand.adsLibraryUrl ?? '');
                  setIsEditingUrl(false);
                }}
                className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2">
              {brand.adsLibraryUrl ? (
                <p className="text-sm text-slate-600 truncate flex-1">{brand.adsLibraryUrl}</p>
              ) : (
                <p className="text-sm text-slate-400 italic flex-1">No URL set</p>
              )}
              <button
                onClick={() => {
                  setUrlDraft(brand.adsLibraryUrl ?? '');
                  setIsEditingUrl(true);
                }}
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <Pencil className="w-3.5 h-3.5" />
                {brand.adsLibraryUrl ? 'Edit' : 'Add URL'}
              </button>
            </div>
          )}
        </div>

        {/* Delete Brand */}
        <div className="bg-white border border-red-200 rounded-xl p-5">
          <h3 className="font-medium text-red-900 mb-1">Delete Brand</h3>
          <p className="text-sm text-slate-600 mb-3">
            Permanently delete this brand and all its data. This action cannot be undone.
          </p>

          {showDeleteConfirm ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-600 font-medium">Are you sure?</span>
              <button
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  await deleteClientBrand(brandId);
                  router.push('/');
                }}
                className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Brand
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

// Quick Stat Card component
interface QuickStatCardProps {
  icon: typeof Users;
  label: string;
  value: number | string;
  href: string;
  color: 'indigo' | 'purple' | 'amber' | 'green';
}

function QuickStatCard({ icon: Icon, label, value, href, color }: QuickStatCardProps) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <Link
      href={href}
      className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </Link>
  );
}

// Quick Action Card component
interface QuickActionCardProps {
  icon: typeof Users;
  title: string;
  description: string;
  href: string;
  color: 'indigo' | 'purple' | 'green';
}

function QuickActionCard({ icon: Icon, title, description, href, color }: QuickActionCardProps) {
  const colorClasses = {
    indigo: 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
    purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    green: 'bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white',
  };

  return (
    <Link
      href={href}
      className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-md transition-all"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${colorClasses[color]} mb-4`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
    </Link>
  );
}

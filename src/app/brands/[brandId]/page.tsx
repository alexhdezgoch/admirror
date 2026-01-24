'use client';

import { useMemo } from 'react';
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
  BookOpen
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: { brandId: string };
}

export default function BrandDashboardPage({ params }: Props) {
  const { brandId } = params;
  const brand = useCurrentBrand(brandId);
  const { getAdsForBrand, allAds, loading, error } = useBrandContext();

  // Get ads for this brand
  const brandAds = useMemo(() => getAdsForBrand(brandId), [brandId, getAdsForBrand, allAds]);

  // Get swipe file count
  const swipeFileCount = useMemo(() => brandAds.filter(ad => ad.inSwipeFile).length, [brandAds]);

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
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{brand.logo}</span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{brand.name}</h1>
            <p className="text-slate-500">{brand.industry}</p>
          </div>
        </div>
      </div>

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
        <QuickActionCard
          icon={BookOpen}
          title="Playbook"
          description="AI-generated recommendations based on competitor winning patterns"
          href={`/brands/${brandId}/playbook`}
          color="green"
        />
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

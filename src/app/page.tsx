'use client';

import { useBrandContext } from '@/context/BrandContext';
import { BrandCard } from '@/components/BrandCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Plus, LayoutGrid, Users, FileImage, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AgencyDashboard() {
  const { clientBrands, allAds, loading, error } = useBrandContext();

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" message="Loading your brands..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Data</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalCompetitors = clientBrands.reduce((sum, brand) => sum + brand.competitors.length, 0);
  const totalAds = allAds.length;

  // Get ad count for each brand
  const getAdCountForBrand = (brandId: string) => {
    return allAds.filter(ad => ad.clientBrandId === brandId).length;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight mb-2">
            Your Client Brands
          </h1>
          <p className="text-slate-500 text-[15px]">
            Manage competitive intelligence for all your client brands
          </p>
        </div>
        <Link
          href="/brands/new"
          className="flex items-center gap-2.5 px-7 py-3.5 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 shadow-sm hover:shadow"
        >
          <Plus className="w-5 h-5" />
          Add New Brand
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-5 mb-10">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <LayoutGrid className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="text-[28px] font-bold text-slate-900 tracking-tight">{clientBrands.length}</div>
              <div className="text-sm text-slate-500">Client Brands</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-[28px] font-bold text-slate-900 tracking-tight">{totalCompetitors}</div>
              <div className="text-sm text-slate-500">Competitors Tracked</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <FileImage className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="text-[28px] font-bold text-slate-900 tracking-tight">{totalAds}</div>
              <div className="text-sm text-slate-500">Ads Analyzed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Grid */}
      {clientBrands.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientBrands.map(brand => (
            <BrandCard
              key={brand.id}
              brand={brand}
              adCount={getAdCountForBrand(brand.id)}
            />
          ))}

          {/* Add New Brand Card */}
          <Link
            href="/brands/new"
            className="flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 p-8 hover:border-indigo-300 hover:bg-indigo-50/30 min-h-[200px]"
          >
            <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center mb-4">
              <Plus className="w-7 h-7 text-slate-400" />
            </div>
            <span className="font-medium text-slate-600 text-[15px]">Add New Brand</span>
          </Link>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <LayoutGrid className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-3 tracking-tight">No brands yet</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto text-[15px] leading-relaxed">
            Create your first client brand to start tracking competitors and analyzing their ads.
          </p>
          <Link
            href="/brands/new"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 shadow-sm hover:shadow"
          >
            <Plus className="w-5 h-5" />
            Create Your First Brand
          </Link>
        </div>
      )}
    </div>
  );
}

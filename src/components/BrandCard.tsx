'use client';

import Link from 'next/link';
import { ClientBrand, Ad } from '@/types';
import { ArrowRight, Users, FileImage, Clock } from 'lucide-react';

interface BrandCardProps {
  brand: ClientBrand;
  adCount: number;
}

export function BrandCard({ brand, adCount }: BrandCardProps) {
  // Format the last updated date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Link
      href={`/brands/${brand.id}/gallery`}
      className="group block bg-white rounded-2xl border border-slate-100 p-7 hover:border-slate-200 hover:shadow-lg shadow-sm"
    >
      {/* Header with Logo */}
      <div className="flex items-start justify-between mb-5">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
          style={{ backgroundColor: `${brand.color}12` }}
        >
          {brand.logo}
        </div>
        <ArrowRight className="w-5 h-5 text-slate-200 group-hover:text-slate-400 group-hover:translate-x-1" />
      </div>

      {/* Brand Info */}
      <h3 className="font-semibold text-lg text-slate-900 mb-1.5 tracking-tight">{brand.name}</h3>
      <p className="text-sm text-slate-500 mb-5">{brand.industry}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 pt-5 border-t border-slate-50">
        <div className="flex items-center gap-2.5">
          <Users className="w-4 h-4 text-slate-300" />
          <span className="text-sm text-slate-600">
            {brand.competitors.length} competitor{brand.competitors.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <FileImage className="w-4 h-4 text-slate-300" />
          <span className="text-sm text-slate-600">
            {adCount} ad{adCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
        <Clock className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-xs text-slate-400">
          Updated {formatDate(brand.lastUpdated)}
        </span>
      </div>
    </Link>
  );
}

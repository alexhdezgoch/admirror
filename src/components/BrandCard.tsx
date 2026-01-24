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
      className="group block bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-lg transition-all duration-200"
    >
      {/* Header with Logo */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
          style={{ backgroundColor: `${brand.color}15` }}
        >
          {brand.logo}
        </div>
        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
      </div>

      {/* Brand Info */}
      <h3 className="font-semibold text-lg text-slate-900 mb-1">{brand.name}</h3>
      <p className="text-sm text-slate-500 mb-4">{brand.industry}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600">
            {brand.competitors.length} competitor{brand.competitors.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <FileImage className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600">
            {adCount} ad{adCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs text-slate-400">
          Updated {formatDate(brand.lastUpdated)}
        </span>
      </div>
    </Link>
  );
}

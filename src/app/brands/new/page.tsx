'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBrandContext } from '@/context/BrandContext';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Check, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const EMOJI_OPTIONS = [
  '🐕', '🐱', '🦁', '🐻', '🐼', '🦊', '🐸', '🐵',
  '👗', '👔', '👟', '👜', '💄', '💍', '👙', '🧥',
  '💪', '🏃', '🧘', '🏋️', '🥗', '💊', '🍎', '🥤',
  '🏠', '🛋️', '🛏️', '🪴', '🏡', '🔑', '🧹', '💡',
  '💻', '📱', '🎮', '🎧', '⌚', '📷', '🖥️', '🔌',
  '✈️', '🚗', '🚀', '⛵', '🏖️', '🏔️', '🎒', '🗺️',
  '📚', '🎨', '🎵', '🎬', '🎭', '📝', '✏️', '🎓',
  '💰', '📈', '💳', '🏦', '💵', '📊', '💼', '🤝',
];

const COLOR_OPTIONS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Teal', value: '#14b8a6' },
];

const INDUSTRY_OPTIONS = [
  'Pet Supplements',
  'Fashion & Apparel',
  'Health & Fitness',
  'Home & Garden',
  'Technology',
  'Travel & Tourism',
  'Education',
  'Finance',
  'Food & Beverage',
  'Beauty & Skincare',
  'SaaS / Software',
  'E-commerce',
  'Other',
];

export default function NewBrandPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { createClientBrand, error: contextError, loading: brandLoading } = useBrandContext();

  const [name, setName] = useState('');
  const [logo, setLogo] = useState('🏢');
  const [industry, setIndustry] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [adsLibraryUrl, setAdsLibraryUrl] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Debug: Log auth state
  useEffect(() => {
    console.log('Auth state:', { user: user?.email, authLoading, brandLoading });
  }, [user, authLoading, brandLoading]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Clear local error when context error changes
  useEffect(() => {
    if (contextError) {
      setLocalError(contextError);
    }
  }, [contextError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !industry || isSubmitting) return;

    setIsSubmitting(true);
    setLocalError(null);

    try {
      const newBrand = await createClientBrand({
        name: name.trim(),
        logo,
        industry,
        color,
        adsLibraryUrl: adsLibraryUrl.trim() || undefined,
      });

      if (newBrand) {
        router.push(`/brands/${newBrand.id}/competitors`);
      } else {
        // Show generic error - contextError effect will update it
        setLocalError('Failed to create brand. Please try again.');
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = name.trim().length > 0 && industry.length > 0;

  // Show loading state while checking auth
  if (authLoading || brandLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Don't render form if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2.5 text-slate-500 hover:text-slate-900 mb-10"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10">
        <h1 className="text-[28px] font-bold text-slate-900 tracking-tight mb-3">Create New Brand</h1>
        <p className="text-slate-500 mb-10 text-[15px]">
          Add a new client brand to track their competitors
        </p>

        {/* Error Display */}
        {localError && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 mb-8">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Logo & Name Row */}
          <div className="flex gap-4">
            {/* Logo Picker */}
            <div className="relative">
              <label className="block text-sm font-medium text-slate-600 mb-2.5">
                Logo
              </label>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-16 h-16 rounded-2xl border-2 border-slate-100 flex items-center justify-center text-3xl hover:border-indigo-200 shadow-sm"
                style={{ backgroundColor: `${color}10` }}
              >
                {logo}
              </button>

              {/* Emoji Picker Dropdown */}
              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-2 p-4 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 w-80">
                  <div className="grid grid-cols-8 gap-1.5">
                    {EMOJI_OPTIONS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setLogo(emoji);
                          setShowEmojiPicker(false);
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-slate-100 ${
                          logo === emoji ? 'bg-indigo-100' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Brand Name */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-2.5">
                Brand Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., PawPure, StyleCo"
                className="w-full px-5 py-3.5 border border-slate-100 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
              />
            </div>
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2.5">
              Industry
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-5 py-3.5 border border-slate-100 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
            >
              <option value="">Select an industry...</option>
              {INDUSTRY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Meta Ads Library URL (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2.5">
              Meta Ads Library URL <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={adsLibraryUrl}
              onChange={(e) => setAdsLibraryUrl(e.target.value)}
              placeholder="https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&view_all_page_id=..."
              className="w-full px-5 py-3.5 border border-slate-100 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm shadow-sm"
            />
            <p className="mt-2.5 text-xs text-slate-400">
              Add the brand's own Meta Ads Library URL to track and compare their ads alongside competitors
            </p>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-3">
              Brand Color
            </label>
            <div className="flex gap-2.5">
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                    color === opt.value ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : ''
                  }`}
                  style={{ backgroundColor: opt.value }}
                  title={opt.name}
                >
                  {color === opt.value && <Check className="w-5 h-5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="pt-8 border-t border-slate-50">
            <label className="block text-sm font-medium text-slate-600 mb-4">
              Preview
            </label>
            <div className="flex items-center gap-5 p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: `${color}12` }}
              >
                {logo}
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-lg tracking-tight">
                  {name || 'Brand Name'}
                </div>
                <div className="text-sm text-slate-500 mt-0.5">
                  {industry || 'Industry'}
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-6">
            <Link
              href="/"
              className="flex-1 px-6 py-3.5 text-center border border-slate-100 text-slate-700 font-medium rounded-full hover:bg-slate-50 shadow-sm"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex-1 px-6 py-3.5 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-sm hover:shadow"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Creating...' : 'Create Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

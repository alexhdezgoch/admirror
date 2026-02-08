'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBrandContext } from '@/context/BrandContext';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Check, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { BrandUpgradeModal } from '@/components/BrandUpgradeModal';

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
  const { createClientBrand, checkBrandLimit, error: contextError, loading: brandLoading } = useBrandContext();

  const [name, setName] = useState('');
  const [logo, setLogo] = useState('🏢');
  const [industry, setIndustry] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [adsLibraryUrl, setAdsLibraryUrl] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [brandLimitInfo, setBrandLimitInfo] = useState<{ brandCount: number; allowedBrands: number } | null>(null);
  const [checkingLimit, setCheckingLimit] = useState(true);

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

  // Check brand limit on page load
  useEffect(() => {
    const checkLimit = async () => {
      if (!user || authLoading || brandLoading) return;

      setCheckingLimit(true);
      const limitInfo = await checkBrandLimit();
      setBrandLimitInfo({ brandCount: limitInfo.brandCount, allowedBrands: limitInfo.allowedBrands });

      if (!limitInfo.canCreate) {
        setShowUpgradeModal(true);
      }
      setCheckingLimit(false);
    };

    checkLimit();
  }, [user, authLoading, brandLoading, checkBrandLimit]);

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
      const result = await createClientBrand({
        name: name.trim(),
        logo,
        industry,
        color,
        adsLibraryUrl: adsLibraryUrl.trim() || undefined,
      });

      if (result.success && result.brand) {
        router.push(`/brands/${result.brand.id}/competitors`);
      } else if (result.error === 'BRAND_LIMIT_REACHED') {
        // Show upgrade modal
        setBrandLimitInfo({
          brandCount: result.brandCount || 0,
          allowedBrands: result.allowedBrands || 1,
        });
        setShowUpgradeModal(true);
      } else {
        // Show generic error - contextError effect will update it
        setLocalError(result.error || 'Failed to create brand. Please try again.');
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = name.trim().length > 0 && industry.length > 0;

  // Show loading state while checking auth or brand limit
  if (authLoading || brandLoading || checkingLimit) {
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
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Create New Brand</h1>
        <p className="text-slate-600 mb-8">
          Add a new client brand to track their competitors
        </p>

        {/* Error Display */}
        {localError && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo & Name Row */}
          <div className="flex gap-4">
            {/* Logo Picker */}
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Logo
              </label>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-16 h-16 rounded-xl border-2 border-slate-200 flex items-center justify-center text-3xl hover:border-indigo-300 transition-colors"
                style={{ backgroundColor: `${color}15` }}
              >
                {logo}
              </button>

              {/* Emoji Picker Dropdown */}
              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-xl shadow-lg border border-slate-200 z-50 w-72">
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJI_OPTIONS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setLogo(emoji);
                          setShowEmojiPicker(false);
                        }}
                        className={`w-8 h-8 rounded flex items-center justify-center text-lg hover:bg-slate-100 transition-colors ${
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
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Brand Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., PawPure, StyleCo"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Industry
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select an industry...</option>
              {INDUSTRY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Meta Ads Library URL (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Meta Ads Library URL <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={adsLibraryUrl}
              onChange={(e) => setAdsLibraryUrl(e.target.value)}
              placeholder="https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&view_all_page_id=..."
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Add the brand's own Meta Ads Library URL to track and compare their ads alongside competitors
            </p>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Brand Color
            </label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
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
          <div className="pt-6 border-t border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Preview
            </label>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: `${color}15` }}
              >
                {logo}
              </div>
              <div>
                <div className="font-semibold text-slate-900">
                  {name || 'Brand Name'}
                </div>
                <div className="text-sm text-slate-500">
                  {industry || 'Industry'}
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Link
              href="/"
              className="flex-1 px-4 py-3 text-center border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex-1 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Creating...' : 'Create Brand'}
            </button>
          </div>
        </form>
      </div>

      {/* Brand Upgrade Modal */}
      {brandLimitInfo && (
        <BrandUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            router.push('/');
          }}
          brandCount={brandLimitInfo.brandCount}
          allowedBrands={brandLimitInfo.allowedBrands}
          returnUrl={typeof window !== 'undefined' ? window.location.href : undefined}
        />
      )}
    </div>
  );
}

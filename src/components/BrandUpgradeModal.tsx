'use client';

import { useState } from 'react';
import { X, Building2, Zap, CreditCard, Loader2, TrendingUp, Users } from 'lucide-react';

interface BrandUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandCount: number;
  allowedBrands: number;
  returnUrl?: string;
}

export function BrandUpgradeModal({ isOpen, onClose, brandCount, allowedBrands, returnUrl }: BrandUpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-brand-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: returnUrl || window.location.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error creating checkout:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-6 pt-8 pb-6 text-center border-b border-gray-800">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Add Another Brand</h2>
          <p className="text-gray-400">
            You&apos;re using <span className="text-white font-semibold">{brandCount}</span> of{' '}
            <span className="text-white font-semibold">{allowedBrands}</span> brand slot{allowedBrands !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Usage bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Current usage</span>
              <span className="text-white font-medium">{brandCount}/{allowedBrands} brands</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
                style={{ width: `${Math.min((brandCount / allowedBrands) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Free tier info */}
          <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <p className="text-gray-300 text-sm">
              Your free plan includes <span className="text-white font-semibold">1 brand</span> with 1 competitor.
              Add more brands to track multiple clients or product lines.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-violet-500" />
              </div>
              <span>Add a new brand to your account</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <span>Track up to 10 competitors per paid brand</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <span>Full competitive intelligence &amp; trend analysis</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-yellow-500" />
              </div>
              <span>Cancel anytime, no long-term commitment</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full py-4 px-6 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Redirecting to checkout...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Add Brand - $500/mo</span>
              </>
            )}
          </button>

          <p className="text-center text-gray-500 text-xs mt-4">
            Monthly subscription per brand. Cancel anytime from billing portal.
          </p>
        </div>
      </div>
    </div>
  );
}

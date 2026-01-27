'use client';

import { useState } from 'react';
import { X, Users, Zap, CreditCard, Loader2, TrendingUp } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  limit: number;
  brandId: string;
  brandName: string;
  returnUrl?: string;
}

export function UpgradeModal({ isOpen, onClose, currentCount, limit, brandId, brandName, returnUrl }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          brandName,
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
            <Users className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Upgrade {brandName}</h2>
          <p className="text-gray-400">
            You&apos;re using <span className="text-white font-semibold">{currentCount}</span> of{' '}
            <span className="text-white font-semibold">{limit}</span> competitor slot{limit !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Usage bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Current usage</span>
              <span className="text-white font-medium">{currentCount}/{limit} competitors</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
                style={{ width: `${Math.min((currentCount / limit) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-yellow-500" />
              </div>
              <span>Track up to 10 competitors for this brand</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <span>Full competitive intelligence &amp; trend analysis</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-500" />
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
                <span>Upgrade Brand - $500/mo</span>
              </>
            )}
          </button>

          <p className="text-center text-gray-500 text-xs mt-4">
            Monthly subscription. Cancel anytime from billing portal.
          </p>
        </div>
      </div>
    </div>
  );
}

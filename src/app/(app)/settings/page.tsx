'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBrandContext } from '@/context/BrandContext';
import { Building2, Users, CreditCard, Loader2, Calendar } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { subscription, loading } = useBrandContext();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleManageBilling = async () => {
    setActionLoading('billing');
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open billing portal');
      }
    } catch {
      alert('Failed to open billing portal');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Please sign in to view settings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const FREE_EMAILS = new Set(['alex@akeep.co']);
  const isFreeAccount = user.email ? FREE_EMAILS.has(user.email) : false;

  const brandCost = subscription.brandQuantity * 50;
  const competitorCost = subscription.competitorQuantity * 30;
  const totalCost = brandCost + competitorCost;

  const nextBillingDate = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const statusColor = {
    active: 'bg-green-100 text-green-800',
    past_due: 'bg-yellow-100 text-yellow-800',
    canceled: 'bg-red-100 text-red-800',
    inactive: 'bg-slate-100 text-slate-800',
  }[subscription.status] || 'bg-slate-100 text-slate-800';

  if (isFreeAccount) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-8">Settings</h1>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Account</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Free Account
              </span>
            </div>
            <p className="text-slate-600 text-sm">
              {user.email} — unlimited brands and competitors, no billing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Settings</h1>

        {/* Usage Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Usage & Billing</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
              {subscription.status}
            </span>
          </div>

          <div className="space-y-4">
            {/* Brands */}
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <span className="text-slate-900 font-medium">
                    {subscription.brandQuantity} brand{subscription.brandQuantity !== 1 ? 's' : ''}
                  </span>
                  <span className="text-slate-400 ml-1 text-sm">× $50/mo</span>
                </div>
              </div>
              <span className="text-slate-900 font-medium">${brandCost}/mo</span>
            </div>

            {/* Competitors */}
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <span className="text-slate-900 font-medium">
                    {subscription.competitorQuantity} competitor{subscription.competitorQuantity !== 1 ? 's' : ''}
                  </span>
                  <span className="text-slate-400 ml-1 text-sm">× $30/mo</span>
                </div>
              </div>
              <span className="text-slate-900 font-medium">${competitorCost}/mo</span>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between py-3">
              <span className="text-slate-900 font-semibold">Total</span>
              <span className="text-xl font-bold text-slate-900">${totalCost}/mo</span>
            </div>
          </div>

          {/* Next Billing Date */}
          {nextBillingDate && subscription.status === 'active' && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
              <Calendar className="w-4 h-4" />
              <span>Next billing date: {nextBillingDate}</span>
            </div>
          )}
        </div>

        {/* Billing Portal */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment Method</h2>

          <button
            onClick={handleManageBilling}
            disabled={actionLoading === 'billing' || !subscription.stripeCustomerId}
            className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading === 'billing' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Manage Billing
              </>
            )}
          </button>

          {!subscription.stripeCustomerId && (
            <p className="text-sm text-slate-400 mt-2">
              Billing portal available after adding your first brand.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

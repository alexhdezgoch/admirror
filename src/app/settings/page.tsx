'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface SubscriptionInfo {
  status: string;
  competitor_limit: number;
  stripe_customer_id: string | null;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [competitorsUsed, setCompetitorsUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const supabase = createClient();

      const [subResult, compResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('status, competitor_limit, stripe_customer_id')
          .eq('user_id', user!.id)
          .single(),
        supabase
          .from('competitors')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id),
      ]);

      if (subResult.data) {
        setSubscription(subResult.data);
      }
      setCompetitorsUsed(compResult.count ?? 0);
      setLoading(false);
    }

    fetchData();
  }, [user]);

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

  const handleAddSlot = async () => {
    setActionLoading('checkout');
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout');
      }
    } catch {
      alert('Failed to start checkout');
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
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const limit = subscription?.competitor_limit ?? 1;
  const status = subscription?.status ?? 'inactive';

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Settings</h1>

        {/* Subscription Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Subscription</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Status</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                status === 'active' ? 'bg-green-100 text-green-800' :
                status === 'past_due' ? 'bg-yellow-100 text-yellow-800' :
                'bg-slate-100 text-slate-800'
              }`}>
                {status}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600">Competitor Slots</span>
              <span className="text-slate-900 font-medium">
                {competitorsUsed} / {limit} used
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Billing</h2>

          <div className="space-y-3">
            <button
              onClick={handleManageBilling}
              disabled={actionLoading === 'billing'}
              className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'billing' ? 'Opening...' : 'Manage Billing'}
            </button>

            <button
              onClick={handleAddSlot}
              disabled={actionLoading === 'checkout'}
              className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'checkout' ? 'Opening...' : 'Add Competitor Slot — $75'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

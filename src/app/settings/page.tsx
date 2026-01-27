'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface BrandSubInfo {
  brand_id: string;
  brand_name: string;
  status: string;
  competitor_limit: number;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [brandSubs, setBrandSubs] = useState<BrandSubInfo[]>([]);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        return;
      }

      // Fetch user's subscription record for stripe customer id
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user!.id)
        .single();

      if (subData?.stripe_customer_id) {
        setStripeCustomerId(subData.stripe_customer_id);
      }

      // Fetch brand subscriptions with brand names
      const { data: brandSubsData } = await supabase
        .from('brand_subscriptions')
        .select('brand_id, status, competitor_limit')
        .eq('user_id', user!.id);

      if (brandSubsData && brandSubsData.length > 0) {
        // Get brand names
        const brandIds = brandSubsData.map(bs => bs.brand_id);
        const { data: brandsData } = await supabase
          .from('client_brands')
          .select('id, name')
          .in('id', brandIds);

        const brandNameMap = new Map(brandsData?.map(b => [b.id, b.name]) || []);

        setBrandSubs(brandSubsData.map(bs => ({
          brand_id: bs.brand_id,
          brand_name: brandNameMap.get(bs.brand_id) || 'Unknown Brand',
          status: bs.status,
          competitor_limit: bs.competitor_limit,
        })));
      }

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

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Settings</h1>

        {/* Brand Subscriptions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Brand Subscriptions</h2>

          {brandSubs.length > 0 ? (
            <div className="space-y-3">
              {brandSubs.map(bs => (
                <div key={bs.brand_id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <span className="text-slate-900 font-medium">{bs.brand_name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">Up to {bs.competitor_limit} competitors</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      bs.status === 'active' ? 'bg-green-100 text-green-800' :
                      bs.status === 'past_due' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {bs.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">
              No paid brand subscriptions. Free brands get 1 competitor each.
            </p>
          )}
        </div>

        {/* Billing */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Billing</h2>

          <button
            onClick={handleManageBilling}
            disabled={actionLoading === 'billing' || !stripeCustomerId}
            className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {actionLoading === 'billing' ? 'Opening...' : 'Manage Billing'}
          </button>

          {!stripeCustomerId && (
            <p className="text-sm text-slate-400 mt-2">
              Billing portal available after upgrading a brand.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

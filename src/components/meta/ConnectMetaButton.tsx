'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link2, Unlink, ChevronDown, RefreshCw, Check } from 'lucide-react';

interface AdAccount {
  id: string;
  name: string;
}

interface MetaStatus {
  connected: boolean;
  adAccountId?: string | null;
  adAccountName?: string | null;
  error?: string;
}

export function ConnectMetaButton({ brandId }: { brandId: string }) {
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [selectingAccount, setSelectingAccount] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/meta/status?brandId=${brandId}`);
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/meta/accounts?brandId=${brandId}`);
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts);
      }
    } catch {
      // silently fail
    }
  }, [brandId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Fetch accounts when connected and no account selected, or when picker is opened
  useEffect(() => {
    if (status?.connected && (!status.adAccountId || showAccountPicker)) {
      fetchAccounts();
    }
  }, [status?.connected, status?.adAccountId, showAccountPicker, fetchAccounts]);

  // Auto-show account picker if connected but no account selected
  useEffect(() => {
    if (status?.connected && !status.adAccountId && accounts.length > 0) {
      setShowAccountPicker(true);
    }
  }, [status, accounts]);

  const handleConnect = () => {
    window.location.href = `/api/meta/auth?brandId=${brandId}`;
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/meta/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ connected: false });
        setAccounts([]);
        setShowAccountPicker(false);
      }
    } catch {
      // silently fail
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSelectAccount = async (account: AdAccount) => {
    setSelectingAccount(true);
    try {
      const res = await fetch('/api/meta/accounts/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          accountName: account.name,
          brandId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                adAccountId: account.id,
                adAccountName: account.name,
              }
            : prev
        );
        setShowAccountPicker(false);
      }
    } catch {
      // silently fail
    } finally {
      setSelectingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-slate-100 rounded-xl p-6 h-32" />
    );
  }

  // Not connected
  if (!status?.connected) {
    return (
      <div className="border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Meta Ads Connection</h3>
            <p className="text-sm text-slate-500 mt-1">
              Connect your Meta (Facebook) Ads account to sync your own ad performance data.
            </p>
            {status?.error && (
              <p className="text-sm text-red-600 mt-2">{status.error}</p>
            )}
          </div>
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shrink-0"
          >
            <Link2 className="w-4 h-4" />
            Connect Meta
          </button>
        </div>
      </div>
    );
  }

  // Connected
  return (
    <div className="border border-slate-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Meta Ads Connection</h3>
            <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3" />
              Connected
            </span>
          </div>
          {status.adAccountName && (
            <p className="text-sm text-slate-500 mt-1">
              Ad Account: <span className="font-medium text-slate-700">{status.adAccountName}</span>
              {status.adAccountId && (
                <span className="text-slate-400 ml-1">({status.adAccountId})</span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAccountPicker(!showAccountPicker)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Change Account
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAccountPicker ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Unlink className="w-3.5 h-3.5" />
            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </div>

      {/* Account picker dropdown */}
      {showAccountPicker && (
        <div className="border border-slate-200 rounded-lg mt-3">
          {accounts.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 text-center">
              Loading ad accounts...
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleSelectAccount(account)}
                  disabled={selectingAccount}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors disabled:opacity-50 ${
                    status.adAccountId === account.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900">{account.name}</div>
                    <div className="text-xs text-slate-500">ID: {account.id}</div>
                  </div>
                  {status.adAccountId === account.id && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

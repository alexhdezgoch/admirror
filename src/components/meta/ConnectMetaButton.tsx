'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link2, Unlink, RefreshCw, AlertCircle } from 'lucide-react';

interface MetaStatus {
  connected: boolean;
  expired?: boolean;
  adAccountId: string | null;
  adAccountName: string | null;
  connectedAt?: string;
  tokenExpiresAt?: string;
}

interface Props {
  brandId?: string;
}

export function ConnectMetaButton({ brandId }: Props) {
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!brandId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/meta/status?brandId=${brandId}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch Meta status:', err);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = () => {
    if (!brandId) {
      console.error('brandId is required to connect Meta');
      return;
    }
    window.location.href = `/api/meta/auth?brandId=${brandId}`;
  };

  const handleDisconnect = async () => {
    if (!brandId) {
      console.error('brandId is required to disconnect Meta');
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch('/api/meta/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId }),
      });
      if (res.ok) {
        setStatus({ connected: false, adAccountId: null, adAccountName: null });
      }
    } catch (err) {
      console.error('Failed to disconnect Meta:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleReconnect = () => {
    if (!brandId) {
      console.error('brandId is required to reconnect Meta');
      return;
    }
    window.location.href = `/api/meta/auth?brandId=${brandId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
        <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
        <span className="text-sm text-slate-500">Checking Meta connection...</span>
      </div>
    );
  }

  // Token expired — needs reconnection
  if (status?.expired) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">Meta token expired</p>
            <p className="text-xs text-amber-600">Reconnect to refresh your ad data</p>
          </div>
        </div>
        <button
          onClick={handleReconnect}
          className="px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors"
        >
          Reconnect
        </button>
      </div>
    );
  }

  // Connected
  if (status?.connected) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 rounded-lg border border-emerald-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          <div>
            <p className="text-sm font-medium text-emerald-800">
              Meta Connected
            </p>
            {status.adAccountName && (
              <p className="text-xs text-emerald-600">
                {status.adAccountName}
                {status.adAccountId && (
                  <span className="text-emerald-400 ml-1">
                    (act_{status.adAccountId})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
        >
          {disconnecting ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Unlink className="w-3 h-3" />
          )}
          Disconnect
        </button>
      </div>
    );
  }

  // Not connected
  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
    >
      <Link2 className="w-4 h-4" />
      <div className="text-left">
        <p className="text-sm font-medium">Connect Meta Ads</p>
        <p className="text-xs text-blue-200">Import your ad performance data</p>
      </div>
    </button>
  );
}

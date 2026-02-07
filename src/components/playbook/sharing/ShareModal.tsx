'use client';

import { useState } from 'react';
import { PlaybookRow } from '@/types/playbook';
import { X, Link as LinkIcon, Copy, Check, Globe, Lock, Loader2 } from 'lucide-react';

interface Props {
  playbook: PlaybookRow;
  onClose: () => void;
  onUpdate: (playbook: PlaybookRow) => void;
}

export function ShareModal({ playbook, onClose, onUpdate }: Props) {
  const [isPublic, setIsPublic] = useState(playbook.is_public);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(
    playbook.is_public ? `${window.location.origin}/playbook/${playbook.share_token}` : null
  );

  const handleToggleShare = async () => {
    setLoading(true);

    try {
      const newIsPublic = !isPublic;

      if (newIsPublic) {
        // Enable sharing
        const res = await fetch(`/api/playbooks/${playbook.id}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublic: true }),
        });

        const data = await res.json();

        if (data.success) {
          setIsPublic(true);
          setShareUrl(data.shareUrl);
          onUpdate({ ...playbook, is_public: true });
        }
      } else {
        // Disable sharing
        const res = await fetch(`/api/playbooks/${playbook.id}/share`, {
          method: 'DELETE',
        });

        const data = await res.json();

        if (data.success) {
          setIsPublic(false);
          setShareUrl(null);
          onUpdate({ ...playbook, is_public: false });
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <LinkIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Share Playbook</h2>
            <p className="text-sm text-slate-500">Create a public link anyone can view</p>
          </div>
        </div>

        {/* Toggle */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="w-5 h-5 text-green-600" />
              ) : (
                <Lock className="w-5 h-5 text-slate-400" />
              )}
              <div>
                <p className="font-medium text-slate-900">
                  {isPublic ? 'Public' : 'Private'}
                </p>
                <p className="text-sm text-slate-500">
                  {isPublic ? 'Anyone with the link can view' : 'Only you can view'}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleShare}
              disabled={loading}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isPublic ? 'bg-green-500' : 'bg-slate-300'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isPublic ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
              {loading && (
                <Loader2 className="absolute inset-0 m-auto w-4 h-4 animate-spin text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Share URL */}
        {isPublic && shareUrl && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Share Link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-700 truncate"
              />
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-slate-400 mt-6">
          Shared playbooks do not include any login or authentication. Anyone with the link can view the content.
        </p>
      </div>
    </div>
  );
}

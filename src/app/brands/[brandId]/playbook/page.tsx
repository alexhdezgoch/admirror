'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCurrentBrand } from '@/context/BrandContext';
import { PlaybookGenerator } from '@/components/playbook/PlaybookGenerator';
import { PlaybookViewer } from '@/components/playbook/PlaybookViewer';
import { PlaybookList } from '@/components/playbook/PlaybookList';
import { ShareModal } from '@/components/playbook/sharing/ShareModal';
import { PDFDownloadButton } from '@/components/playbook/pdf/PDFDownloadButton';
import { PlaybookRow } from '@/types/playbook';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AlertCircle, BookOpen, ArrowLeft, Share2 } from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: { brandId: string };
}

export default function PlaybookPage({ params }: Props) {
  const { brandId } = params;
  const brand = useCurrentBrand(brandId);

  const [playbooks, setPlaybooks] = useState<PlaybookRow[]>([]);
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [playbookToShare, setPlaybookToShare] = useState<PlaybookRow | null>(null);

  const fetchPlaybooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/playbooks?brandId=${brandId}`);
      const data = await res.json();
      if (data.success) {
        setPlaybooks(data.playbooks || []);
        // Select the most recent one if none selected
        if (data.playbooks?.length > 0 && !selectedPlaybook) {
          setSelectedPlaybook(data.playbooks[0]);
        }
      }
    } catch {
      // Ignore errors
    } finally {
      setLoading(false);
    }
  }, [brandId, selectedPlaybook]);

  useEffect(() => {
    fetchPlaybooks();
  }, [fetchPlaybooks]);

  const handleGenerated = (playbook: PlaybookRow) => {
    setPlaybooks(prev => [playbook, ...prev]);
    setSelectedPlaybook(playbook);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this playbook?')) return;

    try {
      const res = await fetch(`/api/playbooks/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPlaybooks(prev => prev.filter(p => p.id !== id));
        if (selectedPlaybook?.id === id) {
          setSelectedPlaybook(playbooks.find(p => p.id !== id) || null);
        }
      }
    } catch {
      // Ignore
    }
  };

  const handleShare = (playbook: PlaybookRow) => {
    setPlaybookToShare(playbook);
    setShareModalOpen(true);
  };

  const handleShareUpdate = (updatedPlaybook: PlaybookRow) => {
    setPlaybooks(prev => prev.map(p => p.id === updatedPlaybook.id ? updatedPlaybook : p));
    if (selectedPlaybook?.id === updatedPlaybook.id) {
      setSelectedPlaybook(updatedPlaybook);
    }
  };

  if (!brand) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Brand not found</h1>
        <Link href="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <LoadingSpinner size="lg" message="Loading playbooks..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">Creative Playbook</h1>
          </div>
          <p className="text-slate-500">
            AI-synthesized creative strategy briefs for {brand.name}
          </p>
        </div>

        {selectedPlaybook && (
          <div className="flex items-center gap-2">
            <PDFDownloadButton playbook={selectedPlaybook} brandName={brand.name} />
            <button
              onClick={() => handleShare(selectedPlaybook)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Left Sidebar - Playbook List */}
        <div className="lg:col-span-1 space-y-6">
          {/* Generate New */}
          {!selectedPlaybook && playbooks.length === 0 ? null : (
            <button
              onClick={() => setSelectedPlaybook(null)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              New Playbook
            </button>
          )}

          {/* Previous Playbooks */}
          <PlaybookList
            playbooks={playbooks}
            selectedId={selectedPlaybook?.id}
            onSelect={setSelectedPlaybook}
            onDelete={handleDelete}
            onShare={handleShare}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {selectedPlaybook ? (
            <div>
              {/* Playbook Header */}
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => setSelectedPlaybook(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedPlaybook.title}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Generated {new Date(selectedPlaybook.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Playbook Content */}
              <PlaybookViewer playbook={selectedPlaybook} />
            </div>
          ) : (
            <PlaybookGenerator brandId={brandId} onGenerated={handleGenerated} />
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareModalOpen && playbookToShare && (
        <ShareModal
          playbook={playbookToShare}
          onClose={() => setShareModalOpen(false)}
          onUpdate={handleShareUpdate}
        />
      )}
    </div>
  );
}

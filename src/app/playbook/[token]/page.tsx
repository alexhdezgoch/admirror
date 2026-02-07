'use client';

import { useState, useEffect } from 'react';
import { PlaybookViewer } from '@/components/playbook/PlaybookViewer';
import { PlaybookRow } from '@/types/playbook';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AlertCircle, BookOpen, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: { token: string };
}

export default function PublicPlaybookPage({ params }: Props) {
  const { token } = params;

  const [playbook, setPlaybook] = useState<PlaybookRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaybook = async () => {
      try {
        const res = await fetch(`/api/playbooks/public/${token}`);
        const data = await res.json();

        if (data.success) {
          setPlaybook(data.playbook);
        } else {
          setError(data.error || 'Playbook not found');
        }
      } catch {
        setError('Failed to load playbook');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaybook();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading playbook..." />
      </div>
    );
  }

  if (error || !playbook) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Playbook Not Found
          </h1>
          <p className="text-slate-600 mb-6">
            {error || 'This playbook may have been deleted or the link has expired.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Go to AdMirror
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AM</span>
              </div>
              <span className="font-semibold text-slate-900">AdMirror</span>
            </div>

            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
            >
              Create your own playbook
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">
              {playbook.title}
            </h1>
          </div>
          <p className="text-slate-500">
            Creative Strategy Brief | Generated {new Date(playbook.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Playbook Content */}
        <PlaybookViewer playbook={playbook} showDataSnapshot={false} />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AM</span>
              </div>
              <div>
                <span className="font-semibold text-slate-900">AdMirror</span>
                <p className="text-sm text-slate-500">AI-powered creative intelligence</p>
              </div>
            </div>

            <Link
              href="/"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Try AdMirror Free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

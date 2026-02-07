'use client';

import { useState } from 'react';
import { BookOpen, Sparkles, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PlaybookRow, InsufficientDataDetails } from '@/types/playbook';
import { InsufficientDataCard } from './InsufficientDataCard';

interface Props {
  brandId: string;
  onGenerated: (playbook: PlaybookRow) => void;
  onAddCompetitors?: () => void;
}

type InsufficientDataError = {
  type: 'insufficient_competitor_data';
  details: InsufficientDataDetails;
};

export function PlaybookGenerator({ brandId, onGenerated, onAddCompetitors }: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insufficientData, setInsufficientData] = useState<InsufficientDataError | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setInsufficientData(null);

    try {
      const response = await fetch('/api/playbooks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId }),
      });

      const data = await response.json();

      if (data.success && data.playbook) {
        onGenerated(data.playbook);
      } else if (data.error === 'insufficient_competitor_data') {
        // Only competitor data validation still exists
        setInsufficientData({
          type: data.error,
          details: data.details,
        });
      } else {
        setError(data.error || 'Failed to generate playbook');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setGenerating(false);
    }
  };

  const handleRetry = () => {
    if (onAddCompetitors) {
      onAddCompetitors();
    }
    setInsufficientData(null);
  };

  // Show insufficient data card if validation failed
  if (insufficientData) {
    return (
      <InsufficientDataCard
        type={insufficientData.type}
        details={insufficientData.details}
        onRetry={handleRetry}
      />
    );
  }

  if (generating) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-12 border border-indigo-100 text-center">
        <LoadingSpinner size="lg" message="Creating your creative strategy playbook..." />
        <p className="text-sm text-slate-500 mt-4">
          Synthesizing your performance data with competitor insights...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-8 border border-indigo-100">
      <div className="text-center max-w-xl mx-auto">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          Generate Creative Playbook
        </h2>

        <p className="text-slate-600 mb-6">
          Get a premium creative strategy brief that synthesizes your ad performance
          with competitor intelligence. Like having a $500/hr creative strategist
          analyze your data.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
          <div className="bg-white/60 rounded-lg p-3">
            <span className="font-medium text-slate-700">What formats to create</span>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <span className="font-medium text-slate-700">Hooks to test</span>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <span className="font-medium text-slate-700">Competitor gaps to exploit</span>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <span className="font-medium text-slate-700">What to stop doing</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 text-left">{error}</p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          <Sparkles className="w-5 h-5" />
          Generate Playbook
        </button>
      </div>
    </div>
  );
}

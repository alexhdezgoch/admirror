'use client';

import { useState, useCallback, useRef } from 'react';
import {
  FileText,
  CheckCircle2,
  Loader2,
  Circle,
  XCircle,
  MinusCircle,
  X,
  Download,
} from 'lucide-react';
import { ReportBranding } from '@/types/report';

interface Props {
  brandId: string;
  brandName: string;
  industry: string;
  metaConnected: boolean;
}

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

interface Step {
  key: string;
  label: string;
  status: StepStatus;
}

const STEP_LABELS: Record<string, string> = {
  loading_data: 'Loading ad data',
  syncing_meta: 'Syncing Meta ads',
  analyzing_trends: 'Analyzing industry trends',
  analyzing_hooks: 'Analyzing hook patterns',
  analyzing_patterns: 'Analyzing creative patterns',
  generating_playbook: 'Generating creative playbook',
  computing_report: 'Computing competitive signals',
};

const STEP_ORDER = [
  'loading_data',
  'syncing_meta',
  'analyzing_trends',
  'analyzing_hooks',
  'analyzing_patterns',
  'generating_playbook',
  'computing_report',
];

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />;
    case 'in_progress':
      return <Loader2 className="w-5 h-5 text-indigo-500 animate-spin flex-shrink-0" />;
    case 'failed':
      return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
    case 'skipped':
      return <MinusCircle className="w-5 h-5 text-slate-300 flex-shrink-0" />;
    default:
      return <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />;
  }
}

export function GenerateReportButton({ brandId, brandName, industry, metaConnected }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [phase, setPhase] = useState<'generating' | 'downloading' | 'done' | 'error'>('generating');
  const [errorMessage, setErrorMessage] = useState('');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const reportDataRef = useRef<Record<string, unknown> | null>(null);

  const initSteps = useCallback((): Step[] => {
    return STEP_ORDER.map(key => ({
      key,
      label: STEP_LABELS[key],
      status: 'pending' as StepStatus,
    }));
  }, []);

  const updateStep = useCallback((stepKey: string, status: StepStatus) => {
    setSteps(prev => prev.map(s => s.key === stepKey ? { ...s, status } : s));
  }, []);

  const generatePdf = useCallback(async (data: Record<string, unknown>) => {
    setPhase('downloading');

    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { StorytellingReport } = await import('./StorytellingReport');
      const { createElement } = await import('react');

      const branding: ReportBranding = {
        companyName: 'AdMirror',
        websiteUrl: 'admirror.io',
        accentColor: '#4f46e5',
      };

      const docElement = createElement(StorytellingReport, {
        report: data.report as Parameters<typeof StorytellingReport>[0]['report'],
        brandName,
        industry,
        branding,
        trends: data.trends as Parameters<typeof StorytellingReport>[0]['trends'],
        hookAnalysis: data.hookAnalysis as Parameters<typeof StorytellingReport>[0]['hookAnalysis'],
        playbook: data.playbook as Parameters<typeof StorytellingReport>[0]['playbook'],
        allAds: data.allAds as Parameters<typeof StorytellingReport>[0]['allAds'],
        clientAds: data.clientAds as Parameters<typeof StorytellingReport>[0]['clientAds'],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(docElement as any).toBlob();
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);

      // Auto-download
      downloadBlob(url);
      setPhase('done');
    } catch (err) {
      console.error('PDF generation failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to generate PDF: ${msg}`);
      setPhase('error');
    }
  }, [brandName, industry]);

  const downloadBlob = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${brandName.replace(/\s+/g, '-')}-competitive-report-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startGeneration = useCallback(async () => {
    const initialSteps = initSteps();
    setSteps(initialSteps);
    setPhase('generating');
    setErrorMessage('');
    setBlobUrl(null);
    reportDataRef.current = null;

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);
            const { step, status, data } = event;

            // Final 'done' event from API carries the assembled report
            if (step === 'done' && status === 'completed' && data) {
              reportDataRef.current = data;
              await generatePdf(data);
              continue;
            }

            // Skip generic wrapper events that don't map to UI steps
            if (step === 'analyzing' || step === 'error') {
              if (step === 'error') {
                setErrorMessage(event.message || 'An unexpected error occurred');
                setPhase('error');
              }
              continue;
            }

            if (step && status && STEP_LABELS[step]) {
              const mappedStatus: StepStatus =
                status === 'started' ? 'in_progress' :
                status === 'completed' ? 'completed' :
                status === 'failed' ? 'failed' :
                status === 'skipped' ? 'skipped' :
                'in_progress';

              updateStep(step, mappedStatus);
            }
          } catch {
            // Ignore malformed JSON lines
          }
        }
      }

      // If we finished the stream without getting report data
      if (!reportDataRef.current) {
        setErrorMessage('Report generation completed but no data was received.');
        setPhase('error');
      }
    } catch (err) {
      console.error('Report generation failed:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate report. Please try again.');
      setPhase('error');
    }
  }, [brandId, initSteps, updateStep, generatePdf]);

  const handleOpen = () => {
    setShowModal(true);
    startGeneration();
  };

  const handleClose = () => {
    setShowModal(false);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
  };

  const handleRetry = () => {
    startGeneration();
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <FileText className="w-4 h-4" />
        Generate Report
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

          {/* Modal card */}
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              {phase === 'done'
                ? 'Report Downloaded'
                : phase === 'error'
                ? 'Report Generation Failed'
                : 'Generating Competitive Intelligence Report...'}
            </h2>
            <p className="text-sm text-slate-500 mb-6">{brandName} &middot; {industry}</p>

            {/* Steps */}
            {(phase === 'generating' || phase === 'downloading') && (
              <div className="space-y-3 mb-6">
                {steps.map(step => (
                  <div key={step.key} className="flex items-center gap-3">
                    <StepIcon status={step.status} />
                    <span className={`text-sm ${
                      step.status === 'in_progress' ? 'text-indigo-700 font-medium' :
                      step.status === 'completed' ? 'text-slate-700' :
                      step.status === 'failed' ? 'text-red-600' :
                      step.status === 'skipped' ? 'text-slate-400' :
                      'text-slate-400'
                    }`}>
                      {step.label}
                      {step.status === 'in_progress' && '...'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Downloading state */}
            {phase === 'downloading' && (
              <div className="flex items-center gap-3 py-3 px-4 bg-indigo-50 rounded-lg">
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                <span className="text-sm text-indigo-700 font-medium">Generating PDF...</span>
              </div>
            )}

            {/* Done state */}
            {phase === 'done' && (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-slate-700 font-medium mb-4">Your report has been downloaded.</p>
                {blobUrl && (
                  <button
                    onClick={() => downloadBlob(blobUrl)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Again
                  </button>
                )}
              </div>
            )}

            {/* Error state */}
            {phase === 'error' && (
              <div className="text-center py-4">
                <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-sm text-red-600 mb-4">{errorMessage}</p>
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

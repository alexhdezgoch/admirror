'use client';

import { useState } from 'react';
import { Ad } from '@/types';
import { AdAnalysis, AnalysisRequest } from '@/types/analysis';
import { ads } from '@/data/mockData';
import { VelocityBadge, GradeBadge } from './VelocityBadge';
import { FormatBadge } from './FormatBadge';
import { Tooltip } from './Tooltip';
import { AdAnalysisPanel } from './AdAnalysisPanel';
import { explainVelocityScore, explainValueScore, explainGrade, getAdLibraryUrl } from '@/lib/scoring';
import {
  X,
  Play,
  Clock,
  Copy,
  Calendar,
  Lightbulb,
  Target,
  FileText,
  Sparkles,
  ArrowRight,
  Gauge,
  TrendingUp,
  Scale,
  ExternalLink
} from 'lucide-react';

interface AdDetailModalProps {
  ad: Ad;
  onClose: () => void;
}

export function AdDetailModal({ ad, onClose }: AdDetailModalProps) {
  const [analysis, setAnalysis] = useState<AdAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | undefined>();
  const [analysisCached, setAnalysisCached] = useState(false);
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string | undefined>();
  const [videoError, setVideoError] = useState(false);

  // Check if videoUrl looks like an actual video (not an image)
  const isValidVideoUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    const lower = url.toLowerCase();
    // Reject obvious image URLs
    if (lower.includes('.jpg') || lower.includes('.jpeg') ||
        lower.includes('.png') || lower.includes('.gif') ||
        lower.includes('.webp')) {
      return false;
    }
    return true;
  };

  const hasPlayableVideo = ad.isVideo && ad.videoUrl && isValidVideoUrl(ad.videoUrl) && !videoError;

  // Get similar ads (same format and signal, different brand)
  const similarAds = ads
    .filter(a => a.id !== ad.id && a.format === ad.format && a.scoring.velocity.signal === ad.scoring.velocity.signal)
    .slice(0, 4);

  const handleAnalyze = async (forceReanalyze = false) => {
    setIsAnalyzing(true);
    setAnalysisError(undefined);

    try {
      const request: AnalysisRequest = {
        adId: ad.id,
        imageUrl: ad.thumbnail,
        videoUrl: ad.videoUrl,
        isVideo: ad.isVideo,
        competitorName: ad.competitorName,
        hookText: ad.hookText,
        headline: ad.headline,
        primaryText: ad.primaryText,
        cta: ad.cta,
        format: ad.format,
        daysActive: ad.daysActive,
        variationCount: ad.variationCount,
        scoring: {
          final: ad.scoring.final,
          grade: ad.scoring.grade,
          velocity: {
            score: ad.scoring.velocity.score,
            signal: ad.scoring.velocity.signal
          }
        },
        forceReanalyze
      };

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!data.success) {
        setAnalysisError(data.error || 'Analysis failed');
      } else {
        setAnalysis(data.analysis);
        setAnalysisCached(data.cached || false);
        setAnalysisTimestamp(data.analyzedAt);
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{ad.competitorLogo}</span>
              <div>
                <h2 className="font-semibold text-slate-900">{ad.competitorName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <VelocityBadge velocity={ad.scoring.velocity} showSignal showScore showTooltip />
                  <GradeBadge grade={ad.scoring.grade} score={ad.scoring} />
                  <FormatBadge format={ad.format} duration={ad.videoDuration} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={getAdLibraryUrl(ad.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View Ad
              </a>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Preview */}
              <div>
                <div className="relative aspect-[4/5] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden mb-4">
                  {/* Video player for video ads with videoUrl (and no error) */}
                  {hasPlayableVideo ? (
                    <video
                      src={`/api/proxy/video?url=${encodeURIComponent(ad.videoUrl!)}`}
                      poster={ad.thumbnail}
                      controls
                      className="absolute inset-0 w-full h-full object-contain bg-black"
                      preload="metadata"
                      onError={() => {
                        console.error('Video failed to load:', ad.videoUrl);
                        setVideoError(true);
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <>
                      {ad.thumbnail && ad.thumbnail.startsWith('http') ? (
                        <img
                          src={ad.thumbnail}
                          alt={`${ad.competitorName} ad`}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`absolute inset-0 flex items-center justify-center text-8xl ${ad.thumbnail && ad.thumbnail.startsWith('http') ? 'hidden' : ''}`}>
                        {ad.competitorLogo}
                      </div>
                      {/* Play icon overlay for video ads - links to Meta Ad Library */}
                      {ad.isVideo && (
                        <a
                          href={getAdLibraryUrl(ad.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                            <Play className="w-8 h-8 text-slate-900 fill-slate-900 ml-1" />
                          </div>
                          {videoError && (
                            <div className="absolute bottom-4 left-4 right-4 bg-amber-100 text-amber-800 text-xs p-2 rounded">
                              Video can&apos;t play directly. Click to view on Meta Ad Library.
                            </div>
                          )}
                        </a>
                      )}
                    </>
                  )}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <Clock className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                    <div className="text-2xl font-semibold text-slate-900">{ad.daysActive}</div>
                    <div className="text-xs text-slate-500">Days Active</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <Copy className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                    <div className="text-2xl font-semibold text-slate-900">{ad.variationCount}</div>
                    <div className="text-xs text-slate-500">Variations</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <Calendar className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                    <div className="text-sm font-semibold text-slate-900">{ad.launchDate}</div>
                    <div className="text-xs text-slate-500">Launch Date</div>
                  </div>
                </div>
              </div>

              {/* Right: Analysis */}
              <div className="space-y-6">
                {/* Hook Analysis */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-900">Hook Analysis</h3>
                  </div>
                  <p className="text-amber-800 mb-3 text-lg">&ldquo;{ad.hookText}&rdquo;</p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-amber-200 text-amber-800 rounded text-xs font-medium capitalize">
                      {ad.hookType.replace('_', ' ')} Hook
                    </span>
                    <span className="text-xs text-amber-700">
                      {ad.hookType === 'question' && 'Engages curiosity, invites self-reflection'}
                      {ad.hookType === 'statement' && 'Establishes credibility through story'}
                      {ad.hookType === 'social_proof' && 'Builds trust through numbers'}
                      {ad.hookType === 'urgency' && 'Creates FOMO, drives immediate action'}
                    </span>
                  </div>
                </div>

                {/* Creative Blueprint */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">Creative Blueprint</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-slate-500 w-20">Format:</span>
                      <span className="text-sm text-slate-700 capitalize">{ad.format}{ad.videoDuration ? ` (${ad.videoDuration}s)` : ''}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-slate-500 w-20">Elements:</span>
                      <div className="flex flex-wrap gap-1">
                        {ad.creativeElements.map((el, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs">
                            {el}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Copy Breakdown */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">Copy Breakdown</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-medium text-slate-500">Headline</span>
                      <p className="text-sm text-slate-900 mt-1">{ad.headline}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500">Primary Text</span>
                      <p className="text-sm text-slate-700 mt-1 line-clamp-3">{ad.primaryText}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500">CTA</span>
                      <span className="ml-2 px-3 py-1 bg-indigo-600 text-white rounded text-sm font-medium">
                        {ad.cta}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Scoring Breakdown */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Gauge className="w-5 h-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">Score Breakdown</h3>
                    <span className="ml-auto text-2xl font-bold text-slate-900">{ad.scoring.final}</span>
                  </div>
                  <div className="space-y-3">
                    {/* Velocity Score */}
                    <Tooltip
                      content={<pre className="whitespace-pre-wrap text-xs">{explainVelocityScore(ad.scoring.velocity, ad.daysActive, ad.variationCount)}</pre>}
                      position="left"
                    >
                      <div className="cursor-help">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-1 text-slate-600">
                            <TrendingUp className="w-3 h-3" />
                            Velocity Score
                            <span className="text-xs text-slate-400">({Math.round(ad.scoring.weights.velocity * 100)}%)</span>
                          </span>
                          <span className="font-medium">{ad.scoring.velocity.score}</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${ad.scoring.velocity.score}%` }}
                          />
                        </div>
                      </div>
                    </Tooltip>
                    {/* Value Score */}
                    <Tooltip
                      content={<pre className="whitespace-pre-wrap text-xs">{explainValueScore(ad.scoring.value)}</pre>}
                      position="left"
                    >
                      <div className="cursor-help">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-1 text-slate-600">
                            <Scale className="w-3 h-3" />
                            Value Score
                            <span className="text-xs text-slate-400">({Math.round(ad.scoring.weights.value * 100)}%)</span>
                          </span>
                          <span className="font-medium">{ad.scoring.value.score}</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${ad.scoring.value.score}%` }}
                          />
                        </div>
                      </div>
                    </Tooltip>
                    {/* Value components */}
                    <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-200">
                      <div className="text-center">
                        <div className="text-xs text-slate-500">Dream</div>
                        <div className="text-sm font-medium">{ad.scoring.value.dreamOutcome}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-500">Likelihood</div>
                        <div className="text-sm font-medium">{ad.scoring.value.likelihood}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-500">Time</div>
                        <div className="text-sm font-medium">{ad.scoring.value.timeDelay}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-500">Effort</div>
                        <div className="text-sm font-medium">{ad.scoring.value.effortSacrifice}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Steal This */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-indigo-900">Steal This</h3>
                  </div>
                  <p className="text-indigo-800">
                    {ad.scoring.rationale}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Analysis Panel */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <AdAnalysisPanel
                ad={ad}
                analysis={analysis}
                isLoading={isAnalyzing}
                onAnalyze={handleAnalyze}
                error={analysisError}
                cached={analysisCached}
                analyzedAt={analysisTimestamp}
              />
            </div>

            {/* Similar Ads */}
            {similarAds.length > 0 && (
              <div className="mt-8 pt-8 border-t border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  Similar Ads
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {similarAds.map(similarAd => (
                    <div
                      key={similarAd.id}
                      className="bg-slate-50 rounded-lg p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg mb-2 overflow-hidden relative">
                        {similarAd.thumbnail && similarAd.thumbnail.startsWith('http') ? (
                          <img
                            src={similarAd.thumbnail}
                            alt={similarAd.competitorName}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-3xl">
                            {similarAd.competitorLogo}
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-medium text-slate-900">{similarAd.competitorName}</div>
                      <div className="text-xs text-slate-500 truncate">{similarAd.hookText}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

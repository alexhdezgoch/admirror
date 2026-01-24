'use client';

import { useState } from 'react';
import { AdAnalysis, VideoMetadata } from '@/types/analysis';
import { Ad } from '@/types';
import {
  Sparkles,
  Target,
  Lightbulb,
  Trophy,
  CheckCircle2,
  RefreshCw,
  Clock,
  Palette,
  Film,
  Layers,
  Loader2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Zap,
  Shield,
  Gauge,
  Heart,
  Music,
  ArrowRight,
  Play,
  Timer,
  Video
} from 'lucide-react';

interface AdAnalysisPanelProps {
  ad: Ad;
  analysis: AdAnalysis | null;
  isLoading: boolean;
  onAnalyze: (forceReanalyze?: boolean) => void;
  error?: string;
  cached?: boolean;
  analyzedAt?: string;
}

export function AdAnalysisPanel({ ad, analysis, isLoading, onAnalyze, error, cached, analyzedAt }: AdAnalysisPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hook: true,
    hormozi: true,
    whyItWon: true,
    swipeFile: true,
    blueprint: false,
    timeline: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!analysis && !isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-6 h-6 text-purple-600" />
        </div>
        <h3 className="font-semibold text-slate-900 mb-2">AI Creative Analysis</h3>
        <p className="text-sm text-slate-600 mb-4">
          Get detailed insights on what makes this ad work, including hook analysis,
          creative blueprints, and actionable recommendations.
        </p>
        <button
          onClick={() => onAnalyze()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          Analyze with AI
        </button>
        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-8 text-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
        <h3 className="font-semibold text-slate-900 mb-2">Analyzing Ad...</h3>
        <p className="text-sm text-slate-600">
          Our AI is examining the creative elements, composition, and messaging.
        </p>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-slate-900">AI Analysis</h3>
          {cached && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
              Cached
            </span>
          )}
        </div>
        <button
          onClick={() => onAnalyze(true)}
          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
        >
          <RefreshCw className="w-3 h-3" />
          Re-analyze
        </button>
      </div>

      {/* Hook Analysis */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('hook')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-900">Hook Analysis</span>
          </div>
          {expandedSections.hook ? (
            <ChevronUp className="w-4 h-4 text-amber-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-600" />
          )}
        </button>
        {expandedSections.hook && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-amber-800">{analysis.hookAnalysis.description}</p>
            <div className="bg-amber-100/50 rounded-lg p-3">
              <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">Why It Works</span>
              <p className="text-sm text-amber-800 mt-1">{analysis.hookAnalysis.whyItWorks}</p>
            </div>
          </div>
        )}
      </div>

      {/* Hormozi Value Scores */}
      {analysis.hormoziScores && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('hormozi')}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-rose-600" />
              <span className="font-semibold text-rose-900">Value Equation Score</span>
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${
                analysis.hormoziScores.valueEquation >= 10 ? 'bg-green-100 text-green-700' :
                analysis.hormoziScores.valueEquation >= 5 ? 'bg-yellow-100 text-yellow-700' :
                analysis.hormoziScores.valueEquation >= 0 ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              }`}>
                {analysis.hormoziScores.valueEquation > 0 ? '+' : ''}{analysis.hormoziScores.valueEquation}
              </span>
            </div>
            {expandedSections.hormozi ? (
              <ChevronUp className="w-4 h-4 text-rose-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-rose-600" />
            )}
          </button>
          {expandedSections.hormozi && (
            <div className="px-4 pb-4 space-y-4">
              {/* Hook Type Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-600 font-medium">Hook Type:</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  analysis.hormoziScores.hookType === 'Speed-Focused' ? 'bg-blue-100 text-blue-700' :
                  analysis.hormoziScores.hookType === 'Trust-Focused' ? 'bg-green-100 text-green-700' :
                  analysis.hormoziScores.hookType === 'Low-Friction' ? 'bg-purple-100 text-purple-700' :
                  analysis.hormoziScores.hookType === 'Outcome-Focused' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {analysis.hormoziScores.hookType}
                </span>
              </div>

              {/* Score Bars */}
              <div className="space-y-3">
                {/* Dream Outcome */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500" />
                      <span className="text-rose-700 font-medium">Dream Outcome</span>
                    </div>
                    <span className="font-bold text-rose-800">{analysis.hormoziScores.dreamOutcome}/10</span>
                  </div>
                  <div className="h-2 bg-rose-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all"
                      style={{ width: `${analysis.hormoziScores.dreamOutcome * 10}%` }}
                    />
                  </div>
                  <p className="text-xs text-rose-600 mt-0.5">How desirable is the promised result?</p>
                </div>

                {/* Perceived Likelihood */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-700 font-medium">Perceived Likelihood</span>
                    </div>
                    <span className="font-bold text-emerald-800">{analysis.hormoziScores.likelihood}/10</span>
                  </div>
                  <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${analysis.hormoziScores.likelihood * 10}%` }}
                    />
                  </div>
                  <p className="text-xs text-emerald-600 mt-0.5">Do they believe it will happen?</p>
                </div>

                {/* Time Delay (inverted - lower is better) */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span className="text-amber-700 font-medium">Time Delay</span>
                      <span className="text-amber-400 text-[10px]">(lower is better)</span>
                    </div>
                    <span className="font-bold text-amber-800">{analysis.hormoziScores.timeDelay}/10</span>
                  </div>
                  <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        analysis.hormoziScores.timeDelay <= 3 ? 'bg-green-500' :
                        analysis.hormoziScores.timeDelay <= 6 ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${analysis.hormoziScores.timeDelay * 10}%` }}
                    />
                  </div>
                  <p className="text-xs text-amber-600 mt-0.5">How long until they get results?</p>
                </div>

                {/* Effort & Sacrifice (inverted - lower is better) */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-violet-500" />
                      <span className="text-violet-700 font-medium">Effort & Sacrifice</span>
                      <span className="text-violet-400 text-[10px]">(lower is better)</span>
                    </div>
                    <span className="font-bold text-violet-800">{analysis.hormoziScores.effortSacrifice}/10</span>
                  </div>
                  <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        analysis.hormoziScores.effortSacrifice <= 3 ? 'bg-green-500' :
                        analysis.hormoziScores.effortSacrifice <= 6 ? 'bg-violet-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${analysis.hormoziScores.effortSacrifice * 10}%` }}
                    />
                  </div>
                  <p className="text-xs text-violet-600 mt-0.5">How hard is it for them?</p>
                </div>
              </div>

              {/* Value Equation Explanation */}
              <div className="bg-white/50 rounded-lg p-3 border border-rose-100">
                <div className="text-xs text-rose-600 font-medium mb-1">Value Equation Formula</div>
                <div className="text-sm text-rose-800 font-mono">
                  ({analysis.hormoziScores.dreamOutcome} + {analysis.hormoziScores.likelihood}) - ({analysis.hormoziScores.timeDelay} + {analysis.hormoziScores.effortSacrifice}) = <span className="font-bold">{analysis.hormoziScores.valueEquation}</span>
                </div>
                <p className="text-xs text-rose-500 mt-2">
                  {analysis.hormoziScores.valueEquation >= 10
                    ? 'Excellent value proposition - this ad promises high reward with low friction.'
                    : analysis.hormoziScores.valueEquation >= 5
                    ? 'Good value proposition - solid offer with reasonable friction.'
                    : analysis.hormoziScores.valueEquation >= 0
                    ? 'Moderate value - consider improving either the promise or reducing friction.'
                    : 'Weak value proposition - the effort/time outweighs the perceived benefit.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Why It Won */}
      <div className="bg-green-50 border border-green-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('whyItWon')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-900">Why It Won</span>
          </div>
          {expandedSections.whyItWon ? (
            <ChevronUp className="w-4 h-4 text-green-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-green-600" />
          )}
        </button>
        {expandedSections.whyItWon && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-green-800">{analysis.whyItWon.summary}</p>
            <div className="flex flex-wrap gap-2">
              {analysis.whyItWon.keyFactors.map((factor, i) => (
                <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                  {factor}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Swipe File */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('swipeFile')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-indigo-900">Swipe File: Steal This Ad</span>
          </div>
          {expandedSections.swipeFile ? (
            <ChevronUp className="w-4 h-4 text-indigo-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-indigo-600" />
          )}
        </button>
        {expandedSections.swipeFile && (
          <div className="px-4 pb-4 space-y-4">
            <div>
              <span className="text-xs font-medium text-indigo-700 uppercase tracking-wide">How to Adapt This</span>
              <p className="text-sm text-indigo-800 mt-1">{analysis.swipeFile.howToAdapt}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Keep */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-1 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-800 uppercase">KEEP (Steal These)</span>
                </div>
                <ul className="space-y-1">
                  {analysis.swipeFile.keep.map((item, i) => (
                    <li key={i} className="text-xs text-green-700 flex items-start gap-1">
                      <span className="text-green-500 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Swap */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-1 mb-2">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-800 uppercase">SWAP (Customize)</span>
                </div>
                <ul className="space-y-1">
                  {analysis.swipeFile.swap.map((item, i) => (
                    <li key={i} className="text-xs text-blue-700 flex items-start gap-1">
                      <span className="text-blue-500 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Enhancement Idea */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-800 uppercase">Enhancement Idea (A/B Test This)</span>
              </div>
              <p className="text-xs text-purple-700">{analysis.swipeFile.enhancementIdea}</p>
            </div>
          </div>
        )}
      </div>

      {/* Creative Blueprint */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('blueprint')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-slate-600" />
            <span className="font-semibold text-slate-900">Creative Blueprint</span>
          </div>
          {expandedSections.blueprint ? (
            <ChevronUp className="w-4 h-4 text-slate-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-600" />
          )}
        </button>
        {expandedSections.blueprint && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Opening Hook</span>
              <p className="text-sm text-slate-700 mt-1">{analysis.creativeBlueprint.openingHook}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Storytelling Structure</span>
              <p className="text-sm text-slate-700 mt-1">{analysis.creativeBlueprint.storytellingStructure}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Visual Style</span>
              <p className="text-sm text-slate-700 mt-1">{analysis.creativeBlueprint.visualStyle}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pacing</span>
              <p className="text-sm text-slate-700 mt-1">{analysis.creativeBlueprint.pacing}</p>
            </div>
          </div>
        )}
      </div>

      {/* Video Metadata Summary (for videos) */}
      {analysis.isVideo && analysis.videoMetadata && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-xl overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Video className="w-5 h-5 text-cyan-600" />
              <span className="font-semibold text-cyan-900">Video Summary</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Duration */}
              <div className="bg-white rounded-lg p-2 border border-cyan-100">
                <div className="flex items-center gap-1 text-xs text-cyan-600 mb-1">
                  <Timer className="w-3 h-3" />
                  Duration
                </div>
                <div className="font-semibold text-cyan-900">{analysis.videoMetadata.estimatedDuration}s</div>
              </div>
              {/* Scene Count */}
              <div className="bg-white rounded-lg p-2 border border-cyan-100">
                <div className="flex items-center gap-1 text-xs text-cyan-600 mb-1">
                  <Film className="w-3 h-3" />
                  Scenes
                </div>
                <div className="font-semibold text-cyan-900">{analysis.videoMetadata.sceneCount}</div>
              </div>
              {/* Format */}
              <div className="bg-white rounded-lg p-2 border border-cyan-100">
                <div className="flex items-center gap-1 text-xs text-cyan-600 mb-1">
                  <Play className="w-3 h-3" />
                  Format
                </div>
                <div className="font-semibold text-cyan-900 text-xs capitalize">{analysis.videoMetadata.primaryFormat}</div>
              </div>
              {/* Pacing */}
              <div className="bg-white rounded-lg p-2 border border-cyan-100">
                <div className="flex items-center gap-1 text-xs text-cyan-600 mb-1">
                  <Zap className="w-3 h-3" />
                  Pacing
                </div>
                <div className={`font-semibold capitalize ${
                  analysis.videoMetadata.pacingStyle === 'fast' ? 'text-red-600' :
                  analysis.videoMetadata.pacingStyle === 'medium' ? 'text-amber-600' :
                  'text-green-600'
                }`}>{analysis.videoMetadata.pacingStyle}</div>
              </div>
              {/* BPM */}
              <div className="bg-white rounded-lg p-2 border border-cyan-100">
                <div className="flex items-center gap-1 text-xs text-cyan-600 mb-1">
                  <Music className="w-3 h-3" />
                  BPM
                </div>
                <div className="font-semibold text-cyan-900">
                  {analysis.videoMetadata.bpmEstimate || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Frame-by-Frame Timeline (for videos) */}
      {analysis.isVideo && analysis.frameByFrame && analysis.frameByFrame.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('timeline')}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-slate-600" />
              <span className="font-semibold text-slate-900">Scene-by-Scene Breakdown</span>
              <span className="text-xs text-slate-500">({analysis.frameByFrame.length} scenes)</span>
            </div>
            {expandedSections.timeline ? (
              <ChevronUp className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-600" />
            )}
          </button>
          {expandedSections.timeline && (
            <div className="px-4 pb-4">
              <div className="space-y-3">
                {analysis.frameByFrame.map((frame, i) => (
                  <div key={i} className="relative">
                    {/* Scene Card */}
                    <div className="p-3 bg-white rounded-lg border border-slate-100">
                      {/* Scene Header */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-slate-800 text-white rounded text-xs font-mono">
                          <Clock className="w-3 h-3" />
                          {frame.timestamp}
                        </div>
                        {frame.scene && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                            {frame.scene}
                          </span>
                        )}
                      </div>
                      {/* Scene Content */}
                      <div className="space-y-2">
                        <p className="text-sm text-slate-700">{frame.description}</p>
                        {frame.visualElements && (
                          <p className="text-xs text-slate-500">
                            <span className="font-medium text-slate-600">Visual:</span> {frame.visualElements}
                          </p>
                        )}
                        {frame.text && frame.text !== 'None' && frame.text !== 'N/A' && (
                          <p className="text-xs text-slate-500">
                            <span className="font-medium text-slate-600">Text:</span> {frame.text}
                          </p>
                        )}
                        {frame.audio && frame.audio !== 'None' && frame.audio !== 'N/A' && (
                          <div className="flex items-start gap-1 text-xs text-slate-500">
                            <Music className="w-3 h-3 mt-0.5 text-purple-500 flex-shrink-0" />
                            <span><span className="font-medium text-slate-600">Audio:</span> {frame.audio}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Transition Badge */}
                    {frame.transition && frame.transition !== 'None' && frame.transition !== 'N/A' && i < analysis.frameByFrame!.length - 1 && (
                      <div className="flex items-center justify-center py-1">
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full text-xs">
                          <ArrowRight className="w-3 h-3" />
                          {frame.transition}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zone Analysis (for images) */}
      {!analysis.isVideo && analysis.zoneAnalysis && analysis.zoneAnalysis.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('timeline')}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-slate-600" />
              <span className="font-semibold text-slate-900">Zone Analysis</span>
            </div>
            {expandedSections.timeline ? (
              <ChevronUp className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-600" />
            )}
          </button>
          {expandedSections.timeline && (
            <div className="px-4 pb-4">
              <div className="space-y-3">
                {analysis.zoneAnalysis.map((zone, i) => (
                  <div key={i} className="p-3 bg-white rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                        zone.zone === 'top' ? 'bg-blue-100 text-blue-700' :
                        zone.zone === 'center' ? 'bg-green-100 text-green-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        Zone {i + 1}: {zone.zone} Third
                      </span>
                      <span className="text-xs text-slate-400">
                        ({zone.zone === 'top' ? '0-33%' : zone.zone === 'center' ? '33-66%' : '66-100%'} height)
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{zone.description}</p>
                    {zone.text && zone.text !== 'None' && (
                      <p className="text-xs text-slate-500 mt-2">
                        <span className="font-medium">Text:</span> {zone.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analyzed timestamp */}
      <p className="text-xs text-slate-400 text-center">
        {cached ? 'Cached analysis from' : 'Analyzed'} {new Date(analyzedAt || analysis.analyzedAt).toLocaleString()}
      </p>
    </div>
  );
}

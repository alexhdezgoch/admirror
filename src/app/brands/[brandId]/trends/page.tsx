'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useBrandContext, useCurrentBrand, AdWithAnalysis } from '@/context/BrandContext';
import {
  calculateFormatDistribution,
  calculateVelocityDistribution,
  calculateSignalDistribution,
  calculateGradeDistribution,
  calculateHookTypeDistribution,
  extractHookLibrary,
} from '@/lib/analytics';
import { TrendIndicator } from '@/components/TrendIndicator';
import { HookType, Competitor, Ad } from '@/types';
import { AdDetailModal } from '@/components/AdDetailModal';
import { DetectedTrend, TrendAnalysisSummary, HookLibraryAnalysis, AdvancedHookType, AIHookAnalysis } from '@/types/analysis';
import {
  TrendingUp,
  PieChart,
  Activity,
  MessageSquare,
  ChevronRight,
  BarChart3,
  Award,
  AlertCircle,
  DollarSign,
  Star,
  Flame,
  Ghost,
  Beaker,
  Info,
  LucideIcon,
  Trophy,
  Medal,
  Target,
  AlertTriangle,
  XCircle,
  Sparkles,
  Loader2,
  RefreshCw,
  Eye,
  Lightbulb,
  Palette,
  FileText,
  Calendar,
  BookOpen,
  Layout,
  Users,
  Copy,
  X,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { Tooltip } from '@/components/Tooltip';

interface Props {
  params: { brandId: string };
}

interface AdBrief {
  trendName: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  hookTemplate: string;
  formatRecommendation: string;
  visualDirection: string;
  copyGuidelines: string;
  referenceAds: Ad[];
  estimatedEffort: 'Low' | 'Medium' | 'High';
}

export default function BrandTrendsPage({ params }: Props) {
  const { brandId } = params;
  const brand = useCurrentBrand(brandId);
  const { getAdsForBrand, allAds, getAnalyzedAds } = useBrandContext();

  const [selectedHookType, setSelectedHookType] = useState<HookType | 'all'>('all');
  const [selectedAdvancedHookType, setSelectedAdvancedHookType] = useState<AdvancedHookType | 'all'>('all');
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [aiTrends, setAiTrends] = useState<DetectedTrend[]>([]);
  const [aiSummary, setAiSummary] = useState<TrendAnalysisSummary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [_analyzedAds, setAnalyzedAds] = useState<AdWithAnalysis[]>([]);
  const [analysisStats, setAnalysisStats] = useState<{ total: number; analyzed: number }>({ total: 0, analyzed: 0 });

  // Hook AI Analysis state
  const [hookAnalysis, setHookAnalysis] = useState<HookLibraryAnalysis | null>(null);
  const [isAnalyzingHooks, setIsAnalyzingHooks] = useState(false);
  const [hookAnalysisError, setHookAnalysisError] = useState<string | null>(null);
  const [expandedHook, setExpandedHook] = useState<string | null>(null);

  // Ad Brief state
  const [activeBrief, setActiveBrief] = useState<AdBrief | null>(null);

  // Fetch analyzed ads stats
  useEffect(() => {
    const fetchAnalyzedAds = async () => {
      const ads = await getAnalyzedAds(brandId);
      setAnalyzedAds(ads);
      const analyzedCount = ads.filter(ad => ad.analysis).length;
      setAnalysisStats({ total: ads.length, analyzed: analyzedCount });
    };
    fetchAnalyzedAds();
  }, [brandId, getAnalyzedAds]);

  // Get ads for this brand
  const brandAds = useMemo(() => getAdsForBrand(brandId), [brandId, getAdsForBrand, allAds]);

  // Calculate real distributions from ads
  const formatDistribution = useMemo(() => calculateFormatDistribution(brandAds), [brandAds]);
  const velocityDistribution = useMemo(() => calculateVelocityDistribution(brandAds), [brandAds]);
  const signalDistribution = useMemo(() => calculateSignalDistribution(brandAds), [brandAds]);
  const gradeDistribution = useMemo(() => calculateGradeDistribution(brandAds), [brandAds]);
  const hookTypeDistribution = useMemo(() => calculateHookTypeDistribution(brandAds), [brandAds]);
  const hookLibrary = useMemo(() => extractHookLibrary(brandAds), [brandAds]);

  // Generate Ad Brief from an AI-detected trend
  const generateBrief = useCallback((trend: DetectedTrend, supportingAds: Ad[]): AdBrief => {
    // Map recency score to confidence level
    const confidence: 'HIGH' | 'MEDIUM' | 'LOW' =
      trend.recencyScore >= 8 ? 'HIGH' :
      trend.recencyScore >= 5 ? 'MEDIUM' : 'LOW';

    // Get top performing ad by score as primary reference
    const sortedAds = [...supportingAds].sort((a, b) => (b.scoring?.final || 0) - (a.scoring?.final || 0));
    const topAd = sortedAds[0];

    // Determine format recommendation based on category or distribution
    let formatRecommendation = '';
    let estimatedEffort: 'Low' | 'Medium' | 'High' = 'Medium';

    if (trend.category === 'Visual' || trend.category === 'Color') {
      formatRecommendation = 'Video or static with strong visuals. Focus on the visual elements highlighted in this trend.';
      estimatedEffort = 'Medium';
    } else if (trend.category === 'Format') {
      formatRecommendation = 'Match the format patterns identified in this trend.';
      estimatedEffort = 'Medium';
    } else {
      // Fallback to distribution-based recommendation
      const videoCount = supportingAds.filter(ad => ad.format === 'video').length;
      const staticCount = supportingAds.filter(ad => ad.format === 'static').length;
      const carouselCount = supportingAds.filter(ad => ad.format === 'carousel').length;

      if (videoCount >= staticCount && videoCount >= carouselCount) {
        formatRecommendation = `Video (${supportingAds.length > 0 ? Math.round((videoCount / supportingAds.length) * 100) : 0}% of trend ads are video). Recommended duration: 15-30 seconds.`;
        estimatedEffort = 'High';
      } else if (carouselCount >= staticCount) {
        formatRecommendation = `Carousel (${supportingAds.length > 0 ? Math.round((carouselCount / supportingAds.length) * 100) : 0}% of trend ads are carousel). Recommend 3-5 slides.`;
        estimatedEffort = 'Medium';
      } else {
        formatRecommendation = `Static image (${supportingAds.length > 0 ? Math.round((staticCount / supportingAds.length) * 100) : 0}% of trend ads are static). Single high-impact visual.`;
        estimatedEffort = 'Low';
      }
    }

    // Extract hook template from trend or top ad
    const hookTemplate = topAd?.hookText || topAd?.primaryText?.split('.')[0] || trend.description;

    // Calculate visual direction from trend
    const visualDirection = `Based on "${trend.trendName}" trend pattern. ${trend.whyItWorks || ''} Reference the supporting ads for style guidance.`;

    // Generate copy guidelines
    const copyGuidelines = `Follow the "${trend.trendName}" pattern. ${trend.recommendedAction || 'Adapt the trend for your brand voice.'}`;

    return {
      trendName: trend.trendName,
      confidence,
      hookTemplate,
      formatRecommendation,
      visualDirection,
      copyGuidelines,
      referenceAds: sortedAds.slice(0, 3),
      estimatedEffort
    };
  }, []);

  // AI Trend Analysis function
  const analyzeTrends = useCallback(async () => {
    if (allAds.length < 3) {
      setAnalysisError('Need at least 3 ads to detect meaningful trends.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Get top 10 ads per competitor across ALL brands (cross-brand trend detection)
      const competitorIds = Array.from(new Set(allAds.map(ad => ad.competitorId)));
      const topAdsPerCompetitor: typeof allAds = [];

      competitorIds.forEach(compId => {
        const competitorAds = allAds
          .filter(ad => ad.competitorId === compId)
          .sort((a, b) => (b.scoring?.final || 0) - (a.scoring?.final || 0))
          .slice(0, 10);
        topAdsPerCompetitor.push(...competitorAds);
      });

      console.log(`[Trends] Analyzing top ${topAdsPerCompetitor.length} ads across all brands (top 10 per ${competitorIds.length} competitors)`);

      const response = await fetch('/api/analyze/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          ads: topAdsPerCompetitor.map(ad => ({
            id: ad.id,
            competitorName: ad.competitorName,
            format: ad.format,
            daysActive: ad.daysActive,
            score: ad.scoring?.final || 0,
            hookText: ad.hookText || '',
            primaryText: ad.primaryText || '',
            launchDate: ad.launchDate,
            creativeElements: ad.creativeElements || []
          }))
        })
      });

      const data = await response.json();

      if (data.success) {
        setAiTrends(data.trends || []);
        setAiSummary(data.summary || null);
      } else {
        setAnalysisError(data.error || 'Failed to analyze trends');
      }
    } catch (error) {
      setAnalysisError('Failed to connect to the analysis service');
      console.error('Trend analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [brandId, allAds]);

  // AI Hook Analysis function
  const analyzeHooks = useCallback(async () => {
    if (hookLibrary.length < 3) {
      setHookAnalysisError('Need at least 3 hooks to perform meaningful analysis.');
      return;
    }

    setIsAnalyzingHooks(true);
    setHookAnalysisError(null);

    try {
      const response = await fetch('/api/analyze/hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          hooks: hookLibrary.map(hook => ({
            text: hook.text,
            type: hook.type,
            frequency: hook.frequency,
            adIds: hook.adIds
          }))
        })
      });

      const data = await response.json();

      if (data.success) {
        setHookAnalysis(data.analysis);
      } else {
        setHookAnalysisError(data.error || 'Failed to analyze hooks');
      }
    } catch (error) {
      setHookAnalysisError('Failed to connect to the analysis service');
      console.error('Hook analysis error:', error);
    } finally {
      setIsAnalyzingHooks(false);
    }
  }, [brandId, hookLibrary]);

  // Category icon mapping
  const categoryIcons: Record<string, LucideIcon> = {
    Visual: Palette,
    Copy: FileText,
    Color: Eye,
    Seasonal: Calendar,
    Storytelling: BookOpen,
    Format: Layout,
    Hormozi: Target,
    Hook: MessageSquare
  };

  // Get competitors for this brand
  const competitors: Competitor[] = brand?.competitors || [];


  // Calculate hook type labels
  const hookTypeLabels: Record<HookType, string> = {
    question: 'Question',
    statement: 'Statement',
    social_proof: 'Social Proof',
    urgency: 'Urgency'
  };

  // Advanced hook type labels and colors
  const advancedHookTypeLabels: Record<AdvancedHookType, { label: string; color: string; bgColor: string }> = {
    curiosity_gap: { label: 'Curiosity Gap', color: 'text-purple-700', bgColor: 'bg-purple-100' },
    transformation: { label: 'Transformation', color: 'text-green-700', bgColor: 'bg-green-100' },
    contrarian: { label: 'Contrarian', color: 'text-red-700', bgColor: 'bg-red-100' },
    number_driven: { label: 'Number Driven', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    pain_point: { label: 'Pain Point', color: 'text-orange-700', bgColor: 'bg-orange-100' },
    aspirational: { label: 'Aspirational', color: 'text-pink-700', bgColor: 'bg-pink-100' },
    fear_based: { label: 'Fear Based', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    authority: { label: 'Authority', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
    story_opener: { label: 'Story Opener', color: 'text-teal-700', bgColor: 'bg-teal-100' },
    direct_benefit: { label: 'Direct Benefit', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    question: { label: 'Question', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
    challenge: { label: 'Challenge', color: 'text-rose-700', bgColor: 'bg-rose-100' }
  };

  // Get enhanced hooks from analysis or use original hooks
  const enhancedHooks = hookAnalysis?.hooks || hookLibrary.map(h => ({ ...h, aiAnalysis: undefined }));

  // Filter hooks based on selected type (basic or advanced)
  const getFilteredHooks = () => {
    let hooks = enhancedHooks;

    if (selectedHookType !== 'all') {
      hooks = hooks.filter(h => h.type === selectedHookType);
    }

    if (selectedAdvancedHookType !== 'all' && hookAnalysis) {
      hooks = hooks.filter(h => h.aiAnalysis?.advancedType === selectedAdvancedHookType);
    }

    return hooks;
  };

  const displayedHooks = getFilteredHooks();

  // Signal explanations with actionable guidance
  const signalExplanations: Record<string, {
    icon: LucideIcon;
    meaning: string;
    spendSignal: string;
    action: string;
  }> = {
    'Cash Cow': {
      icon: DollarSign,
      meaning: 'Proven winner with sustained ad spend',
      spendSignal: 'High confidence spend - running 30+ days with multiple variations',
      action: 'Study these closely - they work. Adapt the hook and format for your clients.'
    },
    'Rising Star': {
      icon: Star,
      meaning: 'Early winner showing momentum',
      spendSignal: 'Increasing spend - brand is scaling up variations (2-4 weeks old)',
      action: 'Watch these - they may become Cash Cows. Good for timely inspiration.'
    },
    'Burn Test': {
      icon: Flame,
      meaning: 'Aggressive testing with rapid iteration',
      spendSignal: 'Testing budget - multiple variations in under 2 weeks',
      action: 'Interesting creative direction, but unproven. Note the hooks being tested.'
    },
    'Zombie': {
      icon: Ghost,
      meaning: 'Old ad that may be forgotten',
      spendSignal: 'Likely low/no spend - running 30+ days but never iterated',
      action: 'Probably ignore. May be leftover from past campaigns.'
    },
    'Standard': {
      icon: Beaker,
      meaning: 'Regular ad without strong signals',
      spendSignal: 'Unknown spend pattern - not enough data to classify',
      action: 'Evaluate on creative merit alone.'
    }
  };

  // Grade explanations with actionable guidance
  const gradeExplanations: Record<string, {
    icon: LucideIcon;
    meaning: string;
    quality: string;
    action: string;
  }> = {
    'A+': {
      icon: Trophy,
      meaning: 'Exceptional creative excellence',
      quality: 'Top 5% - Strong hook, clear value prop, compelling CTA, polished execution',
      action: 'These are gold. Break down every element and adapt for your clients.'
    },
    'A': {
      icon: Medal,
      meaning: 'High-quality, effective creative',
      quality: 'Top 20% - Solid fundamentals with professional execution',
      action: 'Worth studying. Good templates for proven approaches.'
    },
    'B': {
      icon: Target,
      meaning: 'Competent creative with room to improve',
      quality: 'Average performer - Meets basic standards but lacks standout elements',
      action: 'Can work, but look for A/A+ versions of similar concepts.'
    },
    'C': {
      icon: AlertTriangle,
      meaning: 'Below average with notable weaknesses',
      quality: 'Underperforming - Missing key elements or poor execution',
      action: 'Skip unless studying what NOT to do.'
    },
    'D': {
      icon: XCircle,
      meaning: 'Poor creative that likely underperforms',
      quality: 'Bottom tier - Multiple issues with hook, messaging, or production',
      action: 'Avoid. These rarely convert well.'
    }
  };

  // BriefModal Component
  const BriefModal = ({ brief, onClose, onAdClick }: {
    brief: AdBrief;
    onClose: () => void;
    onAdClick: (ad: Ad) => void;
  }) => {
    const copyBriefToClipboard = () => {
      const briefText = `
AD CREATIVE BRIEF
=================

TREND: ${brief.trendName}
CONFIDENCE: ${brief.confidence}
ESTIMATED EFFORT: ${brief.estimatedEffort}

HOOK TEMPLATE
-------------
"${brief.hookTemplate}"

FORMAT RECOMMENDATION
---------------------
${brief.formatRecommendation}

VISUAL DIRECTION
----------------
${brief.visualDirection}

COPY GUIDELINES
---------------
${brief.copyGuidelines}

REFERENCE ADS
-------------
${brief.referenceAds.map((ad, i) => `${i + 1}. ${ad.competitorName} - Score: ${ad.scoring?.final || 0}`).join('\n')}

---
Generated from Admirror Trends Analysis
      `.trim();

      navigator.clipboard.writeText(briefText);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ad Creative Brief</h2>
              <p className="text-sm text-slate-500">{brief.trendName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Badges */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                brief.confidence === 'HIGH' ? 'bg-green-100 text-green-700' :
                brief.confidence === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {brief.confidence} Confidence
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                brief.estimatedEffort === 'High' ? 'bg-red-100 text-red-700' :
                brief.estimatedEffort === 'Medium' ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>
                {brief.estimatedEffort} Effort
              </span>
            </div>

            {/* Hook Template */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Hook Template
              </h3>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-slate-900 font-medium italic">&ldquo;{brief.hookTemplate}&rdquo;</p>
                <p className="text-xs text-indigo-600 mt-2">Adapt this hook for your brand voice</p>
              </div>
            </div>

            {/* Format Recommendation */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Layout className="w-4 h-4" />
                Format Recommendation
              </h3>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-slate-700">{brief.formatRecommendation}</p>
              </div>
            </div>

            {/* Visual Direction */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Visual Direction
              </h3>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-slate-700">{brief.visualDirection}</p>
              </div>
            </div>

            {/* Copy Guidelines */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Copy Guidelines
              </h3>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-slate-700">{brief.copyGuidelines}</p>
              </div>
            </div>

            {/* Reference Ads */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Reference Ads
              </h3>
              <div className="flex items-center gap-3">
                {brief.referenceAds.map((ad) => (
                  <button
                    key={ad.id}
                    onClick={() => onAdClick(ad)}
                    className="relative group"
                    title={`${ad.competitorName} - Score: ${ad.scoring?.final || 0}`}
                  >
                    {ad.thumbnail ? (
                      <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-200 group-hover:border-indigo-400 transition-colors">
                        <img
                          src={ad.thumbnail}
                          alt={ad.competitorName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-slate-100 border-2 border-slate-200 group-hover:border-indigo-400 flex items-center justify-center text-2xl transition-colors">
                        {ad.competitorLogo}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-white border border-slate-200 rounded-full px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                      {ad.scoring?.final || 0}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Click to view ad details</p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={copyBriefToClipboard}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy Brief
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Show error if brand not found
  if (!brand) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Brand not found</h1>
        <p className="text-slate-600 mb-4">The brand you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // Empty state when no ads synced
  if (brandAds.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{brand.logo}</span>
            <h1 className="text-2xl font-bold text-slate-900">Trends Dashboard</h1>
          </div>
          <p className="text-slate-600">
            Bird&apos;s-eye view of what&apos;s happening in {brand.name}&apos;s competitive landscape.
          </p>
        </div>

        {/* Empty State */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">No competitor ads synced yet</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Add competitors and sync their ads to see real trends, format distributions, hook patterns, and more.
          </p>
          <Link
            href={`/brands/${brandId}/competitors`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Users className="w-4 h-4" />
            Add Competitors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{brand.logo}</span>
          <h1 className="text-2xl font-bold text-slate-900">Trends Dashboard</h1>
        </div>
        <p className="text-slate-600">
          Cross-brand trend detection across all your competitors. Gap analysis personalized to {brand.name}.
          <span className="text-indigo-600 font-medium ml-1">Based on {allAds.length} ads across all brands.</span>
        </p>
      </div>

      {/* Low Data Warning Banner */}
      {brandAds.length < 20 && brandAds.length > 0 && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">Limited Data Available</h3>
            <p className="text-sm text-amber-700">
              With only {brandAds.length} ads synced, trend detection may be less reliable.
              For more accurate insights, sync at least 20+ ads across multiple competitors.
            </p>
            <Link
              href={`/brands/${brandId}/competitors`}
              className="inline-flex items-center gap-1 mt-2 text-sm text-amber-800 hover:text-amber-900 font-medium"
            >
              <Users className="w-4 h-4" />
              Add more competitors
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* AI Trend Analysis */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">AI Trend Detection</h2>
              <p className="text-sm text-slate-500">Cross-brand AI analysis of top 10 ads per competitor across all brands</p>
            </div>
          </div>
          <button
            onClick={analyzeTrends}
            disabled={isAnalyzing || allAds.length < 3}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : aiTrends.length > 0 ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Re-analyze
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze Trends
              </>
            )}
          </button>
        </div>

        {analysisError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{analysisError}</span>
          </div>
        )}

        {allAds.length < 3 && !aiTrends.length && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-amber-800 font-medium">Need more ads for AI trend detection</p>
            <p className="text-amber-600 text-sm mt-1">
              Sync at least 3 ads from your competitors to enable AI trend analysis.
            </p>
          </div>
        )}

        {isAnalyzing && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-8 text-center">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Analyzing Trends...</h3>
            <p className="text-sm text-slate-600">
              Our AI is examining top ads across all brands to identify emerging creative patterns.
            </p>
          </div>
        )}

        {!isAnalyzing && aiTrends.length > 0 && (
          <div className="space-y-4">
            {/* Summary Stats */}
            {aiSummary && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">{aiSummary.totalAdsAnalyzed}</div>
                  <div className="text-xs text-slate-500">Ads Analyzed</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{aiSummary.recentAds}</div>
                  <div className="text-xs text-slate-500">Recent (30 days)</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{aiSummary.avgRecentScore}</div>
                  <div className="text-xs text-slate-500">Avg Recent Score</div>
                </div>
              </div>
            )}

            {/* AI Detected Trends */}
            <div className="grid gap-4">
              {aiTrends.map((trend, index) => {
                const CategoryIcon = categoryIcons[trend.category] || TrendingUp;
                return (
                  <div
                    key={index}
                    className="bg-white border border-slate-200 rounded-xl p-5 hover:border-purple-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          trend.category === 'Visual' ? 'bg-pink-100' :
                          trend.category === 'Copy' ? 'bg-blue-100' :
                          trend.category === 'Color' ? 'bg-orange-100' :
                          trend.category === 'Seasonal' ? 'bg-green-100' :
                          trend.category === 'Storytelling' ? 'bg-violet-100' :
                          trend.category === 'Hormozi' ? 'bg-amber-100' :
                          trend.category === 'Hook' ? 'bg-cyan-100' :
                          'bg-slate-100'
                        }`}>
                          <CategoryIcon className={`w-5 h-5 ${
                            trend.category === 'Visual' ? 'text-pink-600' :
                            trend.category === 'Copy' ? 'text-blue-600' :
                            trend.category === 'Color' ? 'text-orange-600' :
                            trend.category === 'Seasonal' ? 'text-green-600' :
                            trend.category === 'Storytelling' ? 'text-violet-600' :
                            trend.category === 'Hormozi' ? 'text-amber-600' :
                            trend.category === 'Hook' ? 'text-cyan-600' :
                            'text-slate-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{trend.trendName}</h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            trend.category === 'Visual' ? 'bg-pink-100 text-pink-700' :
                            trend.category === 'Copy' ? 'bg-blue-100 text-blue-700' :
                            trend.category === 'Color' ? 'bg-orange-100 text-orange-700' :
                            trend.category === 'Seasonal' ? 'bg-green-100 text-green-700' :
                            trend.category === 'Storytelling' ? 'bg-violet-100 text-violet-700' :
                            trend.category === 'Hormozi' ? 'bg-amber-100 text-amber-700' :
                            trend.category === 'Hook' ? 'bg-cyan-100 text-cyan-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {trend.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          trend.recencyScore >= 8 ? 'bg-green-100 text-green-700' :
                          trend.recencyScore >= 5 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {trend.recencyScore >= 8 ? 'Hot' : trend.recencyScore >= 5 ? 'Growing' : 'Established'}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-4">{trend.description}</p>

                    {/* Evidence */}
                    <div className="flex items-center gap-4 mb-4 text-xs flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Seen in:</span>
                        <span className="font-semibold text-slate-700">{trend.evidence.adCount} ads</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Avg Score:</span>
                        <span className="font-semibold text-slate-700">{Math.round(trend.evidence.avgScore)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Recency:</span>
                        <span className="font-semibold text-slate-700">{trend.recencyScore}/10</span>
                      </div>
                      {trend.evidence.competitorNames && trend.evidence.competitorNames.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Competitors:</span>
                          <span className="font-semibold text-slate-700">
                            {trend.evidence.competitorNames.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Why it works & Recommendation */}
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <Lightbulb className="w-3 h-3 text-amber-500" />
                          <span className="text-xs font-semibold text-slate-700 uppercase">Why It Works</span>
                        </div>
                        <p className="text-xs text-slate-600">{trend.whyItWorks}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <Target className="w-3 h-3 text-purple-500" />
                          <span className="text-xs font-semibold text-purple-700 uppercase">Action</span>
                        </div>
                        <p className="text-xs text-purple-600">{trend.recommendedAction}</p>
                      </div>
                    </div>

                    {/* Gap Analysis */}
                    {trend.clientGapAnalysis && (
                      <div className={`mt-4 p-4 rounded-lg ${trend.hasGap ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                        {trend.hasGap ? (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              <span className="font-semibold text-amber-800 text-sm">Gap Found</span>
                              {trend.gapDetails?.severity && (
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  trend.gapDetails.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                  trend.gapDetails.severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {trend.gapDetails.severity}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-amber-700">{trend.clientGapAnalysis}</p>

                            {/* Missing Elements */}
                            {trend.gapDetails?.missingElements && trend.gapDetails.missingElements.length > 0 && (
                              <div className="mt-3">
                                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Missing</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {trend.gapDetails.missingElements.map((el, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">
                                      {el}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Competitors to study */}
                            {trend.gapDetails?.competitorsDoingItWell && trend.gapDetails.competitorsDoingItWell.length > 0 && (
                              <div className="mt-3">
                                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Study these competitors</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {trend.gapDetails.competitorsDoingItWell.map((name, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-white border border-amber-200 text-amber-800 text-xs rounded-full font-medium">
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Client strengths (even when there's a gap) */}
                            {trend.gapDetails?.clientStrengths && (
                              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                  <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">Your strength</span>
                                </div>
                                <p className="text-xs text-green-700">{trend.gapDetails.clientStrengths}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="font-semibold text-green-800 text-sm">Match Found</span>
                            </div>
                            <p className="text-sm text-green-700">{trend.clientGapAnalysis}</p>
                            {trend.gapDetails?.clientStrengths && (
                              <div className="mt-2 p-2 bg-green-100/50 rounded-md">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                  <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">Your strength</span>
                                </div>
                                <p className="text-xs text-green-700">{trend.gapDetails.clientStrengths}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Adaptation Recommendation */}
                    {trend.adaptationRecommendation && (
                      <div className="mt-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="w-4 h-4 text-indigo-600" />
                          <span className="font-semibold text-indigo-800 text-sm">How to Adapt for Your Brand</span>
                        </div>
                        <p className="text-sm text-indigo-700">{trend.adaptationRecommendation}</p>
                      </div>
                    )}

                    {/* Sample Ads */}
                    {trend.evidence.sampleAdIds.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <span className="text-xs text-slate-500">Sample ads:</span>
                        <div className="flex items-center gap-2 mt-1">
                          {trend.evidence.sampleAdIds.slice(0, 4).map((adId) => {
                            const ad = allAds.find(a => a.id === adId);
                            return ad ? (
                              <button
                                key={adId}
                                onClick={() => setSelectedAd(ad)}
                                className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-sm hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title={`${ad.competitorName} - Score: ${ad.scoring?.final || 0} (Click to view)`}
                              >
                                {ad.competitorLogo}
                              </button>
                            ) : null;
                          })}
                          {trend.evidence.sampleAdIds.length > 4 && (
                            <span className="text-xs text-slate-400">
                              +{trend.evidence.sampleAdIds.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Create Ad Brief Button */}
                    <div className="border-t border-slate-100 pt-4 mt-4">
                      <button
                        onClick={() => {
                          const supportingAds = trend.evidence.sampleAdIds
                            .map(id => allAds.find(a => a.id === id))
                            .filter((ad): ad is Ad => ad !== undefined);
                          const brief = generateBrief(trend, supportingAds);
                          setActiveBrief(brief);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        Create Ad Brief from This Trend
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isAnalyzing && aiTrends.length === 0 && allAds.length >= 3 && (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Discover Creative Trends</h3>
            <p className="text-sm text-slate-600 mb-4">
              Let AI analyze {allAds.length} ads across all brands to identify emerging patterns,
              winning strategies, and actionable recommendations.
            </p>
          </div>
        )}
      </section>

      {/* Analysis Coverage Stats */}
      {analysisStats.total > 0 && (
        <section className="mb-10">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Eye className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">AI Analysis Coverage</h3>
                  <p className="text-sm text-slate-600">
                    {analysisStats.analyzed} of {analysisStats.total} ads have AI-powered analysis
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {analysisStats.total > 0 ? Math.round((analysisStats.analyzed / analysisStats.total) * 100) : 0}%
                  </div>
                  <div className="text-xs text-slate-500">Coverage</div>
                </div>
                <div className="w-24 h-2 bg-green-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${analysisStats.total > 0 ? (analysisStats.analyzed / analysisStats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            {analysisStats.analyzed > 0 && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-sm text-green-700">
                  <Lightbulb className="w-4 h-4 inline mr-1" />
                  AI insights available include hook analysis, creative blueprints, and Hormozi value scoring for analyzed ads.
                  Top ads are automatically analyzed during sync.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        {/* Format Distribution */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <PieChart className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Format Distribution</h2>
          </div>

          <div className="flex items-center gap-8">
            {/* Simple pie chart visualization */}
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {formatDistribution.reduce((acc, item, index) => {
                  const total = formatDistribution.reduce((sum, i) => sum + i.value, 0);
                  if (total === 0) return acc;
                  const startAngle = acc.angle;
                  const angle = (item.value / total) * 360;
                  const endAngle = startAngle + angle;

                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;

                  const x1 = 50 + 40 * Math.cos(startRad);
                  const y1 = 50 + 40 * Math.sin(startRad);
                  const x2 = 50 + 40 * Math.cos(endRad);
                  const y2 = 50 + 40 * Math.sin(endRad);

                  const largeArc = angle > 180 ? 1 : 0;

                  acc.elements.push(
                    <path
                      key={index}
                      d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={item.color}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  );
                  acc.angle = endAngle;
                  return acc;
                }, { elements: [] as JSX.Element[], angle: 0 }).elements}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-3">
              {formatDistribution.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Velocity Distribution */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Velocity Distribution</h2>
          </div>

          <div className="space-y-4">
            {velocityDistribution.map(item => (
              <div key={item.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600">{item.name}</span>
                  <span className="font-medium text-slate-900">{item.value}%</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-4">
            {velocityDistribution.find(v => v.name === 'Scaling')?.value || 0}% of ads are actively scaling, indicating strong product-market fit signals.
          </p>
        </section>
      </div>

      {/* Signal and Grade Distribution */}
      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        {/* Signal Distribution */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Signal Classification</h2>
          </div>

          <div className="space-y-3">
            {signalDistribution.map(item => {
              const explanation = signalExplanations[item.name];
              const IconComponent = explanation?.icon || Info;

              return (
                <Tooltip
                  key={item.name}
                  position="right"
                  content={
                    explanation ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 font-medium border-b border-slate-700 pb-2">
                          <IconComponent className="w-4 h-4" />
                          <span>{item.name}</span>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">What it means</div>
                          <div className="text-slate-100">{explanation.meaning}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Spend signal</div>
                          <div className="text-slate-100">{explanation.spendSignal}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">What to do</div>
                          <div className="text-slate-100">{explanation.action}</div>
                        </div>
                      </div>
                    ) : (
                      <span>No additional information available</span>
                    )
                  }
                >
                  <div className="cursor-help group">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        <span className="text-slate-600 group-hover:text-slate-900 transition-colors">{item.name}</span>
                        <Info className="w-3 h-3 text-slate-300 group-hover:text-slate-400 transition-colors" />
                      </div>
                      <span className="font-medium text-slate-900">{item.value}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.max(item.value, 2)}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                </Tooltip>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 mt-4 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Hover over each signal to learn what it means and how to act on it.
          </p>
        </section>

        {/* Grade Distribution */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Grade Distribution</h2>
          </div>

          <div className="space-y-3">
            {gradeDistribution.map(item => {
              const explanation = gradeExplanations[item.name];
              const IconComponent = explanation?.icon || Award;

              return (
                <Tooltip
                  key={item.name}
                  position="left"
                  content={
                    explanation ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 font-medium border-b border-slate-700 pb-2">
                          <IconComponent className="w-4 h-4" />
                          <span>Grade {item.name}</span>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">What it means</div>
                          <div className="text-slate-100">{explanation.meaning}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Quality level</div>
                          <div className="text-slate-100">{explanation.quality}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">What to do</div>
                          <div className="text-slate-100">{explanation.action}</div>
                        </div>
                      </div>
                    ) : (
                      <span>No additional information available</span>
                    )
                  }
                >
                  <div className="cursor-help group">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        <span className="font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{item.name}</span>
                        <Info className="w-3 h-3 text-slate-300 group-hover:text-slate-400 transition-colors" />
                      </div>
                      <span className="font-medium text-slate-900">{item.value}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.max(item.value, 2)}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                </Tooltip>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 mt-4 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Hover over each grade to learn what it means and how to act on it.
          </p>
        </section>
      </div>

      {/* Competitor Pacing */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <h2 className="font-semibold text-slate-900">Competitor Pacing</h2>
          <span className="text-sm text-slate-500 ml-auto">Ads launched per week (avg)</span>
        </div>

        {competitors.length > 0 ? (
          <div className="space-y-4">
            {competitors.sort((a, b) => b.avgAdsPerWeek - a.avgAdsPerWeek).map(comp => (
              <div key={comp.id} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32">
                  <span className="text-xl">{comp.logo}</span>
                  <span className="text-sm font-medium text-slate-900 truncate">{comp.name}</span>
                </div>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${Math.min((comp.avgAdsPerWeek / 5) * 100, 100)}%` }}
                  >
                    <span className="text-xs font-medium text-amber-900">
                      {comp.avgAdsPerWeek}/wk
                    </span>
                  </div>
                </div>
                <span className="text-sm text-slate-500 w-20 text-right">
                  {comp.totalAds} total
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">
            No competitors added yet. <Link href={`/brands/${brandId}/competitors`} className="text-indigo-600 hover:text-indigo-700">Add competitors</Link> to see pacing data.
          </p>
        )}
      </section>

      {/* Hook Library */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Hook Library</h2>
              {hookAnalysis && (
                <p className="text-xs text-slate-500">AI-analyzed {hookAnalysis.analyzedAt ? new Date(hookAnalysis.analyzedAt).toLocaleDateString() : ''}</p>
              )}
            </div>
          </div>

          {/* Analyze with AI button */}
          <button
            onClick={analyzeHooks}
            disabled={isAnalyzingHooks || hookLibrary.length < 3}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzingHooks ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : hookAnalysis ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Re-analyze
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze with AI
              </>
            )}
          </button>
        </div>

        {hookAnalysisError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{hookAnalysisError}</span>
          </div>
        )}

        {/* AI Analysis Summary */}
        {hookAnalysis?.summary && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-900">AI Insights</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Top Performing Style</div>
                <p className="text-sm text-slate-700">{hookAnalysis.summary.topPerformingStyle}</p>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Dominant Types</div>
                <div className="flex flex-wrap gap-1">
                  {hookAnalysis.summary.dominantTypes.map((type, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{type}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Emotional Themes</div>
                <div className="flex flex-wrap gap-1">
                  {hookAnalysis.summary.emotionalThemes.map((theme, i) => (
                    <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">{theme}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Gaps to Exploit</div>
                <div className="flex flex-wrap gap-1">
                  {hookAnalysis.summary.gaps.map((gap, i) => (
                    <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">{gap}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter tabs - Basic types */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">Basic:</span>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setSelectedHookType('all')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedHookType === 'all'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All
            </button>
            {Object.entries(hookTypeLabels).map(([type, label]) => (
              <button
                key={type}
                onClick={() => setSelectedHookType(type as HookType)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedHookType === type
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced type filters - only show if AI analysis is available */}
        {hookAnalysis && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-slate-500">Advanced:</span>
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setSelectedAdvancedHookType('all')}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  selectedAdvancedHookType === 'all'
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                All
              </button>
              {(Object.keys(advancedHookTypeLabels) as AdvancedHookType[]).map((type) => {
                const hasHooks = enhancedHooks.some(h => h.aiAnalysis?.advancedType === type);
                if (!hasHooks) return null;
                const { label, color, bgColor } = advancedHookTypeLabels[type];
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedAdvancedHookType(type)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      selectedAdvancedHookType === type
                        ? `${bgColor} ${color}`
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Hook type distribution mini chart */}
        <div className="flex items-center gap-2 mb-6 p-4 bg-slate-50 rounded-lg">
          <span className="text-xs text-slate-500">Distribution:</span>
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden flex">
            {hookTypeDistribution.map((item, index) => (
              <div
                key={index}
                className="h-full"
                style={{
                  width: `${item.value}%`,
                  backgroundColor: item.color
                }}
                title={`${item.name}: ${item.value}%`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 ml-4">
            {hookTypeDistribution.map(item => (
              <div key={item.name} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-500">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hooks list with AI enhancements */}
        {displayedHooks.length > 0 ? (
          <div className="space-y-3">
            {displayedHooks.map((hook, index) => {
              const isExpanded = expandedHook === hook.text;
              const aiAnalysis = hook.aiAnalysis;
              const advType = aiAnalysis?.advancedType;
              const advTypeInfo = advType ? advancedHookTypeLabels[advType] : null;

              return (
                <div
                  key={index}
                  className={`border rounded-lg transition-all ${
                    isExpanded ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => setExpandedHook(isExpanded ? null : hook.text)}
                  >
                    <div className="flex-1">
                      <p className="text-sm text-slate-900 mb-2">&ldquo;{hook.text}&rdquo;</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Basic type badge */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                          hook.type === 'question' ? 'bg-blue-100 text-blue-700' :
                          hook.type === 'statement' ? 'bg-green-100 text-green-700' :
                          hook.type === 'social_proof' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {hook.type.replace('_', ' ')}
                        </span>

                        {/* Advanced type badge (if AI analyzed) */}
                        {advTypeInfo && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${advTypeInfo.bgColor} ${advTypeInfo.color}`}>
                            {advTypeInfo.label}
                          </span>
                        )}

                        {/* Emotional triggers pills (if AI analyzed) */}
                        {aiAnalysis?.emotionalTriggers.slice(0, 2).map((trigger, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded-full">
                            {trigger}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Score bar (if AI analyzed) */}
                      {aiAnalysis && (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                aiAnalysis.overallScore >= 8 ? 'bg-green-500' :
                                aiAnalysis.overallScore >= 6 ? 'bg-blue-500' :
                                aiAnalysis.overallScore >= 4 ? 'bg-amber-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${aiAnalysis.overallScore * 10}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-700">{aiAnalysis.overallScore}</span>
                        </div>
                      )}
                      <div className="text-right">
                        <div className="text-lg font-semibold text-slate-900">{hook.frequency}</div>
                        <div className="text-xs text-slate-500">uses</div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded analysis view */}
                  {isExpanded && aiAnalysis && (
                    <div className="px-4 pb-4 border-t border-slate-200 pt-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Why it works */}
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                          <div className="flex items-center gap-1 mb-2">
                            <Lightbulb className="w-3 h-3 text-amber-500" />
                            <span className="text-xs font-semibold text-slate-700 uppercase">Why It Works</span>
                          </div>
                          <p className="text-sm text-slate-600">{aiAnalysis.whyItWorks}</p>
                        </div>

                        {/* Psychology breakdown */}
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                          <div className="flex items-center gap-1 mb-2">
                            <Users className="w-3 h-3 text-indigo-500" />
                            <span className="text-xs font-semibold text-slate-700 uppercase">Psychology</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Technique:</span>
                              <span className="text-slate-700 font-medium">{aiAnalysis.persuasionTechnique}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Principle:</span>
                              <span className="text-slate-700 font-medium">{aiAnalysis.psychologicalPrinciple}</span>
                            </div>
                          </div>
                        </div>

                        {/* Scores breakdown */}
                        <div className="bg-white rounded-lg p-3 border border-slate-100 md:col-span-2">
                          <div className="flex items-center gap-1 mb-2">
                            <BarChart3 className="w-3 h-3 text-green-500" />
                            <span className="text-xs font-semibold text-slate-700 uppercase">Effectiveness Scores</span>
                          </div>
                          <div className="grid grid-cols-4 gap-3">
                            {[
                              { label: 'Attention', score: aiAnalysis.attentionScore, color: 'bg-purple-500' },
                              { label: 'Clarity', score: aiAnalysis.clarityScore, color: 'bg-blue-500' },
                              { label: 'Relevance', score: aiAnalysis.relevanceScore, color: 'bg-green-500' },
                              { label: 'Overall', score: aiAnalysis.overallScore, color: 'bg-indigo-500' }
                            ].map((item, i) => (
                              <div key={i}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-slate-500">{item.label}</span>
                                  <span className="font-semibold">{item.score}/10</span>
                                </div>
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.score * 10}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Ads using this hook */}
                        <div className="bg-white rounded-lg p-3 border border-slate-100 md:col-span-2">
                          <div className="flex items-center gap-1 mb-2">
                            <Eye className="w-3 h-3 text-slate-500" />
                            <span className="text-xs font-semibold text-slate-700 uppercase">Ads Using This Hook</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {hook.adIds.slice(0, 6).map((adId) => {
                              const ad = brandAds.find(a => a.id === adId);
                              return ad ? (
                                <button
                                  key={adId}
                                  onClick={(e) => { e.stopPropagation(); setSelectedAd(ad); }}
                                  className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-sm hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                                  title={`${ad.competitorName} (Click to view)`}
                                >
                                  {ad.competitorLogo}
                                </button>
                              ) : null;
                            })}
                            {hook.adIds.length > 6 && (
                              <span className="text-xs text-slate-400">+{hook.adIds.length - 6} more</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>No hooks found for the selected filter.</p>
          </div>
        )}

        {/* AI-Generated Patterns */}
        {hookAnalysis?.patterns && hookAnalysis.patterns.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-slate-900">Detected Patterns</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {hookAnalysis.patterns.map((pattern, index) => (
                <div key={index} className="bg-gradient-to-r from-slate-50 to-indigo-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-900">{pattern.name}</h4>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                      {pattern.frequency} hooks
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{pattern.description}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Avg Score:</span>
                    <span className="font-semibold text-slate-700">{pattern.avgScore.toFixed(1)}/10</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI-Generated Recommendations */}
        {hookAnalysis?.recommendations && hookAnalysis.recommendations.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-slate-900">Hook Recommendations</h3>
            </div>
            <div className="space-y-4">
              {hookAnalysis.recommendations.map((rec, index) => (
                <div key={index} className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-amber-600 font-bold text-sm">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-900 font-medium mb-2">&ldquo;{rec.suggestedHook}&rdquo;</p>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                          {rec.targetEmotion}
                        </span>
                        <span className="text-xs text-slate-500">
                          Estimated effectiveness: {rec.estimatedEffectiveness}/10
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{rec.reasoning}</p>
                      {rec.basedOn.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-amber-100">
                          <span className="text-xs text-slate-500">Inspired by: </span>
                          <span className="text-xs text-slate-700">{rec.basedOn.slice(0, 2).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Brief Modal */}
      {activeBrief && (
        <BriefModal
          brief={activeBrief}
          onClose={() => setActiveBrief(null)}
          onAdClick={(ad) => {
            setActiveBrief(null);
            setSelectedAd(ad);
          }}
        />
      )}

      {/* Ad Detail Modal */}
      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          onClose={() => setSelectedAd(null)}
        />
      )}
    </div>
  );
}

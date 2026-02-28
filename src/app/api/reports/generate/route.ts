import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { dbAdToAd } from '@/lib/transforms';
import { computeReport, validateReport } from '@/lib/story-signals';
import { Ad } from '@/types';
import { DetectedTrend, HookLibraryAnalysis, TrendAnalysisRequest, TrendAnalysisSummary } from '@/types/analysis';
import { MyPatternAnalysis } from '@/types/meta';
import { ReportData, CreativeIntelligenceData } from '@/types/report';
import { extractHookLibrary } from '@/lib/analytics';
import { extractPageIdFromUrl } from '@/lib/apify/client';
import { fetchCreativeIntelligenceData, buildSyntheticCI } from '@/lib/reports/creative-intelligence-data';
import { computeFallbackGaps, computeFallbackBreakouts, deriveClientPatternsFromGaps } from '@/lib/reports/fallback-analysis';

export const maxDuration = 300;

interface SSEEvent {
  step: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  message: string;
  data?: unknown;
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { brandId } = body;

  if (!brandId) {
    return new Response(JSON.stringify({ error: 'brandId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const admin = getSupabaseAdmin();

      // Collected results for final report
      let allAds: Ad[] = [];
      let clientAds: Ad[] = [];
      let trends: DetectedTrend[] = [];
      let hookAnalysis: HookLibraryAnalysis | null = null;
      let patterns: MyPatternAnalysis | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let playbook: Record<string, unknown> | null = null;
      let creativeIntelligence: CreativeIntelligenceData | null = null;
      let trendSummary: TrendAnalysisSummary | null = null;
      let brandName = '';
      let industry = '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let competitors: any[] = [];

      // ========== STEP 1: Load data ==========
      try {
        send({ step: 'loading_data', status: 'started', message: 'Loading brand data...' });

        const [brandResult, competitorsResult, adsResult, metaResult] = await Promise.all([
          admin.from('client_brands').select('*').eq('id', brandId).single(),
          admin.from('competitors').select('*').eq('brand_id', brandId),
          admin.from('ads').select('*').eq('client_brand_id', brandId),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (admin as any).from('meta_connections').select('id').eq('user_id', user.id).eq('client_brand_id', brandId).maybeSingle(),
        ]);

        if (brandResult.error || !brandResult.data) {
          send({ step: 'loading_data', status: 'failed', message: 'Brand not found' });
          controller.close();
          return;
        }

        const brand = brandResult.data;
        brandName = brand.name;
        industry = brand.industry;
        competitors = (competitorsResult.data || []).map((c) => ({
          id: c.id,
          name: c.name,
          logo: c.logo,
          url: c.url,
          totalAds: c.total_ads,
          avgAdsPerWeek: c.avg_ads_per_week,
          lastSyncedAt: c.last_synced_at || undefined,
        }));

        const dbAds = adsResult.data || [];

        // Auto-detect client ads by matching competitor URLs against the brand's own Ad Library URL
        const brandPageId = brand.ads_library_url
          ? extractPageIdFromUrl(brand.ads_library_url)
          : null;
        const selfCompetitorIds = new Set<string>();
        (competitorsResult.data || []).forEach(c => {
          if (c.name?.includes('(Your Ads)')) selfCompetitorIds.add(c.id);
          if (brandPageId && c.url && extractPageIdFromUrl(c.url) === brandPageId) {
            selfCompetitorIds.add(c.id);
          }
        });

        allAds = dbAds.map(dbAdToAd).map(ad => ({
          ...ad,
          isClientAd: ad.isClientAd || selfCompetitorIds.has(ad.competitorId),
        }));
        clientAds = allAds.filter(ad => ad.isClientAd);

        const hasMetaConnection = !!metaResult.data;

        send({
          step: 'loading_data',
          status: 'completed',
          message: `Loaded ${allAds.length} ads across ${competitors.length} competitors`,
          data: { totalAds: allAds.length, competitors: competitors.length, hasMetaConnection },
        });

        // Block generation when 0 ads
        if (allAds.length === 0) {
          send({ step: 'error', status: 'failed', message: 'No ads available. Sync your first competitors before generating a report.' });
          controller.close();
          return;
        }

        // ========== STEP 2: Meta sync (if connected) ==========
        if (hasMetaConnection) {
          try {
            send({ step: 'syncing_meta', status: 'started', message: 'Syncing Meta ads data...' });

            const baseUrl = new URL(request.url).origin;
            const cookieHeader = request.headers.get('cookie') || '';

            const syncResponse = await fetch(`${baseUrl}/api/meta/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Cookie: cookieHeader,
              },
              body: JSON.stringify({ clientBrandId: brandId }),
            });

            const syncResult = await syncResponse.json();

            if (syncResult.success) {
              send({
                step: 'syncing_meta',
                status: 'completed',
                message: `Synced ${syncResult.totalAds || 0} Meta ads`,
              });
            } else {
              send({ step: 'syncing_meta', status: 'failed', message: syncResult.error || 'Meta sync failed' });
            }
          } catch (err) {
            send({ step: 'syncing_meta', status: 'failed', message: err instanceof Error ? err.message : 'Meta sync error' });
          }
        }

        // ========== STEP 3: Parallel analysis (trends + hooks + patterns) ==========
        send({ step: 'analyzing', status: 'started', message: 'Running AI analysis...' });

        const baseUrl = new URL(request.url).origin;
        const cookieHeader = request.headers.get('cookie') || '';
        const fetchHeaders = {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
        };

        // Build trends request payload
        const sortedAds = [...allAds]
          .filter(ad => !ad.isClientAd)
          .sort((a, b) => (b.scoring?.final || 0) - (a.scoring?.final || 0))
          .slice(0, 500);

        const trendAdsPayload: TrendAnalysisRequest['ads'] = sortedAds.map(ad => ({
          id: ad.id,
          competitorName: ad.competitorName,
          format: ad.format,
          daysActive: ad.daysActive,
          score: ad.scoring?.final || 0,
          hookText: ad.hookText,
          primaryText: ad.primaryText,
          launchDate: ad.launchDate,
          creativeElements: ad.creativeElements as string[],
        }));

        // Build hooks request payload
        const hookLibrary = extractHookLibrary(allAds);

        const [trendsResult, hooksResult, patternsResult] = await Promise.allSettled([
          // Trends
          trendAdsPayload.length >= 3
            ? fetch(`${baseUrl}/api/analyze/trends`, {
                method: 'POST',
                headers: fetchHeaders,
                body: JSON.stringify({
                  brandId,
                  ads: trendAdsPayload,
                  forceRefresh: true,
                }),
              }).then(r => r.json())
            : Promise.resolve({ success: false, error: 'Not enough ads for trend analysis' }),

          // Hooks
          hookLibrary.length >= 3
            ? fetch(`${baseUrl}/api/analyze/hooks`, {
                method: 'POST',
                headers: fetchHeaders,
                body: JSON.stringify({
                  brandId,
                  hooks: hookLibrary.map(h => ({
                    text: h.text,
                    type: h.type,
                    frequency: h.frequency,
                    adIds: h.adIds,
                  })),
                }),
              }).then(r => r.json())
            : Promise.resolve({ success: false, error: 'Not enough hooks for analysis' }),

          // Patterns
          fetch(`${baseUrl}/api/analyze/my-patterns`, {
            method: 'POST',
            headers: fetchHeaders,
            body: JSON.stringify({ brandId, forceRefresh: true }),
          }).then(r => r.json()),
        ]);

        // Process trends result
        if (trendsResult.status === 'fulfilled' && trendsResult.value.success) {
          trends = trendsResult.value.trends || [];
          trendSummary = trendsResult.value.summary || null;
          send({ step: 'analyzing_trends', status: 'completed', message: `Found ${trends.length} trends` });
        } else {
          const msg = trendsResult.status === 'rejected'
            ? trendsResult.reason?.message || 'Trend analysis failed'
            : trendsResult.value.error || 'Trend analysis failed';
          send({ step: 'analyzing_trends', status: 'failed', message: msg });
        }

        // Process hooks result
        if (hooksResult.status === 'fulfilled' && hooksResult.value.success) {
          hookAnalysis = hooksResult.value.analysis || null;
          send({ step: 'analyzing_hooks', status: 'completed', message: 'Hook analysis complete' });
        } else {
          const msg = hooksResult.status === 'rejected'
            ? hooksResult.reason?.message || 'Hook analysis failed'
            : hooksResult.value.error || 'Hook analysis failed';
          send({ step: 'analyzing_hooks', status: 'failed', message: msg });
        }

        // Process patterns result
        if (patternsResult.status === 'fulfilled' && patternsResult.value.success) {
          patterns = patternsResult.value.analysis || null;
          send({ step: 'analyzing_patterns', status: 'completed', message: 'Pattern analysis complete' });
        } else {
          const msg = patternsResult.status === 'rejected'
            ? patternsResult.reason?.message || 'Pattern analysis failed'
            : patternsResult.value.error || 'Pattern analysis failed';
          send({ step: 'analyzing_patterns', status: 'failed', message: msg });
        }

        send({ step: 'analyzing', status: 'completed', message: 'AI analysis complete' });

        // ========== STEP 3.5: Load Creative Intelligence data ==========
        try {
          send({ step: 'loading_ci', status: 'started', message: 'Loading creative intelligence data...' });
          creativeIntelligence = await fetchCreativeIntelligenceData(brandId);
          if (creativeIntelligence) {
            send({ step: 'loading_ci', status: 'completed', message: 'Creative intelligence data loaded' });
          } else {
            send({ step: 'loading_ci', status: 'skipped', message: 'No creative intelligence data available yet' });
          }
        } catch {
          send({ step: 'loading_ci', status: 'failed', message: 'Creative intelligence data unavailable' });
        }

        // ========== STEP 3.6: Synthetic CI when no snapshots exist ==========
        if (!creativeIntelligence && allAds.length > 0) {
          try {
            const competitorAds = allAds.filter(a => !a.isClientAd);
            creativeIntelligence = await buildSyntheticCI(brandId, allAds, clientAds, competitorAds);
            send({ step: 'synthetic_ci', status: 'completed', message: 'Built creative intelligence from ad data' });
          } catch (err) {
            console.error('[Report] Synthetic CI failed:', err);
            send({ step: 'synthetic_ci', status: 'failed', message: 'Could not build synthetic creative intelligence' });
          }
        }

        // ========== STEP 3.7: Fallback gap & breakout analysis ==========
        if (creativeIntelligence) {
          const competitorAds = allAds.filter(a => !a.isClientAd);

          // Discard pre-computed gaps if all prevalence values are zero (stale/bad snapshot)
          if (creativeIntelligence.gaps) {
            const allZero = creativeIntelligence.gaps.priorityGaps.every(
              g => g.clientPrevalence < 1 && g.competitorPrevalence < 1
            );
            if (allZero) {
              creativeIntelligence.gaps = null;
              creativeIntelligence.clientPatterns = null;
            }
          }

          if (!creativeIntelligence.gaps && clientAds.length > 0 && creativeIntelligence.rawPrevalence?.length) {
            try {
              const gaps = await computeFallbackGaps(brandId, clientAds.map(a => a.id), creativeIntelligence.rawPrevalence);
              if (gaps) {
                creativeIntelligence.gaps = gaps;
                creativeIntelligence.clientPatterns = deriveClientPatternsFromGaps(gaps);
                creativeIntelligence.metadata.totalClientAds = clientAds.length;
                creativeIntelligence.metadata.totalCompetitorAds = competitorAds.length;
                send({ step: 'fallback_gaps', status: 'completed', message: `Computed gap analysis from ${clientAds.length} client ads` });
              }
            } catch (err) {
              console.error('[Report] Fallback gap analysis failed:', err);
            }
          }

          if (!creativeIntelligence.breakouts && competitorAds.length >= 10) {
            const breakouts = computeFallbackBreakouts(competitorAds);
            if (breakouts) {
              creativeIntelligence.breakouts = breakouts;
              send({ step: 'fallback_breakouts', status: 'completed', message: `Computed breakout analysis from ${competitorAds.length} competitor ads` });
            }
          }
        }

        // ========== STEP 4: Generate playbook (if endpoint exists) ==========
        try {
          send({ step: 'generating_playbook', status: 'started', message: 'Generating playbook...' });

          const playbookResponse = await fetch(`${baseUrl}/api/playbooks/generate`, {
            method: 'POST',
            headers: fetchHeaders,
            body: JSON.stringify({
              brandId,
              forceRefresh: true,
              trends,
              patterns,
            }),
          });

          if (playbookResponse.ok) {
            const playbookResult = await playbookResponse.json();
            if (playbookResult.success && playbookResult.playbook) {
              playbook = playbookResult.playbook?.content ?? playbookResult.playbook;
              console.log('[Report] Playbook keys:', playbook ? Object.keys(playbook) : 'null');
              send({ step: 'generating_playbook', status: 'completed', message: 'Playbook generated' });
            } else {
              send({ step: 'generating_playbook', status: 'failed', message: playbookResult.error || 'Playbook generation failed' });
            }
          } else {
            send({ step: 'generating_playbook', status: 'failed', message: 'Playbook endpoint not available' });
          }
        } catch {
          send({ step: 'generating_playbook', status: 'failed', message: 'Playbook generation skipped' });
        }

        // ========== STEP 5: Compute report ==========
        send({ step: 'computing_report', status: 'started', message: 'Computing report...' });

        const reportData: ReportData = {
          clientBrand: { id: brandId, name: brandName, industry },
          allAds,
          clientAds,
          competitors,
          trends,
          hookAnalysis,
          playbook,
        };

        const report = computeReport(reportData);

        // Validate report data integrity before proceeding
        const validationErrors = validateReport(report);
        if (validationErrors.length > 0) {
          console.error('[Report] Validation failed:', validationErrors);
          send({
            step: 'computing_report',
            status: 'failed',
            message: `Report validation failed: ${validationErrors.map(e => e.message).join('; ')}`,
            data: { validationErrors },
          });
          controller.close();
          return;
        }

        send({
          step: 'computing_report',
          status: 'completed',
          message: 'Report computed',
          data: report,
        });

        // ========== STEP 6: Final assembled report ==========
        send({
          step: 'done',
          status: 'completed',
          message: 'Report generation complete',
          data: {
            report,
            trends,
            hookAnalysis,
            patterns,
            playbook,
            allAds,
            clientAds,
            creativeIntelligence,
            trendSummary,
          },
        });
      } catch (err) {
        send({
          step: 'error',
          status: 'failed',
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

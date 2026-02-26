'use client';

import { PlaybookContent, PlaybookRow } from '@/types/playbook';
import { ActionPlan } from './sections/ActionPlan';
import { ExecutiveSummary } from './sections/ExecutiveSummary';
import { FormatStrategy } from './sections/FormatStrategy';
import { HookStrategy } from './sections/HookStrategy';
import { CompetitorGaps } from './sections/CompetitorGaps';
import { StopDoing } from './sections/StopDoing';
import { TopPerformers } from './sections/TopPerformers';
import { Calendar, BarChart3, TrendingUp, Users, CheckCircle2, AlertTriangle, Link2 } from 'lucide-react';
import Link from 'next/link';

interface Props {
  playbook: PlaybookRow;
  showDataSnapshot?: boolean;
  brandId?: string;
}

export function PlaybookViewer({ playbook, showDataSnapshot = true, brandId }: Props) {
  const content = playbook.content as PlaybookContent;
  const isLowDataMode = content.dataSnapshot?.lowDataMode;

  return (
    <div className="space-y-8">
      {/* Low Data Mode Banner */}
      {isLowDataMode && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">
                {content.dataSnapshot?.clientAdsIncluded
                  ? `Based on ${content.dataSnapshot.clientAdsAnalyzed} of your ads + competitor patterns`
                  : 'Competitor-Focused Playbook'}
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                {content.dataSnapshot?.clientAdsIncluded
                  ? 'Your ad data is included but limited — recommendations are informed by your performance and competitor patterns. Run more ads to unlock full personalized insights.'
                  : 'Based on competitor patterns — test these recommendations with your own data to validate what works for your audience.'}
              </p>
              {brandId && !content.dataSnapshot?.clientAdsIncluded && (
                <Link
                  href={`/brands/${brandId}/patterns`}
                  className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-amber-700 hover:text-amber-900"
                >
                  <Link2 className="w-4 h-4" />
                  Connect Meta account or run more ads for personalized insights
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Data Snapshot */}
      {showDataSnapshot && content.dataSnapshot && (
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar className="w-4 h-4" />
            <span>
              Generated {new Date(content.dataSnapshot.generatedAt).toLocaleDateString()}
            </span>
          </div>
          {(content.dataSnapshot.myPatternsIncluded || content.dataSnapshot.clientAdsIncluded) && (
            <div className="flex items-center gap-2 text-green-600">
              <BarChart3 className="w-4 h-4" />
              <span>{content.dataSnapshot.clientAdsAnalyzed} of your ads analyzed</span>
            </div>
          )}
          {content.dataSnapshot.competitorAdsAnalyzed > 0 && (
            <div className="flex items-center gap-2 text-indigo-600">
              <Users className="w-4 h-4" />
              <span>{content.dataSnapshot.competitorAdsAnalyzed} competitor ads</span>
            </div>
          )}
          {content.dataSnapshot.trendsIncorporated > 0 && (
            <div className="flex items-center gap-2 text-purple-600">
              <TrendingUp className="w-4 h-4" />
              <span>{content.dataSnapshot.trendsIncorporated} trends analyzed</span>
            </div>
          )}
          {/* Data quality indicator */}
          {content.dataSnapshot.myPatternsIncluded && content.dataSnapshot.competitorAdsAnalyzed >= 10 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>High-quality data</span>
            </div>
          )}
        </div>
      )}

      {/* Action Plan - Render first after data snapshot */}
      {content.actionPlan && (
        <ActionPlan data={content.actionPlan} />
      )}

      {/* Executive Summary */}
      {content.executiveSummary && (
        <ExecutiveSummary data={content.executiveSummary} />
      )}

      {/* Format Strategy */}
      {content.formatStrategy && (
        <FormatStrategy data={content.formatStrategy} />
      )}

      {/* Hook Strategy */}
      {content.hookStrategy && (
        <HookStrategy data={content.hookStrategy} />
      )}

      {/* Competitor Gaps */}
      {content.competitorGaps && (
        <CompetitorGaps data={content.competitorGaps} />
      )}

      {/* Stop Doing */}
      {content.stopDoing && (
        <StopDoing data={content.stopDoing} />
      )}

      {/* Top Performers */}
      {content.topPerformers && (
        <TopPerformers data={content.topPerformers} />
      )}
    </div>
  );
}

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
              <h3 className="font-semibold text-amber-900">Competitor-Focused Playbook</h3>
              <p className="text-sm text-amber-700 mt-1">
                Based on competitor patterns — test these recommendations with your own data to validate what works for your audience.
              </p>
              {brandId && (
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
          {content.dataSnapshot.myPatternsIncluded && (
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
      {content.formatStrategy?.recommendations?.length > 0 && (
        <FormatStrategy data={content.formatStrategy} />
      )}

      {/* Hook Strategy */}
      {content.hookStrategy?.toTest?.length > 0 && (
        <HookStrategy data={content.hookStrategy} />
      )}

      {/* Competitor Gaps */}
      {content.competitorGaps?.opportunities?.length > 0 && (
        <CompetitorGaps data={content.competitorGaps} />
      )}

      {/* Stop Doing */}
      {content.stopDoing?.patterns?.length > 0 && (
        <StopDoing data={content.stopDoing} />
      )}

      {/* Top Performers */}
      {content.topPerformers?.competitorAds?.length > 0 && (
        <TopPerformers data={content.topPerformers} />
      )}
    </div>
  );
}

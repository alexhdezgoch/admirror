'use client';

import { AlertTriangle, Info } from 'lucide-react';

interface DataQualityBannerProps {
  daysOfData: number;
  adsAnalyzed: number;
  minDays?: number;
  minAds?: number;
}

export function DataQualityBanner({
  daysOfData,
  adsAnalyzed,
  minDays = 7,
  minAds = 5,
}: DataQualityBannerProps) {
  const hasEnoughDays = daysOfData >= minDays;
  const hasEnoughAds = adsAnalyzed >= minAds;
  const isReliable = hasEnoughDays && hasEnoughAds;

  if (isReliable) {
    return null;
  }

  const issues: string[] = [];
  if (!hasEnoughDays) {
    issues.push(`${daysOfData} day${daysOfData !== 1 ? 's' : ''} of data (need ${minDays}+)`);
  }
  if (!hasEnoughAds) {
    issues.push(`${adsAnalyzed} ad${adsAnalyzed !== 1 ? 's' : ''} analyzed (need ${minAds}+)`);
  }

  const severity = daysOfData < 3 || adsAnalyzed < 3 ? 'warning' : 'info';

  return (
    <div
      className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
        severity === 'warning'
          ? 'bg-amber-50 border border-amber-200'
          : 'bg-blue-50 border border-blue-200'
      }`}
    >
      {severity === 'warning' ? (
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
      ) : (
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
      )}
      <div>
        <p
          className={`text-sm font-medium ${
            severity === 'warning' ? 'text-amber-800' : 'text-blue-800'
          }`}
        >
          Limited data available
        </p>
        <p
          className={`text-sm mt-1 ${
            severity === 'warning' ? 'text-amber-700' : 'text-blue-700'
          }`}
        >
          Results based on {issues.join(' and ')}.{' '}
          {!hasEnoughDays && 'Continue running ads to get more reliable patterns.'}
          {hasEnoughDays && !hasEnoughAds && 'Sync more ads to improve accuracy.'}
        </p>
      </div>
    </div>
  );
}

// Helper to calculate data quality metrics
export function calculateDataQuality(
  adsAnalyzed: number,
  oldestAdDate?: string,
  minDays = 7,
  minAds = 5
): { daysOfData: number; adsAnalyzed: number; isReliable: boolean } {
  const daysOfData = oldestAdDate
    ? Math.floor((Date.now() - new Date(oldestAdDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    daysOfData,
    adsAnalyzed,
    isReliable: daysOfData >= minDays && adsAnalyzed >= minAds,
  };
}

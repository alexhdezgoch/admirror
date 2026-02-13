import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ');
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function daysAgo(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate how many ads to analyze per competitor based on total count.
 * Formula: min(max(10, ceil(totalAds * 0.5)), 100)
 * - Minimum 10 ads
 * - 50% of total ads
 * - Maximum 100 ads
 */
export function getAnalysisAdCount(totalAds: number): number {
  return Math.min(Math.max(10, Math.ceil(totalAds * 0.5)), 100);
}

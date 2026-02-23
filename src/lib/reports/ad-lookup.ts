import { Ad } from '@/types';

export function buildAdMap(allAds: Ad[]): Map<string, Ad> {
  return new Map(allAds.map(a => [a.id, a]));
}

export function findAdsByIds(adMap: Map<string, Ad>, ids: string[]): Ad[] {
  return ids.map(id => adMap.get(id)).filter((a): a is Ad => !!a);
}

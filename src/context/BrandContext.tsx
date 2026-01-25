'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ClientBrand, Competitor, Ad, AdScore } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { clientBrands as mockBrands, ads as mockAds } from '@/data/mockData';
import { useAuth } from './AuthContext';
import { Tables } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

interface SyncResult {
  success: boolean;
  count?: number;
  newAds?: number;
  updatedAds?: number;
  archivedAds?: number;
  error?: string;
}

// Type for ad with analysis data
export interface AdWithAnalysis extends Ad {
  analysis?: {
    analysis: Record<string, unknown>;
    analyzed_at: string;
  } | null;
}

interface BrandContextType {
  // Client brands
  clientBrands: ClientBrand[];
  currentBrand: ClientBrand | null;
  setCurrentBrandId: (brandId: string | null) => void;

  // Loading and error states
  loading: boolean;
  error: string | null;

  // CRUD operations for client brands
  createClientBrand: (brand: Omit<ClientBrand, 'id' | 'createdAt' | 'lastUpdated' | 'competitors'>) => Promise<ClientBrand | null>;
  updateClientBrand: (brandId: string, updates: Partial<ClientBrand>) => Promise<void>;
  deleteClientBrand: (brandId: string) => Promise<void>;

  // Competitor management
  addCompetitor: (brandId: string, competitor: Omit<Competitor, 'id'>) => Promise<void>;
  removeCompetitor: (brandId: string, competitorId: string) => Promise<void>;

  // Ads for current brand
  getAdsForBrand: (brandId: string) => Ad[];
  allAds: Ad[];

  // Get ads with their analysis data
  getAnalyzedAds: (brandId: string) => Promise<AdWithAnalysis[]>;

  // Swipe file management
  toggleSwipeFile: (adId: string) => Promise<void>;

  // Apify sync
  syncCompetitorAds: (brandId: string, competitorId: string) => Promise<SyncResult>;

  // Refresh data
  refreshData: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

// Helper to convert database row to ClientBrand
function dbBrandToClientBrand(
  dbBrand: Tables<'client_brands'>,
  competitors: Competitor[] = []
): ClientBrand {
  return {
    id: dbBrand.id,
    name: dbBrand.name,
    logo: dbBrand.logo,
    industry: dbBrand.industry,
    color: dbBrand.color,
    adsLibraryUrl: (dbBrand as Record<string, unknown>).ads_library_url as string | undefined,
    createdAt: dbBrand.created_at,
    lastUpdated: dbBrand.last_updated,
    competitors,
  };
}

// Helper to convert database row to Competitor
function dbCompetitorToCompetitor(dbComp: Tables<'competitors'>): Competitor {
  return {
    id: dbComp.id,
    name: dbComp.name,
    logo: dbComp.logo,
    url: dbComp.url || '',
    totalAds: dbComp.total_ads,
    avgAdsPerWeek: Number(dbComp.avg_ads_per_week),
    lastSyncedAt: dbComp.last_synced_at || undefined,
  };
}

// Helper to convert database row to Ad
function dbAdToAd(dbAd: Tables<'ads'>): Ad {
  return {
    id: dbAd.id,
    clientBrandId: dbAd.client_brand_id,
    competitorId: dbAd.competitor_id,
    competitorName: dbAd.competitor_name,
    competitorLogo: dbAd.competitor_logo,
    thumbnail: dbAd.thumbnail_url || '',
    format: dbAd.format as Ad['format'],
    daysActive: dbAd.days_active,
    variationCount: dbAd.variation_count,
    launchDate: dbAd.launch_date,
    hookText: dbAd.hook_text || '',
    hookType: (dbAd.hook_type || 'statement') as Ad['hookType'],
    headline: dbAd.headline || '',
    primaryText: dbAd.primary_text || '',
    cta: dbAd.cta || '',
    isVideo: dbAd.is_video,
    videoDuration: dbAd.video_duration || undefined,
    videoUrl: dbAd.video_url || undefined,
    creativeElements: dbAd.creative_elements || [],
    inSwipeFile: dbAd.in_swipe_file,
    scoring: dbAd.scoring as unknown as AdScore,
    isActive: dbAd.is_active,
    lastSeenAt: dbAd.last_seen_at,
  };
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clientBrands, setClientBrands] = useState<ClientBrand[]>([]);
  const [currentBrandId, setCurrentBrandIdState] = useState<string | null>(null);
  const [allAds, setAllAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);

  // Initialize Supabase client (or trigger demo mode)
  useEffect(() => {
    if (isSupabaseConfigured) {
      const client = createClient();
      setSupabase(client);
    } else {
      // Demo mode: load mock data immediately
      console.log('[DEMO MODE] Supabase not configured, loading mock data');
      setClientBrands(mockBrands);
      setAllAds(mockAds);
      setLoading(false);
    }
  }, []);

  const currentBrand = clientBrands.find(b => b.id === currentBrandId) || null;

  // Fetch all data from Supabase (or use mock data in demo mode)
  const fetchData = useCallback(async () => {
    // Demo mode: use mock data when Supabase isn't configured
    if (!isSupabaseConfigured) {
      console.log('[DEMO MODE] Using mock data');
      setClientBrands(mockBrands);
      setAllAds(mockAds);
      setLoading(false);
      return;
    }

    if (!user || !supabase) {
      setClientBrands([]);
      setAllAds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('client_brands')
        .select('*')
        .order('created_at', { ascending: false });

      if (brandsError) throw brandsError;

      // Fetch all competitors
      const { data: competitorsData, error: competitorsError } = await supabase
        .from('competitors')
        .select('*');

      if (competitorsError) throw competitorsError;

      // Fetch all ads
      const { data: adsData, error: adsError } = await supabase
        .from('ads')
        .select('*')
        .order('created_at', { ascending: false });

      if (adsError) throw adsError;

      // Group competitors by brand
      const competitorsByBrand: Record<string, Competitor[]> = {};
      competitorsData?.forEach(comp => {
        if (!competitorsByBrand[comp.brand_id]) {
          competitorsByBrand[comp.brand_id] = [];
        }
        competitorsByBrand[comp.brand_id].push(dbCompetitorToCompetitor(comp));
      });

      // Convert to ClientBrand objects
      const brands = brandsData?.map(brand =>
        dbBrandToClientBrand(brand, competitorsByBrand[brand.id] || [])
      ) || [];

      // Convert ads
      const ads = adsData?.map(dbAdToAd) || [];
      console.log('[FETCH] Video ads from DB:', ads.filter(a => a.format === 'video').length);

      setClientBrands(brands);
      setAllAds(ads);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // Load data when user changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setCurrentBrandId = (brandId: string | null) => {
    setCurrentBrandIdState(brandId);
  };

  const createClientBrand = async (
    brand: Omit<ClientBrand, 'id' | 'createdAt' | 'lastUpdated' | 'competitors'>
  ): Promise<ClientBrand | null> => {
    if (!supabase) {
      console.error('Cannot create brand: Supabase client not initialized');
      setError('Database connection not available');
      return null;
    }

    // Get current user directly from Supabase to avoid stale closure issues
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    console.log('BrandContext: getUser result:', {
      hasUser: !!currentUser,
      email: currentUser?.email,
      authError: authError?.message
    });

    // Also check session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('BrandContext: getSession result:', {
      hasSession: !!session,
      sessionUser: session?.user?.email
    });

    if (!currentUser) {
      console.error('Cannot create brand: user not authenticated');
      setError('You must be logged in to create a brand. Please log out and log in again.');
      return null;
    }

    try {
      const insertData = {
        user_id: currentUser.id,
        name: brand.name,
        logo: brand.logo,
        industry: brand.industry,
        color: brand.color,
        ...(brand.adsLibraryUrl && { ads_library_url: brand.adsLibraryUrl }),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from('client_brands')
        .insert(insertData as any)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating brand:', error);
        throw new Error(error.message || error.code || 'Database error');
      }

      const newBrand = dbBrandToClientBrand(data, []);
      setClientBrands(prev => [newBrand, ...prev]);
      return newBrand;
    } catch (err) {
      console.error('Error creating brand:', err);
      const message = err instanceof Error ? err.message : 'Failed to create brand';
      setError(message);
      return null;
    }
  };

  const updateClientBrand = async (brandId: string, updates: Partial<ClientBrand>) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('client_brands')
        .update({
          name: updates.name,
          logo: updates.logo,
          industry: updates.industry,
          color: updates.color,
        })
        .eq('id', brandId);

      if (error) throw error;

      // Optimistic update
      setClientBrands(prev =>
        prev.map(brand =>
          brand.id === brandId
            ? { ...brand, ...updates, lastUpdated: new Date().toISOString() }
            : brand
        )
      );
    } catch (err) {
      console.error('Error updating brand:', err);
      setError(err instanceof Error ? err.message : 'Failed to update brand');
    }
  };

  const deleteClientBrand = async (brandId: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('client_brands')
        .delete()
        .eq('id', brandId);

      if (error) throw error;

      // Optimistic update - cascade handles competitors and ads
      setClientBrands(prev => prev.filter(brand => brand.id !== brandId));
      setAllAds(prev => prev.filter(ad => ad.clientBrandId !== brandId));

      if (currentBrandId === brandId) {
        setCurrentBrandIdState(null);
      }
    } catch (err) {
      console.error('Error deleting brand:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete brand');
    }
  };

  const addCompetitor = async (brandId: string, competitor: Omit<Competitor, 'id'>) => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('competitors')
        .insert({
          brand_id: brandId,
          name: competitor.name,
          logo: competitor.logo,
          url: competitor.url || null,
          total_ads: competitor.totalAds || 0,
          avg_ads_per_week: competitor.avgAdsPerWeek || 0,
        })
        .select()
        .single();

      if (error) throw error;

      const newCompetitor = dbCompetitorToCompetitor(data);

      // Optimistic update
      setClientBrands(prev =>
        prev.map(brand =>
          brand.id === brandId
            ? {
                ...brand,
                competitors: [...brand.competitors, newCompetitor],
                lastUpdated: new Date().toISOString(),
              }
            : brand
        )
      );
    } catch (err) {
      console.error('Error adding competitor:', err);
      setError(err instanceof Error ? err.message : 'Failed to add competitor');
    }
  };

  const removeCompetitor = async (brandId: string, competitorId: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('competitors')
        .delete()
        .eq('id', competitorId);

      if (error) throw error;

      // Optimistic update - cascade handles ads
      setClientBrands(prev =>
        prev.map(brand =>
          brand.id === brandId
            ? {
                ...brand,
                competitors: brand.competitors.filter(c => c.id !== competitorId),
                lastUpdated: new Date().toISOString(),
              }
            : brand
        )
      );
      setAllAds(prev =>
        prev.filter(ad => !(ad.clientBrandId === brandId && ad.competitorId === competitorId))
      );
    } catch (err) {
      console.error('Error removing competitor:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove competitor');
    }
  };

  const getAdsForBrand = (brandId: string): Ad[] => {
    return allAds.filter(ad => ad.clientBrandId === brandId);
  };

  const getAnalyzedAds = useCallback(async (brandId: string): Promise<AdWithAnalysis[]> => {
    if (!supabase) return [];

    // Get ads for the brand
    const { data: adsData, error: adsError } = await supabase
      .from('ads')
      .select('*')
      .eq('client_brand_id', brandId)
      .order('scoring->>final', { ascending: false, nullsFirst: false });

    if (adsError || !adsData) {
      console.error('Error fetching ads:', adsError);
      return [];
    }

    // Get analyses for these ads
    const adIds = adsData.map(ad => ad.id);
    const { data: analysesData } = await supabase
      .from('ad_analyses')
      .select('ad_id, analysis, analyzed_at')
      .in('ad_id', adIds);

    // Create a map of ad_id to analysis
    const analysisMap = new Map<string, { analysis: Record<string, unknown>; analyzed_at: string }>();
    analysesData?.forEach(item => {
      analysisMap.set(item.ad_id, {
        analysis: item.analysis as Record<string, unknown>,
        analyzed_at: item.analyzed_at
      });
    });

    // Convert and merge
    return adsData.map(dbAd => {
      const ad = dbAdToAd(dbAd);
      return {
        ...ad,
        analysis: analysisMap.get(ad.id) || null
      };
    });
  }, [supabase]);

  const toggleSwipeFile = async (adId: string) => {
    // Clear any previous errors
    setError(null);

    const ad = allAds.find(a => a.id === adId);
    if (!ad) return;

    const newValue = !ad.inSwipeFile;

    // Optimistic update (works for both demo and production)
    setAllAds(prev =>
      prev.map(a => (a.id === adId ? { ...a, inSwipeFile: newValue } : a))
    );

    // In demo mode, skip database update - just use local state
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    // Production mode: persist to database
    try {
      // Get current user directly from Supabase to avoid stale closure issues
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('Auth error checking user:', authError);
      }

      if (!currentUser) {
        throw new Error('You must be logged in to update swipe file. Please log out and log in again.');
      }

      const { error } = await supabase
        .from('ads')
        .update({ in_swipe_file: newValue })
        .eq('id', adId)
        .eq('user_id', currentUser.id);  // Add user_id filter for RLS

      if (error) throw error;

      // If adding to swipe file, check if analysis exists and trigger if not
      if (newValue) {
        const { data: existingAnalysis } = await supabase
          .from('ad_analyses')
          .select('id')
          .eq('ad_id', adId)
          .single();

        if (!existingAnalysis) {
          // Trigger analysis in background (fire and forget)
          fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
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
              }
            })
          }).catch(err => {
            console.error('Background analysis failed:', err);
          });
        }
      }
    } catch (err) {
      // Revert on error
      setAllAds(prev =>
        prev.map(a => (a.id === adId ? { ...a, inSwipeFile: !newValue } : a))
      );

      // Log detailed error for debugging
      console.error('Error toggling swipe file:', err);
      if (err && typeof err === 'object' && 'message' in err) {
        console.error('Supabase error message:', (err as { message: string }).message);
        console.error('Supabase error details:', JSON.stringify(err, null, 2));
      }

      setError(err instanceof Error ? err.message : 'Failed to update swipe file');
    }
  };

  const syncCompetitorAds = async (brandId: string, competitorId: string): Promise<SyncResult> => {
    if (!user || !supabase) {
      return { success: false, error: 'Not authenticated' };
    }

    const brand = clientBrands.find(b => b.id === brandId);
    if (!brand) {
      return { success: false, error: 'Brand not found' };
    }

    const competitor = brand.competitors.find(c => c.id === competitorId);
    if (!competitor) {
      return { success: false, error: 'Competitor not found' };
    }

    if (!competitor.url) {
      return { success: false, error: 'Competitor does not have a Meta Ad Library URL configured' };
    }

    try {
      // Step 1: Get all existing ad IDs for this competitor
      const { data: existingAdsData, error: existingError } = await supabase
        .from('ads')
        .select('id, is_active')
        .eq('competitor_id', competitorId);

      if (existingError) {
        console.error('Error fetching existing ads:', existingError);
      }

      // Ensure consistent string comparison for IDs
      // Treat NULL or undefined is_active as true (for backwards compatibility with existing ads)
      const existingAdIds = new Set((existingAdsData || []).map(ad => String(ad.id)));
      const existingActiveIds = new Set(
        (existingAdsData || []).filter(ad => ad.is_active !== false).map(ad => String(ad.id))
      );

      // Step 2: Fetch new ads from Apify
      const response = await fetch('/api/apify/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientBrandId: brandId,
          competitorId,
          competitorUrl: competitor.url,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || 'Sync failed' };
      }

      const fetchedAds: Ad[] = data.ads;
      console.log('[SYNC] Video ads received:', fetchedAds.filter(a => a.format === 'video').length);

      // Create set of fetched ad IDs
      const fetchedAdIds = new Set(fetchedAds.map(ad => String(ad.id)));

      // Step 3: Calculate new vs updated vs archived
      let newAdsCount = 0;
      let updatedAdsCount = 0;

      // Prepare ads for insertion with is_active and last_seen_at
      const now = new Date().toISOString();
      const adsToUpsert = fetchedAds.map(ad => {
        const adId = String(ad.id);
        const isNew = !existingAdIds.has(adId);
        if (isNew) {
          newAdsCount++;
        } else {
          updatedAdsCount++;
        }

        return {
          id: adId,
          user_id: user.id,
          client_brand_id: brandId,
          competitor_id: competitorId,
          competitor_name: ad.competitorName,
          competitor_logo: ad.competitorLogo,
          format: ad.format,
          days_active: ad.daysActive,
          variation_count: ad.variationCount,
          launch_date: ad.launchDate.split('T')[0],
          hook_text: ad.hookText,
          headline: ad.headline,
          primary_text: ad.primaryText,
          cta: ad.cta,
          hook_type: ad.hookType,
          is_video: ad.isVideo,
          video_duration: ad.videoDuration || null,
          creative_elements: ad.creativeElements,
          in_swipe_file: false,
          scoring: JSON.parse(JSON.stringify(ad.scoring)),
          thumbnail_url: ad.thumbnail,
          video_url: ad.videoUrl || null,
          is_active: true,
          last_seen_at: now,
        };
      });

      // Deduplicate ads by ID (Apify can return duplicates)
      const uniqueAdsMap = new Map<string, typeof adsToUpsert[0]>();
      adsToUpsert.forEach(ad => {
        uniqueAdsMap.set(ad.id, ad);
      });
      const uniqueAdsToUpsert = Array.from(uniqueAdsMap.values());

      console.log(`[DEDUP] Before: ${adsToUpsert.length} ads, After: ${uniqueAdsToUpsert.length} unique ads`);

      // Upsert ads (insert or update if exists)
      const { error: upsertError } = await supabase
        .from('ads')
        .upsert(uniqueAdsToUpsert, { onConflict: 'id' });

      if (upsertError) {
        console.error('Error upserting ads:', JSON.stringify(upsertError, null, 2));
        return { success: false, error: `Failed to save ads to database: ${upsertError.message}` };
      }

      // Step 4: Archive ads that were active but not in the new fetch
      const adsToArchive = Array.from(existingActiveIds).filter(id => !fetchedAdIds.has(id));
      let archivedAdsCount = 0;

      // Debug logging to help diagnose archive issues
      console.log('[SYNC DEBUG] Existing active IDs count:', existingActiveIds.size);
      console.log('[SYNC DEBUG] Fetched IDs count:', fetchedAdIds.size);
      console.log('[SYNC DEBUG] Ads to archive count:', adsToArchive.length);
      if (adsToArchive.length > 0 && adsToArchive.length <= 5) {
        console.log('[SYNC DEBUG] IDs to archive:', adsToArchive);
      }
      // Sample some IDs to check format
      const existingSample = Array.from(existingActiveIds).slice(0, 3);
      const fetchedSample = Array.from(fetchedAdIds).slice(0, 3);
      console.log('[SYNC DEBUG] Sample existing IDs:', existingSample);
      console.log('[SYNC DEBUG] Sample fetched IDs:', fetchedSample);

      if (adsToArchive.length > 0) {
        const { error: archiveError } = await supabase
          .from('ads')
          .update({ is_active: false })
          .in('id', adsToArchive);

        if (archiveError) {
          console.error('Error archiving ads:', archiveError);
        } else {
          archivedAdsCount = adsToArchive.length;
          console.log(`[ARCHIVE] Archived ${archivedAdsCount} ads that are no longer active`);
        }
      }

      // Step 5: Update competitor's total_ads count and last_synced_at
      const activeAdsCount = uniqueAdsToUpsert.length;
      const { error: updateError } = await supabase
        .from('competitors')
        .update({
          total_ads: activeAdsCount,
          last_synced_at: now
        })
        .eq('id', competitorId);

      if (updateError) {
        console.error('Error updating competitor:', updateError);
      }

      // Auto-analyze top 10 ads by score (fire-and-forget)
      const topAds = uniqueAdsToUpsert
        .sort((a, b) => ((b.scoring as AdScore)?.final || 0) - ((a.scoring as AdScore)?.final || 0))
        .slice(0, 10);

      // Trigger background analysis for each top ad
      topAds.forEach(ad => {
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adId: ad.id,
            imageUrl: ad.thumbnail_url,
            videoUrl: ad.video_url,
            isVideo: ad.is_video,
            competitorName: ad.competitor_name,
            hookText: ad.hook_text,
            headline: ad.headline,
            primaryText: ad.primary_text,
            cta: ad.cta,
            format: ad.format,
            daysActive: ad.days_active,
            variationCount: ad.variation_count,
            scoring: ad.scoring
          })
        }).catch(err => console.error('Background analysis failed for ad:', ad.id, err));
      });
      console.log(`Triggered background analysis for top ${topAds.length} ads`);

      // Refresh data to get updated state
      await fetchData();

      return {
        success: true,
        count: fetchedAds.length,
        newAds: newAdsCount,
        updatedAds: updatedAdsCount,
        archivedAds: archivedAdsCount
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      return { success: false, error: errorMessage };
    }
  };

  const refreshData = async () => {
    await fetchData();
  };

  return (
    <BrandContext.Provider
      value={{
        clientBrands,
        currentBrand,
        setCurrentBrandId,
        loading,
        error,
        createClientBrand,
        updateClientBrand,
        deleteClientBrand,
        addCompetitor,
        removeCompetitor,
        getAdsForBrand,
        allAds,
        getAnalyzedAds,
        toggleSwipeFile,
        syncCompetitorAds,
        refreshData,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export function useBrandContext() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrandContext must be used within a BrandProvider');
  }
  return context;
}

// Hook to get current brand from URL param
export function useCurrentBrand(brandId: string | undefined) {
  const { clientBrands, setCurrentBrandId } = useBrandContext();

  useEffect(() => {
    if (brandId) {
      setCurrentBrandId(brandId);
    }
  }, [brandId, setCurrentBrandId]);

  return clientBrands.find(b => b.id === brandId) || null;
}

'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ClientBrand, Competitor, Ad, AdScore, ClientAd, AudienceBreakdown } from '@/types';
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
  tokenExpired?: boolean;
}

interface AddCompetitorResult {
  success: boolean;
  error?: string;
}

// Type for ad with analysis data
export interface AdWithAnalysis extends Ad {
  analysis?: {
    analysis: Record<string, unknown>;
    analyzed_at: string;
  } | null;
}

interface CreateBrandResult {
  success: boolean;
  brand?: ClientBrand;
  error?: string;
  requiresCheckout?: boolean;
  checkoutBrandId?: string;
}

export interface SubscriptionState {
  status: string;
  brandQuantity: number;
  competitorQuantity: number;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  hasSubscription: boolean;
}

interface BrandContextType {
  // Client brands
  clientBrands: ClientBrand[];
  currentBrand: ClientBrand | null;
  setCurrentBrandId: (brandId: string | null) => void;

  // Loading and error states
  loading: boolean;
  error: string | null;

  // Subscription state
  subscription: SubscriptionState;

  // CRUD operations for client brands
  createClientBrand: (brand: Omit<ClientBrand, 'id' | 'createdAt' | 'lastUpdated' | 'competitors'>) => Promise<CreateBrandResult>;
  updateClientBrand: (brandId: string, updates: Partial<ClientBrand>) => Promise<void>;
  deleteClientBrand: (brandId: string) => Promise<void>;

  // Competitor management
  addCompetitor: (brandId: string, competitor: Omit<Competitor, 'id'>) => Promise<AddCompetitorResult>;
  removeCompetitor: (brandId: string, competitorId: string) => Promise<void>;

  // Ads for current brand
  getAdsForBrand: (brandId: string) => Ad[];
  allAds: Ad[];

  // Get ads with their analysis data
  getAnalyzedAds: (brandId: string) => Promise<AdWithAnalysis[]>;

  // Apify sync
  syncCompetitorAds: (brandId: string, competitorId: string) => Promise<SyncResult>;

  // Client ads (user's own Meta ads)
  clientAds: ClientAd[];
  getClientAdsForBrand: (brandId: string) => ClientAd[];
  syncMetaAds: (brandId: string) => Promise<SyncResult>;

  // Audience breakdowns from Meta Insights API
  audienceBreakdowns: AudienceBreakdown[];
  getAudienceBreakdownsForBrand: (brandId: string) => AudienceBreakdown[];

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
    isClientAd: dbAd.is_client_ad,
  };
}

const defaultSubscription: SubscriptionState = {
  status: 'inactive',
  brandQuantity: 0,
  competitorQuantity: 0,
  currentPeriodEnd: null,
  stripeCustomerId: null,
  hasSubscription: false,
};

// Accounts that are never charged (must match server-side FREE_ACCOUNTS)
const FREE_ACCOUNTS = new Set([
  'alex@akeep.co',
  'kevin@vkng.group',
]);

export function BrandProvider({ children }: { children: ReactNode }) {
  const { user, refreshKey } = useAuth();
  const [clientBrands, setClientBrands] = useState<ClientBrand[]>([]);
  const [currentBrandId, setCurrentBrandIdState] = useState<string | null>(null);
  const [allAds, setAllAds] = useState<Ad[]>([]);
  const [clientAds, setClientAds] = useState<ClientAd[]>([]);
  const [audienceBreakdowns, setAudienceBreakdowns] = useState<AudienceBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionState>(defaultSubscription);

  // Initialize Supabase client (or trigger demo mode)
  useEffect(() => {
    if (isSupabaseConfigured) {
      const client = createClient();
      setSupabase(client);
    } else {
      console.log('[DEMO MODE] Supabase not configured, loading mock data');
      setClientBrands(mockBrands);
      setAllAds(mockAds);
      setLoading(false);
    }
  }, []);

  const currentBrand = clientBrands.find(b => b.id === currentBrandId) || null;

  // Fetch all data from Supabase (or use mock data in demo mode)
  const fetchData = useCallback(async () => {
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
      // Fetch subscription
      const isFreeAccount = user.email ? FREE_ACCOUNTS.has(user.email) : false;
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (isFreeAccount) {
        // Free accounts are always active with unlimited usage
        setSubscription({
          status: 'active',
          brandQuantity: subData?.brand_quantity ?? 999,
          competitorQuantity: subData?.competitor_quantity ?? 999,
          currentPeriodEnd: null,
          stripeCustomerId: null,
          hasSubscription: true,
        });
      } else if (subData) {
        setSubscription({
          status: subData.status,
          brandQuantity: subData.brand_quantity ?? 0,
          competitorQuantity: subData.competitor_quantity ?? 0,
          currentPeriodEnd: subData.current_period_end,
          stripeCustomerId: subData.stripe_customer_id,
          hasSubscription: subData.status === 'active' || subData.status === 'past_due',
        });
      } else {
        setSubscription(defaultSubscription);
      }

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

      // Fetch client ads (user's own Meta ads)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clientAdsData } = await (supabase as any)
        .from('client_ads')
        .select('*')
        .order('synced_at', { ascending: false });

      // Fetch audience breakdowns
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: breakdownsData } = await (supabase as any)
        .from('client_ad_audience_breakdowns')
        .select('*')
        .order('spend', { ascending: false });

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

      // Convert client ads
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedClientAds: ClientAd[] = (clientAdsData || []).map((row: any) => ({
        id: row.id,
        clientBrandId: row.client_brand_id,
        metaAdId: row.meta_ad_id,
        name: row.name || '',
        status: row.status || '',
        effectiveStatus: row.effective_status || '',
        thumbnailUrl: row.thumbnail_url || undefined,
        imageUrl: row.image_url || undefined,
        body: row.body || undefined,
        title: row.title || undefined,
        impressions: Number(row.impressions) || 0,
        clicks: Number(row.clicks) || 0,
        spend: Number(row.spend) || 0,
        ctr: Number(row.ctr) || 0,
        cpc: Number(row.cpc) || 0,
        cpm: Number(row.cpm) || 0,
        conversions: Number(row.conversions) || 0,
        revenue: Number(row.revenue) || 0,
        roas: Number(row.roas) || 0,
        cpa: Number(row.cpa) || 0,
        emotionalAngle: row.emotional_angle || undefined,
        narrativeStructure: row.narrative_structure || undefined,
        syncedAt: row.synced_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      // Convert audience breakdowns
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedBreakdowns: AudienceBreakdown[] = (breakdownsData || []).map((row: any) => ({
        id: row.id,
        clientBrandId: row.client_brand_id,
        age: row.age || '',
        gender: row.gender || '',
        publisherPlatform: row.publisher_platform || '',
        impressions: Number(row.impressions) || 0,
        clicks: Number(row.clicks) || 0,
        spend: Number(row.spend) || 0,
        conversions: Number(row.conversions) || 0,
        revenue: Number(row.revenue) || 0,
        syncedAt: row.synced_at,
      }));

      setClientBrands(brands);
      setAllAds(ads);
      setClientAds(mappedClientAds);
      setAudienceBreakdowns(mappedBreakdowns);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // Load data when user changes or session is refreshed after tab switch
  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const setCurrentBrandId = (brandId: string | null) => {
    setCurrentBrandIdState(brandId);
  };

  // Helper to call update-subscription API
  const updateSubscriptionQuantities = async (brandCount: number, competitorCount: number) => {
    const response = await fetch('/api/stripe/update-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandCount, competitorCount }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update subscription');
    }

    // Update local subscription state
    setSubscription(prev => ({
      ...prev,
      brandQuantity: brandCount,
      competitorQuantity: competitorCount,
    }));
  };

  // Count total competitors across all brands
  const getTotalCompetitorCount = useCallback(() => {
    return clientBrands.reduce((sum, brand) => sum + brand.competitors.length, 0);
  }, [clientBrands]);

  const createClientBrand = async (
    brand: Omit<ClientBrand, 'id' | 'createdAt' | 'lastUpdated' | 'competitors'>
  ): Promise<CreateBrandResult> => {
    if (!supabase) {
      return { success: false, error: 'Database connection not available' };
    }

    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      return { success: false, error: 'You must be logged in to create a brand.' };
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
        throw new Error(error.message || error.code || 'Database error');
      }

      const newBrand = dbBrandToClientBrand(data, []);
      setClientBrands(prev => [newBrand, ...prev]);

      // Free accounts never need checkout
      const isFreeAccount = user?.email ? FREE_ACCOUNTS.has(user.email) : false;

      // If no active subscription, this is the first brand — needs Stripe Checkout
      if (!isFreeAccount && (!subscription.hasSubscription || !subscription.stripeCustomerId)) {
        return {
          success: true,
          brand: newBrand,
          requiresCheckout: true,
          checkoutBrandId: newBrand.id,
        };
      }

      // Active subscription exists — update quantities (skip for free accounts)
      if (!isFreeAccount) {
        await updateSubscriptionQuantities(newBrandCount, totalCompetitors);
      }

      return { success: true, brand: newBrand };
    } catch (err) {
      console.error('Error creating brand:', err);
      const message = err instanceof Error ? err.message : 'Failed to create brand';
      setError(message);
      return { success: false, error: message };
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
          ads_library_url: updates.adsLibraryUrl,
        })
        .eq('id', brandId);

      if (error) throw error;

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
      // Count competitors that will be removed with this brand
      const brandToDelete = clientBrands.find(b => b.id === brandId);
      const removedCompetitors = brandToDelete?.competitors.length || 0;

      const { error } = await supabase
        .from('client_brands')
        .delete()
        .eq('id', brandId);

      if (error) throw error;

      // Optimistic update
      const remainingBrands = clientBrands.filter(brand => brand.id !== brandId);
      setClientBrands(remainingBrands);
      setAllAds(prev => prev.filter(ad => ad.clientBrandId !== brandId));

      if (currentBrandId === brandId) {
        setCurrentBrandIdState(null);
      }

      // Recount and update subscription (skip for free accounts)
      if (!FREE_ACCOUNTS.has(user?.email || '')) {
        const newBrandCount = remainingBrands.length;
        const newCompetitorCount = getTotalCompetitorCount() - removedCompetitors;

        if (subscription.hasSubscription) {
          await updateSubscriptionQuantities(newBrandCount, newCompetitorCount);
        }
      }
    } catch (err) {
      console.error('Error deleting brand:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete brand');
    }
  };

  const addCompetitor = async (brandId: string, competitor: Omit<Competitor, 'id'>): Promise<AddCompetitorResult> => {
    if (!supabase) return { success: false, error: 'Database connection not available' };

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase
        .from('competitors')
        .insert({
          brand_id: brandId,
          user_id: currentUser.id,
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

      // Update subscription quantities (skip for free accounts)
      if (!FREE_ACCOUNTS.has(user?.email || '')) {
        const newCompetitorCount = getTotalCompetitorCount() + 1;
        if (subscription.hasSubscription) {
          await updateSubscriptionQuantities(clientBrands.length, newCompetitorCount);
        }
      }

      return { success: true };
    } catch (err) {
      console.error('Error adding competitor:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add competitor';
      setError(errorMessage);
      return { success: false, error: errorMessage };
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

      // Optimistic update
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

      // Update subscription quantities (skip for free accounts)
      if (!FREE_ACCOUNTS.has(user?.email || '')) {
        const newCompetitorCount = getTotalCompetitorCount() - 1;
        if (subscription.hasSubscription) {
          await updateSubscriptionQuantities(clientBrands.length, newCompetitorCount);
        }
      }
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

    const { data: adsData, error: adsError } = await supabase
      .from('ads')
      .select('*')
      .eq('client_brand_id', brandId)
      .order('scoring->>final', { ascending: false, nullsFirst: false });

    if (adsError || !adsData) {
      console.error('Error fetching ads:', adsError);
      return [];
    }

    const adIds = adsData.map(ad => ad.id);
    const { data: analysesData } = await supabase
      .from('ad_analyses')
      .select('ad_id, analysis, analyzed_at')
      .in('ad_id', adIds);

    const analysisMap = new Map<string, { analysis: Record<string, unknown>; analyzed_at: string }>();
    analysesData?.forEach(item => {
      analysisMap.set(item.ad_id, {
        analysis: item.analysis as Record<string, unknown>,
        analyzed_at: item.analyzed_at
      });
    });

    return adsData.map(dbAd => {
      const ad = dbAdToAd(dbAd);
      return {
        ...ad,
        analysis: analysisMap.get(ad.id) || null
      };
    });
  }, [supabase]);

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

      // Auto-analyze top 10 ads by score
      const topAds = [...fetchedAds]
        .sort((a, b) => ((b.scoring as AdScore)?.final || 0) - ((a.scoring as AdScore)?.final || 0))
        .slice(0, 10);

      topAds.forEach(ad => {
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
            scoring: ad.scoring
          })
        }).catch(err => console.error('Background analysis failed for ad:', ad.id, err));
      });

      await fetchData();

      return {
        success: true,
        count: data.count,
        newAds: data.newAds,
        updatedAds: data.updatedAds,
        archivedAds: data.archivedAds,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      return { success: false, error: errorMessage };
    }
  };

  const getClientAdsForBrand = (brandId: string): ClientAd[] => {
    return clientAds.filter(ad => ad.clientBrandId === brandId);
  };

  const getAudienceBreakdownsForBrand = (brandId: string): AudienceBreakdown[] => {
    return audienceBreakdowns.filter(b => b.clientBrandId === brandId);
  };

  const syncMetaAds = async (brandId: string): Promise<SyncResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch('/api/meta/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientBrandId: brandId }),
      });

      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || 'Meta sync failed', tokenExpired: data.tokenExpired || false };
      }

      await fetchData();

      return {
        success: true,
        count: data.totalAds,
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
        subscription,
        createClientBrand,
        updateClientBrand,
        deleteClientBrand,
        addCompetitor,
        removeCompetitor,
        getAdsForBrand,
        allAds,
        getAnalyzedAds,
        syncCompetitorAds,
        clientAds,
        getClientAdsForBrand,
        syncMetaAds,
        audienceBreakdowns,
        getAudienceBreakdownsForBrand,
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

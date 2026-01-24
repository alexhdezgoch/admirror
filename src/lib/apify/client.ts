import { ApifyAd, ApifyError } from '@/types/apify';

const APIFY_ACTOR_ID = 'curious_coder~facebook-ads-library-scraper';
const APIFY_API_BASE = 'https://api.apify.com/v2';

interface ApifyClientOptions {
  apiToken: string;
  maxResults?: number;
}

interface FetchAdsOptions {
  pageId?: string;
  adLibraryUrl?: string;
  maxResults?: number;
}

interface ApifyRunResult {
  success: boolean;
  ads: ApifyAd[];
  error?: ApifyError;
}

/**
 * Extract page ID from Meta Ad Library URL
 */
export function extractPageIdFromUrl(url: string): string | null {
  // URL format: https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&view_all_page_id=123456789
  const match = url.match(/view_all_page_id=(\d+)/);
  return match ? match[1] : null;
}

/**
 * Validate Apify API token format
 */
export function isValidApiToken(token: string): boolean {
  // Apify tokens are typically 32+ alphanumeric characters
  return /^[a-zA-Z0-9_-]{20,}$/.test(token);
}

/**
 * Fetch ads from Apify Facebook Ads Scraper
 */
export async function fetchAdsFromApify(
  options: FetchAdsOptions,
  clientOptions: ApifyClientOptions
): Promise<ApifyRunResult> {
  const { apiToken, maxResults = 50 } = clientOptions;

  if (!apiToken) {
    return {
      success: false,
      ads: [],
      error: { message: 'Apify API token is not configured' }
    };
  }

  // Determine page ID
  let pageId = options.pageId;
  if (!pageId && options.adLibraryUrl) {
    pageId = extractPageIdFromUrl(options.adLibraryUrl) ?? undefined;
  }

  if (!pageId) {
    return {
      success: false,
      ads: [],
      error: { message: 'No valid page ID or Ad Library URL provided' }
    };
  }

  try {
    // Build the Ad Library URL for the actor
    const adLibraryUrl = options.adLibraryUrl ||
      `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&media_type=all&view_all_page_id=${pageId}`;

    // Input format compatible with curious_coder/facebook-ads-library-scraper
    const inputPayload = {
      // curious_coder actor expects urls as array of objects with url field
      urls: [{ url: adLibraryUrl }],
      startUrls: [{ url: adLibraryUrl }],
      maxItems: maxResults,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL']
      }
    };

    console.log('=== APIFY REQUEST ===');
    console.log('Actor ID:', APIFY_ACTOR_ID);
    console.log('URL:', adLibraryUrl);
    console.log('Input payload:', JSON.stringify(inputPayload, null, 2));

    // Start actor run synchronously (waits for completion)
    const runResponse = await fetch(
      `${APIFY_API_BASE}/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${apiToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inputPayload),
      }
    );

    console.log('=== APIFY RESPONSE STATUS ===');
    console.log('Status:', runResponse.status, runResponse.statusText);

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.log('Error response body:', errorText);
      let errorMessage = `Apify API error: ${runResponse.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // Use status text if can't parse
        errorMessage = `Apify API error: ${runResponse.statusText || runResponse.status}`;
      }

      return {
        success: false,
        ads: [],
        error: {
          message: errorMessage,
          statusCode: runResponse.status
        }
      };
    }

    const data = await runResponse.json();

    console.log('=== APIFY RESPONSE DATA ===');
    console.log('Is array:', Array.isArray(data));
    console.log('Item count:', Array.isArray(data) ? data.length : 'N/A');
    if (Array.isArray(data) && data.length > 0) {
      console.log('First item keys:', Object.keys(data[0]));
    }

    // The sync endpoint returns dataset items directly
    const ads: ApifyAd[] = Array.isArray(data) ? data : [];

    return {
      success: true,
      ads
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      ads: [],
      error: { message: `Failed to fetch ads: ${errorMessage}` }
    };
  }
}

/**
 * Check if Apify API is accessible with the given token
 */
export async function validateApifyToken(apiToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${APIFY_API_BASE}/users/me?token=${apiToken}`);
    return response.ok;
  } catch {
    return false;
  }
}

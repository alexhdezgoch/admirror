// Apify Facebook Ad Library response types

export interface ApifyAdCard {
  body?: string;
  title?: string;
  caption?: string;
  cta_text?: string;
  cta_type?: string;
  link_url?: string;
  resized_image_url?: string;
  video_hd_url?: string;
  video_sd_url?: string;
  video_preview_image_url?: string;
  watermarked_video_hd_url?: string;
  watermarked_video_sd_url?: string;
}

export interface ApifyAdSnapshot {
  body_markup?: string;
  cards?: ApifyAdCard[];
  creation_time?: number;
  cta_text?: string;
  cta_type?: string;
  disclaimer_label?: string;
  display_format?: string;
  dynamic_item_flags?: Record<string, unknown>;
  dynamic_versions?: unknown;
  effective_authorization_category?: string;
  effective_metadata_category_flags?: string[];
  page_id?: string;
  page_is_deleted?: boolean;
  page_name?: string;
  page_profile_picture_url?: string;
  page_profile_uri?: string;
  title?: string;
}

export interface ApifyAd {
  ad_archive_id: string;
  ad_creative_bodies?: string[];
  ad_creative_link_captions?: string[];
  ad_creative_link_descriptions?: string[];
  ad_creative_link_titles?: string[];
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string | null;
  ad_id?: string;
  collation_count?: number | null;
  collation_id?: string;
  currency?: string;
  display_format?: string;
  estimated_audience_size?: {
    lower_bound?: number;
    upper_bound?: number;
  };
  eu_total_reach?: number | null;
  has_media?: boolean;
  has_user_reported?: boolean;
  languages?: string[];
  page_id: string;
  page_name: string;
  publisher_platforms?: string[];
  snapshot?: ApifyAdSnapshot;
  spend?: {
    lower_bound?: number;
    upper_bound?: number;
  };
  start_date?: number; // Unix timestamp in seconds
  start_date_formatted?: string;
}

export interface ApifyRunInput {
  pageId?: string;
  adLibraryUrl?: string;
  maxResults?: number;
  startDate?: string;
}

export interface ApifyError {
  message: string;
  code?: string;
  statusCode?: number;
}

export interface ApifySyncResponse {
  success: boolean;
  ads?: ApifyAd[];
  error?: ApifyError;
}

/**
 * One-time script: Create kevin@vkng.group account with Devlyn brand data
 * copied from alex@akeep.co.
 *
 * Usage: npx tsx scripts/create-kevin-account.ts
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually (no dotenv dependency)
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  if (!process.env[key]) process.env[key] = val;
}

const KEVIN_EMAIL = 'kevin@vkng.group';
const KEVIN_PASSWORD = 'Admirror2026!';
const SOURCE_EMAIL = 'alex@akeep.co';
const BRAND_NAME = 'Devlyn';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      `Missing env vars: NEXT_PUBLIC_SUPABASE_URL=${!!url}, SUPABASE_SERVICE_ROLE_KEY=${!!serviceRoleKey}`
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main() {
  const supabase = getSupabaseAdmin();

  // Quick connectivity check
  const { count, error: testError } = await supabase.from('client_brands').select('*', { count: 'exact', head: true });
  if (testError) throw new Error(`DB connectivity check failed: ${testError.message}`);
  console.log(`Connected to Supabase (${count} brands in DB)\n`);

  // ── 1. Create Kevin's user account ──
  console.log('1. Creating user account...');
  let kevinUserId: string;

  // Check if user already exists — paginate through all users
  let allUsers: Array<{ id: string; email?: string }> = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    if (!data?.users.length) break;
    allUsers = allUsers.concat(data.users);
    if (data.users.length < 1000) break;
    page++;
  }

  const existingKevin = allUsers.find(u => u.email === KEVIN_EMAIL);

  if (existingKevin) {
    console.log(`   User found: ${existingKevin.id}`);
    kevinUserId = existingKevin.id;
  } else {
    throw new Error(
      `User ${KEVIN_EMAIL} not found. Please create the user manually via the Supabase Dashboard ` +
      `(Authentication > Users > Add User) and re-run this script.`
    );
  }

  // ── 2. Find alex@akeep.co's user_id ──
  console.log('\n2. Finding source user (alex@akeep.co)...');
  const alexUser = allUsers.find(u => u.email === SOURCE_EMAIL);
  if (!alexUser) throw new Error('Source user alex@akeep.co not found');
  const alexUserId = alexUser.id;
  console.log(`   Found: ${alexUserId}`);

  // ── 3. Find Devlyn brand ──
  console.log('\n3. Finding Devlyn brand...');
  const { data: brands, error: brandError } = await supabase
    .from('client_brands')
    .select('*')
    .eq('user_id', alexUserId)
    .ilike('name', BRAND_NAME);

  if (brandError) throw new Error(`Brand query failed: ${brandError.message}`);
  if (!brands || brands.length === 0) throw new Error('Devlyn brand not found under alex@akeep.co');

  const sourceBrand = brands[0];
  console.log(`   Found brand: ${sourceBrand.name} (${sourceBrand.id})`);

  // Check if Kevin already has a Devlyn brand (idempotent)
  const { data: existingBrands } = await supabase
    .from('client_brands')
    .select('id')
    .eq('user_id', kevinUserId)
    .ilike('name', BRAND_NAME);

  let newBrandId: string;

  if (existingBrands && existingBrands.length > 0) {
    newBrandId = existingBrands[0].id;
    console.log(`   Kevin already has Devlyn brand: ${newBrandId} (skipping copy)`);
  } else {
    // ── 4. Copy brand record ──
    console.log('\n4. Copying brand record...');
    const { data: newBrand, error: insertBrandError } = await supabase
      .from('client_brands')
      .insert({
        user_id: kevinUserId,
        name: sourceBrand.name,
        logo: sourceBrand.logo,
        industry: sourceBrand.industry,
        color: sourceBrand.color,
        ads_library_url: sourceBrand.ads_library_url,
      })
      .select()
      .single();

    if (insertBrandError) throw new Error(`Brand insert failed: ${insertBrandError.message}`);
    newBrandId = newBrand.id;
    console.log(`   Created brand: ${newBrandId}`);
  }

  // ── 5. Copy competitors ──
  console.log('\n5. Copying competitors...');
  const { data: sourceCompetitors, error: compError } = await supabase
    .from('competitors')
    .select('*')
    .eq('brand_id', sourceBrand.id);

  if (compError) throw new Error(`Competitors query failed: ${compError.message}`);

  const competitorIdMap = new Map<string, string>(); // old -> new

  for (const comp of sourceCompetitors || []) {
    // Check if already copied
    const { data: existing } = await supabase
      .from('competitors')
      .select('id')
      .eq('brand_id', newBrandId)
      .eq('name', comp.name);

    if (existing && existing.length > 0) {
      competitorIdMap.set(comp.id, existing[0].id);
      console.log(`   Competitor "${comp.name}" already exists: ${existing[0].id}`);
      continue;
    }

    const { data: newComp, error: insertCompError } = await supabase
      .from('competitors')
      .insert({
        brand_id: newBrandId,
        user_id: kevinUserId,
        name: comp.name,
        logo: comp.logo,
        url: comp.url,
        total_ads: comp.total_ads,
        avg_ads_per_week: comp.avg_ads_per_week,
        last_synced_at: comp.last_synced_at,
      })
      .select()
      .single();

    if (insertCompError) throw new Error(`Competitor insert failed: ${insertCompError.message}`);
    competitorIdMap.set(comp.id, newComp.id);
    console.log(`   Copied "${comp.name}": ${comp.id} -> ${newComp.id}`);
  }

  // ── 6. Copy ads ──
  console.log('\n6. Copying ads...');
  const { data: sourceAds, error: adsError } = await supabase
    .from('ads')
    .select('*')
    .eq('client_brand_id', sourceBrand.id);

  if (adsError) throw new Error(`Ads query failed: ${adsError.message}`);

  const adIdMap = new Map<string, string>(); // old -> new
  let adsInserted = 0;
  let adsSkipped = 0;

  for (const ad of sourceAds || []) {
    const newAdId = `kv_${ad.id}`;
    const newCompetitorId = competitorIdMap.get(ad.competitor_id);

    if (!newCompetitorId) {
      console.log(`   Skipping ad ${ad.id}: competitor ${ad.competitor_id} not mapped`);
      adsSkipped++;
      continue;
    }

    // Check if already copied
    const { data: existingAd } = await supabase
      .from('ads')
      .select('id')
      .eq('id', newAdId);

    if (existingAd && existingAd.length > 0) {
      adIdMap.set(ad.id, newAdId);
      adsSkipped++;
      continue;
    }

    const { error: insertAdError } = await supabase
      .from('ads')
      .insert({
        id: newAdId,
        user_id: kevinUserId,
        client_brand_id: newBrandId,
        competitor_id: newCompetitorId,
        competitor_name: ad.competitor_name,
        competitor_logo: ad.competitor_logo,
        format: ad.format,
        days_active: ad.days_active,
        variation_count: ad.variation_count,
        launch_date: ad.launch_date,
        hook_text: ad.hook_text,
        headline: ad.headline,
        primary_text: ad.primary_text,
        cta: ad.cta,
        hook_type: ad.hook_type,
        is_video: ad.is_video,
        video_duration: ad.video_duration,
        creative_elements: ad.creative_elements,
        in_swipe_file: ad.in_swipe_file,
        scoring: ad.scoring,
        thumbnail_url: ad.thumbnail_url,
        video_url: ad.video_url,
        is_active: ad.is_active,
        last_seen_at: ad.last_seen_at,
        is_client_ad: ad.is_client_ad,
        emotional_angle: ad.emotional_angle,
        narrative_structure: ad.narrative_structure,
      });

    if (insertAdError) {
      console.error(`   Failed to insert ad ${newAdId}: ${insertAdError.message}`);
      continue;
    }

    adIdMap.set(ad.id, newAdId);
    adsInserted++;
  }
  console.log(`   Inserted: ${adsInserted}, Skipped: ${adsSkipped}`);

  // ── 7. Copy ad_analyses ──
  console.log('\n7. Copying ad_analyses...');
  const sourceAdIds = Array.from(adIdMap.keys());
  let analysesInserted = 0;

  if (sourceAdIds.length > 0) {
    const { data: sourceAnalyses, error: analysesError } = await supabase
      .from('ad_analyses')
      .select('*')
      .in('ad_id', sourceAdIds);

    if (analysesError) throw new Error(`Ad analyses query failed: ${analysesError.message}`);

    for (const analysis of sourceAnalyses || []) {
      const newAdId = adIdMap.get(analysis.ad_id);
      if (!newAdId) continue;

      // Check UNIQUE(ad_id)
      const { data: existing } = await supabase
        .from('ad_analyses')
        .select('id')
        .eq('ad_id', newAdId);

      if (existing && existing.length > 0) continue;

      const { error: insertError } = await supabase
        .from('ad_analyses')
        .insert({
          ad_id: newAdId,
          user_id: kevinUserId,
          analysis: analysis.analysis,
          analyzed_at: analysis.analyzed_at,
        });

      if (insertError) {
        console.error(`   Failed to insert analysis for ${newAdId}: ${insertError.message}`);
        continue;
      }
      analysesInserted++;
    }
  }
  console.log(`   Inserted: ${analysesInserted}`);

  // ── 8. Copy hook_analyses ──
  console.log('\n8. Copying hook_analyses...');
  const { data: sourceHookAnalyses } = await supabase
    .from('hook_analyses')
    .select('*')
    .eq('brand_id', sourceBrand.id);

  let hookAnalysesInserted = 0;
  for (const ha of sourceHookAnalyses || []) {
    const { data: existing } = await supabase
      .from('hook_analyses')
      .select('id')
      .eq('brand_id', newBrandId);

    if (existing && existing.length > 0) {
      console.log('   Already exists, skipping');
      continue;
    }

    const { error: insertError } = await supabase
      .from('hook_analyses')
      .insert({
        brand_id: newBrandId,
        user_id: kevinUserId,
        analysis: ha.analysis,
        analyzed_at: ha.analyzed_at,
      });

    if (insertError) {
      console.error(`   Failed: ${insertError.message}`);
      continue;
    }
    hookAnalysesInserted++;
  }
  console.log(`   Inserted: ${hookAnalysesInserted}`);

  // ── 9. Copy trend_analyses ──
  console.log('\n9. Copying trend_analyses...');
  const { data: sourceTrends } = await supabase
    .from('trend_analyses')
    .select('*')
    .eq('brand_id', sourceBrand.id);

  let trendsInserted = 0;
  for (const trend of sourceTrends || []) {
    const { error: insertError } = await supabase
      .from('trend_analyses')
      .insert({
        brand_id: newBrandId,
        user_id: kevinUserId,
        trends: trend.trends,
        summary: trend.summary,
        ads_count: trend.ads_count,
        analyzed_at: trend.analyzed_at,
      });

    if (insertError) {
      console.error(`   Failed: ${insertError.message}`);
      continue;
    }
    trendsInserted++;
  }
  console.log(`   Inserted: ${trendsInserted}`);

  // ── 10. Copy playbooks ──
  console.log('\n10. Copying playbooks...');
  const { data: sourcePlaybooks } = await supabase
    .from('playbooks')
    .select('*')
    .eq('brand_id', sourceBrand.id);

  let playbooksInserted = 0;
  for (const pb of sourcePlaybooks || []) {
    const { error: insertError } = await supabase
      .from('playbooks')
      .insert({
        brand_id: newBrandId,
        user_id: kevinUserId,
        title: pb.title,
        generated_at: pb.generated_at,
        my_patterns_included: pb.my_patterns_included,
        competitor_trends_count: pb.competitor_trends_count,
        competitor_ads_count: pb.competitor_ads_count,
        content: pb.content,
        is_public: false,
        status: pb.status,
        error_message: pb.error_message,
      });

    if (insertError) {
      console.error(`   Failed: ${insertError.message}`);
      continue;
    }
    playbooksInserted++;
  }
  console.log(`   Inserted: ${playbooksInserted}`);

  // ── 11. Copy pattern_analyses ──
  console.log('\n11. Copying pattern_analyses...');
  const { data: sourcePatterns } = await supabase
    .from('pattern_analyses')
    .select('*')
    .eq('brand_id', sourceBrand.id);

  let patternsInserted = 0;
  for (const pa of sourcePatterns || []) {
    const { data: existing } = await supabase
      .from('pattern_analyses')
      .select('id')
      .eq('brand_id', newBrandId)
      .eq('user_id', kevinUserId);

    if (existing && existing.length > 0) {
      console.log('   Already exists, skipping');
      continue;
    }

    const { error: insertError } = await supabase
      .from('pattern_analyses')
      .insert({
        brand_id: newBrandId,
        user_id: kevinUserId,
        analysis: pa.analysis,
        analyzed_at: pa.analyzed_at,
      });

    if (insertError) {
      console.error(`   Failed: ${insertError.message}`);
      continue;
    }
    patternsInserted++;
  }
  console.log(`   Inserted: ${patternsInserted}`);

  // ── 12. Activate subscription ──
  console.log('\n12. Activating subscription...');
  const competitorCount = competitorIdMap.size;

  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: kevinUserId,
      status: 'active',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      brand_quantity: 1,
      competitor_quantity: competitorCount,
      current_period_end: null,
    }, { onConflict: 'user_id' });

  if (subError) throw new Error(`Subscription upsert failed: ${subError.message}`);
  console.log(`   Subscription active: 1 brand, ${competitorCount} competitors`);

  // ── Done ──
  console.log('\n✅ Done! Kevin can log in at:');
  console.log(`   Email: ${KEVIN_EMAIL}`);
  console.log(`   Password: ${KEVIN_PASSWORD}`);
}

main().catch(err => {
  console.error('\n❌ Script failed:', err.message);
  process.exit(1);
});

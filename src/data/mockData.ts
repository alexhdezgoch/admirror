import { Ad, Brand, Competitor, ClientBrand, PlaybookRecommendation, CreativePattern, ABTest, TrendCard, HookData, Analysis, AdFormat, HookType, VelocitySignal } from '@/types';
import { scoreAd } from '@/lib/scoring';

// Helper to generate random date within range
function randomDate(start: Date, end: Date): string {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
}

// Helper to calculate days active
function daysAgo(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// Pet Supplements competitors
const petSupplementCompetitors: Competitor[] = [
  {
    id: 'comp-1',
    name: 'VitalPets',
    logo: '🐱',
    url: 'https://facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=vitalpets',
    totalAds: 38,
    avgAdsPerWeek: 2.8
  },
  {
    id: 'comp-2',
    name: 'NutriHound',
    logo: '🦴',
    url: 'https://facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=nutrihound',
    totalAds: 52,
    avgAdsPerWeek: 4.1
  },
  {
    id: 'comp-3',
    name: 'FurWell',
    logo: '🐾',
    url: 'https://facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=furwell',
    totalAds: 41,
    avgAdsPerWeek: 2.5
  },
  {
    id: 'comp-4',
    name: 'PetVitality',
    logo: '💊',
    url: 'https://facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=petvitality',
    totalAds: 29,
    avgAdsPerWeek: 1.9
  }
];

// Fashion DTC competitors
const fashionCompetitors: Competitor[] = [
  {
    id: 'comp-5',
    name: 'TrendyThreads',
    logo: '👗',
    url: 'https://facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=trendythreads',
    totalAds: 45,
    avgAdsPerWeek: 3.5
  },
  {
    id: 'comp-6',
    name: 'UrbanStyle',
    logo: '👔',
    url: 'https://facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=urbanstyle',
    totalAds: 32,
    avgAdsPerWeek: 2.2
  },
  {
    id: 'comp-7',
    name: 'ChicWear',
    logo: '👠',
    url: 'https://facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=chicwear',
    totalAds: 28,
    avgAdsPerWeek: 1.8
  }
];

// Fitness competitors
const fitnessCompetitors: Competitor[] = [
  {
    id: 'comp-8',
    name: 'FitFuel',
    logo: '🏋️',
    url: 'https://facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=fitfuel',
    totalAds: 55,
    avgAdsPerWeek: 4.2
  },
  {
    id: 'comp-9',
    name: 'ProteinPro',
    logo: '💪',
    url: 'https://facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=proteinpro',
    totalAds: 40,
    avgAdsPerWeek: 3.0
  },
  {
    id: 'comp-10',
    name: 'GymGains',
    logo: '🏃',
    url: 'https://facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=gymgains',
    totalAds: 35,
    avgAdsPerWeek: 2.5
  }
];

// Client brands (agency workspaces)
export const clientBrands: ClientBrand[] = [
  {
    id: 'brand-1',
    name: 'PawPure',
    logo: '🐕',
    industry: 'Pet Supplements',
    color: '#22c55e',
    createdAt: '2024-01-15T10:00:00Z',
    lastUpdated: new Date().toISOString(),
    competitors: petSupplementCompetitors
  },
  {
    id: 'brand-2',
    name: 'StyleCo',
    logo: '👗',
    industry: 'Fashion DTC',
    color: '#8b5cf6',
    createdAt: '2024-01-10T14:30:00Z',
    lastUpdated: new Date().toISOString(),
    competitors: fashionCompetitors
  },
  {
    id: 'brand-3',
    name: 'FitLife',
    logo: '💪',
    industry: 'Fitness & Nutrition',
    color: '#f97316',
    createdAt: '2024-01-05T09:15:00Z',
    lastUpdated: new Date().toISOString(),
    competitors: fitnessCompetitors
  }
];

// All competitors flattened (for backward compatibility)
export const competitors: Competitor[] = [
  ...petSupplementCompetitors,
  ...fashionCompetitors,
  ...fitnessCompetitors
];

// Backward compatibility: brands alias for competitors
export const brands: Brand[] = petSupplementCompetitors;

// Hook templates by type
const hooks: Record<HookType, string[]> = {
  question: [
    "Is your dog's joint pain keeping them from playing?",
    "Why do vets recommend this supplement over kibble additives?",
    "Does your cat refuse to take their vitamins?",
    "What if you could add 3 healthy years to your pet's life?",
    "Tired of your dog scratching constantly?",
    "Want to know the #1 ingredient vets say to avoid?",
    "Is grain-free actually better for your dog?",
    "Why is your senior dog slowing down?",
    "Does your pet have bad breath? Here's why...",
    "What's really in your pet's food?"
  ],
  statement: [
    "My vet said Max only had 6 months left. That was 2 years ago.",
    "I stopped buying expensive vet supplements. Here's what I use instead.",
    "This changed everything for my arthritic golden retriever.",
    "After 3 weeks, Bella started running again.",
    "The ingredient big pet food companies don't want you to know about.",
    "I was skeptical until I saw the lab results.",
    "My 14-year-old dog acts like a puppy again.",
    "We tested 47 supplements. Only 3 actually worked.",
    "The vet was shocked at Luna's bloodwork improvement.",
    "I wish I knew about this when my first dog was alive."
  ],
  social_proof: [
    "Over 500,000 pet parents trust PawPure",
    "4.9 stars from 12,847 verified reviews",
    "Recommended by 3,000+ veterinarians nationwide",
    "Join 100,000+ dogs who've made the switch",
    "Featured in DogTime, PetMD, and The Bark",
    "#1 rated pet supplement on Amazon for 18 months",
    "Trusted by professional dog trainers worldwide",
    "As seen on Good Morning America",
    "Winner: Best Pet Supplement 2024",
    "Used by 47 Westminster champions"
  ],
  urgency: [
    "Last chance: 40% off ends tonight",
    "Only 127 units left in stock",
    "Flash sale: Next 4 hours only",
    "Your exclusive discount expires in 24 hours",
    "Black Friday pricing - limited time",
    "Free shipping ends at midnight",
    "Selling out fast - 83% claimed",
    "Price going up tomorrow",
    "Final restock of 2024",
    "VIP early access - 48 hours only"
  ]
};

const headlines = [
  "Finally, A Supplement Dogs Actually Love",
  "Vet-Approved Joint Support",
  "The Clean Label Promise",
  "Made in USA. Loved Worldwide.",
  "90-Day Money Back Guarantee",
  "Real Results in 30 Days",
  "Science-Backed. Pet-Approved.",
  "Premium Ingredients. Fair Price.",
  "The Supplement Vets Give Their Own Pets",
  "Nature's Best for Your Best Friend"
];

const primaryTexts = [
  "Most pet supplements use cheap fillers and artificial flavors. We use 100% human-grade ingredients that actually work. See the difference in just 2 weeks or your money back.",
  "Developed with leading veterinary nutritionists, our formula targets the root cause of joint pain - not just the symptoms. Your dog deserves to run, jump, and play again.",
  "Thousands of pet parents have switched from expensive vet prescriptions to our all-natural alternative. Same results. Half the price. Zero side effects.",
  "We spent 3 years perfecting this formula. 47 versions. 12 clinical studies. The result? The most effective pet supplement on the market, period.",
  "Don't let your pet suffer in silence. Joint pain affects 1 in 4 dogs over age 7. Our proven formula gets them back on their paws.",
  "Made in small batches in our FDA-registered facility. Every ingredient traceable. Every batch tested. Because your pet deserves the best.",
  "Our founder created this after watching her 12-year-old lab struggle to climb stairs. Now Max runs like he's 5 again. We want that for your pet too.",
  "Warning: Once you try this, you'll never go back to regular kibble. Our customers report their pets have more energy, shinier coats, and better digestion.",
  "Skip the expensive vet visits. Our supplement addresses the #1 nutrient deficiency in commercial pet food. See results in just 14 days.",
  "Real reviews from real pet parents: 'I was skeptical but my dog loves it and her mobility has improved so much!' - Sarah M., verified buyer"
];

const ctas = ["Shop Now", "Try Risk-Free", "Get 40% Off", "Learn More", "Claim Offer", "Start Free Trial", "Buy Now", "See Results"];

const creativeElementsList = [
  ["Before/After split screen", "Slow-motion dog running", "Vet testimonial"],
  ["Product close-up", "Happy dog face", "Ingredient callouts"],
  ["UGC style", "Phone screenshot", "Text overlay"],
  ["Lifestyle footage", "Family with pet", "Outdoor setting"],
  ["Problem/Solution format", "Pain points listed", "CTA button animation"],
  ["Unboxing footage", "Product sizing demo", "Customer review quotes"],
  ["Comparison chart", "Competitor callout", "Value proposition"],
  ["Emotional music", "Slow zoom", "Sunset lighting"],
  ["Green screen founder", "Direct to camera", "Casual tone"],
  ["Animated infographic", "Statistics overlay", "Professional voiceover"]
];

// Generate ads for all client brands' competitors
function generateAds(): Ad[] {
  const ads: Ad[] = [];
  let adId = 1;

  clientBrands.forEach(clientBrand => {
    clientBrand.competitors.forEach(competitor => {
      const adCount = competitor.totalAds;

      for (let i = 0; i < adCount; i++) {
        // Determine format distribution: 40% video, 35% static, 25% carousel
        const formatRand = Math.random();
        let format: AdFormat;
        if (formatRand < 0.40) format = 'video';
        else if (formatRand < 0.75) format = 'static';
        else format = 'carousel';

        // Generate raw input data that will determine the score
        // Distribution targets: ~15% cash_cow/scaling signals, ~35% testing, ~50% new/standard
        const distributionRand = Math.random();
        let daysActive: number;
        let variationCount: number;

        if (distributionRand < 0.08) {
          // Cash cows - long running, many variations
          daysActive = 45 + Math.floor(Math.random() * 135); // 45-180 days
          variationCount = 3 + Math.floor(Math.random() * 17); // 3-20 variations
        } else if (distributionRand < 0.15) {
          // Zombies - long running, single variation
          daysActive = 35 + Math.floor(Math.random() * 100); // 35-135 days
          variationCount = 1;
        } else if (distributionRand < 0.25) {
          // Burn tests - early, many variations
          daysActive = 3 + Math.floor(Math.random() * 11); // 3-14 days
          variationCount = 3 + Math.floor(Math.random() * 5); // 3-8 variations
        } else if (distributionRand < 0.45) {
          // Rising stars - mid duration, growing variations
          daysActive = 14 + Math.floor(Math.random() * 17); // 14-30 days
          variationCount = 2 + Math.floor(Math.random() * 4); // 2-5 variations
        } else if (distributionRand < 0.70) {
          // Testing phase - medium duration
          daysActive = 14 + Math.floor(Math.random() * 16); // 14-30 days
          variationCount = 1 + Math.floor(Math.random() * 2); // 1-2 variations
        } else {
          // New - recently launched
          daysActive = 1 + Math.floor(Math.random() * 14); // 1-14 days
          variationCount = 1 + Math.floor(Math.random() * 2); // 1-2 variations
        }

        // Determine hook type
        const hookTypes: HookType[] = ['question', 'statement', 'social_proof', 'urgency'];
        const hookType = hookTypes[Math.floor(Math.random() * hookTypes.length)];
        const hookText = hooks[hookType][Math.floor(Math.random() * hooks[hookType].length)];

        const launchDate = new Date();
        launchDate.setDate(launchDate.getDate() - daysActive);

        const creativeElements = creativeElementsList[Math.floor(Math.random() * creativeElementsList.length)];

        // Calculate scoring using the new engine
        const scoring = scoreAd(daysActive, variationCount, hookType, format, creativeElements);

        // Determine if ad is active (90% active, 10% archived for demo)
        const isActive = Math.random() > 0.1;

        ads.push({
          id: `ad-${adId}`,
          clientBrandId: clientBrand.id,
          competitorId: competitor.id,
          competitorName: competitor.name,
          competitorLogo: competitor.logo,
          thumbnail: `/api/placeholder/${format === 'carousel' ? '400/400' : '350/450'}`,
          format,
          daysActive,
          variationCount,
          launchDate: launchDate.toISOString().split('T')[0],
          hookText,
          hookType,
          headline: headlines[Math.floor(Math.random() * headlines.length)],
          primaryText: primaryTexts[Math.floor(Math.random() * primaryTexts.length)],
          cta: ctas[Math.floor(Math.random() * ctas.length)],
          isVideo: format === 'video',
          videoDuration: format === 'video' ? 15 + Math.floor(Math.random() * 45) : undefined,
          creativeElements,
          inSwipeFile: Math.random() < 0.1, // 10% in swipe file
          scoring,
          isActive,
          lastSeenAt: new Date().toISOString()
        });

        adId++;
      }
    });
  });

  return ads;
}

export const ads: Ad[] = generateAds();

// Helper to get ads for a specific client brand
export function getAdsForClientBrand(clientBrandId: string): Ad[] {
  return ads.filter(ad => ad.clientBrandId === clientBrandId);
}

// Helper to get competitors for a specific client brand
export function getCompetitorsForClientBrand(clientBrandId: string): Competitor[] {
  const brand = clientBrands.find(b => b.id === clientBrandId);
  return brand?.competitors || [];
}

// Playbook recommendations
export const playbookRecommendations: PlaybookRecommendation[] = [
  {
    id: 'rec-1',
    title: 'Launch a UGC-style testimonial series',
    description: 'Create 3-5 UGC-style videos featuring real customer testimonials. Focus on "before/after" transformation stories with senior dogs.',
    proof: '73% of top-performing ads in this niche use UGC format. NutriHound\'s UGC ads have 2.3x longer run time than their polished ads.',
    effort: 'medium',
    category: 'quick_win',
    relatedAds: ['ad-12', 'ad-45', 'ad-78']
  },
  {
    id: 'rec-2',
    title: 'Add urgency overlays to static images',
    description: 'Test adding countdown timers or "limited stock" badges to your existing static image ads. Simple text overlay, no new creative needed.',
    proof: 'PawPure\'s urgency-overlay statics are running 40% longer than their non-urgency variants.',
    effort: 'low',
    category: 'quick_win',
    relatedAds: ['ad-23', 'ad-56']
  },
  {
    id: 'rec-3',
    title: 'Create comparison carousel ads',
    description: 'Build carousel ads that compare your supplement to competitors (without naming them). Focus on ingredient quality, sourcing, and testing standards.',
    proof: 'Comparison-style carousels have 15% higher velocity scores on average. FurWell\'s comparison ad has been running for 120+ days.',
    effort: 'medium',
    category: 'quick_win',
    relatedAds: ['ad-89', 'ad-102']
  },
  {
    id: 'rec-4',
    title: 'Test "Vet Reaction" video format',
    description: 'Film a veterinarian reviewing your ingredient list and giving their genuine reaction. Authenticity over production value.',
    proof: 'Vet-featuring ads in this dataset have 1.8x the average variation count, suggesting strong scaling conviction.',
    effort: 'high',
    category: 'pattern',
    relatedAds: ['ad-34', 'ad-67', 'ad-98']
  },
  {
    id: 'rec-5',
    title: 'Develop "Problem Aware" hook variants',
    description: 'Your competitors lead with solutions. Stand out by leading with problem awareness: "Is your dog showing these 5 signs of joint pain?"',
    proof: 'Question-format hooks account for 34% of scaling-tier ads but only 22% of new-tier ads - they\'re being selected for.',
    effort: 'low',
    category: 'pattern',
    relatedAds: ['ad-15', 'ad-48', 'ad-81']
  }
];

// Creative patterns
export const creativePatterns: CreativePattern[] = [
  {
    id: 'pattern-1',
    name: 'UGC Testimonial with B-Roll',
    description: 'Customer speaking to camera intercut with footage of their pet playing/running. Usually 30-45 seconds.',
    adoptionRate: 42,
    trend: 'rising',
    exampleAds: ['ad-12', 'ad-45', 'ad-78', 'ad-112']
  },
  {
    id: 'pattern-2',
    name: 'Text-Heavy Static with Urgency',
    description: 'Bold headline, price/discount prominent, countdown or scarcity element. Clean background with product shot.',
    adoptionRate: 28,
    trend: 'stable',
    exampleAds: ['ad-23', 'ad-56', 'ad-89']
  },
  {
    id: 'pattern-3',
    name: 'Founder Story Video',
    description: 'Direct-to-camera from founder explaining why they created the product. Personal, authentic, usually mentions their own pet.',
    adoptionRate: 18,
    trend: 'rising',
    exampleAds: ['ad-34', 'ad-67']
  },
  {
    id: 'pattern-4',
    name: 'Before/After Split Screen',
    description: 'Side-by-side or sequential showing pet transformation. Often includes timeline (e.g., "Day 1 vs Day 30").',
    adoptionRate: 35,
    trend: 'stable',
    exampleAds: ['ad-15', 'ad-48', 'ad-81', 'ad-102']
  },
  {
    id: 'pattern-5',
    name: 'Comparison Carousel',
    description: 'Multi-slide carousel comparing product to alternatives (competitors, vet prescriptions, doing nothing).',
    adoptionRate: 22,
    trend: 'rising',
    exampleAds: ['ad-89', 'ad-120', 'ad-145']
  },
  {
    id: 'pattern-6',
    name: 'Ingredient Deep Dive',
    description: 'Educational content breaking down key ingredients with graphics/animations. Positions brand as transparent and science-backed.',
    adoptionRate: 15,
    trend: 'declining',
    exampleAds: ['ad-98', 'ad-134']
  }
];

// A/B Tests
export const abTests: ABTest[] = [
  {
    id: 'test-1',
    hypothesis: 'We believe leading with a question hook will increase CTR because question hooks show 1.5x higher representation in scaling-tier ads.',
    control: 'Statement hook: "My 14-year-old dog acts like a puppy again"',
    variant: 'Question hook: "What if your senior dog could feel young again?"',
    effort: 'low',
    evidence: 'Question hooks: 34% of scaling ads vs 22% of new ads'
  },
  {
    id: 'test-2',
    hypothesis: 'We believe adding a vet endorsement will increase trust because vet-featuring ads have 1.8x higher variation counts.',
    control: 'Current UGC testimonial without professional validation',
    variant: 'Same UGC with vet quote overlay at the end',
    effort: 'medium',
    evidence: 'Vet endorsement ads average 8.3 variations vs 4.6 overall'
  },
  {
    id: 'test-3',
    hypothesis: 'We believe carousel format will outperform single image because carousels allow full story arc and comparison positioning.',
    control: 'Single static image with benefit-focused copy',
    variant: 'Carousel with problem → solution → proof → offer slides',
    effort: 'medium',
    evidence: 'Carousels represent 25% of ads but 32% of scaling-tier ads'
  }
];

// Trend cards
export const trendCards: TrendCard[] = [
  {
    id: 'trend-1',
    patternName: 'Authenticity Over Production',
    adoptionRate: 58,
    trend: 'rising',
    exampleAds: ['ad-12', 'ad-45', 'ad-78'],
    description: 'Raw, unpolished content outperforming studio-quality ads. Phone-shot UGC with natural lighting showing highest engagement signals.'
  },
  {
    id: 'trend-2',
    patternName: 'Science-Backed Claims',
    adoptionRate: 44,
    trend: 'rising',
    exampleAds: ['ad-34', 'ad-67', 'ad-98'],
    description: 'Ads featuring clinical studies, vet endorsements, or lab testing imagery. Responding to consumer demand for proof.'
  },
  {
    id: 'trend-3',
    patternName: 'Senior Pet Focus',
    adoptionRate: 62,
    trend: 'stable',
    exampleAds: ['ad-15', 'ad-48', 'ad-81'],
    description: 'Messaging increasingly targets senior pet owners (dogs 7+). Emotional hooks around quality of life and extending healthy years.'
  },
  {
    id: 'trend-4',
    patternName: 'Price Comparison Angles',
    adoptionRate: 31,
    trend: 'rising',
    exampleAds: ['ad-89', 'ad-102'],
    description: 'Explicit price comparisons to vet prescriptions and premium competitors. "Same results, half the price" messaging.'
  },
  {
    id: 'trend-5',
    patternName: 'Subscription Push',
    adoptionRate: 39,
    trend: 'stable',
    exampleAds: ['ad-56', 'ad-112'],
    description: 'Ads promoting subscribe-and-save options with significant discounts. LTV optimization taking priority.'
  },
  {
    id: 'trend-6',
    patternName: 'Ingredient Transparency',
    adoptionRate: 27,
    trend: 'declining',
    exampleAds: ['ad-134', 'ad-145'],
    description: 'Detailed ingredient breakdowns becoming less common as brands shift to outcome-focused messaging.'
  }
];

// Hook library data
export const hookLibrary: HookData[] = [
  { text: "Is your dog's joint pain keeping them from playing?", type: 'question', frequency: 12, adIds: ['ad-1', 'ad-34', 'ad-67'] },
  { text: "Why do vets recommend this supplement over kibble additives?", type: 'question', frequency: 8, adIds: ['ad-12', 'ad-89'] },
  { text: "My vet said Max only had 6 months left. That was 2 years ago.", type: 'statement', frequency: 15, adIds: ['ad-23', 'ad-56', 'ad-98'] },
  { text: "This changed everything for my arthritic golden retriever.", type: 'statement', frequency: 11, adIds: ['ad-45', 'ad-78'] },
  { text: "Over 500,000 pet parents trust PawPure", type: 'social_proof', frequency: 9, adIds: ['ad-15', 'ad-102'] },
  { text: "4.9 stars from 12,847 verified reviews", type: 'social_proof', frequency: 14, adIds: ['ad-48', 'ad-81', 'ad-112'] },
  { text: "Last chance: 40% off ends tonight", type: 'urgency', frequency: 18, adIds: ['ad-56', 'ad-89', 'ad-120'] },
  { text: "Only 127 units left in stock", type: 'urgency', frequency: 7, adIds: ['ad-134'] },
  { text: "Does your cat refuse to take their vitamins?", type: 'question', frequency: 6, adIds: ['ad-145'] },
  { text: "The ingredient big pet food companies don't want you to know about.", type: 'statement', frequency: 10, adIds: ['ad-67', 'ad-98'] }
];

// Saved analyses
export const savedAnalyses: Analysis[] = [
  {
    id: 'analysis-1',
    name: 'Pet Supplement Competitors Q4',
    competitors: ['PawPure', 'VitalPets', 'NutriHound', 'FurWell', 'PetVitality'],
    createdAt: '2024-01-15',
    totalAds: 205
  },
  {
    id: 'analysis-2',
    name: 'Dog Food DTC Leaders',
    competitors: ['FreshPet', 'Ollie', 'Farmer\'s Dog'],
    createdAt: '2024-01-10',
    totalAds: 156
  },
  {
    id: 'analysis-3',
    name: 'Cat Supplement Market',
    competitors: ['VitalPets', 'WhiskerWell', 'PurrfectHealth'],
    createdAt: '2024-01-05',
    totalAds: 89
  }
];

// Format distribution for charts
export const formatDistribution = [
  { name: 'Video', value: 40, color: '#6366f1' },
  { name: 'Static', value: 35, color: '#8b5cf6' },
  { name: 'Carousel', value: 25, color: '#a855f7' }
];

// Calculate velocity distribution from generated ads
function calculateVelocityDistribution() {
  const tierCounts = { scaling: 0, testing: 0, new: 0 };
  ads.forEach(ad => {
    tierCounts[ad.scoring.velocity.tier]++;
  });
  const total = ads.length;
  return [
    { name: 'Scaling', value: Math.round((tierCounts.scaling / total) * 100), color: '#22c55e' },
    { name: 'Testing', value: Math.round((tierCounts.testing / total) * 100), color: '#eab308' },
    { name: 'New', value: Math.round((tierCounts.new / total) * 100), color: '#94a3b8' }
  ];
}

// Velocity distribution for charts
export const velocityDistribution = calculateVelocityDistribution();

// Calculate signal distribution for detailed charts
function calculateSignalDistribution() {
  const signalCounts: Record<VelocitySignal, number> = {
    burn_test: 0,
    cash_cow: 0,
    zombie: 0,
    rising_star: 0,
    standard: 0
  };
  ads.forEach(ad => {
    signalCounts[ad.scoring.velocity.signal]++;
  });
  const total = ads.length;
  return [
    { name: 'Cash Cow', value: Math.round((signalCounts.cash_cow / total) * 100), color: '#22c55e' },
    { name: 'Rising Star', value: Math.round((signalCounts.rising_star / total) * 100), color: '#3b82f6' },
    { name: 'Burn Test', value: Math.round((signalCounts.burn_test / total) * 100), color: '#f97316' },
    { name: 'Standard', value: Math.round((signalCounts.standard / total) * 100), color: '#94a3b8' },
    { name: 'Zombie', value: Math.round((signalCounts.zombie / total) * 100), color: '#64748b' }
  ];
}

export const signalDistribution = calculateSignalDistribution();

// Calculate grade distribution for charts
function calculateGradeDistribution() {
  const gradeCounts: Record<string, number> = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
  ads.forEach(ad => {
    gradeCounts[ad.scoring.grade]++;
  });
  const total = ads.length;
  return [
    { name: 'A+', value: Math.round((gradeCounts['A+'] / total) * 100), color: '#22c55e' },
    { name: 'A', value: Math.round((gradeCounts['A'] / total) * 100), color: '#84cc16' },
    { name: 'B', value: Math.round((gradeCounts['B'] / total) * 100), color: '#eab308' },
    { name: 'C', value: Math.round((gradeCounts['C'] / total) * 100), color: '#f97316' },
    { name: 'D', value: Math.round((gradeCounts['D'] / total) * 100), color: '#ef4444' }
  ];
}

export const gradeDistribution = calculateGradeDistribution();

// Hook type distribution
export const hookTypeDistribution = [
  { name: 'Question', value: 28, color: '#3b82f6' },
  { name: 'Statement', value: 32, color: '#10b981' },
  { name: 'Social Proof', value: 22, color: '#f59e0b' },
  { name: 'Urgency', value: 18, color: '#ef4444' }
];

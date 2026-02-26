import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { StorySignal, ReportBranding } from '@/types/report';
import { PDFBarChart } from './shared/PDFBarChart';
import { ComparisonTable } from './shared/ComparisonTable';
import { StatCallout } from './shared/StatCallout';
import { SeverityBadge } from './shared/SeverityBadge';
import { colors } from './shared/ReportStyles';

const s = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  detail: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.5,
    marginBottom: 12,
  },
  fallback: {
    fontSize: 9,
    color: colors.muted,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  recBox: {
    backgroundColor: '#EEF2FF',
    borderLeft: 3,
    borderLeftColor: '#4F46E5',
    padding: 10,
    marginTop: 8,
  },
  recHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  recPriorityBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: 'bold',
  },
  recAction: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  recTimeline: {
    fontSize: 8,
    color: '#6B7280',
  },
});

// --- Data extractors (typed, with safe defaults) ---

interface CompetitorEntry {
  name: string;
  count: number;
}

function extractVolumeData(dp: Record<string, unknown>, brandName: string) {
  const competitors = Array.isArray(dp.competitors)
    ? (dp.competitors as CompetitorEntry[])
    : [];
  const brandCount = typeof dp.brandCount === 'number' ? dp.brandCount : 0;
  const average = typeof dp.average === 'number' ? dp.average : 0;
  return { competitors, brandCount, average };
}

function extractTableRows(dp: Record<string, unknown>): { cells: string[]; highlight?: boolean }[] {
  if (Array.isArray(dp.rows)) {
    return (dp.rows as { cells: string[]; highlight?: boolean }[]).map(r => ({
      cells: Array.isArray(r.cells) ? r.cells.map(c => String(c)) : [],
      highlight: !!r.highlight,
    }));
  }
  return [];
}

function extractStatValues(dp: Record<string, unknown>) {
  const statValue = typeof dp.statValue === 'string' ? dp.statValue : '--';
  const statContext = typeof dp.statContext === 'string' ? dp.statContext : '';
  return { statValue, statContext };
}

function severityToVariant(severity: number): 'danger' | 'warning' | 'neutral' {
  if (severity >= 7) return 'danger';
  if (severity >= 4) return 'warning';
  return 'neutral';
}

function severityToBadge(severity: number): { text: string; variant: 'critical' | 'moderate' | 'minor' } {
  if (severity >= 7) return { text: 'CRITICAL', variant: 'critical' };
  if (severity >= 4) return { text: 'MODERATE', variant: 'moderate' };
  return { text: 'MINOR', variant: 'minor' };
}

// --- Recommendation engine ---

function getRecommendation(signal: StorySignal): { action: string; timeline: string; priority: string } {
  const dp = signal.dataPoints;
  switch (signal.category) {
    case 'volume': {
      const industryAvg = typeof dp.industryAvg === 'number' ? dp.industryAvg : (typeof dp.average === 'number' ? dp.average : 100);
      return {
        action: `Increase active ad count to at least ${Math.ceil(industryAvg * 0.5)} ads within 30 days. Launch 3-5 new creatives per week testing different hooks and formats. Prioritize formats competitors are scaling.`,
        timeline: '30 days',
        priority: 'High',
      };
    }
    case 'quality':
      return {
        action: 'Focus on creative quality over quantity. Study the top 10 competitor ads (see Top Performers section) and reverse-engineer their hooks, visuals, and offers. Test 2-3 new concepts weekly with A/B testing.',
        timeline: '60 days',
        priority: 'High',
      };
    case 'format': {
      const missingFormats = typeof dp.missingFormats === 'string' ? dp.missingFormats : 'Video';
      return {
        action: `Launch ${missingFormats} ad tests immediately. Start with 3 creatives in each missing format. Video ads specifically should test problem-focused hooks and product demonstrations — these are the highest-performing patterns in your industry.`,
        timeline: '14 days',
        priority: 'Critical',
      };
    }
    case 'velocity':
      return {
        action: 'Review current ad testing pipeline. You need a system to identify winners quickly and scale them. Set up rules: if an ad hits 2x ROAS after $50 spend, increase budget 50%. If below 0.5x after $30, kill it. The goal is to surface Scaling ads.',
        timeline: '7 days',
        priority: 'Critical',
      };
    case 'trend': {
      const gapCount = typeof dp.criticalGaps === 'number' ? dp.criticalGaps : (typeof dp.totalGaps === 'number' ? dp.totalGaps : 0);
      return {
        action: `Test ${gapCount} missing industry trends in the next 2 weeks. See the Trends Analysis section for specific recommendations on each trend. Start with the trend that has the highest competitor adoption — it's proven demand.`,
        timeline: '14 days',
        priority: 'High',
      };
    }
    case 'creative':
      return {
        action: 'Diversify your hook strategy. If most of your ads use price/discount hooks, test curiosity, problem-focused, and social proof hooks. Create 2 variations of each hook type applied to your best-selling product.',
        timeline: '21 days',
        priority: 'Medium',
      };
    default:
      return {
        action: 'Review the detailed analysis above and prioritize the identified gaps.',
        timeline: '30 days',
        priority: 'Medium',
      };
  }
}

const priorityColors: Record<string, { bg: string; color: string }> = {
  Critical: { bg: '#fef2f2', color: '#dc2626' },
  High: { bg: '#fff7ed', color: '#ea580c' },
  Medium: { bg: '#eef2ff', color: '#4f46e5' },
};

const CATEGORY_CONFIG: Record<StorySignal['category'], {
  title: string;
  tableHeaders: string[];
}> = {
  volume: { title: 'AD VOLUME VS. INDUSTRY', tableHeaders: [] },
  quality: { title: 'TOP 100 AD RANKINGS', tableHeaders: ['Competitor', 'Ads in Top 100', 'Share'] },
  format: { title: 'FORMAT DISTRIBUTION', tableHeaders: ['Format', 'Industry %', 'Your %'] },
  velocity: { title: 'AD HEALTH SIGNALS', tableHeaders: ['Signal', 'Industry Avg', 'Your Ads'] },
  trend: { title: 'INDUSTRY TRENDS', tableHeaders: ['Trend', 'Competitors Using', 'You'] },
  creative: { title: 'CREATIVE PATTERNS', tableHeaders: ['Pattern', 'Top 100 %', 'Your %'] },
};

interface Props {
  signal: StorySignal;
  brandName: string;
  branding: ReportBranding;
}

export function SignalDeepDive({ signal, brandName }: Props) {
  const { category, severity, detail, dataPoints } = signal;
  const config = CATEGORY_CONFIG[category];
  const badge = severityToBadge(severity);
  const statVariant = severityToVariant(severity);

  return (
    <View wrap={false} style={s.container}>
      {/* Header row */}
      <View style={s.headerRow}>
        <Text style={s.sectionTitle}>{config.title}</Text>
        <SeverityBadge text={badge.text} variant={badge.variant} />
      </View>

      {/* Category-specific visualization */}
      {category === 'volume' ? (
        <VolumeViz dataPoints={dataPoints} brandName={brandName} />
      ) : (
        <TableViz dataPoints={dataPoints} headers={config.tableHeaders} />
      )}

      {/* Detail paragraph */}
      <Text style={s.detail}>{detail}</Text>

      {/* Stat callout */}
      {category === 'volume' ? (
        <VolumeStatCallout dataPoints={dataPoints} variant={statVariant} />
      ) : (
        <GenericStatCallout dataPoints={dataPoints} variant={statVariant} />
      )}

      {/* Recommended action */}
      <RecommendationBox signal={signal} />
    </View>
  );
}

// --- Sub-renderers ---

function VolumeViz({ dataPoints, brandName }: { dataPoints: Record<string, unknown>; brandName: string }) {
  const { competitors, brandCount } = extractVolumeData(dataPoints, brandName);
  if (competitors.length === 0) {
    return <Text style={s.fallback}>No competitor volume data available.</Text>;
  }

  // Ensure the client brand appears in the bar chart
  const brandAlreadyIncluded = competitors.some(c => c.name === brandName);
  const entries = brandAlreadyIncluded
    ? competitors
    : [...competitors, { name: brandName, count: brandCount }].sort((a, b) => b.count - a.count);

  const barData = entries.map(c => ({
    label: c.name === brandName ? `${brandName} (You)` : c.name,
    value: c.count,
    highlight: false,
    isClient: c.name === brandName,
    color: c.name === brandName ? colors.accent : undefined,
  }));

  return <PDFBarChart data={barData} />;
}

function TableViz({ dataPoints, headers }: { dataPoints: Record<string, unknown>; headers: string[] }) {
  const rows = extractTableRows(dataPoints);
  if (rows.length === 0) {
    return <Text style={s.fallback}>No data available for this signal.</Text>;
  }
  return <ComparisonTable headers={headers} rows={rows} />;
}

function VolumeStatCallout({ dataPoints, variant }: { dataPoints: Record<string, unknown>; variant: 'danger' | 'warning' | 'neutral' }) {
  const { brandCount, average } = extractVolumeData(dataPoints, '');
  return (
    <StatCallout
      stat={`${brandCount} ads`}
      context={`Industry average: ${average} ads`}
      variant={variant}
    />
  );
}

function GenericStatCallout({ dataPoints, variant }: { dataPoints: Record<string, unknown>; variant: 'danger' | 'warning' | 'neutral' }) {
  const { statValue, statContext } = extractStatValues(dataPoints);
  return <StatCallout stat={statValue} context={statContext} variant={variant} />;
}

function RecommendationBox({ signal }: { signal: StorySignal }) {
  const rec = getRecommendation(signal);
  const pColors = priorityColors[rec.priority] || priorityColors.Medium;

  return (
    <View style={s.recBox}>
      <View style={s.recHeaderRow}>
        <Text style={s.recTitle}>▶ RECOMMENDED ACTION</Text>
        <Text style={[s.recPriorityBadge, { backgroundColor: pColors.bg, color: pColors.color }]}>
          {rec.priority.toUpperCase()}
        </Text>
      </View>
      <Text style={s.recAction}>{rec.action}</Text>
      <Text style={s.recTimeline}>Timeline: {rec.timeline}</Text>
    </View>
  );
}

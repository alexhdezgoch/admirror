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
    </View>
  );
}

// --- Sub-renderers ---

function VolumeViz({ dataPoints, brandName }: { dataPoints: Record<string, unknown>; brandName: string }) {
  const { competitors } = extractVolumeData(dataPoints, brandName);
  if (competitors.length === 0) {
    return <Text style={s.fallback}>No competitor volume data available.</Text>;
  }

  const barData = competitors.map(c => ({
    label: c.name,
    value: c.count,
    highlight: c.name === brandName,
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

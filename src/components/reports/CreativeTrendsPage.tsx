import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { CreativeIntelligenceData, ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { SeverityBadge } from './shared/SeverityBadge';
import sharedStyles, { colors } from './shared/ReportStyles';

const s = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
    marginTop: 4,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  trendLabel: {
    flex: 1,
    fontSize: 9,
    color: colors.textLight,
  },
  velocityText: {
    fontSize: 9,
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 45,
    textAlign: 'right',
  },
  barTrack: {
    width: 100,
  },
  bar: {
    height: 10,
    borderRadius: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  alertsSection: {
    marginTop: 16,
  },
  alertBox: {
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 6,
    borderLeft: 3,
    borderLeftColor: colors.danger,
    marginBottom: 8,
  },
  convergenceBox: {
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
  },
  alertText: {
    fontSize: 8,
    color: colors.textLight,
    lineHeight: 1.4,
  },
});

interface Props {
  velocity: CreativeIntelligenceData['velocity'];
  convergence: CreativeIntelligenceData['convergence'];
  branding: ReportBranding;
}

export function CreativeTrendsPage({ velocity, convergence, branding }: Props) {
  const accelerating = velocity.topAccelerating.slice(0, 5);
  const declining = velocity.topDeclining.slice(0, 5);
  const maxPrevalence = Math.max(
    ...accelerating.map((r) => r.currentPrevalence),
    ...declining.map((r) => r.currentPrevalence),
    1
  );

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Creative Trends" branding={branding} />

      {/* Accelerating */}
      <Text style={s.sectionLabel}>Accelerating</Text>
      {accelerating.map((item, i) => (
        <View key={i} style={[s.trendRow, { backgroundColor: '#f0fdf4' }]}>
          <Text style={s.trendLabel}>
            {item.dimension}: {item.value}
          </Text>
          <Text style={[s.velocityText, { color: colors.success }]}>
            +{item.velocityPercent}%
          </Text>
          <View style={s.barTrack}>
            <View
              style={[
                s.bar,
                {
                  width: `${Math.max((item.currentPrevalence / maxPrevalence) * 100, 3)}%`,
                  backgroundColor: colors.success,
                },
              ]}
            />
          </View>
        </View>
      ))}

      <View style={s.divider} />

      {/* Declining */}
      <Text style={s.sectionLabel}>Declining</Text>
      {declining.map((item, i) => (
        <View key={i} style={[s.trendRow, { backgroundColor: '#fafafa' }]}>
          <Text style={s.trendLabel}>
            {item.dimension}: {item.value}
          </Text>
          <Text style={[s.velocityText, { color: colors.muted }]}>
            {item.velocityPercent}%
          </Text>
          <View style={s.barTrack}>
            <View
              style={[
                s.bar,
                {
                  width: `${Math.max((item.currentPrevalence / maxPrevalence) * 100, 3)}%`,
                  backgroundColor: colors.muted,
                },
              ]}
            />
          </View>
        </View>
      ))}

      {/* Convergence Alerts */}
      {(convergence.newAlerts.length > 0 || convergence.strongConvergences.length > 0) && (
        <View style={s.alertsSection}>
          <Text style={s.sectionLabel}>Convergence Alerts</Text>

          {convergence.newAlerts.map((alert, i) => (
            <View key={`alert-${i}`} style={s.alertBox}>
              <View style={s.alertHeaderRow}>
                <Text style={s.alertTitle}>
                  {alert.dimension}: {alert.value}
                </Text>
                <SeverityBadge text="NEW" variant="critical" />
              </View>
              <Text style={s.alertText}>
                Convergence ratio: {Math.round(alert.convergenceRatio * 100)}%
              </Text>
            </View>
          ))}

          {convergence.strongConvergences.slice(0, 4).map((conv, i) => (
            <View key={`conv-${i}`} style={s.convergenceBox}>
              <View style={s.alertHeaderRow}>
                <Text style={s.alertTitle}>
                  {conv.dimension}: {conv.value}
                </Text>
                {conv.crossTrack && (
                  <SeverityBadge text="CROSS-TRACK" variant="info" />
                )}
              </View>
              <Text style={s.alertText}>
                {conv.competitorsIncreasing} of {conv.totalCompetitors} competitors now using this
                {' '} — convergence ratio: {Math.round(conv.convergenceRatio * 100)}%
              </Text>
            </View>
          ))}
        </View>
      )}

      <ReportFooter branding={branding} />
    </Page>
  );
}

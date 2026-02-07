'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { PlaybookContent, PlaybookRow, ConfidenceLevel } from '@/types/playbook';

// Helper to get confidence badge style
const getConfidenceStyle = (level: ConfidenceLevel) => {
  switch (level) {
    case 'high':
      return styles.confidenceHigh;
    case 'medium':
      return styles.confidenceMedium;
    case 'hypothesis':
      return styles.confidenceHypothesis;
    default:
      return styles.confidenceMedium;
  }
};

const getConfidenceLabel = (level: ConfidenceLevel): string => {
  switch (level) {
    case 'high':
      return 'HIGH CONFIDENCE';
    case 'medium':
      return 'MEDIUM';
    case 'hypothesis':
      return 'HYPOTHESIS';
  }
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1e293b',
  },
  header: {
    marginBottom: 30,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 20,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoBox: {
    width: 24,
    height: 24,
    backgroundColor: '#4f46e5',
    borderRadius: 4,
    marginRight: 8,
  },
  logoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
  },
  summaryBox: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  topInsight: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#fff',
    border: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 12,
  },
  gridTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
    marginTop: 3,
  },
  listText: {
    flex: 1,
    fontSize: 9,
    color: '#475569',
  },
  card: {
    backgroundColor: '#fff',
    border: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 8,
    fontWeight: 'bold',
  },
  badgeGreen: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  badgeBlue: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  badgeRed: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  badgeAmber: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
  text: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.5,
  },
  highlight: {
    backgroundColor: '#eef2ff',
    padding: 10,
    borderRadius: 4,
    marginTop: 8,
  },
  highlightText: {
    fontSize: 9,
    color: '#4f46e5',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTop: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
  },
  stopDoingBox: {
    backgroundColor: '#fef2f2',
    border: 1,
    borderColor: '#fecaca',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  confidenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 7,
    fontWeight: 'bold',
  },
  confidenceHigh: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  confidenceMedium: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
  confidenceHypothesis: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  actionPlanBox: {
    backgroundColor: '#eef2ff',
    border: 1,
    borderColor: '#c7d2fe',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  actionPlanItem: {
    backgroundColor: '#fff',
    border: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  benchmarkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
  },
});

interface Props {
  playbook: PlaybookRow;
  brandName: string;
}

export function PlaybookPDF({ playbook, brandName }: Props) {
  const content = playbook.content as PlaybookContent;

  return (
    <Document>
      {/* Page 1: Executive Summary */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <View style={styles.logoBox} />
            <Text style={styles.logoText}>AdMirror</Text>
          </View>
          <Text style={styles.title}>{playbook.title}</Text>
          <Text style={styles.subtitle}>
            Creative Strategy Brief for {brandName} | Generated {new Date(playbook.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Action Plan - First Section */}
        {content.actionPlan && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Action Plan</Text>
            <View style={styles.actionPlanBox}>
              <Text style={[styles.gridTitle, { marginBottom: 4, color: '#4f46e5' }]}>THIS WEEK</Text>
              <Text style={[styles.cardTitle, { marginBottom: 4 }]}>{content.actionPlan.thisWeek.action}</Text>
              <Text style={styles.text}>{content.actionPlan.thisWeek.rationale}</Text>
              <View style={{ flexDirection: 'row', marginTop: 6 }}>
                <Text style={[styles.confidenceBadge, getConfidenceStyle(content.actionPlan.thisWeek.confidence)]}>
                  {getConfidenceLabel(content.actionPlan.thisWeek.confidence)}
                </Text>
              </View>
            </View>

            {content.actionPlan.nextTwoWeeks.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.gridTitle, { marginBottom: 8 }]}>NEXT 2 WEEKS</Text>
                {content.actionPlan.nextTwoWeeks.map((item, i) => (
                  <View key={i} style={styles.actionPlanItem}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.text}>{item.action}</Text>
                      <Text style={[styles.confidenceBadge, getConfidenceStyle(item.confidence)]}>
                        {getConfidenceLabel(item.confidence)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {content.actionPlan.thisMonth.length > 0 && (
              <View>
                <Text style={[styles.gridTitle, { marginBottom: 8 }]}>THIS MONTH</Text>
                {content.actionPlan.thisMonth.map((item, i) => (
                  <View key={i} style={styles.actionPlanItem}>
                    <Text style={styles.text}>{item.action}</Text>
                    <Text style={[styles.text, { fontSize: 8, color: '#64748b', marginTop: 2 }]}>
                      Goal: {item.strategicGoal}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>

          {/* Benchmarks */}
          {content.executiveSummary.benchmarks && content.executiveSummary.benchmarks.length > 0 && (
            <View style={[styles.summaryBox, { marginBottom: 12 }]}>
              <Text style={[styles.gridTitle, { marginBottom: 8 }]}>How You Compare</Text>
              {content.executiveSummary.benchmarks.map((benchmark, i) => (
                <View key={i} style={styles.benchmarkRow}>
                  <Text style={styles.text}>{benchmark.metric}</Text>
                  <Text style={[styles.text, { fontWeight: 'bold' }]}>
                    {benchmark.multiplier > 0 ? `${benchmark.multiplier.toFixed(1)}x` : '-'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.summaryBox}>
            <Text style={styles.topInsight}>{content.executiveSummary.topInsight}</Text>
          </View>

          <View style={styles.grid}>
            {/* Strengths */}
            <View style={styles.gridItem}>
              <Text style={styles.gridTitle}>Your Strengths</Text>
              {content.executiveSummary.yourStrengths.map((item, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={[styles.bullet, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Gaps */}
            <View style={styles.gridItem}>
              <Text style={styles.gridTitle}>Biggest Gaps</Text>
              {content.executiveSummary.biggestGaps.map((item, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={[styles.bullet, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Quick Wins */}
            <View style={styles.gridItem}>
              <Text style={styles.gridTitle}>Quick Wins</Text>
              {content.executiveSummary.quickWins.map((item, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={[styles.bullet, { backgroundColor: '#4f46e5' }]} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Format Strategy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Format Strategy</Text>
          <Text style={[styles.text, { marginBottom: 12 }]}>{content.formatStrategy.summary}</Text>

          {content.formatStrategy.recommendations.slice(0, 3).map((rec, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{rec.format.toUpperCase()}</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {rec.confidence && (
                    <Text style={[styles.confidenceBadge, getConfidenceStyle(rec.confidence)]}>
                      {getConfidenceLabel(rec.confidence)}
                    </Text>
                  )}
                  <Text style={[
                    styles.badge,
                    rec.action === 'scale' ? styles.badgeGreen :
                    rec.action === 'test' ? styles.badgeBlue : styles.badgeRed
                  ]}>
                    {rec.action.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.text}>{rec.rationale}</Text>
              <View style={styles.highlight}>
                <Text style={styles.highlightText}>Your Data: {rec.yourData}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by AdMirror</Text>
          <Text style={styles.footerText}>Page 1</Text>
        </View>
      </Page>

      {/* Page 2: Hooks & Competitor Gaps */}
      <Page size="A4" style={styles.page}>
        {/* Hook Strategy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hook Strategy</Text>
          <Text style={[styles.text, { marginBottom: 12 }]}>{content.hookStrategy.summary}</Text>

          {content.hookStrategy.toTest.slice(0, 4).map((hook, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{hook.hookType.replace(/_/g, ' ')}</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {hook.confidence && (
                    <Text style={[styles.confidenceBadge, getConfidenceStyle(hook.confidence)]}>
                      {getConfidenceLabel(hook.confidence)}
                    </Text>
                  )}
                  <Text style={[
                    styles.badge,
                    hook.priority === 'high' ? styles.badgeRed :
                    hook.priority === 'medium' ? styles.badgeAmber : styles.badgeBlue
                  ]}>
                    {hook.priority.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.highlight}>
                <Text style={styles.highlightText}>&quot;{hook.hookTemplate}&quot;</Text>
              </View>
              <Text style={[styles.text, { marginTop: 8 }]}>{hook.whyItWorks}</Text>
            </View>
          ))}

          {content.hookStrategy.yourWinningHooks.length > 0 && (
            <View style={[styles.card, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
              <Text style={[styles.gridTitle, { color: '#15803d' }]}>Keep Using These Hooks</Text>
              {content.hookStrategy.yourWinningHooks.map((hook, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={[styles.bullet, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.listText}>{hook}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Competitor Gaps */}
        {content.competitorGaps.opportunities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Competitor Opportunities</Text>
            <Text style={[styles.text, { marginBottom: 12 }]}>{content.competitorGaps.summary}</Text>

            {content.competitorGaps.opportunities.slice(0, 3).map((opp, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{opp.patternName}</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {opp.confidence && (
                      <Text style={[styles.confidenceBadge, getConfidenceStyle(opp.confidence)]}>
                        {getConfidenceLabel(opp.confidence)}
                      </Text>
                    )}
                    <Text style={[
                      styles.badge,
                      opp.gapSeverity === 'critical' ? styles.badgeRed :
                      opp.gapSeverity === 'moderate' ? styles.badgeAmber : styles.badgeBlue
                    ]}>
                      {opp.gapSeverity.toUpperCase()} GAP
                    </Text>
                  </View>
                </View>
                <Text style={styles.text}>{opp.description}</Text>
                <Text style={[styles.text, { marginTop: 6, fontWeight: 'bold' }]}>
                  Used by: {opp.competitorsUsing.join(', ')}
                </Text>
                <View style={styles.highlight}>
                  <Text style={styles.highlightText}>How to Adapt: {opp.adaptationSuggestion}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by AdMirror</Text>
          <Text style={styles.footerText}>Page 2</Text>
        </View>
      </Page>

      {/* Page 3: Stop Doing & Top Performers */}
      <Page size="A4" style={styles.page}>
        {/* Stop Doing */}
        {content.stopDoing.patterns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stop Doing</Text>
            <Text style={[styles.text, { marginBottom: 12 }]}>{content.stopDoing.summary}</Text>

            {content.stopDoing.patterns.map((pattern, i) => (
              <View key={i} style={styles.stopDoingBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <Text style={[styles.cardTitle, { color: '#b91c1c' }]}>
                    {pattern.pattern}
                  </Text>
                  {pattern.confidence && (
                    <Text style={[styles.confidenceBadge, getConfidenceStyle(pattern.confidence)]}>
                      {getConfidenceLabel(pattern.confidence)}
                    </Text>
                  )}
                </View>
                <Text style={styles.text}>{pattern.reason}</Text>
                <Text style={[styles.text, { marginTop: 6 }]}>
                  Your data: {pattern.yourData}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Top Performers */}
        {content.topPerformers.competitorAds.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Performers to Study</Text>

            {content.topPerformers.competitorAds.slice(0, 4).map((ad, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{ad.competitorName}</Text>
                </View>
                <Text style={styles.text}>{ad.whyItWorks}</Text>
                <View style={[styles.highlight, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.highlightText, { color: '#b45309' }]}>
                    Stealable Elements: {ad.stealableElements.join(', ')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Data Snapshot */}
        <View style={[styles.section, { marginTop: 'auto' }]}>
          <View style={[styles.summaryBox, { backgroundColor: '#f8fafc' }]}>
            <Text style={[styles.gridTitle, { marginBottom: 8 }]}>Data Snapshot</Text>
            <Text style={styles.text}>
              {content.dataSnapshot.myPatternsIncluded ? `${content.dataSnapshot.clientAdsAnalyzed} of your ads analyzed` : 'Meta not connected'} | {' '}
              {content.dataSnapshot.competitorAdsAnalyzed} competitor ads | {' '}
              {content.dataSnapshot.trendsIncorporated} trends incorporated
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by AdMirror | admirror.io</Text>
          <Text style={styles.footerText}>Page 3</Text>
        </View>
      </Page>
    </Document>
  );
}

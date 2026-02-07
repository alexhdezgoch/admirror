'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { PlaybookContent, PlaybookRow } from '@/types/playbook';

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

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
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
                <Text style={[
                  styles.badge,
                  rec.action === 'scale' ? styles.badgeGreen :
                  rec.action === 'test' ? styles.badgeBlue : styles.badgeRed
                ]}>
                  {rec.action.toUpperCase()}
                </Text>
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
                <Text style={[
                  styles.badge,
                  hook.priority === 'high' ? styles.badgeRed :
                  hook.priority === 'medium' ? styles.badgeAmber : styles.badgeBlue
                ]}>
                  {hook.priority.toUpperCase()}
                </Text>
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
                  <Text style={[
                    styles.badge,
                    opp.gapSeverity === 'critical' ? styles.badgeRed :
                    opp.gapSeverity === 'moderate' ? styles.badgeAmber : styles.badgeBlue
                  ]}>
                    {opp.gapSeverity.toUpperCase()} GAP
                  </Text>
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
                <Text style={[styles.cardTitle, { color: '#b91c1c', marginBottom: 6 }]}>
                  {pattern.pattern}
                </Text>
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

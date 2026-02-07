'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { PlaybookRow, PlaybookContent } from '@/types/playbook';

interface Props {
  playbook: PlaybookRow;
  brandName: string;
}

export function PDFDownloadButton({ playbook, brandName }: Props) {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDownload = async () => {
    setLoading(true);

    try {
      // Dynamically import react-pdf (ESM module)
      const { pdf, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer');

      const content = playbook.content as PlaybookContent;

      // Create styles
      const styles = StyleSheet.create({
        page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1e293b' },
        header: { marginBottom: 30, borderBottom: 1, borderBottomColor: '#e2e8f0', paddingBottom: 20 },
        logo: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
        logoBox: { width: 24, height: 24, backgroundColor: '#4f46e5', borderRadius: 4, marginRight: 8 },
        logoText: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
        title: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
        subtitle: { fontSize: 10, color: '#64748b' },
        section: { marginBottom: 24 },
        sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, paddingBottom: 8, borderBottom: 1, borderBottomColor: '#e2e8f0' },
        summaryBox: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 8, marginBottom: 16 },
        topInsight: { fontSize: 12, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
        text: { fontSize: 9, color: '#475569', lineHeight: 1.5 },
        gridItem: { backgroundColor: '#fff', border: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 12, marginBottom: 8 },
        gridTitle: { fontSize: 10, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
        listItem: { flexDirection: 'row', marginBottom: 6 },
        bullet: { width: 6, height: 6, borderRadius: 3, marginRight: 8, marginTop: 3, backgroundColor: '#4f46e5' },
        listText: { flex: 1, fontSize: 9, color: '#475569' },
        footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTop: 1, borderTopColor: '#e2e8f0' },
        footerText: { fontSize: 8, color: '#94a3b8' },
      });

      // Create the document
      const MyDocument = (
        <Document>
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

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Executive Summary</Text>
              <View style={styles.summaryBox}>
                <Text style={styles.topInsight}>{content.executiveSummary?.topInsight || ''}</Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.gridTitle}>Your Strengths</Text>
                {(content.executiveSummary?.yourStrengths || []).map((item, i) => (
                  <View key={i} style={styles.listItem}>
                    <View style={[styles.bullet, { backgroundColor: '#22c55e' }]} />
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.gridTitle}>Biggest Gaps</Text>
                {(content.executiveSummary?.biggestGaps || []).map((item, i) => (
                  <View key={i} style={styles.listItem}>
                    <View style={[styles.bullet, { backgroundColor: '#f59e0b' }]} />
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.gridTitle}>Quick Wins</Text>
                {(content.executiveSummary?.quickWins || []).map((item, i) => (
                  <View key={i} style={styles.listItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Format Strategy</Text>
              <Text style={[styles.text, { marginBottom: 12 }]}>{content.formatStrategy?.summary || ''}</Text>
              {(content.formatStrategy?.recommendations || []).slice(0, 3).map((rec, i) => (
                <View key={i} style={styles.gridItem}>
                  <Text style={styles.gridTitle}>{rec.format.toUpperCase()} - {rec.action.toUpperCase()}</Text>
                  <Text style={styles.text}>{rec.rationale}</Text>
                </View>
              ))}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Generated by AdMirror</Text>
              <Text style={styles.footerText}>Page 1</Text>
            </View>
          </Page>

          <Page size="A4" style={styles.page}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hook Strategy</Text>
              <Text style={[styles.text, { marginBottom: 12 }]}>{content.hookStrategy?.summary || ''}</Text>
              {(content.hookStrategy?.toTest || []).slice(0, 4).map((hook, i) => (
                <View key={i} style={styles.gridItem}>
                  <Text style={styles.gridTitle}>{hook.hookType.replace(/_/g, ' ').toUpperCase()}</Text>
                  <Text style={[styles.text, { fontStyle: 'italic' }]}>&quot;{hook.hookTemplate}&quot;</Text>
                  <Text style={[styles.text, { marginTop: 4 }]}>{hook.whyItWorks}</Text>
                </View>
              ))}
            </View>

            {(content.competitorGaps?.opportunities || []).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Competitor Opportunities</Text>
                {(content.competitorGaps?.opportunities || []).slice(0, 3).map((opp, i) => (
                  <View key={i} style={styles.gridItem}>
                    <Text style={styles.gridTitle}>{opp.patternName}</Text>
                    <Text style={styles.text}>{opp.description}</Text>
                    <Text style={[styles.text, { marginTop: 4, fontWeight: 'bold' }]}>
                      Used by: {opp.competitorsUsing.join(', ')}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Generated by AdMirror</Text>
              <Text style={styles.footerText}>Page 2</Text>
            </View>
          </Page>

          <Page size="A4" style={styles.page}>
            {(content.stopDoing?.patterns || []).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Stop Doing</Text>
                {(content.stopDoing?.patterns || []).map((pattern, i) => (
                  <View key={i} style={[styles.gridItem, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                    <Text style={[styles.gridTitle, { color: '#b91c1c' }]}>{pattern.pattern}</Text>
                    <Text style={styles.text}>{pattern.reason}</Text>
                  </View>
                ))}
              </View>
            )}

            {(content.topPerformers?.competitorAds || []).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Performers to Study</Text>
                {(content.topPerformers?.competitorAds || []).slice(0, 4).map((ad, i) => (
                  <View key={i} style={styles.gridItem}>
                    <Text style={styles.gridTitle}>{ad.competitorName}</Text>
                    <Text style={styles.text}>{ad.whyItWorks}</Text>
                    <Text style={[styles.text, { marginTop: 4, color: '#b45309' }]}>
                      Stealable: {ad.stealableElements.join(', ')}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={[styles.summaryBox, { marginTop: 'auto' }]}>
              <Text style={styles.gridTitle}>Data Snapshot</Text>
              <Text style={styles.text}>
                {content.dataSnapshot?.myPatternsIncluded ? `${content.dataSnapshot.clientAdsAnalyzed} of your ads analyzed` : 'Meta not connected'} | {content.dataSnapshot?.competitorAdsAnalyzed || 0} competitor ads | {content.dataSnapshot?.trendsIncorporated || 0} trends incorporated
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Generated by AdMirror | admirror.io</Text>
              <Text style={styles.footerText}>Page 3</Text>
            </View>
          </Page>
        </Document>
      );

      // Generate the PDF blob
      const blob = await pdf(MyDocument).toBlob();

      // Create download link
      const filename = `${brandName.replace(/\s+/g, '-')}-playbook-${new Date(playbook.created_at).toISOString().split('T')[0]}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 border border-slate-200 rounded-lg cursor-not-allowed"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading...
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
        loading
          ? 'text-slate-400 border-slate-200 cursor-not-allowed'
          : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
      }`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Preparing...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Download PDF
        </>
      )}
    </button>
  );
}

import { StyleSheet } from '@react-pdf/renderer';

export const colors = {
  accent: '#4f46e5',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#64748b',
  text: '#1e293b',
  textLight: '#475569',
  border: '#e2e8f0',
};

const styles = StyleSheet.create({
  // Page
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.text,
  },

  // Headings
  h1: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  h2: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  h3: { fontSize: 14, fontWeight: 'bold', color: colors.text },
  h4: { fontSize: 12, fontWeight: 'bold', color: colors.text },

  // Body text
  text: { fontSize: 9, color: colors.textLight, lineHeight: 1.5 },
  textBold: { fontSize: 9, color: colors.textLight, lineHeight: 1.5, fontWeight: 'bold' },
  textSmall: { fontSize: 8, color: colors.muted },

  // Boxes
  summaryBox: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  alertBox: {
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeft: 3,
    borderLeftColor: colors.danger,
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeft: 3,
    borderLeftColor: colors.success,
  },
  gutPunchBox: {
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  gutPunchText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gutPunchSubtext: {
    color: '#c7d2fe',
    fontSize: 9,
  },

  // Tables
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottom: 1,
    borderBottomColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: colors.border,
  },
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottom: 1,
    borderBottomColor: colors.border,
  },
  tableRowHighlight: {
    flexDirection: 'row',
    backgroundColor: '#fef9c3',
    borderBottom: 1,
    borderBottomColor: colors.border,
  },
  tableCell: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 9,
    color: colors.textLight,
  },
  tableCellHeader: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
  },

  // Bar chart
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  barLabel: {
    width: 120,
    fontSize: 9,
    color: colors.textLight,
  },
  bar: {
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  barValue: {
    fontSize: 9,
    color: colors.text,
    fontWeight: 'bold',
    marginLeft: 6,
  },

  // Badges
  severityCritical: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 7,
    fontWeight: 'bold',
  },
  severityModerate: {
    backgroundColor: '#fffbeb',
    color: '#d97706',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 7,
    fontWeight: 'bold',
  },
  severityMinor: {
    backgroundColor: '#f1f5f9',
    color: colors.muted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 7,
    fontWeight: 'bold',
  },
  confidenceHigh: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 7,
    fontWeight: 'bold',
  },
  confidenceMedium: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 7,
    fontWeight: 'bold',
  },
  confidenceHypothesis: {
    backgroundColor: '#f1f5f9',
    color: colors.muted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 7,
    fontWeight: 'bold',
  },

  // Footer / header row
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: colors.accent,
  },
  footerRow: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTop: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
  },

  // List items
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
    backgroundColor: colors.accent,
  },
  listText: {
    flex: 1,
    fontSize: 9,
    color: colors.textLight,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: 1,
    borderBottomColor: colors.border,
  },
});

export default styles;

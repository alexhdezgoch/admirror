import { Text, StyleSheet } from '@react-pdf/renderer';

const variants = {
  critical: { bg: '#fef2f2', color: '#dc2626' },
  high: { bg: '#fff7ed', color: '#ea580c' },
  moderate: { bg: '#fffbeb', color: '#d97706' },
  minor: { bg: '#f1f5f9', color: '#64748b' },
  aligned: { bg: '#f0fdf4', color: '#16a34a' },
  info: { bg: '#eef2ff', color: '#4f46e5' },
};

const s = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 7,
    fontWeight: 'bold',
  },
});

interface Props {
  text: string;
  variant?: 'critical' | 'high' | 'moderate' | 'minor' | 'aligned' | 'info';
}

export function SeverityBadge({ text, variant = 'info' }: Props) {
  const v = variants[variant] || variants.info;

  return (
    <Text style={[s.badge, { backgroundColor: v.bg, color: v.color }]}>
      {text}
    </Text>
  );
}

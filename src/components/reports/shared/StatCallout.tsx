import { View, Text, StyleSheet } from '@react-pdf/renderer';

const variantStyles = {
  danger: { bg: '#fef2f2', border: '#ef4444' },
  warning: { bg: '#fffbeb', border: '#f59e0b' },
  neutral: { bg: '#f1f5f9', border: '#4f46e5' },
};

const s = StyleSheet.create({
  container: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 4,
    borderLeftWidth: 3,
  },
  stat: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  context: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.4,
  },
});

interface Props {
  stat: string;
  context: string;
  variant?: 'danger' | 'warning' | 'neutral';
}

export function StatCallout({ stat, context, variant = 'neutral' }: Props) {
  const v = variantStyles[variant];

  return (
    <View
      style={[
        s.container,
        { backgroundColor: v.bg, borderLeftColor: v.border },
      ]}
    >
      <Text style={s.stat}>{stat}</Text>
      <Text style={s.context}>{context}</Text>
    </View>
  );
}

import { View, Text, StyleSheet } from '@react-pdf/renderer';

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rowHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: '#fef9c3',
    marginHorizontal: -4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  label: {
    width: 120,
    fontSize: 9,
    color: '#475569',
  },
  barTrack: {
    flex: 1,
    maxWidth: 300,
  },
  bar: {
    height: 14,
    borderRadius: 2,
  },
  value: {
    fontSize: 9,
    color: '#1e293b',
    fontWeight: 'bold',
    marginLeft: 6,
    minWidth: 40,
  },
});

interface BarItem {
  label: string;
  value: number;
  color?: string;
  highlight?: boolean;
}

interface Props {
  data: BarItem[];
  maxValue?: number;
  showPercentage?: boolean;
  unit?: string;
}

export function PDFBarChart({ data, maxValue, showPercentage, unit }: Props) {
  const resolvedMax = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <View>
      {data.map((item, i) => {
        const widthPercent = (item.value / resolvedMax) * 100;
        const displayValue = showPercentage
          ? `${Math.round((item.value / resolvedMax) * 100)}%`
          : `${item.value}${unit || ''}`;

        return (
          <View key={i} style={item.highlight ? s.rowHighlight : s.row}>
            <Text style={s.label}>{item.label}</Text>
            <View style={s.barTrack}>
              <View
                style={[
                  s.bar,
                  {
                    width: `${Math.max(widthPercent, 1)}%`,
                    backgroundColor: item.color || '#4f46e5',
                  },
                ]}
              />
            </View>
            <Text style={s.value}>{displayValue}</Text>
          </View>
        );
      })}
    </View>
  );
}

import { View, Text, StyleSheet } from '@react-pdf/renderer';

const s = StyleSheet.create({
  table: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
  },
  row: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
  },
  rowAlt: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
  },
  rowHighlight: {
    flexDirection: 'row',
    backgroundColor: '#fef9c3',
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerCell: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  cell: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 9,
    color: '#475569',
  },
});

interface RowData {
  cells: string[];
  highlight?: boolean;
}

interface Props {
  headers: string[];
  rows: RowData[];
  columnWidths?: number[];
}

export function ComparisonTable({ headers, rows, columnWidths }: Props) {
  const widths = columnWidths || headers.map(() => 100 / headers.length);

  return (
    <View style={s.table}>
      <View style={s.headerRow}>
        {headers.map((header, i) => (
          <Text key={i} style={[s.headerCell, { width: `${widths[i]}%` }]}>
            {header}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIdx) => {
        const rowStyle = row.highlight
          ? s.rowHighlight
          : rowIdx % 2 === 1
            ? s.rowAlt
            : s.row;

        return (
          <View key={rowIdx} style={rowStyle}>
            {row.cells.map((cell, cellIdx) => (
              <Text key={cellIdx} style={[s.cell, { width: `${widths[cellIdx]}%` }]}>
                {cell}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

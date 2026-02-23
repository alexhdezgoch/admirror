import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { PDFAdThumbnail } from './PDFAdThumbnail';

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  label: {
    fontSize: 7,
    color: '#94a3b8',
    marginBottom: 4,
    letterSpacing: 0.5,
    fontWeight: 'bold',
  },
});

interface AdExample {
  thumbnail?: string;
  competitorName?: string;
  hookText?: string;
}

interface Props {
  ads: AdExample[];
  maxAds?: number;
  label?: string;
}

export function PDFAdExampleRow({ ads, maxAds = 3, label }: Props) {
  const displayed = ads.slice(0, maxAds);
  if (displayed.length === 0) return null;

  return (
    <View wrap={false}>
      {label && <Text style={s.label}>{label}</Text>}
      <View style={s.row}>
        {displayed.map((ad, i) => (
          <PDFAdThumbnail
            key={i}
            src={ad.thumbnail}
            width={50}
            height={50}
            label={ad.competitorName}
          />
        ))}
      </View>
    </View>
  );
}

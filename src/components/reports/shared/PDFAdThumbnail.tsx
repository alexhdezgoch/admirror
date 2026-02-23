import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  image: {
    objectFit: 'cover',
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
  placeholder: {
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  placeholderText: {
    fontSize: 6,
    color: '#94a3b8',
    textAlign: 'center',
  },
  label: {
    fontSize: 7,
    color: '#64748b',
    marginTop: 3,
    textAlign: 'center',
    maxLines: 1,
  },
});

interface Props {
  src?: string;
  width?: number;
  height?: number;
  label?: string;
}

export function PDFAdThumbnail({ src, width = 55, height = 55, label }: Props) {
  const hasImage = src && src.startsWith('http');

  return (
    <View style={[s.container, { width }]}>
      {hasImage ? (
        <Image
          src={src}
          style={[s.image, { width, height }]}
        />
      ) : (
        <View style={[s.placeholder, { width, height }]}>
          <Text style={s.placeholderText}>No preview</Text>
        </View>
      )}
      {label && (
        <Text style={[s.label, { width }]}>
          {label.length > 12 ? label.slice(0, 11) + '…' : label}
        </Text>
      )}
    </View>
  );
}

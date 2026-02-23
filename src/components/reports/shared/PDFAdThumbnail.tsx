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

/**
 * Only render <Image> for URLs we know are safe for client-side PDF rendering.
 * Supabase Storage URLs (same project) are CORS-safe.
 * Raw fbcdn URLs may fail in the browser, so we show a placeholder instead.
 */
function isSafeImageUrl(url: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && url.startsWith(supabaseUrl)) return true;
  // supabase.co storage URLs (covers both custom domains and default URLs)
  if (url.includes('.supabase.co/storage/')) return true;
  return false;
}

interface Props {
  src?: string;
  width?: number;
  height?: number;
  label?: string;
}

export function PDFAdThumbnail({ src, width = 55, height = 55, label }: Props) {
  const canRender = src && isSafeImageUrl(src);

  return (
    <View style={[s.container, { width }]}>
      {canRender ? (
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

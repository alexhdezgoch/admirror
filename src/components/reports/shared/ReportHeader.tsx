import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { ReportBranding } from '@/types/report';

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#4f46e5',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 24,
    height: 24,
    backgroundColor: '#4f46e5',
    borderRadius: 4,
    marginRight: 8,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  title: {
    fontSize: 10,
    color: '#64748b',
  },
});

interface Props {
  title: string;
  branding: ReportBranding;
}

export function ReportHeader({ title, branding }: Props) {
  return (
    <View style={s.container}>
      <View style={s.left}>
        <View style={s.logoBox} />
        <Text style={s.companyName}>{branding.companyName || 'AdMirror'}</Text>
      </View>
      <Text style={s.title}>{title}</Text>
    </View>
  );
}

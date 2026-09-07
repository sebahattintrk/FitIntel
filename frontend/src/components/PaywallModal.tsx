import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PaywallModal({ visible, onClose, onSuccess }: PaywallModalProps) {
  const handlePurchase = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Simüle satın alma (RevenueCat entegre edilene kadar)
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.badge}>
            <Ionicons name="sparkles" size={14} color="#059669" />
            <Text style={styles.badgeText}>LANSMANA ÖZEL %50 İNDİRİM</Text>
          </View>

          <Text style={styles.title}>FitIntel PRO ile Potansiyelini Katla</Text>
          <Text style={styles.subtitle}>
            Kişisel yapay zeka diyetisyeninle hedeflerine sınır olmadan ulaş.
          </Text>

          {/* Özellik Listesi */}
          <View style={styles.features}>
            <FeatureItem title="Sınırsız AI Koç Sohbeti" desc="Günlük soru limiti olmadan her an danış" />
            <FeatureItem title="Akıllı Dolap Uyarlaması" desc="Evdeki malzemelere göre anında sınırsız tarif üretimi" />
            <FeatureItem title="Haftalık & Aylık Derin Analiz" desc="Kilonu ve makro dengeni analiz eden koç raporları" />
            <FeatureItem title="Kişisel Beslenme Hafızası" desc="Bütçeni, sevmediğin besinleri ve hedeflerini unutmaz" />
          </View>

          {/* Fiyatlandırma Kutusu */}
          <View style={styles.priceBox}>
            <View>
              <Text style={styles.oldPrice}>239.99 TL / ay</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={styles.newPrice}>119.99 TL</Text>
                <Text style={styles.perMonth}>/ aylık</Text>
              </View>
            </View>
            <View style={styles.discountTag}>
              <Text style={styles.discountTagText}>%50 TASARRUF</Text>
            </View>
          </View>

          {/* Satın Al Butonu */}
          <TouchableOpacity style={styles.buyBtn} onPress={handlePurchase} activeOpacity={0.85}>
            <Text style={styles.buyBtnText}>PRO'ya Geç (119.99 TL)</Text>
          </TouchableOpacity>

          <Text style={styles.guaranteeText}>İstediğin an tek dokunuşla iptal edebilirsin.</Text>
        </View>
      </View>
    </Modal>
  );
}

function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.checkIcon}>
        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  closeBtn: { alignSelf: 'flex-end', padding: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 12 },
  badgeText: { color: '#059669', fontSize: 11, fontWeight: '800' },
  title: { fontSize: 24, fontWeight: '900', color: '#111827', lineHeight: 30 },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 18 },
  features: { gap: 14, marginVertical: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 13, fontWeight: '800', color: '#111827' },
  featureDesc: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  priceBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#059669', borderRadius: 16, padding: 16, marginBottom: 16 },
  oldPrice: { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through' },
  newPrice: { fontSize: 24, fontWeight: '900', color: '#111827' },
  perMonth: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  discountTag: { backgroundColor: '#DC2626', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  discountTagText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  buyBtn: { backgroundColor: '#059669', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  buyBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  guaranteeText: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 12 },
});
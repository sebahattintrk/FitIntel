import React from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';

import { useDashboard } from '@/api/queries';
import { useUserStore } from '@/store/userStore';
import { colors } from '@/theme/colors';
import { GOAL_LABEL, ACTIVITY_LABEL, GENDER_LABEL } from '@/utils/turkish';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { LinearGradient } from 'expo-linear-gradient';

export function ProfileScreen() {
  const userId = useUserStore((s) => s.userId);
  const signOut = useUserStore((s) => s.signOut);
  const q = useDashboard(userId);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (q.isLoading || !q.data) return <Loader label="Profil yükleniyor…" />;
  const u = q.data.user;

  const confirmReset = () => {
    Alert.alert(
      'Sıfırlansın mı?',
      'Cihazdaki veriler temizlenip onboarding ekranına döneceksin. Sunucudaki kayıtların kalır.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sıfırla', style: 'destructive', onPress: () => signOut() },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader subtitle="Profil" title={u.name || 'FitIntel kullanıcısı'} />

        <View className="px-5" style={{ gap: 14 }}>
          {/* Premium Otomasyonlar — top of profile, easy to reach */}
          <Pressable onPress={() => navigation.navigate('Premium')}>
            <LinearGradient
              colors={['rgba(245,158,11,0.18)', 'rgba(124,77,255,0.18)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View className="flex-row items-center">
                <Text style={{ fontSize: 26, marginRight: 12 }}>👑</Text>
                <View style={{ flex: 1 }}>
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.textHi, fontSize: 14, fontWeight: '700' }}>
                      Premium Otomasyonlar
                    </Text>
                    <View
                      style={{
                        marginLeft: 8,
                        paddingHorizontal: 7, paddingVertical: 2,
                        borderRadius: 999, backgroundColor: 'rgba(245,158,11,0.15)',
                        borderWidth: 1, borderColor: colors.warning,
                      }}
                    >
                      <Text style={{ color: colors.warning, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 }}>
                        AÇIK
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.textMid, fontSize: 12, lineHeight: 16, marginTop: 3 }}>
                    Plan ayarı önerisi + haftalık rapor. Sistem verine bakıp planını koç gibi ayarlar.
                  </Text>
                </View>
                <Text style={{ color: colors.textLow, fontSize: 22, marginLeft: 4 }}>›</Text>
              </View>
            </LinearGradient>
          </Pressable>

          <Card>
            <Text className="text-textLow text-xs uppercase tracking-widest mb-3">Hedeflerin</Text>
            <Row label="Kalori"        value={`${u.calorie_target} kcal`} />
            <Row label="Protein"       value={`${u.protein_target} g`} />
            <Row label="Karbonhidrat"  value={`${u.carbs_target} g`} />
            <Row label="Yağ"           value={`${u.fats_target} g`} />
            <Row label="BMR"           value={`${u.bmr} kcal`} />
            <Row label="TDEE"          value={`${u.tdee} kcal`} last />
          </Card>

          <Card>
            <Text className="text-textLow text-xs uppercase tracking-widest mb-3">Profil</Text>
            <Row label="Yaş"      value={`${u.age}`} />
            <Row label="Cinsiyet" value={GENDER_LABEL[u.gender] ?? u.gender} />
            <Row label="Kilo"     value={`${u.weight_kg} kg`} />
            <Row label="Boy"      value={`${u.height_cm} cm`} />
            <Row label="Aktivite" value={ACTIVITY_LABEL[u.activity_level] ?? u.activity_level} />
            <Row label="Hedef"    value={GOAL_LABEL[u.goal] ?? u.goal} last />
          </Card>

          <Card>
            <Text className="text-textLow text-xs uppercase tracking-widest mb-3">Tercihler</Text>
            <Row label="Bütçe" value={`${u.budget ?? 0} ₺ / ay`} />
            <Row
              label="Sevmedikleri"
              value={(u.disliked_foods && u.disliked_foods.length) ? u.disliked_foods.join(', ') : '—'}
              last
            />
          </Card>

          <Pressable onPress={() => navigation.navigate('Exercises')}>
            <Card>
              <View className="flex-row items-center">
                <View
                  style={{
                    width: 44, height: 44, borderRadius: 14,
                    backgroundColor: 'rgba(34,197,94,0.15)',
                    alignItems: 'center', justifyContent: 'center', marginRight: 12,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>🏋️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textHi, fontSize: 14, fontWeight: '700' }}>
                    Hareket Kütüphanesi
                  </Text>
                  <Text style={{ color: colors.textMid, fontSize: 12, marginTop: 3, lineHeight: 16 }}>
                    GIF + form rehberi. "Bu hareket yerine ne yapayım?" sorusuna alternatif öner.
                  </Text>
                </View>
                <Text style={{ color: colors.textLow, fontSize: 22, marginLeft: 4 }}>›</Text>
              </View>
            </Card>
          </Pressable>

          <PrimaryButton label="Sıfırla & Yeniden Başla" variant="ghost" onPress={confirmReset} />

          <View className="items-center mt-2">
            <Text className="text-textLow text-xs">FitIntel · v0.1.0 MVP</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      className="flex-row justify-between items-center py-3"
      style={{
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text className="text-textMid text-sm">{label}</Text>
      <Text className="text-textHi text-sm font-semibold">{value}</Text>
    </View>
  );
}

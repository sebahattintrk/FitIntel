import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { PaywallModal } from '@/components/PaywallModal';

import { useMealPlan, useRegeneratePlan } from '@/api/queries';
import { api } from '@/api/client';
import { useUserStore } from '@/store/userStore';
import { colors } from '@/theme/colors';
import { SLOT_LABEL, SLOT_TIME } from '@/utils/turkish';

type Tab = 'plan' | 'shopping';

const SLOT_ICONS: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🍗',
  dinner: '🍲',
  snack: '🍎',
};

export function PlanScreen() {
  const userId = useUserStore((s) => Number(s.user?.id) || 1);
  const setPremium = useUserStore((s) => s.setPremium);
  const q = useMealPlan(userId);
  const regenerate = useRegeneratePlan(userId);

  const [tab, setTab] = useState<Tab>('plan');

  // Paywall Modal State
  const [paywallVisible, setPaywallVisible] = useState(false);

  // Anlık Öğün Tüketimi (Hızlı Kayıt) State'leri
  const [instantMeal, setInstantMeal] = useState('');
  const [instantLogging, setInstantLogging] = useState(false);

  // Her öğünün altındaki malzeme uyarlama state'leri
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [updatingSlot, setUpdatingSlot] = useState<string | null>(null);

  // PRO Satın Alma / Yükseltme İşlemi
  const handleUpgradeSuccess = async () => {
    try {
      await api.post('/api/auth/upgrade', { userId });
      await setPremium();
      Alert.alert('Tebrikler! 🎉', 'FitIntel PRO başarıyla aktif edildi. Artık tüm özellikler sınırsız!');
    } catch (e: any) {
      Alert.alert('Hata', 'Üyelik yükseltilemedi: ' + (e?.message || ''));
    }
  };

  // Anlık Ne Yedin Gönderimi
  const handleInstantMealSubmit = async () => {
    const meal = instantMeal.trim();
    if (!meal || instantLogging) return;

    setInstantLogging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await api.post('/api/chat', {
        message: `${meal} yedim, bunu günlüğüme ekle`,
        userId,
      });

      setInstantMeal('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '✅ Günlüğe Eklendi',
        res.data?.loggedItem
          ? `${res.data.loggedItem.food_name} (+${res.data.loggedItem.calories} kcal) başarıyla kaydedildi!`
          : 'Yediğin öğün günlüğüne kaydedildi.'
      );
    } catch (err: any) {
      // Soru/istek limiti dolduysa veya deneme süresi bittiyse Paywall'u aç
      if (err?.response?.data?.code === 'LIMIT_REACHED') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setPaywallVisible(true);
        return;
      }
      Alert.alert('Hata', 'Öğün kaydedilemedi: ' + (err?.response?.data?.error || err?.message || 'Bilinmeyen hata'));
    } finally {
      setInstantLogging(false);
    }
  };

  // Dolaptaki Malzemelere Göre Öğün Uyarlama
  const handleCustomizeMeal = async (slot: string) => {
    const raw = customInputs[slot]?.trim();
    if (!raw) {
      Alert.alert(
        'Malzeme Yazmadın',
        'Lütfen elinde olan malzemeleri virgülle ayırarak yaz (Örn: 2 yumurta, kaşar, domates).'
      );
      return;
    }

    setUpdatingSlot(slot);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await api.post(`/api/meal-plan/${userId}/custom-slot`, {
        slot,
        ingredients: raw,
      });

      setCustomInputs((prev) => ({ ...prev, [slot]: '' }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await q.refetch();
      Alert.alert(
        '✨ Harika!',
        'Koçun elindeki malzemelerle bu öğünü hedeflerine uygun şekilde yeniden tasarladı.'
      );
    } catch (err: any) {
      // Soru/uyarlama limiti dolduysa Paywall'u aç
      if (err?.response?.data?.code === 'LIMIT_REACHED') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setPaywallVisible(true);
        return;
      }
      Alert.alert('Hata', 'Öğün uyarlanamadı: ' + (err?.response?.data?.error || err?.message || 'Bilinmeyen hata'));
    } finally {
      setUpdatingSlot(null);
    }
  };

  if (q.isLoading) return <Loader label="Planın hazırlanıyor…" />;
  if (q.isError || !q.data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.centerBox}>
          <Text style={styles.errorTitle}>Plan alınamadı</Text>
          <Text style={styles.errorSub}>
            API'ye ulaşılamıyor — yenilemek için sayfayı aşağı çek.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { meals, totals, targets } = q.data;
  const calProgress = targets.calories > 0 ? Math.min(1, totals.calories / targets.calories) : 0;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={q.isFetching && !q.isLoading}
            onRefresh={q.refetch}
            tintColor={colors.textLow}
          />
        }
      >
        <ScreenHeader subtitle="Bugüne özel" title="AI Beslenme Planım" />

        <View style={{ paddingHorizontal: 20 }}>
          <SegmentedControl<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'plan', label: 'Planım' },
              { value: 'shopping', label: 'Alışveriş' },
            ]}
          />
        </View>

        {tab === 'plan' && (
          <>
            {/* Büyük Kalori & Makro Özeti */}
            <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Text style={styles.sectionCaption}>GÜNLÜK HEDEF</Text>
                  <Text style={{ color: colors.textLow, fontSize: 12, fontWeight: '600' }}>
                    %{Math.round(calProgress * 100)}
                  </Text>
                </View>

                <Text style={styles.targetCaloriesText}>
                  {targets.calories.toLocaleString('tr-TR')}{' '}
                  <Text style={{ fontSize: 16, fontWeight: '500', color: colors.textLow }}>kcal</Text>
                </Text>

                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${calProgress * 100}%` }]} />
                </View>

                <Text style={{ color: colors.textLow, fontSize: 11, marginTop: 6 }}>
                  {Math.round(totals.calories)} / {targets.calories.toLocaleString('tr-TR')} kcal planlandı
                </Text>

                <View style={{ flexDirection: 'row', marginTop: 14, gap: 10 }}>
                  <MacroPill label="Protein" value={`${Math.round(totals.protein)} / ${targets.protein}g`} />
                  <MacroPill label="Karb" value={`${Math.round(totals.carbs)} / ${targets.carbs}g`} />
                  <MacroPill label="Yağ" value={`${Math.round(totals.fats)} / ${targets.fats}g`} />
                </View>
              </Card>
            </View>

            {/* ⚡ Anlık Ne Yedin? (Hızlı Öğün Girişi) */}
            <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
              <View style={styles.instantMealCard}>
                <View style={styles.instantMealHeader}>
                  <Ionicons name="flash" size={17} color="#059669" />
                  <Text style={styles.instantMealTitle}>ANLIK NE YEDİN?</Text>
                </View>
                <Text style={styles.instantMealSub}>
                  Plandan farklı bir şey mi yedin? Buraya yaz, AI makrolarını hesaplayıp günlüğüne ve gelişimine eklesin.
                </Text>

                <View style={styles.instantMealInputRow}>
                  <TextInput
                    style={styles.instantMealInput}
                    placeholder="Örn: 1 tabak makarna, 1 kase yoğurt..."
                    placeholderTextColor="#9CA3AF"
                    value={instantMeal}
                    onChangeText={setInstantMeal}
                    editable={!instantLogging}
                    onSubmitEditing={handleInstantMealSubmit}
                  />
                  <TouchableOpacity
                    style={[
                      styles.instantMealBtn,
                      (!instantMeal.trim() || instantLogging) && styles.instantMealBtnDisabled,
                    ]}
                    onPress={handleInstantMealSubmit}
                    disabled={!instantMeal.trim() || instantLogging}
                  >
                    {instantLogging ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Öğün Kartları Listesi */}
            <View style={{ paddingHorizontal: 20, marginTop: 22, marginBottom: 8 }}>
              <Text style={{ color: colors.textHi, fontSize: 17, fontWeight: '800' }}>
                Bugünkü Öğün Planın
              </Text>
            </View>

            <View style={{ paddingHorizontal: 20, gap: 18 }}>
              {meals.map((m) => {
                const key = `${m.slot}-${m.id}`;
                const ingredients = Array.isArray(m.ingredients) ? m.ingredients : [];
                const isThisSlotUpdating = updatingSlot === m.slot;

                return (
                  <View key={key} style={styles.mealCard}>
                    {/* Üst Kısım: Slot Başlığı ve Saat */}
                    <View style={styles.mealCardTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 18 }}>{SLOT_ICONS[m.slot] || '🍽️'}</Text>
                        <Text style={styles.slotTitle}>
                          {(SLOT_LABEL[m.slot] ?? m.slot).toUpperCase()}
                        </Text>
                      </View>
                      {SLOT_TIME[m.slot] ? (
                        <View style={styles.timeBadge}>
                          <Text style={styles.timeBadgeText}>{SLOT_TIME[m.slot]}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Yemek Adı */}
                    <Text style={styles.mealName}>{m.name}</Text>

                    {/* Açıklama */}
                    {m.description ? (
                      <Text style={styles.mealDescription}>{m.description}</Text>
                    ) : null}

                    {/* Makrolar ve Porsiyon Rozetleri */}
                    <View style={styles.macroPillsRow}>
                      <View style={[styles.badge, styles.badgeCal]}>
                        <Text style={styles.badgeCalText}>{m.calories} kcal</Text>
                      </View>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{Math.round(Number(m.protein_g))}g Protein</Text>
                      </View>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{Math.round(Number(m.carbs_g || 0))}g Karb</Text>
                      </View>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{Math.round(Number(m.fats_g || 0))}g Yağ</Text>
                      </View>
                      {m.serving_size_g ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>~{Math.round(Number(m.serving_size_g))}g</Text>
                        </View>
                      ) : null}
                      {m.prep_time_min ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>⏱ {m.prep_time_min} dk</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* İçindekiler / Malzemeler */}
                    {ingredients.length > 0 && (
                      <View style={styles.ingredientsContainer}>
                        <Text style={styles.ingredientsHeader}>İÇİNDEKİLER / MALZEMELER</Text>
                        <View style={styles.ingredientsRow}>
                          {ingredients.map((ing, idx) => (
                            <View key={idx} style={styles.ingredientChip}>
                              <Text style={styles.ingredientChipText}>{ing}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* AI Koç Gerekçesi (Rationale) */}
                    {m.rationale ? (
                      <View style={styles.rationaleBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <Ionicons name="sparkles" size={13} color="#059669" />
                          <Text style={styles.rationaleTitle}>FitIntel Koç Notu</Text>
                        </View>
                        <Text style={styles.rationaleText}>{m.rationale}</Text>
                      </View>
                    ) : null}

                    {/* 🔄 Dolapta Bunlar Yok mu? (AI ile Elindekilere Göre Yeniden Tasarla) */}
                    <View style={styles.customizeContainer}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Ionicons name="sparkles-outline" size={15} color="#059669" />
                        <Text style={styles.customizeTitle}>Dolabında bunlar yok mu?</Text>
                      </View>
                      <Text style={styles.customizeSub}>
                        Hiç sorun değil! Elinde ne varsa virgülle yaz, koçun hedefine uygun olarak bu öğünü hemen yeniden tasarlasın.
                      </Text>

                      <View style={styles.customizeInputRow}>
                        <TextInput
                          style={styles.customizeInput}
                          placeholder="Örn: 2 yumurta, lor peyniri, domates, zeytin..."
                          placeholderTextColor="#9CA3AF"
                          value={customInputs[m.slot] || ''}
                          onChangeText={(text) =>
                            setCustomInputs((prev) => ({ ...prev, [m.slot]: text }))
                          }
                          editable={!isThisSlotUpdating}
                        />
                        <Pressable
                          onPress={() => handleCustomizeMeal(m.slot)}
                          disabled={isThisSlotUpdating || !customInputs[m.slot]?.trim()}
                          style={[
                            styles.customizeBtn,
                            (!customInputs[m.slot]?.trim() || isThisSlotUpdating) &&
                              styles.customizeBtnDisabled,
                          ]}
                        >
                          {isThisSlotUpdating ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="sync" size={13} color="#FFFFFF" />
                              <Text style={styles.customizeBtnText}>Uyarla</Text>
                            </View>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Tüm Planı Sıfırdan Yenile Butonu */}
            <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
              <PrimaryButton
                label="Bütün Planı Baştan Üret"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  regenerate.mutate();
                }}
                loading={regenerate.isPending}
              />
            </View>
          </>
        )}

        {tab === 'shopping' && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Card>
              <Text style={{ color: colors.textHi, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
                Alışveriş Listesi
              </Text>
              <Text style={{ color: colors.textMid, fontSize: 13, lineHeight: 20 }}>
                Haftalık planına dayalı otomatik akıllı alışveriş listesi çok yakında burada olacak.
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* 💎 FitIntel PRO Paywall Modalı */}
      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onSuccess={handleUpgradeSuccess}
      />
    </SafeAreaView>
  );
}

function MacroPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.macroPill}>
      <Text style={styles.macroPillLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.macroPillValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorTitle: { color: colors.textHi, fontSize: 18, fontWeight: '700' },
  errorSub: { color: colors.textMid, fontSize: 13, marginTop: 6, textAlign: 'center' },
  sectionCaption: { color: colors.textLow, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  targetCaloriesText: { color: colors.textHi, fontSize: 32, fontWeight: '900', marginTop: 4 },
  progressBg: { height: 8, marginTop: 12, borderRadius: 8, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 8 },
  macroPill: { flex: 1, backgroundColor: colors.surface2, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center' },
  macroPillLabel: { color: colors.textLow, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  macroPillValue: { color: colors.textHi, fontSize: 12, fontWeight: '700', marginTop: 2 },

  // ⚡ Anlık Ne Yedin Kartı
  instantMealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  instantMealHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  instantMealTitle: { fontSize: 11, fontWeight: '800', color: '#059669', letterSpacing: 0.8 },
  instantMealSub: { fontSize: 12, color: '#6B7280', marginBottom: 12, lineHeight: 17 },
  instantMealInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  instantMealInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 13,
    color: '#111827',
  },
  instantMealBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instantMealBtnDisabled: { backgroundColor: '#9CA3AF' },

  // Öğün Kartı
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  mealCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  slotTitle: { fontSize: 12, fontWeight: '800', color: colors.textLow, letterSpacing: 0.8 },
  timeBadge: { backgroundColor: colors.surface2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  timeBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textMid },
  mealName: { fontSize: 17, fontWeight: '800', color: colors.textHi, lineHeight: 23 },
  mealDescription: { fontSize: 13, color: colors.textMid, lineHeight: 18, marginTop: 5 },

  // Makro Rozetleri
  macroPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  badge: { backgroundColor: colors.surface2, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.textMid },
  badgeCal: { backgroundColor: '#ECFDF5' },
  badgeCalText: { fontSize: 11, fontWeight: '800', color: '#059669' },

  // Malzemeler
  ingredientsContainer: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.surface2 },
  ingredientsHeader: { fontSize: 10, fontWeight: '700', color: colors.textLow, letterSpacing: 0.8, marginBottom: 6 },
  ingredientsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ingredientChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ingredientChipText: { fontSize: 11, color: '#374151', fontWeight: '500' },

  // Koç Gerekçesi
  rationaleBox: {
    marginTop: 12,
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
    borderRadius: 10,
    padding: 10,
  },
  rationaleTitle: { fontSize: 11, fontWeight: '800', color: '#059669' },
  rationaleText: { fontSize: 12, color: '#166534', lineHeight: 17 },

  // 🔄 Elindekilere Göre Yeniden Tasarla Alanı
  customizeContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    marginHorizontal: -18,
    marginBottom: -18,
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  customizeTitle: { fontSize: 12, fontWeight: '800', color: '#059669' },
  customizeSub: { fontSize: 11, color: '#6B7280', lineHeight: 16, marginBottom: 10 },
  customizeInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customizeInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 9 : 7,
    fontSize: 12,
    color: '#111827',
  },
  customizeBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customizeBtnDisabled: { backgroundColor: '#9CA3AF' },
  customizeBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});

export default PlanScreen;
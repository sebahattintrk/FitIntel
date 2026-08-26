import React, { useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Image, Pressable, Modal, ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { SegmentedControl } from '@/components/SegmentedControl';

import {
  useMealPlan, useRegeneratePlan, useToggleMealDone,
  useSwapMeal, useApplyMealSwap,
  type Meal, type MealAlternative, type MealSlot,
} from '@/api/queries';
import { useUserStore } from '@/store/userStore';
import { colors } from '@/theme/colors';
import { SLOT_LABEL, SLOT_TIME } from '@/utils/turkish';

// "Öğün Değiştir" eski bir tab'dı ama artık inline DEĞİŞTİR butonu her öğün kartında.
// İkinci tab kaldırıldı; bottom-sheet-only flow daha temiz.
type Tab = 'plan' | 'shopping';

export function PlanScreen() {
  const userId = useUserStore((s) => s.userId);
  const q = useMealPlan(userId);
  const regenerate = useRegeneratePlan(userId);
  const toggleMeal = useToggleMealDone(userId);
  const swap = useSwapMeal(userId);
  const apply = useApplyMealSwap(userId);
  const [tab, setTab] = useState<Tab>('plan');
  const [swapTarget, setSwapTarget] = useState<Meal | null>(null);
  const [alternatives, setAlternatives] = useState<MealAlternative[] | null>(null);

  const openSwap = async (m: Meal) => {
    Haptics.selectionAsync();
    setSwapTarget(m);
    setAlternatives(null);
    try {
      const res = await swap.mutateAsync({ slot: m.slot });
      if (res.status) {
        Alert.alert('Alternatif yok', res.message ?? 'Şu an alternatif üretilemedi.');
        setSwapTarget(null);
        return;
      }
      setAlternatives(res.alternatives);
    } catch (err: any) {
      Alert.alert('Hata', err?.message ?? 'Alternatif alınamadı.');
      setSwapTarget(null);
    }
  };

  const closeSwap = () => { setSwapTarget(null); setAlternatives(null); };

  const applyAlt = async (alt: MealAlternative) => {
    if (!swapTarget) return;
    try {
      await apply.mutateAsync({ slot: swapTarget.slot, meal: alt });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeSwap();
    } catch (err: any) {
      Alert.alert('Uygulanamadı', err?.message ?? 'Tekrar dene.');
    }
  };

  if (q.isLoading) return <Loader label="Planın hazırlanıyor…" />;
  if (q.isError || !q.data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-textHi text-lg font-semibold">Plan alınamadı</Text>
          <Text className="text-textMid text-sm mt-2 text-center">
            API'ye ulaşılamıyor — yenilemek için aşağıya çek.
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
        contentContainerStyle={{ paddingBottom: 220 }}
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

        <View className="px-5">
          <SegmentedControl<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'plan',     label: 'Planım' },
              { value: 'shopping', label: 'Alışveriş' },
            ]}
          />
        </View>

        {tab === 'plan' && (
          <>
            {/* Big calorie card */}
            <View className="px-5 mt-4">
              <Card>
                <View className="flex-row items-baseline justify-between">
                  <Text className="text-textLow text-xs uppercase tracking-widest">Kalori Hedefin</Text>
                  <Text className="text-textLow text-[11px]">%{Math.round(calProgress * 100)}</Text>
                </View>
                <Text className="text-textHi text-3xl font-extrabold mt-1">
                  {targets.calories.toLocaleString('tr-TR')}{' '}
                  <Text className="text-textLow text-base font-normal">kcal</Text>
                </Text>

                <View
                  style={{
                    height: 8, marginTop: 12, borderRadius: 8,
                    backgroundColor: colors.border, overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${calProgress * 100}%`,
                      height: '100%',
                      backgroundColor: colors.primary,
                      borderRadius: 8,
                    }}
                  />
                </View>

                <Text className="text-textLow text-[11px] mt-2">
                  {Math.round(totals.calories)} / {targets.calories.toLocaleString('tr-TR')} kcal
                </Text>

                <View className="flex-row mt-4" style={{ gap: 10 }}>
                  <MacroPill label="Protein"      value={`${Math.round(totals.protein)} / ${targets.protein}g`} />
                  <MacroPill label="Karbonhidrat" value={`${Math.round(totals.carbs)} / ${targets.carbs}g`} />
                  <MacroPill label="Yağ"          value={`${Math.round(totals.fats)} / ${targets.fats}g`} />
                </View>
              </Card>
            </View>

            {/* Meal list */}
            <View className="px-5 mt-5 mb-2">
              <Text className="text-textHi text-base font-semibold">Bugünkü Öğün Planın</Text>
            </View>
            <View className="px-5" style={{ gap: 10 }}>
              {meals.map((m) => {
                const key = `${m.slot}-${m.id}`;
                const isDone = !!m.done;
                return (
                  <Card key={key} padded={false} className="overflow-hidden">
                    <View className="flex-row items-center" style={{ opacity: isDone ? 0.6 : 1 }}>
                      {m.image_url ? (
                        <Image source={{ uri: m.image_url }} style={{ width: 80, height: 90 }} resizeMode="cover" />
                      ) : (
                        <View style={{ width: 80, height: 90, backgroundColor: colors.surface2 }} />
                      )}
                      <Pressable
                        style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 8 }}
                        onPress={() => {
                          Haptics.selectionAsync();
                          toggleMeal.mutate({ slot: m.slot, done: !isDone });
                        }}
                      >
                        <View className="flex-row items-center justify-between">
                          <Text className="text-textHi text-sm font-semibold">
                            {SLOT_LABEL[m.slot] ?? m.slot}
                          </Text>
                          <Text className="text-textLow text-xs">{SLOT_TIME[m.slot] ?? ''}</Text>
                        </View>
                        <Text
                          className="text-textMid text-xs mt-0.5"
                          numberOfLines={1}
                          style={isDone ? { textDecorationLine: 'line-through' } : undefined}
                        >
                          {m.name}
                        </Text>
                        <Text className="text-textLow text-[11px] mt-1">
                          {m.calories} kcal · {Math.round(Number(m.protein_g))}g protein
                          {m.serving_size_g ? ` · ~${Math.round(Number(m.serving_size_g))}g` : ''}
                          {m.prep_time_min ? ` · ${m.prep_time_min} dk` : ''}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => openSwap(m)}
                        hitSlop={8}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 6,
                          marginRight: 8,
                          borderRadius: 10,
                          backgroundColor: 'rgba(124,77,255,0.15)',
                          borderWidth: 1, borderColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
                          DEĞİŞTİR
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          toggleMeal.mutate({ slot: m.slot, done: !isDone });
                        }}
                        hitSlop={8}
                        style={{ paddingHorizontal: 14 }}
                      >
                        <CheckCircle done={isDone} />
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </View>

            <View className="px-5 mt-5">
              <PrimaryButton
                label="Yeni Plan Üret"
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
          <View className="px-5 mt-6">
            <Card>
              <Text className="text-textHi text-base font-semibold mb-2">Alışveriş Listesi</Text>
              <Text className="text-textMid text-sm">
                Haftalık plana dayalı otomatik alışveriş listesi. Yakında.
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Meal swap modal — premium */}
      <Modal
        visible={!!swapTarget}
        animationType="slide"
        transparent
        onRequestClose={closeSwap}
      >
        <Pressable
          onPress={closeSwap}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 18, paddingBottom: 30,
              borderWidth: 1, borderColor: colors.border, borderBottomWidth: 0,
              maxHeight: '85%',
            }}
          >
            <View
              style={{
                width: 36, height: 4, borderRadius: 2,
                backgroundColor: colors.border,
                alignSelf: 'center', marginBottom: 14,
              }}
            />
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-textHi text-base font-semibold">Öğün Değiştir</Text>
              <Pressable onPress={closeSwap} hitSlop={10}>
                <Text style={{ color: colors.textLow, fontSize: 22 }}>×</Text>
              </Pressable>
            </View>
            {swapTarget ? (
              <Text className="text-textLow text-xs mb-3">
                {SLOT_LABEL[swapTarget.slot]} · {swapTarget.name} ({swapTarget.calories} kcal)
              </Text>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false}>
              {swap.isPending || !alternatives ? (
                <View className="items-center justify-center" style={{ paddingVertical: 32 }}>
                  <ActivityIndicator color={colors.primary} />
                  <Text className="text-textMid text-sm mt-3">Alternatifler hazırlanıyor…</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {alternatives.map((a, i) => (
                    <Pressable
                      key={i}
                      onPress={() => applyAlt(a)}
                      disabled={apply.isPending}
                      style={{
                        backgroundColor: colors.surface2,
                        borderColor: colors.border, borderWidth: 1,
                        borderRadius: 16, padding: 14,
                      }}
                    >
                      <View className="flex-row items-center justify-between mb-1">
                        <Text style={{ color: colors.textHi, fontSize: 14, fontWeight: '700', flex: 1 }}>
                          {a.name}
                        </Text>
                        <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>
                          SEÇ
                        </Text>
                      </View>
                      <Text style={{ color: colors.textLow, fontSize: 11, marginBottom: 6 }}>
                        {a.calories} kcal · {Math.round(a.protein_g)}g pro · {Math.round(a.carbs_g)}g karb · {Math.round(a.fats_g)}g yağ
                      </Text>
                      <Text style={{ color: colors.textMid, fontSize: 12, lineHeight: 17 }} numberOfLines={3}>
                        {a.description}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function MacroPill({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface2,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
      }}
    >
      <Text style={{ color: colors.textLow, fontSize: 10, letterSpacing: 1 }}>{label.toUpperCase()}</Text>
      <Text style={{ color: colors.textHi, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function CheckCircle({ done }: { done: boolean }) {
  return (
    <View
      style={{
        width: 28, height: 28, borderRadius: 28,
        borderWidth: 2,
        borderColor: done ? colors.success : colors.border,
        backgroundColor: done ? colors.success : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {done ? (
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, marginTop: -1 }}>✓</Text>
      ) : null}
    </View>
  );
}

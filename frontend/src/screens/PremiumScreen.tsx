import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert, RefreshControl, ActivityIndicator,
  TextInput, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/colors';
import { useUserStore } from '@/store/userStore';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import {
  usePlanAdjustment, useApplyPlanAdjustment, useWeeklyReport,
  useEatingOut, usePlanRationale, useGoalSimulation, useSetTargetWeight, useCrisisMode,
  type PlanAdjustment, type WeeklyReport, type EatingOutVenue, type EatingOutResponse,
  type PlanRationale, type GoalSimulation, type CrisisKind, type CrisisResponse,
} from '@/api/queries';

const VENUES: { value: EatingOutVenue; label: string; icon: string }[] = [
  { value: 'doner',     label: 'Dönerci',     icon: '🥙' },
  { value: 'kebap',     label: 'Kebapçı',     icon: '🍢' },
  { value: 'ev_yemegi', label: 'Ev yemeği',   icon: '🍲' },
  { value: 'kahvalti',  label: 'Kahvaltıcı',  icon: '🍳' },
  { value: 'market',    label: 'Market',      icon: '🛒' },
  { value: 'fast_food', label: 'Fast food',   icon: '🍔' },
];

export function PremiumScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userId = useUserStore((s) => s.userId);

  const planAdj  = usePlanAdjustment(userId);
  const apply    = useApplyPlanAdjustment(userId);
  const report   = useWeeklyReport(userId);
  const eatOut   = useEatingOut(userId);
  const rationale = usePlanRationale(userId);
  const goalSim  = useGoalSimulation(userId);
  const setTarget = useSetTargetWeight(userId);
  const crisis   = useCrisisMode(userId);
  const [selectedVenue, setSelectedVenue] = useState<EatingOutVenue | null>(null);
  const [rationaleOpen, setRationaleOpen] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [selectedCrisis, setSelectedCrisis] = useState<CrisisKind | null>(null);

  const submitTarget = async () => {
    Keyboard.dismiss();
    const n = Number(targetInput);
    if (!Number.isFinite(n) || n < 30 || n > 250) {
      Alert.alert('Geçersiz kilo', 'Hedef kilo 30 – 250 kg arasında olmalı.');
      return;
    }
    try {
      await setTarget.mutateAsync({ target_weight_kg: n });
      setTargetInput('');
    } catch (err: any) {
      Alert.alert('Kaydedilemedi', err?.message ?? 'Tekrar dene.');
    }
  };

  const refresh = () => {
    planAdj.refetch();
    report.refetch();
  };

  const onApply = (adj: PlanAdjustment) => {
    Alert.alert(
      'Plan ayarını uygula',
      `${adj.current.calorie_target} → ${adj.suggested.calorie_target} kcal\n${adj.current.protein_target} → ${adj.suggested.protein_target} g protein`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Uygula',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            try {
              await apply.mutateAsync({
                calorie_target: adj.suggested.calorie_target,
                protein_target: adj.suggested.protein_target,
              });
            } catch (err: any) {
              Alert.alert('Uygulanamadı', err?.message ?? 'Tekrar dene.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={{ color: colors.textHi, fontSize: 22 }}>‹</Text>
        </Pressable>
        <View className="flex-row items-center" style={{ marginLeft: 8 }}>
          <Text style={{ color: colors.textHi, fontSize: 16, fontWeight: '700' }}>
            Premium Otomasyonlar
          </Text>
          <View
            style={{
              marginLeft: 8,
              paddingHorizontal: 8, paddingVertical: 2,
              borderRadius: 999, backgroundColor: 'rgba(245,158,11,0.15)',
              borderWidth: 1, borderColor: colors.warning,
            }}
          >
            <Text style={{ color: colors.warning, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 }}>
              PREMIUM
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={(planAdj.isFetching && !planAdj.isLoading) || (report.isFetching && !report.isLoading)}
            onRefresh={refresh}
            tintColor={colors.textLow}
          />
        }
      >
        <Text style={{ color: colors.textLow, fontSize: 13, lineHeight: 18, marginTop: 4, marginBottom: 18 }}>
          Sistem verilerine bakıp planını otomatik ayarlar. Sen sormadan, koç gibi.
        </Text>

        {/* 1) Plan adjustment */}
        <Text className="text-textHi text-base font-semibold mb-3">⚙️ Plan Ayarı Önerisi</Text>
        {planAdj.isLoading ? (
          <Loader />
        ) : planAdj.isError ? (
          <Card>
            <Text className="text-textMid text-sm">Şu an öneri alınamadı. Yenilemek için aşağıya çek.</Text>
          </Card>
        ) : planAdj.data ? (
          <PlanAdjustmentCard adj={planAdj.data} onApply={onApply} applying={apply.isPending} />
        ) : null}

        {/* 2) Weekly report */}
        <Text className="text-textHi text-base font-semibold mt-7 mb-3">📊 Haftalık Rapor</Text>
        {report.isLoading ? (
          <Loader />
        ) : report.isError ? (
          <Card>
            <Text className="text-textMid text-sm">Rapor şu an üretilemedi.</Text>
          </Card>
        ) : report.data ? (
          <WeeklyReportCard report={report.data} />
        ) : null}

        {/* 3) Eating out — premium */}
        <Text className="text-textHi text-base font-semibold mt-7 mb-1">🍽️ Dışarıda Ne Yiyeyim?</Text>
        <Text style={{ color: colors.textLow, fontSize: 12, marginBottom: 12 }}>
          Mekan tipini seç, kalan kalorine göre sipariş öner.
        </Text>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {VENUES.map((v) => {
            const active = selectedVenue === v.value;
            return (
              <Pressable
                key={v.value}
                onPress={async () => {
                  Haptics.selectionAsync();
                  setSelectedVenue(v.value);
                  try {
                    await eatOut.mutateAsync({ venue: v.value });
                  } catch {
                    /* error rendered below from mutation state */
                  }
                }}
                disabled={eatOut.isPending}
                style={{
                  flexBasis: '31%',
                  flexGrow: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 14,
                  borderWidth: 1,
                  alignItems: 'center',
                  backgroundColor: active ? 'rgba(124,77,255,0.18)' : colors.surface2,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: eatOut.isPending && !active ? 0.4 : 1,
                }}
              >
                <Text style={{ fontSize: 22 }}>{v.icon}</Text>
                <Text style={{ color: colors.textHi, fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                  {v.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {eatOut.isPending ? (
          <View className="items-center mt-4">
            <ActivityIndicator color={colors.primary} />
            <Text className="text-textMid text-xs mt-2">Sipariş öneriliyor…</Text>
          </View>
        ) : eatOut.data ? (
          <View className="mt-4">
            <EatingOutResult data={eatOut.data} />
          </View>
        ) : null}

        {/* 4) Crisis Mode */}
        <Text className="text-textHi text-base font-semibold mt-7 mb-1">🆘 Kriz Modu</Text>
        <Text style={{ color: colors.textLow, fontSize: 12, marginBottom: 12 }}>
          Plana uyamadın? Tek tap ile ne yapacağını söyleyelim.
        </Text>
        <CrisisChips
          mutation={crisis}
          selected={selectedCrisis}
          onSelect={async (k) => {
            setSelectedCrisis(k);
            try { await crisis.mutateAsync({ kind: k }); } catch {}
          }}
        />
        {crisis.isPending ? (
          <View className="items-center mt-4">
            <ActivityIndicator color={colors.primary} />
            <Text className="text-textMid text-xs mt-2">Çözüm üretiliyor…</Text>
          </View>
        ) : crisis.data ? (
          <View className="mt-4">
            <CrisisResultCard data={crisis.data} />
          </View>
        ) : null}

        {/* 5) Goal Simulation */}
        <Text className="text-textHi text-base font-semibold mt-7 mb-1">🎯 Hedef Simülasyonu</Text>
        <Text style={{ color: colors.textLow, fontSize: 12, marginBottom: 12 }}>
          Mevcut hızınla hedefe ne zaman ulaşırsın?
        </Text>
        {goalSim.isLoading ? <Loader /> : goalSim.data ? (
          <GoalSimulationCard
            sim={goalSim.data}
            targetInput={targetInput}
            setTargetInput={setTargetInput}
            onSubmit={submitTarget}
            submitting={setTarget.isPending}
          />
        ) : null}

        {/* 6) Plan Rationale */}
        <Text className="text-textHi text-base font-semibold mt-7 mb-3">📖 Plan Neden Böyle?</Text>
        <Pressable
          onPress={() => setRationaleOpen((v) => !v)}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16, borderWidth: 1, borderColor: colors.border,
            padding: 14,
          }}
        >
          <View className="flex-row items-center justify-between">
            <Text style={{ color: colors.textHi, fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 19 }}>
              {rationale.data?.summary ?? 'Kalori ve makro hedeflerinin neden öyle olduğunu adım adım gör.'}
            </Text>
            <Text style={{ color: colors.textLow, fontSize: 18, marginLeft: 8 }}>
              {rationaleOpen ? '▴' : '▾'}
            </Text>
          </View>
          {rationaleOpen && rationale.data ? (
            <View style={{ marginTop: 14, gap: 10 }}>
              {rationale.data.steps.map((s, i) => (
                <View key={i} style={{
                  borderLeftWidth: 2, borderLeftColor: colors.primary,
                  paddingLeft: 10, paddingVertical: 2,
                }}>
                  <Text style={{ color: colors.textLow, fontSize: 10, letterSpacing: 1.2, fontWeight: '700' }}>
                    {s.title.toUpperCase()}
                  </Text>
                  <Text style={{ color: colors.textHi, fontSize: 14, fontWeight: '800', marginTop: 2 }}>
                    {s.value}
                  </Text>
                  <Text style={{ color: colors.textLow, fontSize: 10.5, marginTop: 1, fontStyle: 'italic' }}>
                    {s.formula}
                  </Text>
                  <Text style={{ color: colors.textMid, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                    {s.explanation}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Pressable>

        {/* 7) Meal Photo Estimation */}
        <Text className="text-textHi text-base font-semibold mt-7 mb-3">📸 Fotoğraflı Öğün Tahmini</Text>
        <Pressable onPress={() => navigation.navigate('MealPhoto')}>
          <LinearGradient
            colors={['rgba(34,197,94,0.18)', 'rgba(124,77,255,0.10)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border }}
          >
            <View className="flex-row items-center">
              <Text style={{ fontSize: 26, marginRight: 12 }}>🍽️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textHi, fontSize: 14, fontWeight: '700' }}>
                  Yemeği çek, makroları gör
                </Text>
                <Text style={{ color: colors.textMid, fontSize: 12, lineHeight: 16, marginTop: 3 }}>
                  AI yemeği tanır, ~kalori/protein/karb/yağ tahmin eder. Sen düzeltirsen
                  sistem öğrenir.
                </Text>
              </View>
              <Text style={{ color: colors.textLow, fontSize: 22, marginLeft: 4 }}>›</Text>
            </View>
          </LinearGradient>
        </Pressable>

        <View className="mt-7">
          <Card>
            <Text className="text-textLow text-[10px] uppercase tracking-widest mb-2">YAKINDA</Text>
            <Text className="text-textMid text-sm" style={{ lineHeight: 19 }}>
              Supplement gelişmiş analiz (canlı fiyat takibi, gerçek yorum sentiment)
              ve egzersiz hareket alternatifi sıradaki sürümlerde.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanAdjustmentCard({
  adj, onApply, applying,
}: { adj: PlanAdjustment; onApply: (a: PlanAdjustment) => void; applying: boolean }) {
  const confidenceColor =
    adj.confidence === 'high'   ? colors.success :
    adj.confidence === 'medium' ? colors.warning :
                                  colors.textLow;

  return (
    <LinearGradient
      colors={['rgba(124,77,255,0.18)', 'rgba(18,24,38,0.5)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border }}
    >
      <View className="flex-row items-center mb-2">
        <Text style={{
          color: confidenceColor, fontSize: 10, letterSpacing: 1.4, fontWeight: '800',
        }}>
          {adj.confidence === 'high' ? 'GÜVENİLİR' : adj.confidence === 'medium' ? 'OLASI' : 'KESİN DEĞİL'}
        </Text>
        {adj.has_change ? (
          <View
            style={{
              marginLeft: 8,
              paddingHorizontal: 7, paddingVertical: 2,
              borderRadius: 999, backgroundColor: 'rgba(124,77,255,0.15)',
              borderWidth: 1, borderColor: colors.primary,
            }}
          >
            <Text style={{ color: colors.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 }}>
              DEĞİŞİKLİK ÖNERİSİ
            </Text>
          </View>
        ) : null}
      </View>

      <Text className="text-textHi text-sm font-semibold mb-3" style={{ lineHeight: 20 }}>
        {adj.reason_tr}
      </Text>

      {adj.has_change ? (
        <View
          style={{
            backgroundColor: colors.surface2,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            flexDirection: 'row',
            gap: 12,
          }}
        >
          <DeltaCol
            label="KALORİ"
            from={adj.current.calorie_target}
            to={adj.suggested.calorie_target}
            unit="kcal"
            delta={adj.calorie_delta}
          />
          <DeltaCol
            label="PROTEİN"
            from={adj.current.protein_target}
            to={adj.suggested.protein_target}
            unit="g"
            delta={adj.protein_delta}
          />
        </View>
      ) : null}

      <View
        style={{
          borderLeftWidth: 2,
          borderLeftColor: colors.primary,
          paddingLeft: 10,
          marginBottom: adj.has_change ? 14 : 0,
        }}
      >
        <Text style={{ color: colors.textLow, fontSize: 10, letterSpacing: 1.4, fontWeight: '700' }}>
          NE YAPACAĞIZ
        </Text>
        <Text style={{ color: colors.textHi, fontSize: 13.5, lineHeight: 19, marginTop: 3 }}>
          {adj.action_tr}
        </Text>
      </View>

      {adj.has_change ? (
        <PrimaryButton
          label={applying ? 'Uygulanıyor…' : 'Bu Ayarı Uygula'}
          onPress={() => onApply(adj)}
          loading={applying}
        />
      ) : null}
    </LinearGradient>
  );
}

function DeltaCol({
  label, from, to, unit, delta,
}: { label: string; from: number; to: number; unit: string; delta: number }) {
  const direction = delta === 0 ? null : delta > 0 ? 'up' : 'down';
  const deltaColor = direction === 'up' ? colors.success : direction === 'down' ? colors.warning : colors.textLow;
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.textLow, fontSize: 9, letterSpacing: 1.4, fontWeight: '700' }}>
        {label}
      </Text>
      <View className="flex-row items-baseline" style={{ marginTop: 4, gap: 6 }}>
        <Text style={{ color: colors.textLow, fontSize: 11 }}>{from}</Text>
        <Text style={{ color: colors.textLow, fontSize: 12 }}>→</Text>
        <Text style={{ color: colors.textHi, fontSize: 16, fontWeight: '800' }}>{to}</Text>
        <Text style={{ color: colors.textLow, fontSize: 11 }}>{unit}</Text>
      </View>
      {direction ? (
        <Text style={{ color: deltaColor, fontSize: 10, marginTop: 2, fontWeight: '700' }}>
          {delta > 0 ? `+${delta}` : delta} {unit}
        </Text>
      ) : null}
    </View>
  );
}

function WeeklyReportCard({ report }: { report: WeeklyReport }) {
  const m = report.metrics;
  const s = report.summary;
  const toneColor =
    s.tone === 'positive' ? colors.success :
    s.tone === 'warning'  ? colors.warning :
                            colors.primary;

  return (
    <View style={{ gap: 10 }}>
      {/* Metrics row */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16, padding: 14,
          borderWidth: 1, borderColor: colors.border,
        }}
      >
        <Text style={{ color: colors.textLow, fontSize: 10, letterSpacing: 1.4, fontWeight: '700' }}>
          {`HAFTANIN ÖZETI · ${m.days_logged}/7 LOGLU GÜN`}
        </Text>
        <View className="flex-row flex-wrap mt-3" style={{ gap: 16 }}>
          <Metric label="Kilo Δ"  value={m.weight_delta_kg != null ? `${signed(m.weight_delta_kg)} kg` : '—'} />
          <Metric label="Bel Δ"   value={m.waist_delta_cm  != null ? `${signed(m.waist_delta_cm)} cm` : '—'} />
          <Metric label="Uyum"    value={m.compliance_avg  != null ? `%${m.compliance_avg}` : '—'} />
          <Metric label="Protein" value={m.protein_avg_g   != null ? `${m.protein_avg_g} / ${m.protein_target_g}g` : '—'} />
          <Metric label="Su"      value={m.water_avg_ml    != null ? `${(m.water_avg_ml / 1000).toFixed(1)} L` : '—'} />
        </View>
      </View>

      {/* Narrative */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16, padding: 14,
          borderWidth: 1, borderColor: colors.border,
          borderLeftWidth: 3, borderLeftColor: toneColor,
        }}
      >
        <Text style={{ color: colors.textHi, fontSize: 14, lineHeight: 20, fontWeight: '600' }}>
          {s.body}
        </Text>
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ color: colors.textLow, fontSize: 10, letterSpacing: 1.4, fontWeight: '700' }}>
            BUNU YAP
          </Text>
          <Text style={{ color: colors.textHi, fontSize: 13.5, lineHeight: 19, marginTop: 4 }}>
            {s.action}
          </Text>
        </View>
      </View>
    </View>
  );
}

function EatingOutResult({ data }: { data: EatingOutResponse }) {
  if (data.status === 'rate_limited' || data.error) {
    return (
      <View
        style={{
          borderRadius: 16, padding: 14,
          backgroundColor: 'rgba(245,158,11,0.10)',
          borderWidth: 1, borderColor: colors.border,
        }}
      >
        <Text style={{ color: colors.textMid, fontSize: 13, lineHeight: 18 }}>
          {data.message ?? 'AI önerisi şu an üretilemedi.'}
        </Text>
      </View>
    );
  }
  return (
    <LinearGradient
      colors={['rgba(124,77,255,0.18)', 'rgba(18,24,38,0.5)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border }}
    >
      <Text style={{ color: colors.textHi, fontSize: 14, fontWeight: '700', lineHeight: 20 }}>
        {data.headline}
      </Text>
      {data.order_items && data.order_items.length > 0 ? (
        <View style={{ marginTop: 10 }}>
          {data.order_items.map((it, i) => (
            <View key={i} className="flex-row" style={{ marginBottom: 3 }}>
              <Text style={{ color: colors.primary, fontSize: 13, marginRight: 6 }}>•</Text>
              <Text style={{ color: colors.textMid, fontSize: 13, lineHeight: 18, flex: 1 }}>{it}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={{ color: colors.textLow, fontSize: 11, marginTop: 10 }}>
        ~{data.estimated_kcal} kcal · ~{data.estimated_protein_g}g protein (tahmini)
      </Text>
      {data.advice ? (
        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ color: colors.textLow, fontSize: 10, letterSpacing: 1.4, fontWeight: '700' }}>
            NEDEN BU
          </Text>
          <Text style={{ color: colors.textHi, fontSize: 13, lineHeight: 19, marginTop: 4 }}>
            {data.advice}
          </Text>
        </View>
      ) : null}
      {data.avoid ? (
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: colors.warning, fontSize: 10, letterSpacing: 1.4, fontWeight: '700' }}>
            KAÇIN
          </Text>
          <Text style={{ color: colors.textMid, fontSize: 12.5, lineHeight: 17, marginTop: 3 }}>
            {data.avoid}
          </Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const CRISIS_LIST: { kind: CrisisKind; icon: string; label: string }[] = [
  { kind: 'ate_out',      icon: '🍽️', label: 'Dışarıda yedim' },
  { kind: 'cheat_meal',   icon: '🍰', label: 'Tatlı kaçtı' },
  { kind: 'late_hungry',  icon: '🌙', label: 'Geç saatte aç' },
  { kind: 'protein_low',  icon: '💪', label: 'Protein eksik' },
  { kind: 'skipped_meal', icon: '⏭️', label: 'Öğün atladım' },
  { kind: 'post_workout', icon: '🏋️', label: 'Antrenman sonrası' },
];

function CrisisChips({
  mutation, selected, onSelect,
}: {
  mutation: ReturnType<typeof useCrisisMode>;
  selected: CrisisKind | null;
  onSelect: (k: CrisisKind) => void;
}) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {CRISIS_LIST.map((c) => {
        const active = selected === c.kind;
        return (
          <Pressable
            key={c.kind}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(c.kind);
            }}
            disabled={mutation.isPending}
            style={{
              flexBasis: '31%', flexGrow: 1,
              paddingVertical: 10, paddingHorizontal: 6,
              borderRadius: 14, borderWidth: 1,
              alignItems: 'center',
              backgroundColor: active ? 'rgba(239,68,68,0.15)' : colors.surface2,
              borderColor: active ? colors.danger : colors.border,
              opacity: mutation.isPending && !active ? 0.4 : 1,
            }}
          >
            <Text style={{ fontSize: 20 }}>{c.icon}</Text>
            <Text style={{ color: colors.textHi, fontSize: 10.5, fontWeight: '600', marginTop: 2, textAlign: 'center' }}>
              {c.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CrisisResultCard({ data }: { data: CrisisResponse }) {
  return (
    <LinearGradient
      colors={['rgba(239,68,68,0.15)', 'rgba(18,24,38,0.5)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border }}
    >
      <Text style={{ color: colors.danger, fontSize: 10, letterSpacing: 1.4, fontWeight: '800' }}>
        KRİZ MODU
      </Text>
      <Text style={{ color: colors.textHi, fontSize: 14, fontWeight: '700', marginTop: 4 }}>
        {data.title}
      </Text>
      <Text style={{ color: colors.textMid, fontSize: 13, marginTop: 8, lineHeight: 19 }}>
        {data.advice}
      </Text>
      <View style={{
        marginTop: 12, paddingTop: 10,
        borderTopWidth: 1, borderTopColor: colors.border,
        borderLeftWidth: 2, borderLeftColor: colors.danger,
        paddingLeft: 10,
      }}>
        <Text style={{ color: colors.danger, fontSize: 10, letterSpacing: 1.4, fontWeight: '700' }}>
          AKSİYON
        </Text>
        <Text style={{ color: colors.textHi, fontSize: 13.5, marginTop: 3, lineHeight: 19, fontWeight: '600' }}>
          {data.action}
        </Text>
      </View>
      {data.suggested_food ? (
        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ color: colors.textLow, fontSize: 10, letterSpacing: 1.4, fontWeight: '700' }}>
            SOMUT ÖNERİ
          </Text>
          <Text style={{ color: colors.textMid, fontSize: 13, marginTop: 3, lineHeight: 18 }}>
            {data.suggested_food}
          </Text>
        </View>
      ) : null}
      <Text style={{ color: colors.textLow, fontSize: 10, marginTop: 10 }}>
        Kalan: ~{data.context.remaining_kcal} kcal · {data.context.remaining_protein_g} g protein
      </Text>
    </LinearGradient>
  );
}

function GoalSimulationCard({
  sim, targetInput, setTargetInput, onSubmit, submitting,
}: {
  sim: GoalSimulation;
  targetInput: string;
  setTargetInput: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  if (sim.state === 'insufficient_data') {
    return (
      <View style={cardSoft}>
        <Text style={{ color: colors.textMid, fontSize: 13, lineHeight: 19 }}>
          {sim.message ?? 'Trend için yeterli veri yok.'}
        </Text>
      </View>
    );
  }

  if (sim.state === 'no_target') {
    return (
      <View style={cardSoft}>
        <Text style={{ color: colors.textHi, fontSize: 13.5, fontWeight: '600', marginBottom: 4 }}>
          Hedef kilonu gir
        </Text>
        {sim.velocity_per_week_kg != null ? (
          <Text style={{ color: colors.textLow, fontSize: 11, marginBottom: 12 }}>
            Mevcut hız: {sim.velocity_per_week_kg >= 0 ? '+' : ''}{sim.velocity_per_week_kg} kg/hafta
          </Text>
        ) : null}
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <TextInput
            value={targetInput}
            onChangeText={setTargetInput}
            placeholder="75"
            placeholderTextColor={colors.textLow}
            keyboardType="decimal-pad"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={onSubmit}
            style={{
              flex: 1,
              backgroundColor: colors.surface2,
              borderColor: colors.border, borderWidth: 1, borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 10,
              color: colors.textHi, fontSize: 15,
            }}
          />
          <Text style={{ color: colors.textLow, fontSize: 12 }}>kg</Text>
          <Pressable
            onPress={onSubmit}
            disabled={submitting}
            style={{
              paddingHorizontal: 16, paddingVertical: 10,
              backgroundColor: colors.primary, borderRadius: 12,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
              {submitting ? '…' : 'Kaydet'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (sim.state === 'reached') {
    return (
      <View style={[cardSoft, { borderLeftWidth: 3, borderLeftColor: colors.success }]}>
        <Text style={{ color: colors.success, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
          🎉 HEDEFE ULAŞILDI
        </Text>
        <Text style={{ color: colors.textHi, fontSize: 14, fontWeight: '600', marginTop: 6, lineHeight: 19 }}>
          {sim.message}
        </Text>
      </View>
    );
  }

  if (sim.state === 'wrong_direction') {
    return (
      <View style={[cardSoft, { borderLeftWidth: 3, borderLeftColor: colors.warning }]}>
        <Text style={{ color: colors.warning, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
          ⚠️ HEDEFE DOĞRU İLERLEME YOK
        </Text>
        <Text style={{ color: colors.textHi, fontSize: 13.5, marginTop: 6, lineHeight: 19 }}>
          {sim.message}
        </Text>
        <Text style={{ color: colors.textLow, fontSize: 11, marginTop: 10 }}>
          Plan Ayarı Önerisi sayfasında bu durumu hesaba katıyor — yukarıdaki öneriyi uygula.
        </Text>
      </View>
    );
  }

  // Only 'projecting' is left at this point — explicit narrowing for TS.
  if (sim.state !== 'projecting') return null;
  return (
    <LinearGradient
      colors={['rgba(124,77,255,0.18)', 'rgba(18,24,38,0.4)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border }}
    >
      <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
        <Text style={{ color: colors.textLow, fontSize: 10, letterSpacing: 1.4, fontWeight: '800' }}>
          PROJEKSİYON
        </Text>
        <View style={{
          paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
          backgroundColor: 'rgba(124,77,255,0.18)',
          borderWidth: 1, borderColor: colors.primary,
        }}>
          <Text style={{ color: colors.primary, fontSize: 9, fontWeight: '800' }}>
            {sim.confidence === 'high' ? 'YÜKSEK GÜVEN' : sim.confidence === 'medium' ? 'ORTA GÜVEN' : 'DÜŞÜK GÜVEN'}
          </Text>
        </View>
      </View>

      <View className="flex-row items-baseline" style={{ gap: 8 }}>
        <Text style={{ color: colors.textHi, fontSize: 22, fontWeight: '800' }}>
          {sim.current_weight_kg} kg
        </Text>
        <Text style={{ color: colors.textLow, fontSize: 14 }}>→</Text>
        <Text style={{ color: colors.success, fontSize: 18, fontWeight: '800' }}>
          {sim.target_weight_kg} kg
        </Text>
        <Text style={{ color: colors.textLow, fontSize: 11, marginLeft: 4 }}>
          (kalan {Math.abs(sim.remaining_kg)} kg)
        </Text>
      </View>

      <Text style={{ color: colors.textMid, fontSize: 12, marginTop: 8 }}>
        Mevcut hız: <Text style={{ color: colors.textHi, fontWeight: '700' }}>{sim.velocity_per_week_kg} kg/hafta</Text>
      </Text>

      <View
        style={{
          marginTop: 12, padding: 12,
          borderRadius: 12, backgroundColor: colors.surface2,
        }}
      >
        <ETARow label="Mevcut tempoda" weeks={sim.weeks_at_current_pace} date={sim.eta_date} primary />
        <ETARow label="Daha yüksek uyumla" weeks={sim.weeks_if_better} accent={colors.success} />
        <ETARow label="Tempo yavaşlarsa" weeks={sim.weeks_if_slower} accent={colors.warning} />
      </View>

      <Text style={{ color: colors.textLow, fontSize: 10, marginTop: 8 }}>
        Son {sim.days_window} günde {sim.samples_count} kilo logu kullanıldı.
      </Text>
    </LinearGradient>
  );
}

function ETARow({
  label, weeks, date, primary, accent,
}: {
  label: string; weeks: number | null;
  date?: string | null; primary?: boolean; accent?: string;
}) {
  if (weeks == null) return null;
  const color = primary ? colors.textHi : (accent ?? colors.textMid);
  return (
    <View className="flex-row items-baseline justify-between" style={{ paddingVertical: 4 }}>
      <Text style={{ color: colors.textMid, fontSize: 12 }}>{label}</Text>
      <View className="flex-row items-baseline" style={{ gap: 6 }}>
        <Text style={{
          color, fontSize: primary ? 16 : 13,
          fontWeight: primary ? '800' : '600',
        }}>
          {weeks} hafta
        </Text>
        {date ? <Text style={{ color: colors.textLow, fontSize: 10 }}>({date})</Text> : null}
      </View>
    </View>
  );
}

const cardSoft = {
  backgroundColor: colors.surface,
  borderRadius: 16, padding: 14,
  borderWidth: 1, borderColor: colors.border,
} as const;

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ minWidth: 80 }}>
      <Text style={{ color: colors.textLow, fontSize: 10, letterSpacing: 1 }}>{label}</Text>
      <Text style={{ color: colors.textHi, fontSize: 14, fontWeight: '700', marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function signed(n: number) {
  if (n > 0) return `+${n}`;
  return String(n);
}

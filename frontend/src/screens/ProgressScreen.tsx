import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Alert, Dimensions, RefreshControl, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import type { RootStackParamList } from '@/navigation/RootNavigator';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Sparkline } from '@/components/Sparkline';
import { ProgressRing } from '@/components/ProgressRing';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { InsightCard } from '@/components/InsightCard';
import { RangeTabs } from '@/components/RangeTabs';
import { MetricChangeCard } from '@/components/MetricChangeCard';
import { IconCircle } from '@/components/IconCircle';

import { useDashboard, useLogDay } from '@/api/queries';
import { useUserStore } from '@/store/userStore';
import { colors } from '@/theme/colors';

type Range = 'week' | 'month' | 'q' | 'year';

// 3-step self-rated daily compliance. Maps to 0-100 stored on the server.
type ComplianceRating = 'bad' | 'ok' | 'good';
const COMPLIANCE_VALUE: Record<ComplianceRating, number> = { bad: 40, ok: 70, good: 95 };
const COMPLIANCE_LABEL: Record<ComplianceRating, string> = { bad: 'Kötü', ok: 'Orta', good: 'İyi' };

export function ProgressScreen() {
  const userId = useUserStore((s) => s.userId);
  const dash = useDashboard(userId);
  const log  = useLogDay();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [range, setRange] = useState<Range>('month');

  const [weight, setWeight] = useState('');
  const [waist, setWaist]   = useState('');
  const [water,  setWater]  = useState('1500');
  const [rating, setRating] = useState<ComplianceRating | null>(null);

  const trend  = dash.data?.trend ?? [];
  const screenWidth = Dimensions.get('window').width - 40 - 32;

  const weightSeries = useMemo(
    () => trend.map((t) => Number(t.weight_kg)).filter((v) => Number.isFinite(v) && v > 0),
    [trend],
  );
  const complianceSeries = useMemo(() => trend.map((t) => Number(t.compliance) || 0), [trend]);
  const waistSeries      = useMemo(
    () => trend.map((t) => Number(t.waist_cm)).filter((v) => Number.isFinite(v) && v > 0),
    [trend],
  );
  const waterSeries      = useMemo(() => trend.map((t) => Number(t.water_ml) || 0), [trend]);

  const weightStart = weightSeries[0];
  const weightNow   = weightSeries[weightSeries.length - 1];
  const weightDelta = weightStart && weightNow ? weightNow - weightStart : 0;

  const waistStart  = waistSeries[0];
  const waistNow    = waistSeries[waistSeries.length - 1];
  const waistDelta  = waistStart && waistNow ? waistNow - waistStart : 0;

  const avgCompliance = complianceSeries.length
    ? Math.round(complianceSeries.reduce((s, v) => s + v, 0) / complianceSeries.length)
    : (dash.data?.today.compliance ?? 0);

  const avgWater = waterSeries.length
    ? Math.round(waterSeries.reduce((s, v) => s + v, 0) / waterSeries.length)
    : 0;

  const onSave = async () => {
    if (!userId) return;
    try {
      await log.mutateAsync({
        user_id: userId,
        weight_kg: weight ? Number(weight) : undefined,
        waist_cm:  waist  ? Number(waist)  : undefined,
        water_ml:  water  ? Number(water)  : 0,
        compliance: rating ? COMPLIANCE_VALUE[rating] : undefined,
      });
      setWeight(''); setWaist(''); setRating(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Kaydedildi', 'Bugünün günlüğü güncellendi.');
    } catch (err: any) {
      Alert.alert('Kaydedilemedi', err?.message ?? 'Lütfen daha sonra tekrar dene.');
    }
  };

  if (dash.isLoading) return <Loader label="Yükleniyor…" />;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={dash.isFetching && !dash.isLoading}
            onRefresh={dash.refetch}
            tintColor={colors.textLow}
          />
        }
      >
        <ScreenHeader subtitle="İlerleme Takibi" title="Takip" />

        <View className="px-5 mb-3">
          <RangeTabs<Range>
            value={range}
            onChange={setRange}
            options={[
              { value: 'week',  label: 'Hafta' },
              { value: 'month', label: 'Ay' },
              { value: 'q',     label: '3 Ay' },
              { value: 'year',  label: 'Yıl' },
            ]}
          />
        </View>

        <View className="px-5 flex-row" style={{ gap: 12 }}>
          <MetricChangeCard
            label="Kilo Değişimi"
            unit="kg"
            delta={weightDelta || 0}
            start={weightStart}
            current={weightNow}
            positiveIsGood={false}
          />
          <MetricChangeCard
            label="Bel Çevresi"
            unit="cm"
            delta={waistDelta || 0}
            start={waistStart}
            current={waistNow}
            positiveIsGood={false}
          />
        </View>

        <View className="px-5 mt-3">
          <Card>
            <View className="flex-row items-baseline justify-between mb-2">
              <Text className="text-textLow text-xs uppercase tracking-widest">Kilo Değişimi</Text>
              <Text className="text-textHi text-base font-semibold">
                {weightNow ? `${weightNow.toFixed(1)} kg` : '—'}
              </Text>
            </View>
            <Sparkline
              data={weightSeries.length > 0 ? weightSeries : [0]}
              width={screenWidth}
              height={120}
              color={colors.success}
            />
          </Card>
        </View>

        {/* Uyum Skoru */}
        <View className="px-5 mt-3">
          <Card>
            <View className="flex-row items-center">
              <ProgressRing
                size={120}
                stroke={12}
                progress={avgCompliance / 100}
                value={`%${avgCompliance}`}
                caption="Uyum Skoru"
                color={colors.success}
              />
              <View style={{ flex: 1, paddingLeft: 18 }}>
                <Text className="text-textHi text-base font-semibold mb-2">
                  {avgCompliance >= 85 ? 'Harika gidiyorsun!' :
                   avgCompliance >= 70 ? 'İyi yoldasın' :
                                         'Daha tutarlı olalım'}
                </Text>
                <ScoreBar label="Beslenme"    pct={avgCompliance} />
                <ScoreBar label="Su Tüketimi" pct={Math.round((avgWater / 3000) * 100)} />
              </View>
            </View>
          </Card>
        </View>

        {/* AI Yorumum */}
        {dash.data?.insight ? (
          <View className="px-5 mt-3">
            <InsightCard insight={dash.data.insight} />
          </View>
        ) : null}

        {/* Premium: Waist visual tracking */}
        <View className="px-5 mt-3">
          <Pressable onPress={() => navigation.navigate('ProgressPhotos')}>
            <Card>
              <View className="flex-row items-center">
                <View
                  style={{
                    width: 44, height: 44, borderRadius: 14,
                    backgroundColor: 'rgba(245,158,11,0.15)',
                    alignItems: 'center', justifyContent: 'center', marginRight: 14,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>📸</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View className="flex-row items-center">
                    <Text className="text-textHi text-sm font-semibold">Bel Görsel Takibi</Text>
                    <View
                      style={{
                        marginLeft: 8,
                        paddingHorizontal: 7, paddingVertical: 2,
                        borderRadius: 999, backgroundColor: 'rgba(245,158,11,0.15)',
                        borderWidth: 1, borderColor: colors.warning,
                      }}
                    >
                      <Text style={{ color: colors.warning, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 }}>
                        PREMIUM
                      </Text>
                    </View>
                  </View>
                  <Text className="text-textMid text-xs mt-1" numberOfLines={2}>
                    Haftada 1 fotoğraf yükle, AI karar motoru kilo verisiyle birleştirsin.
                  </Text>
                </View>
                <Text style={{ color: colors.textLow, fontSize: 22, marginLeft: 4 }}>›</Text>
              </View>
            </Card>
          </Pressable>
        </View>

        {/* Günlük Kontrol */}
        <View className="px-5 mt-4">
          <Text className="text-textHi text-base font-semibold mb-3">Günlük Kontrol</Text>
          <Card>
            <View className="flex-row" style={{ gap: 8 }}>
              <IconCircle icon="⚖️" label="Kilo"     value={weightNow ? `${weightNow.toFixed(1)} kg` : '—'} color={colors.primary} />
              <IconCircle icon="📏" label="Bel"      value={waistNow  ? `${waistNow.toFixed(1)} cm` : '—'}  color="#8B5CF6" />
              <IconCircle icon="💧" label="Su"       value={`${(((dash.data?.today.water_ml) ?? 0) / 1000).toFixed(1)} L`} color="#38BDF8" />
              <IconCircle icon="✓"  label="Uyum"     value={`%${dash.data?.today.compliance ?? 0}`} color={colors.success} />
            </View>
          </Card>
        </View>

        {/* Bugünü logla */}
        <View className="px-5 mt-4">
          <Card>
            <Text className="text-textLow text-xs uppercase tracking-widest mb-3">Bugünü Logla</Text>
            <Text className="text-textLow text-[11px] mb-3" style={{ lineHeight: 16 }}>
              Kalori ve protein, Plan ekranındaki öğün işaretlerinden otomatik hesaplanır.
            </Text>

            <Row label="Kilo (kg)">
              <Field value={weight} onChangeText={setWeight} placeholder="78.4" />
            </Row>
            <Row label="Bel (cm)">
              <Field value={waist} onChangeText={setWaist} placeholder="84" />
            </Row>
            <Row label="Su (ml)">
              <Field value={water} onChangeText={setWater} placeholder="2500" />
            </Row>

            <Text className="text-textMid text-xs mb-2 mt-1">Bugüne uyum</Text>
            <View className="flex-row" style={{ gap: 8 }}>
              {(['bad', 'ok', 'good'] as ComplianceRating[]).map((r) => (
                <ComplianceChip
                  key={r}
                  active={rating === r}
                  label={COMPLIANCE_LABEL[r]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRating(r);
                  }}
                />
              ))}
            </View>

            <View className="mt-4">
              <PrimaryButton label="Günlüğü Kaydet" onPress={onSave} loading={log.isPending} />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreBar({ label, pct }: { label: string; pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct || 0));
  return (
    <View className="mb-2">
      <View className="flex-row justify-between mb-0.5">
        <Text style={{ color: colors.textMid, fontSize: 11 }}>{label}</Text>
        <Text style={{ color: colors.textHi, fontSize: 11, fontWeight: '700' }}>%{clamped}</Text>
      </View>
      <View
        style={{
          height: 5, borderRadius: 5,
          backgroundColor: colors.border, overflow: 'hidden',
        }}
      >
        <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: colors.success, borderRadius: 5 }} />
      </View>
    </View>
  );
}

function ComplianceChip({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 11,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        backgroundColor: active ? colors.primary : colors.surface2,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text
        style={{
          color: active ? '#fff' : colors.textMid,
          fontSize: 13,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-3">
      <Text className="text-textMid text-xs mb-1.5">{label}</Text>
      {children}
    </View>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={colors.textLow}
      keyboardType="decimal-pad"
      {...props}
      style={[
        {
          backgroundColor: colors.surface2,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: colors.textHi,
          fontSize: 15,
        },
        props.style,
      ]}
    />
  );
}

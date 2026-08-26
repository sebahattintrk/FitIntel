import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Image, Pressable,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '@/theme/colors';
import { Card } from '@/components/Card';
import {
  useExercises, useExerciseRecommendation,
  type Exercise, type ExerciseFilters, type ExerciseRecommendation,
} from '@/api/queries';
import { useUserStore } from '@/store/userStore';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Chip = {
  label: string;
  icon: string;
  filters: Partial<ExerciseFilters>;
};

const CHIPS: Chip[] = [
  { label: 'Tümü',       icon: '✦',  filters: {} },
  { label: 'Göğüs',      icon: '🫁', filters: { bodyPart: 'chest' } },
  { label: 'Sırt',       icon: '⬅',  filters: { bodyPart: 'back' } },
  { label: 'Bacak',      icon: '🦵', filters: { bodyPart: 'upper legs' } },
  { label: 'Omuz',       icon: '💪', filters: { bodyPart: 'shoulders' } },
  { label: 'Kol',        icon: '💪', filters: { bodyPart: 'upper arms' } },
  { label: 'Karın',      icon: '🔥', filters: { bodyPart: 'waist' } },
  { label: 'Ekipmansız', icon: '🤸', filters: { equipment: 'body weight' } },
];

const SESSION_LABELS: Record<string, string> = {
  low_intensity: 'Düşük Yoğunluk',
  strength:      'Kuvvet',
  core:          'Core',
  mobility:      'Mobilite',
  recovery:      'Toparlanma',
};

export function ExercisesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userId = useUserStore((s) => s.userId);

  const rec = useExerciseRecommendation(userId);

  const [chipIdx, setChipIdx] = useState(0);
  const [query, setQuery] = useState('');
  const activeFilters: ExerciseFilters = useMemo(() => ({
    ...CHIPS[chipIdx].filters,
    q: query.trim() || undefined,
    limit: 50,
  }), [chipIdx, query]);
  const list = useExercises(activeFilters);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={{ color: colors.textHi, fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text style={{ color: colors.textHi, fontSize: 16, fontWeight: '700' }}>
            Akıllı Hareket Önerisi
          </Text>
          <Text style={{ color: colors.textLow, fontSize: 11, marginTop: 1 }}>
            Verilerine göre öneri · arama altında kütüphane
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={(rec.isFetching && !rec.isLoading) || (list.isFetching && !list.isLoading)}
            onRefresh={() => { rec.refetch(); list.refetch(); }}
            tintColor={colors.textLow}
          />
        }
      >
        {/* ---------- TOP: Bugünkü Öneri ---------- */}
        <View className="px-4 pt-1">
          <Text style={{
            color: colors.textLow, fontSize: 10, letterSpacing: 1.4, fontWeight: '800',
            marginBottom: 8,
          }}>
            BUGÜNKÜ ÖNERİ
          </Text>

          {rec.isLoading ? (
            <Card>
              <View className="flex-row items-center" style={{ paddingVertical: 8 }}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ color: colors.textMid, fontSize: 13, marginLeft: 10 }}>
                  Verilerine göre öneri üretiliyor…
                </Text>
              </View>
            </Card>
          ) : rec.isError || !rec.data ? (
            <Card>
              <Text style={{ color: colors.textMid, fontSize: 13 }}>
                Öneri şu an üretilemedi. Yenilemek için aşağıya çek.
              </Text>
            </Card>
          ) : (
            <RecommendationCard
              data={rec.data}
              onPressExercise={(id) => navigation.navigate('ExerciseDetail', { id })}
            />
          )}
        </View>

        {/* ---------- BOTTOM: Hareket Kütüphanesi ---------- */}
        <Text style={{
          color: colors.textLow, fontSize: 10, letterSpacing: 1.4, fontWeight: '800',
          marginTop: 26, marginBottom: 10, paddingHorizontal: 16,
        }}>
          HAREKET KÜTÜPHANESİ
        </Text>

        {/* Search */}
        <View className="px-4 mb-2">
          <View
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface,
              borderColor: colors.border, borderWidth: 1,
              borderRadius: 14, paddingHorizontal: 12, height: 42,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.textLow, marginRight: 8 }}>🔍</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Hareket ara (squat, push-up, plank…)"
              placeholderTextColor={colors.textLow}
              style={{ flex: 1, color: colors.textHi, fontSize: 13 }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Text style={{ color: colors.textLow, fontSize: 16 }}>×</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 6 }}
        >
          {CHIPS.map((c, i) => {
            const active = chipIdx === i;
            return (
              <Pressable
                key={c.label}
                onPress={() => setChipIdx(i)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 12, paddingVertical: 7,
                  marginRight: 8, borderRadius: 999,
                  borderWidth: 1,
                  backgroundColor: active ? 'rgba(124,77,255,0.18)' : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                }}
              >
                <Text style={{ fontSize: 13, marginRight: 5 }}>{c.icon}</Text>
                <Text style={{
                  color: active ? colors.textHi : colors.textMid,
                  fontSize: 12, fontWeight: '700',
                }}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* List body */}
        <View className="px-4 mt-2" style={{ gap: 10 }}>
          {list.isLoading ? (
            <View className="items-center" style={{ paddingVertical: 24 }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : list.isError ? (
            <Card>
              <Text style={{ color: colors.textMid, fontSize: 13 }}>
                Hareket veritabanı şu an ulaşılamıyor.
              </Text>
            </Card>
          ) : (list.data ?? []).length === 0 ? (
            <Card>
              <Text style={{ color: colors.textMid, fontSize: 13 }}>
                Sonuç yok. Filtreyi değiştir veya aramayı temizle.
              </Text>
            </Card>
          ) : (
            (list.data ?? []).map((ex) => (
              <ExerciseRow
                key={ex.id}
                ex={ex}
                onPress={() => navigation.navigate('ExerciseDetail', { id: ex.id })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RecommendationCard({
  data, onPressExercise,
}: { data: ExerciseRecommendation; onPressExercise: (id: string) => void }) {
  const r = data.recommendation;
  const ctx = data.context;
  const accent =
    r.tone === 'positive' ? colors.success :
    r.tone === 'warning'  ? colors.warning :
                            colors.primary;
  const intensityLabel =
    r.intensity === 'high' ? 'YÜKSEK' :
    r.intensity === 'medium' ? 'ORTA' : 'DÜŞÜK';

  return (
    <LinearGradient
      colors={[
        r.tone === 'warning' ? 'rgba(245,158,11,0.18)'
        : r.tone === 'positive' ? 'rgba(34,197,94,0.18)'
        : 'rgba(124,77,255,0.18)',
        'rgba(18,24,38,0.4)',
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 18, padding: 16,
        borderWidth: 1, borderColor: colors.border,
      }}
    >
      <View className="flex-row items-center" style={{ gap: 8, marginBottom: 4 }}>
        <View
          style={{
            width: 8, height: 8, borderRadius: 8,
            backgroundColor: accent,
          }}
        />
        <Text style={{ color: colors.textLow, fontSize: 10, letterSpacing: 1.4, fontWeight: '800' }}>
          {SESSION_LABELS[r.session_type] ?? r.session_type} · {r.duration_min} dk · {intensityLabel}
        </Text>
      </View>

      <Text style={{ color: colors.textHi, fontSize: 16, fontWeight: '700', marginTop: 4 }}>
        {r.title}
      </Text>
      <Text style={{ color: colors.textMid, fontSize: 13, lineHeight: 19, marginTop: 6 }}>
        {r.reason}
      </Text>

      <View
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Text style={{ color: colors.textLow, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>
          ZAMANLAMA · {r.timing}
        </Text>
      </View>

      {/* Mini signals */}
      <View className="flex-row flex-wrap" style={{ gap: 6, marginTop: 12 }}>
        {ctx.compliance_avg != null && (
          <Signal label="Uyum"     value={`%${ctx.compliance_avg}`} />
        )}
        {ctx.weight_trend_kg != null && (
          <Signal label="Kilo Δ"   value={`${signed(ctx.weight_trend_kg)} kg`} />
        )}
        {ctx.waist_trend_cm != null && (
          <Signal label="Bel Δ"    value={`${signed(ctx.waist_trend_cm)} cm`} />
        )}
        {ctx.protein_today_ratio != null && (
          <Signal label="Protein"  value={`%${Math.round(ctx.protein_today_ratio * 100)}`} />
        )}
      </View>

      {/* Exercises */}
      {r.exercises.length > 0 ? (
        <View style={{ marginTop: 14, gap: 8 }}>
          {r.exercises.map((ex) => (
            <Pressable
              key={ex.id}
              onPress={() => onPressExercise(ex.id)}
              style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: colors.surface,
                borderRadius: 12, borderWidth: 1, borderColor: colors.border,
                overflow: 'hidden',
              }}
            >
              {/* Small thumbnail — kept intentionally compact to avoid 180p GIF blur. */}
              <View
                style={{
                  width: 56, height: 56,
                  backgroundColor: '#000',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {ex.gifUrl ? (
                  <Image
                    source={{ uri: ex.gifUrl }}
                    style={{ width: 56, height: 56 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={{ fontSize: 20 }}>🏋️</Text>
                )}
              </View>
              <View style={{ flex: 1, paddingHorizontal: 10 }}>
                <Text
                  style={{ color: colors.textHi, fontSize: 12.5, fontWeight: '700' }}
                  numberOfLines={1}
                >
                  {capitalize(ex.name)}
                </Text>
                <Text style={{ color: colors.textLow, fontSize: 10.5, marginTop: 2 }}>
                  {(ex.equipments[0] ?? '—')}
                  {ex.equipments[0] && ex.targetMuscles[0] ? ' · ' : ''}
                  {ex.targetMuscles[0] ?? ''}
                </Text>
              </View>
              <Text style={{ color: colors.textLow, fontSize: 18, paddingRight: 10 }}>›</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={{ color: colors.textLow, fontSize: 11, marginTop: 12, fontStyle: 'italic' }}>
          Hareket önerisi bulunamadı — kütüphaneden seçim yapabilirsin.
        </Text>
      )}
    </LinearGradient>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 6, backgroundColor: colors.surface2,
        borderWidth: 1, borderColor: colors.border,
      }}
    >
      <Text style={{ color: colors.textLow, fontSize: 9, letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ color: colors.textHi, fontSize: 11, fontWeight: '700', marginTop: 1 }}>
        {value}
      </Text>
    </View>
  );
}

function ExerciseRow({ ex, onPress }: { ex: Exercise; onPress: () => void }) {
  const target = ex.targetMuscles[0];
  const equipment = ex.equipments[0];
  const bodyPart = ex.bodyParts[0];
  return (
    <Pressable onPress={onPress}>
      <Card padded={false} className="overflow-hidden">
        <View className="flex-row items-center">
          {/* Compact thumbnail — 80px. 180p GIF stays sharp here. */}
          <View
            style={{
              width: 80, height: 80,
              backgroundColor: '#000',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {ex.gifUrl ? (
              <Image
                source={{ uri: ex.gifUrl }}
                style={{ width: 80, height: 80 }}
                resizeMode="contain"
              />
            ) : (
              <Text style={{ fontSize: 22 }}>🏋️</Text>
            )}
          </View>
          <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Text
              style={{ color: colors.textHi, fontSize: 13.5, fontWeight: '700' }}
              numberOfLines={1}
            >
              {capitalize(ex.name)}
            </Text>
            {target ? (
              <View className="flex-row items-center" style={{ marginTop: 4 }}>
                <Tag label={target} color={colors.primary} />
              </View>
            ) : null}
            <View className="flex-row flex-wrap" style={{ marginTop: 5, gap: 5 }}>
              {bodyPart ? <Tag label={bodyPart} muted /> : null}
              {equipment ? <Tag label={equipment} muted /> : null}
            </View>
          </View>
          <Text style={{ color: colors.textLow, fontSize: 22, paddingRight: 10 }}>›</Text>
        </View>
      </Card>
    </Pressable>
  );
}

function Tag({ label, color, muted }: { label: string; color?: string; muted?: boolean }) {
  const bg = muted ? colors.surface2 : (color ? 'rgba(124,77,255,0.18)' : colors.surface2);
  const fg = muted ? colors.textMid : (color ?? colors.textMid);
  return (
    <View
      style={{
        paddingHorizontal: 7, paddingVertical: 2,
        borderRadius: 6, backgroundColor: bg,
        borderWidth: 1, borderColor: colors.border,
      }}
    >
      <Text style={{ color: fg, fontSize: 10, fontWeight: '700' }}>{capitalize(label)}</Text>
    </View>
  );
}

function capitalize(s: string) {
  if (!s) return '';
  return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
}
function signed(n: number) {
  return n >= 0 ? `+${n}` : String(n);
}

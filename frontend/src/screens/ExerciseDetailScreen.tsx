import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, Image, Pressable, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '@/theme/colors';
import { Card } from '@/components/Card';
import { Loader } from '@/components/Loader';
import { useExerciseDetail, useExercises, type Exercise } from '@/api/queries';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export function ExerciseDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ExerciseDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { id } = route.params;
  const q = useExerciseDetail(id);

  if (q.isLoading) return <Loader label="Yükleniyor…" />;
  if (q.isError || !q.data) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header onBack={() => navigation.goBack()} title="Hareket" />
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ color: colors.textHi, fontSize: 14, fontWeight: '600' }}>
            Hareket detayı alınamadı
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  const ex = q.data;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header onBack={() => navigation.goBack()} title="Hareket" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* GIF preview — kept compact (280px) because the free ExerciseDB serves
            ~180p frames; stretching them to full-bleed produces a blurry mess.
            "contain" + black background lets the small frame breathe inside a
            premium-looking dark frame. */}
        <View className="items-center mt-2">
          <View
            style={{
              width: 280, height: 280,
              backgroundColor: '#000',
              borderRadius: 18, overflow: 'hidden',
              borderWidth: 1, borderColor: colors.border,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {ex.gifUrl ? (
              <Image
                source={{ uri: ex.gifUrl }}
                style={{ width: 280, height: 280 }}
                resizeMode="contain"
              />
            ) : (
              <View className="items-center">
                <Text style={{ fontSize: 44 }}>🏋️</Text>
                <Text style={{ color: colors.textLow, fontSize: 11, marginTop: 8 }}>
                  Görsel yok
                </Text>
              </View>
            )}
          </View>
          <Text style={{
            color: colors.textLow, fontSize: 10, marginTop: 8, textAlign: 'center',
            letterSpacing: 0.4,
          }}>
            Düşük çözünürlüklü form önizlemesi — kaynak: ExerciseDB
          </Text>
        </View>

        {/* Title */}
        <Text style={{ color: colors.textHi, fontSize: 20, fontWeight: '800', marginTop: 16 }}>
          {capitalize(ex.name)}
        </Text>

        {/* Tag groups */}
        <View className="mt-4" style={{ gap: 10 }}>
          {ex.targetMuscles.length > 0 ? (
            <TagGroup label="HEDEF KAS" items={ex.targetMuscles} color={colors.primary} />
          ) : null}
          {ex.secondaryMuscles.length > 0 ? (
            <TagGroup label="YARDIMCI KAS" items={ex.secondaryMuscles} />
          ) : null}
          {ex.equipments.length > 0 ? (
            <TagGroup label="EKİPMAN" items={ex.equipments} />
          ) : null}
          {ex.bodyParts.length > 0 ? (
            <TagGroup label="BÖLGE" items={ex.bodyParts} />
          ) : null}
        </View>

        {/* Instructions */}
        {ex.instructions.length > 0 ? (
          <View className="mt-5">
            <Text style={{
              color: colors.textLow, fontSize: 10, letterSpacing: 1.4, fontWeight: '800',
              marginBottom: 10,
            }}>
              FORM REHBERİ
            </Text>
            <View style={{ gap: 8 }}>
              {ex.instructions.map((step, i) => (
                <View key={i} className="flex-row" style={{ gap: 10 }}>
                  <View
                    style={{
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: 'rgba(124,77,255,0.20)',
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 1, borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text style={{
                    color: colors.textMid, fontSize: 13.5, lineHeight: 19, flex: 1,
                  }}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Safety note */}
        <View
          style={{
            marginTop: 18, padding: 12,
            backgroundColor: 'rgba(245,158,11,0.08)',
            borderRadius: 12, borderWidth: 1, borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.warning, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>
            ⚠ GÜVENLİK
          </Text>
          <Text style={{ color: colors.textMid, fontSize: 12, lineHeight: 17, marginTop: 4 }}>
            Bu rehber form takibi içindir; tıbbi/sakatlık tavsiyesi değildir.
            Ağrı veya rahatsızlık hissedersen profesyonel destek al.
          </Text>
        </View>

        {/* Alternatives */}
        <AlternativesSection ex={ex} />
      </ScrollView>
    </SafeAreaView>
  );
}

function AlternativesSection({ ex }: { ex: Exercise }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const muscle = ex.targetMuscles[0];
  const equipment = ex.equipments[0];

  // Strategy: prefer same target muscle + same equipment. Fall back to same muscle
  // (any equipment) if the strict filter returns nothing.
  const strictQ = useExercises({
    muscle: muscle || undefined,
    equipment: equipment || undefined,
    limit: 12,
  });
  const looseQ = useExercises({
    muscle: muscle || undefined,
    limit: 12,
  });

  const list = useMemo(() => {
    const strict = (strictQ.data ?? []).filter((e) => e.id !== ex.id);
    if (strict.length >= 1) return strict.slice(0, 5);
    const loose = (looseQ.data ?? []).filter((e) => e.id !== ex.id);
    return loose.slice(0, 5);
  }, [strictQ.data, looseQ.data, ex.id]);

  return (
    <View className="mt-6">
      <View className="flex-row items-baseline justify-between mb-3">
        <Text style={{ color: colors.textHi, fontSize: 15, fontWeight: '700' }}>
          🔄 Alternatif Hareketler
        </Text>
        {muscle ? (
          <Text style={{ color: colors.textLow, fontSize: 11 }}>
            {capitalize(muscle)} için
          </Text>
        ) : null}
      </View>

      {strictQ.isLoading ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : list.length === 0 ? (
        <Card>
          <Text style={{ color: colors.textMid, fontSize: 12, lineHeight: 18 }}>
            Bu hareket için alternatif bulunamadı.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 8 }}>
          {list.map((alt) => (
            <Pressable
              key={alt.id}
              onPress={() => navigation.replace('ExerciseDetail', { id: alt.id })}
            >
              <Card padded={false} className="overflow-hidden">
                <View className="flex-row items-center">
                  <Image
                    source={{ uri: alt.gifUrl }}
                    style={{ width: 70, height: 70, backgroundColor: colors.surface2 }}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text
                      style={{ color: colors.textHi, fontSize: 13.5, fontWeight: '700' }}
                      numberOfLines={1}
                    >
                      {capitalize(alt.name)}
                    </Text>
                    <Text style={{ color: colors.textLow, fontSize: 11, marginTop: 3 }}>
                      {(alt.equipments[0] ?? '—')}
                      {alt.equipments[0] && alt.targetMuscles[0] ? ' · ' : ''}
                      {alt.targetMuscles[0] ?? ''}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textLow, fontSize: 20, paddingRight: 10 }}>›</Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View className="flex-row items-center px-4 pt-2 pb-3">
      <Pressable onPress={onBack} hitSlop={12}>
        <Text style={{ color: colors.textHi, fontSize: 22 }}>‹</Text>
      </Pressable>
      <Text style={{
        color: colors.textHi, fontSize: 16, fontWeight: '700', marginLeft: 8,
      }}>
        {title}
      </Text>
    </View>
  );
}

function TagGroup({
  label, items, color,
}: { label: string; items: string[]; color?: string }) {
  return (
    <View>
      <Text style={{
        color: colors.textLow, fontSize: 10, letterSpacing: 1.4, fontWeight: '800',
        marginBottom: 6,
      }}>
        {label}
      </Text>
      <View className="flex-row flex-wrap" style={{ gap: 6 }}>
        {items.map((m) => (
          <View
            key={m}
            style={{
              paddingHorizontal: 9, paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: color ? 'rgba(124,77,255,0.18)' : colors.surface2,
              borderWidth: 1, borderColor: color ?? colors.border,
            }}
          >
            <Text style={{
              color: color ?? colors.textMid,
              fontSize: 11, fontWeight: '700',
            }}>
              {capitalize(m)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function capitalize(s: string) {
  if (!s) return '';
  return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
}

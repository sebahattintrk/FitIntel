import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenHeader } from '@/components/ScreenHeader';
import { SupplementCard } from '@/components/SupplementCard';
import { CategoryChip } from '@/components/CategoryChip';
import { Loader } from '@/components/Loader';
import { Card } from '@/components/Card';

import { useSupplements, type Supplement } from '@/api/queries';
import { colors } from '@/theme/colors';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Cat = 'all' | 'whey' | 'isolate' | 'vegan' | 'creatine';

const CHIP_CATS: { value: Cat; label: string; icon: string }[] = [
  { value: 'all',      label: 'Tümü',     icon: '✦' },
  { value: 'whey',     label: 'Whey',     icon: '🥤' },
  { value: 'isolate',  label: 'İzolat',   icon: '⚡' },
  { value: 'vegan',    label: 'Vegan',    icon: '🌱' },
  { value: 'creatine', label: 'Kreatin',  icon: '💪' },
];

const BIG_CATS = [
  { label: 'Whey Protein', icon: '🥤' },
  { label: 'Kreatin',      icon: '💪' },
  { label: 'Pre-workout',  icon: '⚡' },
  { label: 'Vitamin',      icon: '💊' },
];

export function SupplementsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [cat, setCat] = useState<Cat>('all');
  const [query, setQuery] = useState('');
  const q = useSupplements(cat === 'all' ? undefined : cat);

  const filtered = useMemo(() => {
    if (!q.data) return [];
    const term = query.trim().toLocaleLowerCase('tr');
    if (!term) return q.data;
    return q.data.filter(
      (s) =>
        s.product_name.toLocaleLowerCase('tr').includes(term) ||
        s.brand.toLocaleLowerCase('tr').includes(term)
    );
  }, [q.data, query]);

  const featured = filtered.slice(0, 3);
  const rest     = filtered.slice(3);

  const goDetail = (s: Supplement) => nav.navigate('SupplementDetail', { supplement: s });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={q.isFetching && !q.isLoading}
            onRefresh={q.refetch}
            tintColor={colors.textLow}
          />
        }
      >
        <ScreenHeader subtitle="Doğru ürün. En iyi fiyat." title="Supplement Intelligence" />

        {/* MVP scope note — keeps expectations honest while the smarter analysis
            (live scraping, real review sentiment) is being built. */}
        <View className="px-5 mb-3">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(124,77,255,0.08)',
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 14,
              padding: 12,
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 10 }}>🧪</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textHi, fontSize: 12, fontWeight: '700' }}>
                Erken katalog
              </Text>
              <Text style={{ color: colors.textMid, fontSize: 11, lineHeight: 15, marginTop: 1 }}>
                Şu an statik kalite skoru ve fiyatları gösteriyoruz. Canlı fiyat takibi ve
                gerçek yorum analizi sonraki sürümde.
              </Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View className="px-5 mb-4">
          <View
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface,
              borderColor: colors.border, borderWidth: 1,
              borderRadius: 16, paddingHorizontal: 14, height: 50,
            }}
          >
            <Text style={{ fontSize: 16, color: colors.textLow, marginRight: 8 }}>🔍</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Ürün veya marka ara…"
              placeholderTextColor={colors.textLow}
              style={{ flex: 1, color: colors.textHi, fontSize: 14 }}
            />
          </View>
        </View>

        {/* Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {CHIP_CATS.map((c) => (
            <CategoryChip
              key={c.value}
              label={c.label}
              icon={c.icon}
              selected={cat === c.value}
              onPress={() => setCat(c.value)}
            />
          ))}
        </ScrollView>

        {/* Featured */}
        <View className="px-5 mt-5 mb-3 flex-row items-center justify-between">
          <Text className="text-textHi text-base font-semibold">Öne Çıkan Ürünler</Text>
          <Text className="text-primary text-xs font-semibold">Tümünü Gör</Text>
        </View>

        {q.isLoading ? (
          <Loader />
        ) : q.isError ? (
          <View className="px-5 mt-2">
            <Card>
              <Text className="text-textHi font-semibold">Ürünler yüklenemedi</Text>
              <Text className="text-textMid text-sm mt-1">
                Yenilemek için aşağıya çek.
              </Text>
            </Card>
          </View>
        ) : featured.length === 0 ? (
          <View className="px-5">
            <Card>
              <Text className="text-textMid text-sm">Bu kategoride ürün bulunamadı.</Text>
            </Card>
          </View>
        ) : (
          <View className="px-5" style={{ gap: 12 }}>
            {featured.map((s) => (
              <SupplementCard key={s.id} s={s} onPress={() => goDetail(s)} />
            ))}
          </View>
        )}

        {/* Big categories grid */}
        <View className="px-5 mt-6 mb-3">
          <Text className="text-textHi text-base font-semibold">Kategorilere Göre</Text>
        </View>
        <View className="px-5 flex-row" style={{ gap: 12 }}>
          {BIG_CATS.map((c) => (
            <CategoryChip key={c.label} size="lg" label={c.label} icon={c.icon} />
          ))}
        </View>

        {/* Educational card */}
        <View className="px-5 mt-6">
          <Card>
            <View className="flex-row items-start">
              <View
                style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: 'rgba(124,77,255,0.18)',
                  alignItems: 'center', justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Text style={{ fontSize: 22 }}>🛡️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text className="text-textHi text-base font-semibold">Supplement Güven Skoru Nedir?</Text>
                <Text className="text-textMid text-xs leading-5 mt-1">
                  İçerik kalitesi, fiyat/performans, kullanıcı yorumları ve güvenilirlik
                  analizlerimizle 0–100 arası hesaplanır.
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {rest.length > 0 ? (
          <>
            <View className="px-5 mt-6 mb-3">
              <Text className="text-textHi text-base font-semibold">Diğer Ürünler</Text>
            </View>
            <View className="px-5" style={{ gap: 12 }}>
              {rest.map((s) => (
                <SupplementCard key={s.id} s={s} onPress={() => goDetail(s)} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

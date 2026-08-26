import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScoreBadge } from '@/components/SupplementCard';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Loader } from '@/components/Loader';

import { colors } from '@/theme/colors';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useSupplementDetail } from '@/api/queries';
import { formatTRY } from '@/utils/turkish';

type Tab = 'overview' | 'content' | 'reviews' | 'prices';

export function SupplementDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'SupplementDetail'>>();
  const nav   = useNavigation();
  const baseId = route.params.supplement.id;
  const q = useSupplementDetail(baseId);
  const [tab, setTab] = useState<Tab>('overview');
  const [favorite, setFavorite] = useState(false);

  if (q.isLoading || !q.data) return <Loader label="Yükleniyor…" />;
  const detail = q.data;
  const cheapest = detail.stores[0];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header bar */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <RoundButton icon="‹" onPress={() => nav.goBack()} />
        <Text className="text-textHi text-base font-semibold">Ürün Detayı</Text>
        <RoundButton
          icon={favorite ? '♥' : '♡'}
          onPress={() => setFavorite((v) => !v)}
          color={favorite ? colors.danger : colors.textHi}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-5 mt-2">
          <Card>
            <View className="flex-row">
              <View
                style={{
                  width: 110, height: 130,
                  backgroundColor: colors.surface2,
                  borderRadius: 14, overflow: 'hidden',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {detail.image_url ? (
                  <Image
                    source={{ uri: detail.image_url }}
                    style={{ width: 110, height: 130 }}
                    resizeMode="cover"
                  />
                ) : null}
              </View>
              <View style={{ flex: 1, paddingLeft: 16 }}>
                <Text className="text-textLow text-[10px] uppercase tracking-widest">
                  {detail.brand}
                </Text>
                <Text className="text-textHi text-lg font-bold mt-0.5" numberOfLines={3}>
                  {detail.product_name}
                </Text>
                <View className="flex-row items-center mt-2">
                  <Text style={{ color: '#FACC15', fontSize: 14 }}>★</Text>
                  <Text className="text-textHi text-sm font-semibold ml-1">
                    {detail.rating.toFixed(1)}
                  </Text>
                  <Text className="text-textLow text-xs ml-1">
                    ({detail.rating_count} yorum)
                  </Text>
                </View>
                <View className="mt-3">
                  <ScoreBadge score={Number(detail.quality_score)} size="lg" />
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Tabs */}
        <View className="px-5 mt-4">
          <SegmentedControl<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'overview', label: 'Genel Bakış' },
              { value: 'content',  label: 'İçerik' },
              { value: 'reviews',  label: 'Yorumlar' },
              { value: 'prices',   label: 'Fiyatlar' },
            ]}
          />
        </View>

        {tab === 'overview' && (
          <>
            {/* Score breakdown */}
            <View className="px-5 mt-4">
              <Card>
                <Text className="text-textHi text-base font-semibold mb-3">Skor Dağılımı</Text>
                {detail.score_breakdown.map((b) => (
                  <BreakdownRow key={b.label} label={b.label} value={b.value} explanation={b.explanation} />
                ))}
                <View className="flex-row justify-between mt-3">
                  <Text className="text-textMid text-sm">Fake Yorum Riski</Text>
                  <Text
                    className="text-sm font-bold"
                    style={{
                      color:
                        detail.fake_review_risk === 'Düşük' ? colors.success :
                        detail.fake_review_risk === 'Orta'  ? colors.warning :
                                                              colors.danger,
                    }}
                  >
                    {detail.fake_review_risk}
                  </Text>
                </View>
              </Card>
            </View>

            {/* AI Summary */}
            <View className="px-5 mt-3">
              <Card>
                <View className="flex-row items-center mb-2">
                  <View
                    style={{
                      width: 8, height: 8, borderRadius: 8,
                      backgroundColor: colors.primary, marginRight: 8,
                    }}
                  />
                  <Text className="text-textLow text-xs uppercase tracking-widest">AI Özeti</Text>
                </View>
                <Text className="text-textMid text-sm leading-5">{detail.ai_summary}</Text>
              </Card>
            </View>

            {/* Price comparison preview */}
            <View className="px-5 mt-3">
              <Card>
                <Text className="text-textHi text-base font-semibold mb-3">Fiyat Karşılaştırma</Text>
                {detail.stores.map((s) => (
                  <StoreRow key={s.name} name={s.name} price={s.price} highlight={s === cheapest} />
                ))}
              </Card>
            </View>
          </>
        )}

        {tab === 'content' && (
          <View className="px-5 mt-4">
            <Card>
              <Text className="text-textHi text-base font-semibold mb-2">İçerik Bilgisi</Text>
              <KV k="Marka"            v={detail.brand} />
              <KV k="Kategori"         v={detail.category} />
              <KV k="Servis Boyutu"    v={detail.serving_size_g ? `${Number(detail.serving_size_g)} g` : '—'} />
              <KV k="Servis / Paket"   v={detail.servings_per_pack ? `${detail.servings_per_pack}` : '—'} />
              <KV k="Protein / Servis" v={detail.protein_per_serving ? `${Number(detail.protein_per_serving)} g` : '—'} />
              <KV k="Etiketler"        v={(detail.tags || []).join(', ') || '—'} last />
            </Card>
          </View>
        )}

        {tab === 'reviews' && (
          <View className="px-5 mt-4">
            <Card>
              <Text className="text-textHi text-base font-semibold mb-2">
                Kullanıcı Yorumları ({detail.rating_count})
              </Text>
              <Text className="text-textMid text-sm leading-5">
                Yorumlar bir sonraki sürümde aktif olacak. Şimdilik AI Özeti'nde
                kullanıcı geri bildirimlerinin destilasyonunu görebilirsin.
              </Text>
            </Card>
          </View>
        )}

        {tab === 'prices' && (
          <View className="px-5 mt-4">
            <Card>
              <Text className="text-textHi text-base font-semibold mb-3">Tüm Mağazalar</Text>
              {detail.stores.map((s) => (
                <StoreRow key={s.name} name={s.name} price={s.price} highlight={s === cheapest} />
              ))}
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom action bar */}
      <View
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28,
          backgroundColor: 'rgba(11,15,26,0.92)',
          borderTopWidth: 1, borderTopColor: colors.border,
          flexDirection: 'row', gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <PrimaryButton variant="ghost" label="Fiyat Alarmı Kur" onPress={() => {}} />
        </View>
        <View style={{ flex: 1.4 }}>
          <PrimaryButton
            label={`En Ucuza Git · ${formatTRY(cheapest?.price ?? 0)}₺`}
            onPress={() => {}}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function BreakdownRow({ label, value, explanation }: { label: string; value: number; explanation?: string }) {
  return (
    <View className="mb-2.5">
      <View className="flex-row justify-between mb-1">
        <Text style={{ color: colors.textMid, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>{value}</Text>
      </View>
      <View
        style={{
          height: 6, borderRadius: 6,
          backgroundColor: colors.border, overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${value}%`, height: '100%',
            backgroundColor: colors.success, borderRadius: 6,
          }}
        />
      </View>
      {explanation ? (
        <Text style={{ color: colors.textLow, fontSize: 10, marginTop: 4, lineHeight: 14 }}>
          {explanation}
        </Text>
      ) : null}
    </View>
  );
}

function StoreRow({ name, price, highlight }: { name: string; price: number; highlight?: boolean }) {
  return (
    <View
      className="flex-row items-center justify-between"
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ color: highlight ? colors.success : colors.textHi, fontSize: 14, fontWeight: '600' }}>
        {name}
      </Text>
      <View className="flex-row items-center">
        <Text style={{ color: colors.textHi, fontSize: 14, fontWeight: '700', marginRight: 12 }}>
          {formatTRY(price)} ₺
        </Text>
        <View
          style={{
            paddingHorizontal: 12, paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: highlight ? colors.success : 'rgba(124,77,255,0.18)',
          }}
        >
          <Text style={{
            color: highlight ? '#0B0F1A' : colors.primary,
            fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
          }}>
            GİT
          </Text>
        </View>
      </View>
    </View>
  );
}

function KV({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <View
      className="flex-row justify-between items-center py-2.5"
      style={{
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text className="text-textMid text-sm">{k}</Text>
      <Text className="text-textHi text-sm font-semibold">{v}</Text>
    </View>
  );
}

function RoundButton({
  icon, onPress, color = colors.textHi,
}: {
  icon: string; onPress: () => void; color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 40, height: 40, borderRadius: 14,
        backgroundColor: colors.surface,
        borderWidth: 1, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: 22, fontWeight: '700', lineHeight: 22 }}>{icon}</Text>
    </Pressable>
  );
}

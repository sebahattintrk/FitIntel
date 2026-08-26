import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Card } from './Card';
import { colors } from '@/theme/colors';
import { Supplement } from '@/api/queries';

type Props = {
  s: Supplement;
  onPress?: () => void;
  variant?: 'list' | 'featured';
};

export function SupplementCard({ s, onPress, variant = 'list' }: Props) {
  const price = Number(s.price) || 0;
  const quality = Number(s.quality_score) || 0;
  const pp = Number(s.price_performance) || 0;
  const protein = s.protein_per_serving != null ? Number(s.protein_per_serving) : null;

  const Inner = (
    <Card padded={false} className="overflow-hidden">
      <View className="flex-row">
        <View
          style={{
            width: 110, height: 140,
            backgroundColor: colors.surface2,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {s.image_url ? (
            <Image
              source={{ uri: s.image_url }}
              style={{ width: 110, height: 140 }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ color: colors.textLow }}>—</Text>
          )}
        </View>

        <View className="flex-1 p-4">
          <View className="flex-row items-start justify-between">
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text className="text-textLow text-[10px] uppercase tracking-widest">{s.brand}</Text>
              <Text className="text-textHi text-base font-semibold mt-0.5" numberOfLines={2}>
                {s.product_name}
              </Text>
            </View>
            <ScoreBadge score={quality} />
          </View>

          <View className="flex-row items-end justify-between mt-3">
            <View>
              <Text className="text-textLow text-[10px]">En düşük fiyat</Text>
              <Text className="text-textHi text-lg font-bold mt-0.5">
                {price.toLocaleString('tr-TR')}{' '}
                <Text className="text-textLow text-xs font-medium">{s.currency || 'TL'}</Text>
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {protein != null && protein > 0 ? (
                <>
                  <Text className="text-textLow text-[10px]">Protein/servis</Text>
                  <Text className="text-textHi text-sm font-semibold mt-0.5">{protein.toFixed(0)}g</Text>
                </>
              ) : (
                <>
                  <Text className="text-textLow text-[10px]">F/P skoru</Text>
                  <Text className="text-textHi text-sm font-semibold mt-0.5">{pp.toFixed(1)}</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </Card>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        {Inner}
      </Pressable>
    );
  }
  return Inner;
}

export function ScoreBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'lg' }) {
  const tone =
    score >= 9 ? colors.success :
    score >= 8 ? '#84CC16' :
    score >= 7 ? colors.warning :
                 colors.danger;
  const isLg = size === 'lg';
  // backend stores 0-10; show as /100 to match mock
  const display = Math.round(score * 10);
  return (
    <View
      style={{
        backgroundColor: 'rgba(34,197,94,0.12)',
        borderColor: tone,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: isLg ? 14 : 10,
        paddingVertical: isLg ? 8 : 4,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: tone,
          fontSize: isLg ? 22 : 14,
          fontWeight: '800',
          lineHeight: isLg ? 26 : 16,
        }}
      >
        {display}
      </Text>
      <Text
        style={{
          color: tone,
          fontSize: isLg ? 10 : 9,
          fontWeight: '600',
          letterSpacing: 1,
          marginTop: isLg ? 2 : 0,
        }}
      >
        {isLg ? 'KALİTE SKORU' : 'SKOR'}
      </Text>
    </View>
  );
}

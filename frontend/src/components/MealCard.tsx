import React from 'react';
import { View, Text, Image } from 'react-native';
import { Card } from './Card';
import { colors } from '@/theme/colors';

type Props = {
  slot: string;
  name: string;
  description?: string;
  calories: number;
  protein_g: number | string;
  carbs_g: number | string;
  fats_g: number | string;
  image_url?: string;
};

export function MealCard({
  slot, name, description, calories, protein_g, carbs_g, fats_g, image_url,
}: Props) {
  return (
    <Card padded={false} className="overflow-hidden">
      <View className="flex-row">
        {image_url ? (
          <Image
            source={{ uri: image_url }}
            style={{ width: 110, height: 130 }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: 110, height: 130, backgroundColor: colors.surface2 }} />
        )}
        <View className="flex-1 p-4 justify-between">
          <View>
            <Text className="text-textLow text-[10px] uppercase tracking-widest">{slot}</Text>
            <Text className="text-textHi text-base font-semibold mt-1" numberOfLines={1}>
              {name}
            </Text>
            {description ? (
              <Text className="text-textMid text-xs mt-1" numberOfLines={2}>
                {description}
              </Text>
            ) : null}
          </View>
          <View className="flex-row items-center mt-2">
            <Pill text={`${calories} kcal`} highlight />
            <Pill text={`P ${Math.round(Number(protein_g))}g`} />
            <Pill text={`C ${Math.round(Number(carbs_g))}g`} />
            <Pill text={`F ${Math.round(Number(fats_g))}g`} />
          </View>
        </View>
      </View>
    </Card>
  );
}

function Pill({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <View
      style={{
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: highlight ? 'rgba(124,77,255,0.15)' : colors.surface2,
        marginRight: 6,
      }}
    >
      <Text
        style={{
          color: highlight ? colors.primary : colors.textMid,
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.4,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

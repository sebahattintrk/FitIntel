import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '@/theme/colors';

type Props = {
  label: string;
  value: number;
  target: number;
  unit?: string;
  color?: string;
};

export function MacroBar({ label, value, target, unit = 'g', color = colors.primary }: Props) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1.5">
        <Text className="text-textMid text-xs uppercase tracking-widest">{label}</Text>
        <Text className="text-textHi text-xs font-semibold">
          {Math.round(value)}
          <Text className="text-textLow"> / {Math.round(target)}{unit}</Text>
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 8,
          backgroundColor: colors.border,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 8,
          }}
        />
      </View>
    </View>
  );
}

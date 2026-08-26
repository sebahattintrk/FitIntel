import React from 'react';
import { View, Text } from 'react-native';
import { Card } from './Card';

type Props = {
  label: string;
  value: string;
  caption?: string;
  trend?: 'up' | 'down' | 'flat';
  accent?: string;
};

export function StatCard({ label, value, caption, trend, accent }: Props) {
  const arrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  return (
    <Card className="flex-1">
      <Text className="text-textLow text-xs uppercase tracking-widest">{label}</Text>
      <View className="flex-row items-baseline mt-2">
        <Text className="text-textHi text-2xl font-bold">{value}</Text>
        {trend ? (
          <Text className="ml-2 text-success text-sm" style={accent ? { color: accent } : undefined}>
            {arrow}
          </Text>
        ) : null}
      </View>
      {caption ? <Text className="text-textMid text-xs mt-2">{caption}</Text> : null}
    </Card>
  );
}

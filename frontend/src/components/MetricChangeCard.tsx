import React from 'react';
import { View, Text } from 'react-native';
import { Card } from './Card';
import { colors } from '@/theme/colors';

type Props = {
  label: string;
  delta: number;
  unit: string;
  start?: number;
  current?: number;
  positiveIsGood?: boolean; // for weight loss, lower is good
};

export function MetricChangeCard({
  label, delta, unit, start, current, positiveIsGood = false,
}: Props) {
  const isLoss = delta < 0;
  const tone = (positiveIsGood ? !isLoss : isLoss) ? colors.success : colors.warning;
  const sign = delta > 0 ? '+' : '';

  return (
    <Card className="flex-1">
      <Text className="text-textLow text-[11px] uppercase tracking-widest">{label}</Text>
      <Text style={{ color: tone, fontSize: 28, fontWeight: '800', marginTop: 6 }}>
        {sign}{delta.toFixed(1)} {unit}
      </Text>
      {start != null && current != null ? (
        <Text className="text-textLow text-[11px] mt-2">
          Başlangıç: {start.toFixed(1)} {unit}  •  Şu an: {current.toFixed(1)} {unit}
        </Text>
      ) : null}
    </Card>
  );
}

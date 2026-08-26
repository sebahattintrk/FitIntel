import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '@/theme/colors';

type Props = {
  size?: number;
  stroke?: number;
  progress: number; // 0..1 (capped)
  label?: string;
  value?: string;
  caption?: string;
  color?: string;
  trackColor?: string;
};

export function ProgressRing({
  size = 140,
  stroke = 12,
  progress,
  label,
  value,
  caption,
  color = colors.primary,
  trackColor = colors.border,
}: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  const offset = c * (1 - clamped);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.primaryDim} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View
        style={{
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {label ? <Text className="text-textLow text-xs uppercase tracking-widest">{label}</Text> : null}
        {value ? <Text className="text-textHi text-2xl font-bold mt-1">{value}</Text> : null}
        {caption ? <Text className="text-textMid text-xs mt-1">{caption}</Text> : null}
      </View>
    </View>
  );
}

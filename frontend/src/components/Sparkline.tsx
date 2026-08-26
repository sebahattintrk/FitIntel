import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';
import { colors } from '@/theme/colors';

type Props = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
};

export function Sparkline({ data, width = 280, height = 90, color = colors.primary }: Props) {
  if (!data || data.length === 0) return <View style={{ width, height }} />;

  const padding = 6;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const stepX = data.length === 1 ? 0 : (width - padding * 2) / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = padding + i * stepX;
      const y = padding + (height - padding * 2) * (1 - (v - min) / range);
      return `${x},${y}`;
    })
    .join(' ');

  const fillPolygon =
    `${padding},${height - padding} ` + points + ` ${padding + (data.length - 1) * stepX},${height - padding}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.35" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Polygon points={fillPolygon} fill="url(#spark)" />
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

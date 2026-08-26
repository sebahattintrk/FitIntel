import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '@/theme/colors';

type Props = {
  icon: string;
  label: string;
  value: string;
  color?: string;
};

export function IconCircle({ icon, label, value, color = colors.primary }: Props) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View
        style={{
          width: 56, height: 56, borderRadius: 56,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderWidth: 2,
          borderColor: color,
        }}
      >
        <Text style={{ fontSize: 24 }}>{icon}</Text>
      </View>
      <Text style={{ color: colors.textMid, fontSize: 11, marginTop: 6 }}>{label}</Text>
      <Text style={{ color: colors.textHi, fontSize: 13, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

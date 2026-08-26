import React from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';

type Props = {
  label: string;
  icon?: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'lg';
};

export function CategoryChip({ label, icon, selected, onPress, size = 'sm' }: Props) {
  const handle = () => {
    if (!onPress) return;
    Haptics.selectionAsync();
    onPress();
  };

  if (size === 'lg') {
    return (
      <Pressable onPress={handle} style={{ alignItems: 'center', width: 80 }}>
        <View
          style={{
            width: 64, height: 64, borderRadius: 20,
            backgroundColor: selected ? 'rgba(124,77,255,0.18)' : colors.surface,
            borderColor: selected ? colors.primary : colors.border,
            borderWidth: 1,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 26 }}>{icon ?? '✦'}</Text>
        </View>
        <Text
          style={{
            color: selected ? colors.textHi : colors.textMid,
            fontSize: 11, fontWeight: '600',
            marginTop: 6, textAlign: 'center',
          }}
          numberOfLines={2}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: selected ? 'rgba(124,77,255,0.18)' : colors.surface,
        borderColor: selected ? colors.primary : colors.border,
        borderWidth: 1,
        marginRight: 8,
      }}
    >
      {icon ? <Text style={{ fontSize: 14, marginRight: 6 }}>{icon}</Text> : null}
      <Text
        style={{
          color: selected ? colors.textHi : colors.textMid,
          fontSize: 13, fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

import React from 'react';
import { View, Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';

type Option<T extends string> = { value: T; label: string };
type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
};

export function SegmentedControl<T extends string>({ value, options, onChange }: Props<T>) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 4,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(o.value);
            }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: active ? colors.primary : 'transparent',
            }}
          >
            <Text
              style={{
                color: active ? '#fff' : colors.textMid,
                fontWeight: '600',
                fontSize: 13,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

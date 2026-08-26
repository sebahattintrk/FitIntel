import React from 'react';
import { View, Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';

type Option<T extends string> = { value: T; label: string };

export function RangeTabs<T extends string>({
  value, options, onChange,
}: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row" style={{ gap: 8 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => { Haptics.selectionAsync(); onChange(o.value); }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: active ? colors.primary : colors.surface,
              borderColor: active ? colors.primary : colors.border,
              borderWidth: 1,
            }}
          >
            <Text
              style={{
                color: active ? '#fff' : colors.textMid,
                fontWeight: '600',
                fontSize: 12,
                letterSpacing: 0.4,
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

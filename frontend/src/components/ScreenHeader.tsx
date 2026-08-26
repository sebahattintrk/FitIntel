import React from 'react';
import { View, Text } from 'react-native';

type Props = { title: string; subtitle?: string };

export function ScreenHeader({ title, subtitle }: Props) {
  return (
    <View className="px-5 pt-2 pb-4">
      {subtitle ? (
        <Text className="text-textLow text-xs uppercase tracking-[3px] mb-1">{subtitle}</Text>
      ) : null}
      <Text className="text-textHi text-3xl font-bold">{title}</Text>
    </View>
  );
}

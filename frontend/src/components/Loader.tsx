import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { colors } from '@/theme/colors';

export function Loader({ label }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <ActivityIndicator color={colors.primary} />
      {label ? <Text className="text-textLow mt-3 text-sm">{label}</Text> : null}
    </View>
  );
}

import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
};

export function PrimaryButton({
  label, onPress, loading, disabled, variant = 'primary',
}: Props) {
  const isPrimary = variant === 'primary';

  const handle = () => {
    if (loading || disabled) return;
    Haptics.selectionAsync();
    onPress();
  };

  if (!isPrimary) {
    return (
      <Pressable
        onPress={handle}
        disabled={disabled || loading}
        className="h-14 rounded-2xl items-center justify-center border border-border bg-surface"
      >
        <Text className="text-textHi font-semibold text-base">{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handle}
      disabled={disabled || loading}
      style={({ pressed }) => ({ opacity: pressed || disabled ? 0.85 : 1 })}
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryDim]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: 56,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.primary,
          shadowOpacity: 0.45,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View className="flex-row items-center">
            <Text className="text-white font-semibold text-base tracking-wide">{label}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

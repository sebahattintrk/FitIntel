import React from 'react';
import { Pressable, Text, View, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '@/theme/colors';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export function ChatFab() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        right: 20,
        bottom: Platform.OS === 'ios' ? 110 : 100,
        zIndex: 50,
      }}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('Chat');
        }}
        style={({ pressed }) => ({
          width: 60,
          height: 60,
          borderRadius: 30,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.primary,
          shadowOpacity: pressed ? 0.6 : 0.45,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDim]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 60, height: 60, borderRadius: 30,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 22, marginTop: -2 }}>💬</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

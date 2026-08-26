import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useUserStore } from '@/store/userStore';
import { TabNavigator } from './TabNavigator';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { SupplementDetailScreen } from '@/screens/SupplementDetailScreen';
import { ChatScreen } from '@/screens/ChatScreen';
import { ProgressPhotosScreen } from '@/screens/ProgressPhotosScreen';
import { PremiumScreen } from '@/screens/PremiumScreen';
import { MealPhotoScreen } from '@/screens/MealPhotoScreen';
import { ExercisesScreen } from '@/screens/ExercisesScreen';
import { ExerciseDetailScreen } from '@/screens/ExerciseDetailScreen';
import type { Supplement } from '@/api/queries';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  SupplementDetail: { supplement: Supplement };
  Chat: undefined;
  ProgressPhotos: undefined;
  Premium: undefined;
  MealPhoto: undefined;
  Exercises: undefined;
  ExerciseDetail: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const userId = useUserStore((s) => s.userId);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {userId == null ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="SupplementDetail" component={SupplementDetailScreen} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="ProgressPhotos" component={ProgressPhotosScreen} />
          <Stack.Screen name="Premium" component={PremiumScreen} />
          <Stack.Screen name="MealPhoto" component={MealPhotoScreen} />
          <Stack.Screen name="Exercises" component={ExercisesScreen} />
          <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

import './global.css';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View } from 'react-native';

import { RootNavigator } from '@/navigation/RootNavigator';
import { colors } from '@/theme/colors';
import { useUserStore } from '@/store/userStore';
import { syncNotifications } from '@/utils/notifications';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.textHi,
    border: colors.border,
    primary: colors.primary,
    notification: colors.primary,
  },
};

export default function App() {
  const hydrate = useUserStore((s) => s.hydrate);
  const hydrated = useUserStore((s) => s.hydrated);
  const userId = useUserStore((s) => s.userId);

  useEffect(() => { hydrate(); }, [hydrate]);

  // Sync today's smart notifications whenever we have a user id (cold-start path).
  useEffect(() => {
    if (!hydrated || !userId) return;
    syncNotifications(userId).catch(() => { /* silent: handled inside */ });
  }, [hydrated, userId]);

  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

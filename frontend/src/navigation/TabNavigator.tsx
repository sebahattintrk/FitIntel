import React from 'react';
import { Platform, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';

import { colors } from '@/theme/colors';
import { HomeScreen } from '@/screens/HomeScreen';
import { PlanScreen } from '@/screens/PlanScreen';
import { ProgressScreen } from '@/screens/ProgressScreen';
import { SupplementsScreen } from '@/screens/SupplementsScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
// AI Coach chat is gated as a future premium feature. Route + backend service remain
// live (see RootNavigator + services/aiChat.js) so we can re-enable by un-commenting
// the <ChatFab /> below.
// import { ChatFab } from '@/components/ChatFab';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = {
  AnaSayfa:   '⌂',
  Plan:       '◷',
  Takip:      '◎',
  Supplement: '✦',
  Profil:     '☻',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View className="items-center justify-center">
      <Text
        style={{
          color: focused ? colors.primary : colors.textLow,
          fontSize: 22,
          fontWeight: '600',
          marginTop: 6,
        }}
      >
        {ICONS[name]}
      </Text>
      <Text
        style={{
          color: focused ? colors.textHi : colors.textLow,
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          letterSpacing: 0.4,
        }}
      >
        {name.toUpperCase()}
      </Text>
    </View>
  );
}

export function TabNavigator() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: Platform.OS === 'ios' ? 24 : 16,
          height: 72,
          borderTopWidth: 0,
          borderRadius: 24,
          backgroundColor: 'rgba(18,24,38,0.92)',
          borderColor: colors.border,
          borderWidth: 1,
          elevation: 12,
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={40}
              tint="dark"
              style={{ flex: 1, borderRadius: 24, overflow: 'hidden' }}
            />
          ) : null,
      })}
    >
      <Tab.Screen name="AnaSayfa"   component={HomeScreen} />
      <Tab.Screen name="Plan"       component={PlanScreen} />
      <Tab.Screen name="Takip"      component={ProgressScreen} />
      <Tab.Screen name="Supplement" component={SupplementsScreen} />
      <Tab.Screen name="Profil"     component={ProfileScreen} />
    </Tab.Navigator>
      {/* <ChatFab />  ← re-enable when chat becomes a premium feature */}
    </View>
  );
}

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { HomeScreen } from '../screens/HomeScreen';
import { PlanScreen } from '../screens/PlanScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? insets.bottom : 16,
          left: 14,
          right: 14,
          height: 66,
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          borderWidth: 1.5,
          borderColor: '#E2EFE7',
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: '#064E3B',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Plan"
        component={PlanScreen}
        options={{
          tabBarLabel: 'Öğün & Plan',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
              <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: 'AI Koç',
          tabBarStyle: { display: 'none' }, // Alt menüyü bu ekranda gizler
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
              <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarLabel: 'Gelişim',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
              <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconBox: {
    width: 38,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  iconBoxActive: {
    backgroundColor: '#F0FDF4',
  },
});

export default TabNavigator;
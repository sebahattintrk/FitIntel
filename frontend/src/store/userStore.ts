import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/api/client';

export interface User {
  id: number;
  name: string;
  email?: string;
  is_premium?: boolean;
  trial_ends_at?: string;
  calorie_target?: number;
  protein_target?: number;
  weight_kg?: number;
  goal?: string;
}

interface UserState {
  token: string | null;
  user: User | null;
  userId: number | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  loadAuth: () => Promise<void>;
  setAuth: (token: string, user: User) => Promise<void>;
  setPremium: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  logout: () => Promise<void>;
  clearUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  token: null,
  user: null,
  userId: 1,
  hydrated: false,

  hydrate: async () => {
    try {
      const token = await AsyncStorage.getItem('fitintel_token');
      const userStr = await AsyncStorage.getItem('fitintel_user');
      if (token && userStr) {
        const parsedUser = JSON.parse(userStr);
        set({
          token,
          user: parsedUser,
          userId: Number(parsedUser.id) || 1,
          hydrated: true,
        });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  loadAuth: async () => {
    await get().hydrate();
  },

  setAuth: async (token, user) => {
    await AsyncStorage.setItem('fitintel_token', token);
    await AsyncStorage.setItem('fitintel_user', JSON.stringify(user));
    set({ token, user, userId: Number(user.id) || 1 });
  },

  setPremium: async () => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, is_premium: true };
    await AsyncStorage.setItem('fitintel_user', JSON.stringify(updated));
    set({ user: updated });
  },

  logout: async () => {
    await AsyncStorage.removeItem('fitintel_token');
    await AsyncStorage.removeItem('fitintel_user');
    set({ token: null, user: null, userId: null });
  },

  clearUser: async () => {
    await get().logout();
  },

  deleteAccount: async () => {
    const uid = get().userId;
    if (uid) {
      await api.delete('/api/auth/delete-account', { data: { userId: uid } });
    }
    await get().logout();
  },
}));
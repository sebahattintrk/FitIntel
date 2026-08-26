import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fitintel:user_id';

type State = {
  userId: number | null;
  hydrated: boolean;
  setUserId: (id: number | null) => Promise<void>;
  hydrate: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useUserStore = create<State>((set) => ({
  userId: null,
  hydrated: false,
  setUserId: async (id) => {
    if (id == null) await AsyncStorage.removeItem(KEY);
    else            await AsyncStorage.setItem(KEY, String(id));
    set({ userId: id });
  },
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    set({ userId: raw ? Number(raw) : null, hydrated: true });
  },
  signOut: async () => {
    await AsyncStorage.removeItem(KEY);
    set({ userId: null });
  },
}));

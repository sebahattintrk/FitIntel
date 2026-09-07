import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { api } from '../api/client';
import { useUserStore } from '../store/userStore';

const { width, height } = Dimensions.get('window');

// 🌌 Apple Tarzı Homojen Yumuşak Işık Difüzyonu
function SoftAmbientBackground() {
  const fadeAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.65, duration: 6000, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0.4, duration: 6000, useNativeDriver: true }),
      ])
    ).start();
  }, [fadeAnim]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <LinearGradient
        colors={['#F6FAF8', '#FFFFFF', '#F1F7F4']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View style={[styles.softGlowOrb, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.12)', 'rgba(5, 150, 105, 0.03)', 'transparent']}
          locations={[0, 0.5, 1]}
          style={{ flex: 1, borderRadius: width }}
        />
      </Animated.View>
    </View>
  );
}

export const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const user = useUserStore((s) => s.user);
  const userId = Number(user?.id) || 1;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [waterAdding, setWaterAdding] = useState(false);

  // Hızlı Öğün Girişi
  const [quickMeal, setQuickMeal] = useState('');
  const [mealLogging, setMealLogging] = useState(false);

  const firstName = useMemo(() => {
    if (!user?.name) return 'Dostum';
    return user.name.trim().split(' ')[0];
  }, [user?.name]);

  // 💧 AI Biyometrik Su İhtiyacı Hesabı (Kilo x 35ml + Hedef Metabolik Eki)
  const aiWaterTarget = useMemo(() => {
    const weight = Number(user?.weight_kg || (user as any)?.weight) || 75;
    let base = (weight * 35) / 1000; // Bazal hidrasyon

    if (user?.goal === 'weight_gain' || user?.goal === 'muscle_gain') {
      base += 0.5; // Yüksek protein sentezi ve kas içi glikojen tutulumu için ek su
    } else if (user?.goal === 'fat_loss') {
      base += 0.3; // Termojenez ve tokluk desteği
    }

    return Math.round(base * 10) / 10;
  }, [user?.weight_kg, (user as any)?.weight, user?.goal]);

  // Saate Göre Dinamik Sıradaki Öğün Tespiti
  const nextMeal = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 6 && h < 11) return { name: 'Kahvaltı', time: '08:30', icon: 'sunny-outline' };
    if (h >= 11 && h < 15) return { name: 'Öğle Yemeği', time: '12:45', icon: 'restaurant-outline' };
    if (h >= 15 && h < 18) return { name: 'Ara Öğün', time: '16:30', icon: 'nutrition-outline' };
    return { name: 'Akşam Yemeği', time: '19:30', icon: 'moon-outline' };
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/api/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Dashboard hatası:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchDashboard();
  };

  const handleAddWater = async () => {
    if (waterAdding) return;
    setWaterAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await api.post('/api/dashboard/water');
      if (res.data?.success) {
        setData((prev: any) => ({
          ...prev,
          waterDrankLiters: res.data.waterDrankLiters,
        }));
      }
    } catch (err) {
      console.error('Su eklenemedi:', err);
    } finally {
      setWaterAdding(false);
    }
  };

  const handleQuickMealSubmit = async () => {
    const meal = quickMeal.trim();
    if (!meal || mealLogging) return;

    setMealLogging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await api.post('/api/chat', {
        message: `${meal} yedim, bunu günlüğüme ekle`,
        userId,
      });

      setQuickMeal('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '✅ Günlüğe Eklendi',
        res.data?.loggedItem
          ? `${res.data.loggedItem.food_name} (+${res.data.loggedItem.calories} kcal) eklendi!`
          : 'Öğününüz işlendi.'
      );
      fetchDashboard();
    } catch (err: any) {
      Alert.alert('Hata', 'Öğün eklenemedi: ' + (err?.message || 'Hata oluştu'));
    } finally {
      setMealLogging(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  const consumedCal = Number(data?.caloriesConsumed) || 0;
  const targetCal = Number(data?.caloriesTarget) || 2835;
  const remainingCal = Math.max(0, targetCal - consumedCal);
  const calPercent = Math.min(100, Math.round((consumedCal / targetCal) * 100));

  const proteinConsumed = Number(data?.proteinConsumed) || 0;
  const proteinTarget = Number(data?.proteinTarget) || 104;
  const carbsConsumed = Number(data?.carbsConsumed) || 0;
  const carbsTarget = Number(data?.carbsTarget) || 354;
  const fatConsumed = Number(data?.fatConsumed) || 0;
  const fatTarget = Number(data?.fatTarget) || 79;

  const waterDrank = parseFloat(data?.waterDrankLiters || '0.3');
  const waterTarget = Number(data?.waterTargetLiters) || aiWaterTarget;

  return (
    <View style={styles.root}>
      <SoftAmbientBackground />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: 110,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
        }
      >
        {/* Üst Bar: Minimal ve Net */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
            </Text>
            <Text style={styles.welcomeText}>Selam, {firstName}</Text>
          </View>

          <View style={styles.topRightActions}>
            <View style={styles.streakPill}>
              <Ionicons name="flame" size={15} color="#059669" />
              <Text style={styles.streakCount}>{data?.streakDays || 1}</Text>
            </View>

            <Pressable
              onPress={() => navigation.navigate('Profile')}
              style={({ pressed }) => [styles.avatarCircle, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.avatarChar}>{firstName.charAt(0)}</Text>
            </Pressable>
          </View>
        </View>

        {/* 1. Hero Widget: Apple Health Tarzı Kalori & Makro Özeti */}
        <View style={styles.appleHeroWidget}>
          <View style={styles.heroHeader}>
            <View style={styles.liveIndicatorRow}>
              <View style={styles.liveGreenDot} />
              <Text style={styles.heroSectionTitle}>GÜNLÜK KALORİ DENGESİ</Text>
            </View>
            <Text style={styles.heroPercentage}>%{calPercent}</Text>
          </View>

          {/* Odak Noktası: Kalan Kalori */}
          <View style={styles.primaryCalorieDisplay}>
            <Text style={styles.remainingCalorieNumber}>
              {remainingCal.toLocaleString('tr-TR')}
            </Text>
            <Text style={styles.remainingCalorieLabel}>kcal kaldı</Text>
          </View>

          {/* İnce ve Zarif İlerleme Çubuğu */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(4, calPercent)}%` }]} />
          </View>

          {/* Alt Özet Rakamları */}
          <View style={styles.bottomStatsRow}>
            <View style={styles.bottomStatCol}>
              <Text style={styles.bottomStatValue}>{consumedCal.toLocaleString('tr-TR')}</Text>
              <Text style={styles.bottomStatTitle}>Alınan kcal</Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.bottomStatCol}>
              <Text style={styles.bottomStatValue}>{targetCal.toLocaleString('tr-TR')}</Text>
              <Text style={styles.bottomStatTitle}>Hedef kcal</Text>
            </View>
          </View>

          {/* Sadeleştirilmiş Makro Şeridi */}
          <View style={styles.macroStrip}>
            <MacroInline label="Protein" val={proteinConsumed} max={proteinTarget} color="#059669" />
            <MacroInline label="Karb" val={carbsConsumed} max={carbsTarget} color="#0284C7" />
            <MacroInline label="Yağ" val={fatConsumed} max={fatTarget} color="#D97706" />
          </View>
        </View>

        {/* 2. Bento Grid: Su ve Sıradaki Öğün Yan Yana (Kompakt) */}
        <View style={styles.bentoRow}>
          {/* Sol Karo: AI Hidrasyon */}
          <View style={styles.bentoSquare}>
            <View style={styles.bentoSquareHeader}>
              <Ionicons name="water" size={20} color="#0284C7" />
              <TouchableOpacity
                onPress={handleAddWater}
                disabled={waterAdding}
                style={styles.waterPlusBtn}
                activeOpacity={0.7}
                hitSlop={6}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.waterPlusText}>250 ml</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.bentoSquareTitle}>{waterDrank.toFixed(1)} L</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Text style={styles.bentoSquareSub}>Hedef: {waterTarget.toFixed(1)} L</Text>
                <View style={styles.aiTargetPill}>
                  <Text style={styles.aiTargetPillText}>AI</Text>
                </View>
              </View>
            </View>

            <View style={styles.bentoProgressTrack}>
              <View
                style={[
                  styles.bentoProgressFill,
                  {
                    width: `${Math.min(100, (waterDrank / waterTarget) * 100)}%`,
                    backgroundColor: '#0284C7',
                  },
                ]}
              />
            </View>
          </View>

          {/* Sağ Karo: Sıradaki Öğün */}
          <Pressable
            onPress={() => navigation.navigate('Plan')}
            style={({ pressed }) => [styles.bentoSquare, pressed && styles.cardPressed]}
          >
            <View style={styles.bentoSquareHeader}>
              <Ionicons name={nextMeal.icon as any} size={20} color="#059669" />
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.bentoSquareTitle}>{nextMeal.name}</Text>
              <Text style={styles.bentoSquareSub}>Saat {nextMeal.time}</Text>
            </View>

            <Text style={styles.bentoActionTag}>Planı İncele</Text>
          </Pressable>
        </View>

        {/* 3. Minimalist Hızlı Eylem Çubuğu: Kamera & Hızlı Giriş */}
        <View style={styles.quickActionCard}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              navigation.navigate('MealPhoto');
            }}
            style={({ pressed }) => [styles.cameraQuickBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="camera" size={20} color="#059669" />
          </Pressable>

          <TextInput
            style={styles.quickInput}
            placeholder="Ne yedin? Yaz, koçun kaydetsin…"
            placeholderTextColor="#94A3B8"
            value={quickMeal}
            onChangeText={setQuickMeal}
            onSubmitEditing={handleQuickMealSubmit}
            editable={!mealLogging}
          />

          <TouchableOpacity
            onPress={handleQuickMealSubmit}
            disabled={!quickMeal.trim() || mealLogging}
            style={[
              styles.sendActionBtn,
              (!quickMeal.trim() || mealLogging) && styles.sendActionBtnDisabled,
            ]}
          >
            {mealLogging ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up" size={17} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* 4. Günün AI Koç İçgörüsü (Ferah Cam Banner) */}
        <Pressable
          style={({ pressed }) => [styles.coachBanner, pressed && styles.cardPressed]}
          onPress={() => {
            Haptics.selectionAsync();
            navigation.navigate('Chat');
          }}
        >
          <View style={styles.coachHeaderRow}>
            <View style={styles.coachBadge}>
              <Ionicons name="sparkles" size={13} color="#059669" />
              <Text style={styles.coachBadgeText}>FITINTEL KOÇ</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color="#059669" />
          </View>

          <Text style={styles.coachNoteText} numberOfLines={2}>
            {data?.aiRecommendation ||
              `Bugün hedefinize ulaşmak için ${remainingCal} kcal daha tüketmeniz gerekiyor. Tempoyu koru!`}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

// Satır içi sadeleştirilmiş makro göstergesi
function MacroInline({
  label,
  val,
  max,
  color,
}: {
  label: string;
  val: number;
  max: number;
  color: string;
}) {
  return (
    <View style={styles.macroCol}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={[styles.macroValue, { color }]}>
        {Math.round(val)}
        <Text style={styles.macroMax}>/{max}g</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },

  // Yumuşak Işık Halesi
  softGlowOrb: {
    position: 'absolute',
    top: -height * 0.08,
    right: -width * 0.2,
    width: width * 1.2,
    height: width * 1.2,
  },

  // Üst Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 1,
    marginBottom: 3,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  streakCount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  avatarChar: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // Apple Hero Widget
  appleHeroWidget: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 14,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  heroSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  heroPercentage: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  primaryCalorieDisplay: {
    alignItems: 'center',
    marginBottom: 14,
  },
  remainingCalorieNumber: {
    fontSize: 42,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: -1,
  },
  remainingCalorieLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: -2,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  bottomStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    marginBottom: 12,
  },
  bottomStatCol: {
    alignItems: 'center',
  },
  bottomStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  bottomStatTitle: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  statSeparator: {
    width: 1,
    height: 22,
    backgroundColor: '#F1F5F9',
  },
  macroStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  macroCol: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  macroMax: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },

  // Bento Satırı (2x2 Kompakt)
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  bentoSquare: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    justifyContent: 'space-between',
    minHeight: 125,
  },
  bentoSquareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waterPlusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  waterPlusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  aiTargetPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  aiTargetPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  bentoSquareTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  bentoSquareSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  bentoProgressTrack: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 10,
  },
  bentoProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  bentoActionTag: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
    marginTop: 10,
  },

  // Tek Satır Hızlı Giriş Çubuğu
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 5,
    borderWidth: 1.5,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    marginBottom: 14,
    gap: 10,
  },
  cameraQuickBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
  },
  sendActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendActionBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },

  // AI Koç Notu
  coachBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
  },
  coachHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  coachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  coachBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  coachNoteText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18.5,
    fontWeight: '500',
  },
});

export default HomeScreen;
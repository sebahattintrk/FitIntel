import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { api } from '@/api/client';
import { useUserStore } from '@/store/userStore';

type Step = 'auth' | 'goal' | 'biometrics' | 'lifestyle' | 'processing';

const GOALS = [
  { id: 'fat_loss', title: 'Kilo Vermek', desc: 'Yağ oranını düşür, fit bir görünüme kavuş', icon: 'flame' },
  { id: 'muscle_gain', title: 'Kas Kazanımı', desc: 'Hacim kazan, güç ve kas kütleni artır', icon: 'barbell' },
  { id: 'weight_gain', title: 'Kilo Almak', desc: 'Sağlıklı kalori fazlasıyla kilo al', icon: 'trending-up' },
  { id: 'maintain', title: 'Formu Korumak', desc: 'Mevcut kilonu koruyup sağlıklı beslen', icon: 'shield-checkmark' },
];

export const AuthScreen = () => {
  const setAuth = useUserStore((s) => s.setAuth);

  // Akış Durumu
  const [step, setStep] = useState<Step>('auth');
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Auth Alanları
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [registeredToken, setRegisteredToken] = useState<string>('');

  // 2. Onboarding Alanları
  const [selectedGoal, setSelectedGoal] = useState('muscle_gain');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [dislikedFoods, setDislikedFoods] = useState('');
  const [budget, setBudget] = useState('');

  // 3. Animasyon Değerleri
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [processPhase, setProcessPhase] = useState('Metabolizma hızın (BMR) hesaplanıyor...');

  useEffect(() => {
    if (step === 'processing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
        ])
      ).start();

      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 3800,
        useNativeDriver: false,
      }).start();

      setTimeout(() => {
        setProcessPhase('Hedefine özel günlük kalori ve protein dengeleniyor...');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 1200);

      setTimeout(() => {
        setProcessPhase('Türk mutfağına uygun akıllı öğün planın hazırlanıyor...');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 2400);

      setTimeout(async () => {
        setProcessPhase('Kişisel AI koçun hazır! Başlıyoruz...');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Ana sayfaya uçuş
        if (registeredToken && registeredUser) {
          await setAuth(registeredToken, registeredUser);
        }
      }, 3700);
    }
  }, [step]);

  // Auth Submit
  const handleAuthSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen e-posta ve şifrenizi girin.');
      return;
    }

    if (isLogin) {
      setLoading(true);
      try {
        const res = await api.post('/api/auth/login', { email, password });
        await setAuth(res.data.token, res.data.user);
      } catch (err: any) {
        Alert.alert('Giriş Yapılamadı', err?.response?.data?.error || 'Bilgilerinizi kontrol edin.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Kayıt Doğrulamaları
    if (!name.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen adınızı ve soyadınızı girin.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('Şifre Uyuşmazlığı', 'Girdiğiniz şifreler birbiriyle eşleşmiyor.');
      return;
    }
    if (!agreedTerms) {
      Alert.alert('Onay Gerekiyor', 'Lütfen Kullanım Koşulları ve KVKK metnini onaylayın.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await api.post('/api/auth/register', { name, email, password });
      setRegisteredToken(res.data.token);
      setRegisteredUser(res.data.user);
      // Kayıt başarılı -> Hedef adımına geçir
      setStep('goal');
    } catch (err: any) {
      Alert.alert('Kayıt Başarısız', err?.response?.data?.error || 'Kayıt esnasında bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Onboarding Tamamlama ve Sinematik Animasyonu Başlatma
  const handleFinishOnboarding = async () => {
    if (!age || !height || !weight) {
      Alert.alert('Eksik Veri', 'Yaş, boy ve kilo bilgilerini doldurmalısınız.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/onboarding', {
        userId: registeredUser.id,
        goal: selectedGoal,
        age,
        height_cm: height,
        weight_kg: weight,
        disliked_foods: dislikedFoods,
        budget,
      });

      setRegisteredUser(res.data.user);
      setStep('processing'); // Sinematik ekrana geç
    } catch (err: any) {
      Alert.alert('Hata', 'Bilgiler kaydedilemedi: ' + (err?.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // --- 🎬 SİNEMATİK ANİMASYON EKRANI ---
  if (step === 'processing') {
    return (
      <View style={styles.cinematicContainer}>
        <View style={styles.cinematicCenter}>
          <Animated.View style={[styles.aiCoreGlow, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.aiCoreInner}>
              <Ionicons name="sparkles" size={48} color="#059669" />
            </View>
          </Animated.View>

          <Text style={styles.cinematicTitle}>FitIntel AI Engine</Text>
          <Text style={styles.cinematicSubtitle}>{processPhase}</Text>

          {/* İlerleme Çubuğu */}
          <View style={styles.cinematicProgressTrack}>
            <Animated.View
              style={[
                styles.cinematicProgressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 1. ADIM: GİRİŞ YAP & KAYIT OL */}
          {step === 'auth' && (
            <>
              <View style={styles.header}>
                <View style={styles.iconCircle}>
                  <Ionicons name="flash" size={32} color="#059669" />
                </View>
                <Text style={styles.brandTitle}>FitIntel</Text>
                <Text style={styles.brandSubtitle}>
                  {isLogin ? 'Kişisel AI diyetisyenine tekrar hoş geldin!' : 'Hedeflerine yapay zeka desteğiyle ulaşmaya başla.'}
                </Text>
              </View>

              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tabBtn, !isLogin && styles.tabBtnActive]}
                  onPress={() => setIsLogin(false)}
                >
                  <Text style={[styles.tabBtnText, !isLogin && styles.tabBtnTextActive]}>Kayıt Ol</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabBtn, isLogin && styles.tabBtnActive]}
                  onPress={() => setIsLogin(true)}
                >
                  <Text style={[styles.tabBtnText, isLogin && styles.tabBtnTextActive]}>Giriş Yap</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.form}>
                {!isLogin && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>AD SOYAD</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Sebahattin Türk"
                      placeholderTextColor="#9CA3AF"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>E-POSTA</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ornek@fitintel.com"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ŞİFRE</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                {!isLogin && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>ŞİFRE TEKRAR</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="#9CA3AF"
                        value={passwordConfirm}
                        onChangeText={setPasswordConfirm}
                        secureTextEntry
                      />
                    </View>

                    {/* KVKK ve Koşullar */}
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setAgreedTerms(!agreedTerms)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.checkbox, agreedTerms && styles.checkboxActive]}>
                        {agreedTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>
                      <Text style={styles.checkboxText}>
                        <Text style={{ fontWeight: '700', color: '#111827' }}>Kullanım Koşulları</Text> ve{' '}
                        <Text style={{ fontWeight: '700', color: '#111827' }}>KVKK Aydınlatma Metni</Text>'ni okudum, kabul ediyorum.
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  onPress={handleAuthSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {isLogin ? 'Giriş Yap' : 'Devam Et (Profilini Oluştur) →'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* 2. ADIM: HEDEF SEÇİMİ */}
          {step === 'goal' && (
            <View>
              <Text style={styles.stepBadge}>ADIM 1 / 3</Text>
              <Text style={styles.wizardTitle}>Ana Hedefin Nedir?</Text>
              <Text style={styles.wizardSub}>Yapay zeka koçun kalori ve protein dengesini buna göre kuracak.</Text>

              <View style={{ gap: 12, marginTop: 20 }}>
                {GOALS.map((g) => {
                  const active = selectedGoal === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.goalCard, active && styles.goalCardActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedGoal(g.id);
                      }}
                    >
                      <View style={[styles.goalIconBox, active && styles.goalIconBoxActive]}>
                        <Ionicons name={g.icon as any} size={22} color={active ? '#FFFFFF' : '#059669'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.goalTitle, active && styles.goalTitleActive]}>{g.title}</Text>
                        <Text style={styles.goalDesc}>{g.desc}</Text>
                      </View>
                      {active && <Ionicons name="checkmark-circle" size={22} color="#059669" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { marginTop: 28 }]}
                onPress={() => setStep('biometrics')}
              >
                <Text style={styles.submitBtnText}>Devam Et →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 3. ADIM: BİYOMETRİK VERİLER */}
          {step === 'biometrics' && (
            <View>
              <Text style={styles.stepBadge}>ADIM 2 / 3</Text>
              <Text style={styles.wizardTitle}>Vücut Ölçülerin</Text>
              <Text style={styles.wizardSub}>Günlük bazal metabolizmanı (BMR) tam hesaplamak için gereklidir.</Text>

              <View style={{ gap: 16, marginTop: 24 }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>YAŞIN</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 22"
                    placeholderTextColor="#9CA3AF"
                    value={age}
                    onChangeText={setAge}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>BOYUN (CM)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 178"
                    placeholderTextColor="#9CA3AF"
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>KİLON (KG)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 58.5"
                    placeholderTextColor="#9CA3AF"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 30 }}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep('goal')}>
                  <Text style={styles.backBtnText}>Geri</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { flex: 2 }]} onPress={() => setStep('lifestyle')}>
                  <Text style={styles.submitBtnText}>Devam Et →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 4. ADIM: ALIŞKANLIKLAR & BÜTÇE */}
          {step === 'lifestyle' && (
            <View>
              <Text style={styles.stepBadge}>ADIM 3 / 3</Text>
              <Text style={styles.wizardTitle}>Beslenme Tercihlerin</Text>
              <Text style={styles.wizardSub}>Yapay zeka plan çıkarırken bütçeni aşmaz, sevmediğin yemekleri önermez.</Text>

              <View style={{ gap: 18, marginTop: 24 }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>YEMEDİĞİN VEYA SEVMEDİĞİN BESİNLER</Text>
                  <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                    placeholder="Örn: Pırasa, mantar, balık, sakatat (virgülle ayırabilirsin)"
                    placeholderTextColor="#9CA3AF"
                    value={dislikedFoods}
                    onChangeText={setDislikedFoods}
                    multiline
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>AYLIK TAHMİNİ YEMEK BÜTÇEN (TL - İSTEĞE BAĞLI)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 4000"
                    placeholderTextColor="#9CA3AF"
                    value={budget}
                    onChangeText={setBudget}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep('biometrics')}>
                  <Text style={styles.backBtnText}>Geri</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, { flex: 2 }, loading && styles.submitBtnDisabled]}
                  onPress={handleFinishOnboarding}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Planımı Hesapla 🚀</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF8' },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 20, justifyContent: 'center', flexGrow: 1 },
  header: { alignItems: 'center', marginBottom: 24 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  brandTitle: { fontSize: 28, fontWeight: '900', color: '#111827' },
  brandSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 16 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 14, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabBtnText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  tabBtnTextActive: { color: '#111827' },
  form: { gap: 14 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 0.8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 14, color: '#111827' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#059669', borderColor: '#059669' },
  checkboxText: { fontSize: 12, color: '#4B5563', flex: 1, lineHeight: 17 },
  submitBtn: { backgroundColor: '#059669', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { backgroundColor: '#9CA3AF' },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  backBtn: { backgroundColor: '#E5E7EB', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: '#374151', fontSize: 14, fontWeight: '700' },

  // Wizard Başlıkları
  stepBadge: { fontSize: 11, fontWeight: '800', color: '#059669', letterSpacing: 1, marginBottom: 4 },
  wizardTitle: { fontSize: 24, fontWeight: '900', color: '#111827' },
  wizardSub: { fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 18 },

  // Hedef Kartları
  goalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 18, padding: 16, gap: 14 },
  goalCardActive: { borderColor: '#059669', backgroundColor: '#F0FDF4' },
  goalIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  goalIconBoxActive: { backgroundColor: '#059669' },
  goalTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  goalTitleActive: { color: '#059669' },
  goalDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // 🎬 Sinematik Ekran Stilleri
  cinematicContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  cinematicCenter: { alignItems: 'center', width: '100%' },
  aiCoreGlow: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(5, 150, 105, 0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  aiCoreInner: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', shadowColor: '#059669', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20 },
  cinematicTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  cinematicSubtitle: { fontSize: 13, color: '#94A3B8', marginTop: 10, textAlign: 'center', lineHeight: 19, minHeight: 40, paddingHorizontal: 10 },
  cinematicProgressTrack: { width: '80%', height: 6, backgroundColor: '#1E293B', borderRadius: 3, marginTop: 24, overflow: 'hidden' },
  cinematicProgressBar: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },
});

export default AuthScreen;
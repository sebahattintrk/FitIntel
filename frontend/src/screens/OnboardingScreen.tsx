import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StyleSheet,
  Keyboard,
} from 'react-native';
import * as ClientModule from '../api/client';
import { useUserStore } from '../store/userStore';
import PrimaryButton from '../components/PrimaryButton';

// API istemcisini güvenli şekilde al (default veya named export uyumlu)
const apiInstance: any = (ClientModule as any).api || (ClientModule as any).apiClient || (ClientModule as any).default || ClientModule;

export const OnboardingScreen = () => {
  const userStore = useUserStore() as any;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form Verileri
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Erkek');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('Kas Kazanımı');
  const [budget, setBudget] = useState('');
  const [dislikedFoods, setDislikedFoods] = useState('');

  const handleNext = () => {
    Keyboard.dismiss();
    if (step === 1) {
      if (!name.trim() || !age.trim()) {
        Alert.alert('Eksik Bilgi', 'Lütfen adınızı ve yaşınızı girin.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!height.trim() || !weight.trim()) {
        Alert.alert('Eksik Bilgi', 'Lütfen boy ve kilonuzu girin.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setLoading(true);

    const payload = {
      name: name.trim() || 'Sebahattin',
      age: parseInt(age, 10) || 24,
      gender,
      height: parseFloat(height) || 180,
      weight: parseFloat(weight) || 75,
      goal,
      activityLevel: 'Orta',
      monthlyBudget: parseFloat(budget) || 2000,
      dislikedFoods: dislikedFoods
        ? dislikedFoods.split(',').map((f) => f.trim())
        : [],
    };

    try {
      if (apiInstance && typeof apiInstance.post === 'function') {
        const res = await apiInstance.post('/api/onboarding', payload);
        const savedUser = res?.data?.user || { id: 'user_1', ...payload };
        if (userStore?.setUser) userStore.setUser(savedUser);
      } else {
        if (userStore?.setUser) userStore.setUser({ id: 'user_local', ...payload });
      }
    } catch (error: any) {
      console.log('Sunucu yanıt vermedi, yerel profil ile devam ediliyor:', error?.message);
      if (userStore?.setUser) {
        userStore.setUser({ id: 'user_local', ...payload });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* İlerleme Çubuğu */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' },
              ]}
            />
          </View>

          {/* Başlık */}
          <View style={styles.header}>
            <Text style={styles.subHeader}>FITINTEL</Text>
            <Text style={styles.title}>
              {step === 1
                ? 'Tanışalım'
                : step === 2
                ? 'Hedef & Fizik'
                : 'Son birkaç detay'}
            </Text>
          </View>

          {/* Adım 1 */}
          {step === 1 && (
            <View style={styles.formSection}>
              <Text style={styles.label}>ADIN</Text>
              <TextInput
                style={styles.input}
                placeholder="Adınızı girin"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>YAŞ</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: 24"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
              />

              <Text style={styles.label}>CİNSİYET</Text>
              <View style={styles.optionRow}>
                {['Erkek', 'Kadın', 'Diğer'].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.optionButton,
                      gender === item && styles.optionButtonActive,
                    ]}
                    onPress={() => setGender(item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        gender === item && styles.optionTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Adım 2 */}
          {step === 2 && (
            <View style={styles.formSection}>
              <Text style={styles.label}>BOY (CM)</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: 180"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
              />

              <Text style={styles.label}>KİLO (KG)</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: 75"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />

              <Text style={styles.label}>HEDEF</Text>
              <View style={styles.optionCol}>
                {['Kilo Vermek', 'Kas Kazanımı', 'Formu Korumak'].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.optionButtonWide,
                      goal === item && styles.optionButtonActive,
                    ]}
                    onPress={() => setGoal(item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        goal === item && styles.optionTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Adım 3 */}
          {step === 3 && (
            <View style={styles.formSection}>
              <Text style={styles.label}>AYLIK YEMEK BÜTÇESİ (₺)</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: 2000"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={budget}
                onChangeText={setBudget}
              />

              <Text style={styles.label}>SEVMEDİĞİN YİYECEKLER (VİRGÜLLE AYIR)</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: Mantar, Patlıcan"
                placeholderTextColor="#94A3B8"
                value={dislikedFoods}
                onChangeText={setDislikedFoods}
              />
            </View>
          )}

          {/* Alt Butonlar */}
          <View style={styles.bottomSection}>
            {step > 1 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setStep(step - 1);
                }}
              >
                <Text style={styles.backButtonText}>Geri</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title={step === 3 ? 'Başlayalım' : 'Devam Et'}
                onPress={handleNext}
                loading={loading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E2EFE7',
    borderRadius: 3,
    marginVertical: 14,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  header: {
    marginBottom: 24,
  },
  subHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#064E3B',
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064E3B',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2EFE7',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: '#064E3B',
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionCol: {
    gap: 10,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2EFE7',
    borderRadius: 16,
    alignItems: 'center',
  },
  optionButtonWide: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2EFE7',
    borderRadius: 16,
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
    borderWidth: 2,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  optionTextActive: {
    color: '#064E3B',
    fontWeight: '800',
  },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 'auto',
    paddingTop: 24,
  },
  backButton: {
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2EFE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#064E3B',
  },
});

export default OnboardingScreen;
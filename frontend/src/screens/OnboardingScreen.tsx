import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useOnboarding, OnboardingPayload, Goal, Activity } from '@/api/queries';
import { useUserStore } from '@/store/userStore';
import { colors } from '@/theme/colors';

type Step = 0 | 1 | 2 | 3 | 4;
const TOTAL_STEPS = 5;

const ACTIVITY: { value: Activity; label: string; sub: string }[] = [
  { value: 'sedentary',   label: 'Hareketsiz',  sub: 'Masa başı, az egzersiz' },
  { value: 'light',       label: 'Hafif',       sub: 'Haftada 1–3 gün' },
  { value: 'moderate',    label: 'Orta',        sub: 'Haftada 3–5 gün' },
  { value: 'active',      label: 'Aktif',       sub: 'Haftada 6–7 gün' },
  { value: 'very_active', label: 'Çok Aktif',   sub: 'Fiziksel iş + antrenman' },
];

const GOALS: { value: Goal; label: string; desc: string }[] = [
  { value: 'fat_loss',    label: 'Yağ Kaybı',       desc: 'Kalori açığı, kası koru' },
  { value: 'muscle_gain', label: 'Kas Kazanımı',    desc: 'Yağsız kalori fazlası, yüksek protein' },
  { value: 'recomp',      label: 'Vücut Yenileme',  desc: 'Kiloyu koru, vücut kompozisyonunu değiştir' },
];

export function OnboardingScreen() {
  const [step, setStep] = useState<Step>(0);

  const [name, setName] = useState('');
  const [age, setAge]   = useState('28');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [weight, setWeight] = useState('78');
  const [height, setHeight] = useState('178');
  const [startingWaist, setStartingWaist] = useState('');
  const [activity, setActivity] = useState<Activity>('moderate');
  const [goal, setGoal] = useState<Goal>('fat_loss');
  const [budget, setBudget] = useState('1500');
  const [disliked, setDisliked] = useState('');

  const onboarding = useOnboarding();
  const setUserId = useUserStore((s) => s.setUserId);

  const canContinue = useMemo(() => {
    if (step === 0) return name.trim().length >= 1 && Number(age) >= 13 && Number(age) <= 100;
    if (step === 1) return Number(weight) > 30 && Number(height) > 100;
    return true;
  }, [step, name, age, weight, height]);

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => (s + 1) as Step);
    else submit();
  };
  const back = () => { if (step > 0) setStep((s) => (s - 1) as Step); };

  const submit = async () => {
    const payload: OnboardingPayload = {
      name: name.trim() || undefined,
      age: Number(age),
      gender,
      weight_kg: Number(weight),
      height_cm: Number(height),
      activity_level: activity,
      goal,
      budget: Number(budget) || 0,
      disliked_foods: disliked
        .split(',').map((s) => s.trim()).filter(Boolean),
      starting_waist_cm: startingWaist ? Number(startingWaist) : undefined,
    };
    try {
      const user = await onboarding.mutateAsync(payload);
      await setUserId(user.id);
    } catch (err: any) {
      Alert.alert(
        'Profil oluşturulamadı',
        err?.response?.data?.error || err?.message || 'API\'nin http://localhost:5000 üzerinde çalıştığından emin ol.'
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View className="px-5 pt-4">
          <Text className="text-textLow text-xs uppercase tracking-[3px]">FitIntel</Text>
          <Text className="text-textHi text-3xl font-bold mt-1">
            {step === 0 && 'Tanışalım'}
            {step === 1 && 'Vücut bilgilerin'}
            {step === 2 && 'Ne kadar aktifsin?'}
            {step === 3 && 'Hedefin ne?'}
            {step === 4 && 'Son birkaç detay'}
          </Text>
          <Progress value={(step + 1) / TOTAL_STEPS} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <View>
              <Field label="Adın">
                <Input value={name} onChangeText={setName} placeholder="Emre" />
              </Field>
              <Field label="Yaş">
                <Input value={age} onChangeText={setAge} keyboardType="number-pad" />
              </Field>
              <Field label="Cinsiyet">
                <Choices
                  value={gender}
                  onChange={(v) => setGender(v as any)}
                  options={[
                    { value: 'male',   label: 'Erkek' },
                    { value: 'female', label: 'Kadın' },
                    { value: 'other',  label: 'Diğer' },
                  ]}
                />
              </Field>
            </View>
          )}

          {step === 1 && (
            <View>
              <Field label="Kilo (kg)">
                <Input value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
              </Field>
              <Field label="Boy (cm)">
                <Input value={height} onChangeText={setHeight} keyboardType="decimal-pad" />
              </Field>
              <Field label="Başlangıç bel çevresi (cm) — opsiyonel">
                <Input
                  value={startingWaist}
                  onChangeText={setStartingWaist}
                  keyboardType="decimal-pad"
                  placeholder="örn. 84"
                />
              </Field>
              <Text className="text-textLow text-xs leading-5 -mt-2">
                Bel ölçünü girersen, ilerleyen haftalarda görsel takibe baseline olur.
                Şimdi atlayabilirsin.
              </Text>
            </View>
          )}

          {step === 2 && (
            <View>
              {ACTIVITY.map((a) => (
                <SelectableRow
                  key={a.value}
                  selected={activity === a.value}
                  onPress={() => setActivity(a.value)}
                  title={a.label}
                  subtitle={a.sub}
                />
              ))}
            </View>
          )}

          {step === 3 && (
            <View>
              {GOALS.map((g) => (
                <SelectableRow
                  key={g.value}
                  selected={goal === g.value}
                  onPress={() => setGoal(g.value)}
                  title={g.label}
                  subtitle={g.desc}
                />
              ))}
            </View>
          )}

          {step === 4 && (
            <View>
              <Field label="Aylık yemek bütçesi (₺)">
                <Input value={budget} onChangeText={setBudget} keyboardType="number-pad" />
              </Field>
              <Field label="Sevmediğin yiyecekler (virgülle ayır)">
                <Input
                  value={disliked}
                  onChangeText={setDisliked}
                  placeholder="mantar, zeytin, ..."
                  multiline
                />
              </Field>
              <Text className="text-textLow text-xs mt-3 leading-5">
                Bu bilgileri öğün planını ve supplement önerilerini kişiselleştirmek için
                kullanıyoruz. Profil sayfasından her zaman değiştirebilirsin.
              </Text>
            </View>
          )}
        </ScrollView>

        <View className="px-5 pb-6 pt-2 flex-row" style={{ gap: 12 }}>
          {step > 0 ? (
            <View style={{ flex: 1 }}>
              <PrimaryButton variant="ghost" label="Geri" onPress={back} />
            </View>
          ) : null}
          <View style={{ flex: step > 0 ? 2 : 1 }}>
            <PrimaryButton
              label={step === TOTAL_STEPS - 1 ? 'Planımı Oluştur' : 'Devam Et'}
              onPress={next}
              loading={onboarding.isPending}
              disabled={!canContinue}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <View
      style={{
        height: 6, borderRadius: 6, backgroundColor: colors.border,
        overflow: 'hidden', marginTop: 16,
      }}
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryDim]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ width: `${Math.round(value * 100)}%`, height: '100%' }}
      />
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-textLow text-xs uppercase tracking-widest mb-2">{label}</Text>
      {children}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={colors.textLow}
      {...props}
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 14,
          color: colors.textHi,
          fontSize: 16,
          minHeight: 52,
        },
        props.style,
      ]}
    />
  );
}

function Choices({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <View className="flex-row" style={{ gap: 8 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1, height: 52, borderRadius: 16,
              borderWidth: 1,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: active ? 'rgba(124,77,255,0.18)' : colors.surface,
              borderColor: active ? colors.primary : colors.border,
            }}
          >
            <Text
              style={{
                color: active ? colors.textHi : colors.textMid,
                fontWeight: '600',
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SelectableRow({
  selected, onPress, title, subtitle,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.surface,
        borderColor: selected ? colors.primary : colors.border,
        borderWidth: 1,
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 18,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text className="text-textHi text-base font-semibold">{title}</Text>
        <Text className="text-textMid text-xs mt-1">{subtitle}</Text>
      </View>
      <View
        style={{
          width: 22, height: 22, borderRadius: 22,
          borderWidth: 2,
          borderColor: selected ? colors.primary : colors.border,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {selected ? (
          <View style={{ width: 10, height: 10, borderRadius: 10, backgroundColor: colors.primary }} />
        ) : null}
      </View>
    </Pressable>
  );
}

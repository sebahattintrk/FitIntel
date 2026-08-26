import React from 'react';
import { View, Text, ScrollView, RefreshControl, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { ProgressRing } from '@/components/ProgressRing';
import { InsightCard } from '@/components/InsightCard';
import { MomentumCard } from '@/components/MomentumCard';
import { Loader } from '@/components/Loader';

import { useDashboard, useMealPlan } from '@/api/queries';
import { useUserStore } from '@/store/userStore';
import { colors } from '@/theme/colors';
import { greetingFor, SLOT_LABEL, SLOT_TIME, GOAL_LABEL } from '@/utils/turkish';

export function HomeScreen() {
  const userId = useUserStore((s) => s.userId);
  const dash = useDashboard(userId);
  const plan = useMealPlan(userId);

  if (dash.isLoading) return <Loader label="Yükleniyor…" />;
  if (dash.isError || !dash.data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-textHi text-lg font-semibold">API'ye ulaşılamadı</Text>
          <Text className="text-textMid text-sm mt-2 text-center">
            FitIntel arka ucunun http://localhost:5000 üzerinde çalıştığından emin ol.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { user, today, insight, streak } = dash.data;
  const calorieProgress = today.calories_target ? today.calories_eaten / today.calories_target : 0;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={dash.isFetching && !dash.isLoading}
            onRefresh={() => { dash.refetch(); plan.refetch(); }}
            tintColor={colors.textLow}
          />
        }
      >
        {/* Greeting */}
        <View className="pt-4 pb-3 flex-row items-start justify-between">
          <View style={{ flex: 1 }}>
            <Text className="text-textHi text-2xl font-bold">
              {greetingFor()}{user.name ? `, ${user.name}` : ''} <Text style={{ fontSize: 22 }}>👋</Text>
            </Text>
            <Text className="text-textMid text-sm mt-1">
              Hedef: <Text className="text-textHi font-semibold">{GOAL_LABEL[user.goal] ?? user.goal}</Text>
            </Text>
          </View>
          <NotificationBell />
        </View>

        {/* 1) AI Decision card — first thing the user sees: today's action */}
        <View className="mb-3">
          <InsightCard insight={insight} />
        </View>

        {/* 2) Streak / Momentum */}
        <View className="mb-4">
          <MomentumCard streak={streak} />
        </View>

        {/* 3) Daily summary card */}
        <Card>
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-textHi text-base font-semibold">Günlük Özet</Text>
            <Text className="text-primary text-xs font-semibold">Düzenle</Text>
          </View>

          <View className="flex-row items-center mt-3">
            <ProgressRing
              size={130}
              stroke={12}
              progress={calorieProgress}
              value={String(today.calories_eaten)}
              caption={`/ ${today.calories_target} kcal`}
            />

            <View style={{ flex: 1, paddingLeft: 18 }}>
              <MacroLine label="Protein"      value={today.protein_eaten} target={today.protein_target} color={colors.primary} />
              <MacroTarget label="Karbonhidrat" target={user.carbs_target ?? 0} color={colors.success} />
              <MacroTarget label="Yağ"          target={user.fats_target ?? 0}  color={colors.warning} />
            </View>
          </View>
        </Card>

        {/* Water stat */}
        <View className="mt-4">
          <MiniStat label="Su Tüketimi" value={`${(today.water_ml / 1000).toFixed(1)} / 3`} unit="L" />
        </View>

        {/* Meals timeline */}
        <View className="flex-row items-center justify-between mt-6 mb-3">
          <Text className="text-textHi text-base font-semibold">Bugünkü Öğünler</Text>
          <Text className="text-primary text-xs font-semibold">Tümünü Gör</Text>
        </View>

        {plan.isLoading ? (
          <Loader />
        ) : plan.data ? (
          <View style={{ gap: 10 }}>
            {plan.data.meals.map((m) => (
              <MealRow key={`${m.slot}-${m.id}`}
                slot={m.slot}
                name={m.name}
                description={m.description}
                calories={m.calories}
                protein={Number(m.protein_g)}
                image={m.image_url}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationBell() {
  return (
    <Pressable
      style={{
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 18 }}>🔔</Text>
    </Pressable>
  );
}

function MacroLine({
  label, value, target, color,
}: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text style={{ color: colors.textMid, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: colors.textHi, fontSize: 12, fontWeight: '600' }}>
          {Math.round(value)} <Text style={{ color: colors.textLow }}>/ {Math.round(target)}g</Text>
        </Text>
      </View>
      <View
        style={{
          height: 6, borderRadius: 6,
          backgroundColor: colors.border, overflow: 'hidden',
        }}
      >
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: 6 }} />
      </View>
    </View>
  );
}

function MiniStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
      }}
    >
      <Text style={{ color: colors.textLow, fontSize: 11, letterSpacing: 1.4 }}>{label.toUpperCase()}</Text>
      <View className="flex-row items-baseline mt-1">
        <Text style={{ color: colors.textHi, fontSize: 18, fontWeight: '800' }}>{value}</Text>
        <Text style={{ color: colors.textLow, fontSize: 11, marginLeft: 4 }}>{unit}</Text>
      </View>
    </View>
  );
}

function MacroTarget({ label, target, color }: { label: string; target: number; color: string }) {
  return (
    <View className="mb-3">
      <View className="flex-row justify-between">
        <Text style={{ color: colors.textMid, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: colors.textHi, fontSize: 12, fontWeight: '600' }}>
          <Text style={{ color: colors.textLow }}>Hedef:</Text> {Math.round(target)}g
        </Text>
      </View>
      <View style={{ height: 4, marginTop: 6, borderRadius: 4, backgroundColor: colors.border }}>
        <View style={{ width: '100%', height: 4, backgroundColor: color, opacity: 0.25, borderRadius: 4 }} />
      </View>
    </View>
  );
}

function MealRow({
  slot, name, description, calories, protein, image,
}: {
  slot: string; name: string; description?: string;
  calories: number; protein: number; image?: string;
}) {
  return (
    <Card padded={false} className="overflow-hidden">
      <View className="flex-row items-center">
        {image ? (
          <Image source={{ uri: image }} style={{ width: 80, height: 80 }} resizeMode="cover" />
        ) : (
          <View style={{ width: 80, height: 80, backgroundColor: colors.surface2 }} />
        )}
        <View className="flex-1 px-3 py-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-textHi text-sm font-semibold">{SLOT_LABEL[slot] ?? slot}</Text>
            <Text className="text-textLow text-xs">{SLOT_TIME[slot] ?? ''}</Text>
          </View>
          <Text className="text-textMid text-xs mt-1" numberOfLines={1}>
            {name}
          </Text>
          <Text className="text-textLow text-[11px] mt-1">
            {calories} kcal · {Math.round(protein)}g protein
          </Text>
        </View>
      </View>
    </Card>
  );
}

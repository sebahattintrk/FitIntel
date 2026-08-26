import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';
import type { Streak } from '@/api/queries';

type Props = {
  streak: Streak;
};

export function MomentumCard({ streak }: Props) {
  // Day 0: never logged anything → onboarding nudge
  if (streak.current === 0) {
    return (
      <LinearGradient
        colors={['rgba(124,77,255,0.20)', 'rgba(18,24,38,0.4)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={cardStyle}
      >
        <View className="flex-row items-center">
          <Text style={{ fontSize: 26, marginRight: 12 }}>✨</Text>
          <View style={{ flex: 1 }}>
            <Text style={titleStyle}>İlk günün</Text>
            <Text style={subtitleStyle}>Bugün bir öğün tikle veya logla, streak başlasın.</Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // Active streak — show flame + count + status
  const todayBadge = streak.today_logged ? '✓ Bugün' : '· Bugünü işaretle';
  const todayColor = streak.today_logged ? colors.success : colors.warning;

  const progressPct = streak.next_milestone && streak.next_milestone > 0
    ? Math.min(1, streak.current / streak.next_milestone)
    : 1;

  return (
    <LinearGradient
      colors={['rgba(245,158,11,0.18)', 'rgba(124,77,255,0.10)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={cardStyle}
    >
      <View className="flex-row items-center">
        <View style={{ alignItems: 'center', marginRight: 14, minWidth: 50 }}>
          <Text style={{ fontSize: 28 }}>🔥</Text>
          <Text style={{ color: colors.textHi, fontSize: 22, fontWeight: '900', marginTop: -4 }}>
            {streak.current}
          </Text>
          <Text style={{ color: colors.textLow, fontSize: 9, letterSpacing: 1, marginTop: -2 }}>
            GÜN
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <View className="flex-row items-center" style={{ marginBottom: 4 }}>
            <Text style={titleStyle}>
              {streak.current >= 30 ? '30+ gün serisi' :
               streak.current >= 14 ? '2 hafta serisi' :
               streak.current >= 7  ? 'Haftalık seri' :
               streak.current >= 3  ? '3 günlük seri' :
                                      'Yeni seri'}
            </Text>
            <Text style={{ color: todayColor, fontSize: 10, fontWeight: '700', marginLeft: 8 }}>
              {todayBadge}
            </Text>
          </View>

          {streak.next_milestone != null && streak.days_to_next != null ? (
            <>
              <Text style={subtitleStyle} numberOfLines={2}>
                {streak.days_to_next === 1
                  ? `1 gün kaldı: ${streak.next_milestone}-gün hedefine.`
                  : `${streak.days_to_next} gün kaldı: ${streak.next_milestone}-gün hedefine.`}
              </Text>

              {/* progress bar to next milestone */}
              <View
                style={{
                  height: 4,
                  borderRadius: 4,
                  marginTop: 7,
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${progressPct * 100}%`,
                    height: '100%',
                    backgroundColor: colors.warning,
                    borderRadius: 4,
                  }}
                />
              </View>
            </>
          ) : (
            <Text style={subtitleStyle}>
              {streak.milestone_label || 'Bu seriyi koru.'}
            </Text>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const cardStyle = {
  borderRadius: 18,
  padding: 14,
  borderWidth: 1,
  borderColor: colors.border,
} as const;

const titleStyle = {
  color: colors.textHi,
  fontSize: 14,
  fontWeight: '700' as const,
};

const subtitleStyle = {
  color: colors.textMid,
  fontSize: 12,
  lineHeight: 16,
};

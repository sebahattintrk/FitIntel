// Localization helpers — single-language Turkish for the MVP.

export const SLOT_LABEL: Record<string, string> = {
  breakfast: 'Kahvaltı',
  lunch:     'Öğle Yemeği',
  dinner:    'Akşam Yemeği',
  snack:     'Ara Öğün',
};

export const SLOT_TIME: Record<string, string> = {
  breakfast: '08:30',
  lunch:     '13:00',
  dinner:    '19:30',
  snack:     '16:30',
};

export const GOAL_LABEL: Record<string, string> = {
  fat_loss:    'Yağ Kaybı',
  muscle_gain: 'Kas Kazanımı',
  recomp:      'Vücut Yenileme',
};

export const ACTIVITY_LABEL: Record<string, string> = {
  sedentary:   'Hareketsiz',
  light:       'Hafif Aktif',
  moderate:    'Orta Aktif',
  active:      'Aktif',
  very_active: 'Çok Aktif',
};

export const GENDER_LABEL: Record<string, string> = {
  male:   'Erkek',
  female: 'Kadın',
  other:  'Diğer',
};

export const SUPPLEMENT_CATEGORY_LABEL: Record<string, string> = {
  whey:      'Whey',
  isolate:   'İzolat',
  vegan:     'Vegan',
  creatine:  'Kreatin',
  preworkout:'Pre-workout',
  vitamin:   'Vitamin',
};

export function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 6)  return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export function formatTRY(n: number): string {
  return Number(n || 0).toLocaleString('tr-TR');
}

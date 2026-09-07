import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Bildirim davranış ayarı
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface MealNotification {
  hour: number;
  minute: number;
  title: string;
  body: string;
}

const GOAL_NOTIFICATIONS: Record<string, Record<'breakfast' | 'lunch' | 'snack' | 'dinner', { title: string; body: string }>> = {
  weight_gain: {
    breakfast: {
      title: '🍳 Kahvaltıyı Sakın Atlama!',
      body: 'Kilo almanın altın kuralı güne yüksek kaloriyle başlamaktır. Yumurta ve yulafını hazırla!',
    },
    lunch: {
      title: '🍗 Öğle Yemeği Vakti: Hacim Kazan!',
      body: 'Günün en kritik öğünü. Tabağına pirinç ve proteinini bolca koymayı unutma.',
    },
    snack: {
      title: '🥜 Temiz Kalori Takviyesi',
      body: 'İştahın yoksa bile fıstık ezmesi, kuruyemiş veya shake ile kalori hedefini yakala.',
    },
    dinner: {
      title: '🍲 Akşam Yemeği: Hedefi Tamamla!',
      body: 'Bugünkü kalori açığını kapatma zamanı. Sağlıklı karbonhidrat ve et/tavuk seni bekler.',
    },
  },
  fat_loss: {
    breakfast: {
      title: '☀️ Metabolizmayı Ateşle!',
      body: 'Bol proteinli bir kahvaltı gün boyu tatlı krizlerini engeller. Su içmeyi unutma!',
    },
    lunch: {
      title: '🥗 Hacimli ve Doyurucu Öğle Menüsü',
      body: 'Salatanı ve proteinini önden ye, tokluk sinyallerini erken aktive et.',
    },
    snack: {
      title: '🍏 Tatlı Krizine Akıllı Önlem',
      body: 'Bir avuç badem veya yeşil elma ile akşama kadar kan şekerini dengede tut.',
    },
    dinner: {
      title: '🍲 Hafif ve Temiz Akşam Kapanışı',
      body: 'Gece rahat uyumak ve yağ yakımını sürdürmek için hafif ve lifli besleniyoruz.',
    },
  },
  muscle_gain: {
    breakfast: {
      title: '💪 Kas Sentezini Başlat!',
      body: 'Geceki kas açlığını durdurmak için tabağında en az 30g protein olsun.',
    },
    lunch: {
      title: '⚡ Antrenman Yakıtı: Öğle Öğünü',
      body: 'Kaslarını doldurma vakti. Kompleks karbonhidrat ve kaliteli proteini ihmal etme.',
    },
    snack: {
      title: '🥤 Anabolik Aralık Alarmı',
      body: 'Kas onarımını sürdürmek için proteinli ara öğününü alma saati geldi.',
    },
    dinner: {
      title: '🥩 Gece Onarımı İçin Akşam Yemeği',
      body: 'Gece boyunca kas gelişiminin sürmesi için protein hedefini tamamla.',
    },
  },
  maintain: {
    breakfast: {
      title: '🌿 Dengeli Bir Güne Merhaba',
      body: 'Güne zinde başlamak için renkli ve dengeli bir tabak hazırla.',
    },
    lunch: {
      title: '🥗 Enerjini Koru: Öğle Molası',
      body: 'Öğleden sonra rehavet çökmemesi için dengeli porsiyonlarla beslen.',
    },
    snack: {
      title: '💧 Su ve Enerji Molası',
      body: 'Bir bardak soğuk su iç ve hafif bir ara öğünle enerjini tazele.',
    },
    dinner: {
      title: '🍲 Günün Dengesi: Akşam Yemeği',
      body: 'Bugünkü beslenme hedeflerini tamamlayacak dengeli bir akşam tabağı hazırla.',
    },
  },
};

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

export async function scheduleGoalNotifications(goal: string = 'muscle_gain') {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // Çakışmaları önlemek için eski bildirimleri temizle
  await Notifications.cancelAllScheduledNotificationsAsync();

  const activeGoal = GOAL_NOTIFICATIONS[goal] ? goal : 'muscle_gain';
  const templates = GOAL_NOTIFICATIONS[activeGoal];

  const scheduleConfig: MealNotification[] = [
    { hour: 8, minute: 30, ...templates.breakfast },
    { hour: 12, minute: 45, ...templates.lunch },
    { hour: 16, minute: 30, ...templates.snack },
    { hour: 19, minute: 30, ...templates.dinner },
  ];

  for (const item of scheduleConfig) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body: item.body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: item.hour,
        minute: item.minute,
      },
    });
  }

  console.log(`✅ ${activeGoal} hedefine özel 4 öğün bildirimi başarıyla planlandı.`);
}

export async function sendInstantTestNotification(goal: string = 'weight_gain') {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return false;

  const activeGoal = GOAL_NOTIFICATIONS[goal] ? goal : 'weight_gain';
  const sample = GOAL_NOTIFICATIONS[activeGoal].lunch;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: sample.title, // [TEST] veya [FitIntel] kaldırıldı
      body: sample.body,
      sound: true,
    },
    trigger: null,
  });
  return true;
}
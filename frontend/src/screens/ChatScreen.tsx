import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import { useUserStore } from '@/store/userStore';
import { useChat, type ChatMessage } from '@/api/queries';
import { PaywallModal } from '@/components/PaywallModal';
import { api } from '@/api/client';

const { width, height } = Dimensions.get('window');

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
}

const GOAL_SUGGESTIONS: Record<string, string[]> = {
  weight_gain: [
    'İştahım yokken temiz kalori nasıl artırabilirim?',
    'Gece yatmadan önce ne yemem kilo aldırır?',
    'Bütçemi yormayacak yüksek kalorili ara öğün öner',
  ],
  fat_loss: [
    'Kilo verirken kas kaybetmemek için ne yapmalıyım?',
    'Tatlı krizlerini bastırmak için pratik ara öğün',
    'Açlık hissettiğimde kalorisi sıfıra yakın ne yiyebilirim?',
  ],
  muscle_gain: [
    'Bugün pratik ve yüksek proteinli ne yiyebilirim?',
    'Antrenmandan hemen önce ve sonra ne tüketmeliyim?',
    'Kas kütlemi artırırken yağlanmayı nasıl önlerim?',
  ],
  maintain: [
    'Hafta sonu kaçamağı yaptım, bugün nasıl dengelemeliyim?',
    'Bütçeme uygun dengeli bir gün menüsü önerir misin?',
    'Günlük su ve lif ihtiyacımı nasıl tamamlarım?',
  ],
};

// 🌌 Dinamik Çok Katmanlı Aurora / Mesh Arka Plan
function DynamicAmbientBackground() {
  const orbAnim1 = useRef(new Animated.Value(0)).current;
  const orbAnim2 = useRef(new Animated.Value(0)).current;
  const orbAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createLoop = (anim: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createLoop(orbAnim1, 9500);
    const anim2 = createLoop(orbAnim2, 12000);
    const anim3 = createLoop(orbAnim3, 14000);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [orbAnim1, orbAnim2, orbAnim3]);

  // Orb 1: Üst Sağ - Zümrüt Işığı
  const orb1Style = {
    transform: [
      {
        translateX: orbAnim1.interpolate({
          inputRange: [0, 1],
          outputRange: [20, -45],
        }),
      },
      {
        translateY: orbAnim1.interpolate({
          inputRange: [0, 1],
          outputRange: [-30, 40],
        }),
      },
      {
        scale: orbAnim1.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.28],
        }),
      },
    ],
  };

  // Orb 2: Orta Sol - Turkuaz / Cyan Derinliği
  const orb2Style = {
    transform: [
      {
        translateX: orbAnim2.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, 35],
        }),
      },
      {
        translateY: orbAnim2.interpolate({
          inputRange: [0, 1],
          outputRange: [10, -50],
        }),
      },
      {
        scale: orbAnim2.interpolate({
          inputRange: [0, 1],
          outputRange: [1.15, 0.9],
        }),
      },
    ],
  };

  // Orb 3: Alt Merkez/Sağ - Yumuşak Lime / Altın Işık
  const orb3Style = {
    transform: [
      {
        translateX: orbAnim3.interpolate({
          inputRange: [0, 1],
          outputRange: [30, -25],
        }),
      },
      {
        translateY: orbAnim3.interpolate({
          inputRange: [0, 1],
          outputRange: [40, -20],
        }),
      },
      {
        scale: orbAnim3.interpolate({
          inputRange: [0, 1],
          outputRange: [0.95, 1.2],
        }),
      },
    ],
  };

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* İpeksi Ana Gradyan Zemin */}
      <LinearGradient
        colors={['#F0FDF4', '#F8FAFC', '#F0FDFA', '#FFFFFF']}
        locations={[0, 0.4, 0.75, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 1. Üst Sağ Zümrüt Küresi */}
      <Animated.View style={[styles.auroraOrb, styles.orbTopRight, orb1Style]}>
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.32)', 'rgba(52, 211, 153, 0.14)', 'transparent']}
          locations={[0, 0.55, 1]}
          style={styles.fillRounded}
        />
      </Animated.View>

      {/* 2. Orta Sol Turkuaz Küresi */}
      <Animated.View style={[styles.auroraOrb, styles.orbMidLeft, orb2Style]}>
        <LinearGradient
          colors={['rgba(6, 182, 212, 0.26)', 'rgba(20, 184, 166, 0.12)', 'transparent']}
          locations={[0, 0.6, 1]}
          style={styles.fillRounded}
        />
      </Animated.View>

      {/* 3. Alt Sağ Taze Lime / Adaçayı Küresi */}
      <Animated.View style={[styles.auroraOrb, styles.orbBottomRight, orb3Style]}>
        <LinearGradient
          colors={['rgba(74, 222, 128, 0.28)', 'rgba(167, 243, 208, 0.1)', 'transparent']}
          locations={[0, 0.5, 1]}
          style={styles.fillRounded}
        />
      </Animated.View>

      {/* Yüzey Cam Matlığı - Işıkları homojen dağıtan mikro filtre */}
      <LinearGradient
        colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.55)']}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

export function ChatScreen() {
  const navigation = useNavigation<any>();
  const user = useUserStore((s) => s.user);
  const userId = useUserStore((s) => Number(s.user?.id) || 1);
  const setPremium = useUserStore((s) => s.setPremium);
  const chat = useChat(userId);

  const SESSIONS_STORAGE_KEY = `@fitintel_chat_sessions_${userId}`;
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);

  // Karşılama İkonu Pulse Animasyonu
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1.25, duration: 2200, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.08, duration: 2200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1, duration: 2200, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.4, duration: 2200, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [pulseScale, pulseOpacity]);

  const firstName = useMemo(() => {
    if (!user?.name) return 'Dostum';
    return user.name.trim().split(' ')[0];
  }, [user?.name]);

  const suggestions = useMemo(() => {
    return GOAL_SUGGESTIONS[user?.goal || ''] || GOAL_SUGGESTIONS.muscle_gain;
  }, [user?.goal]);

  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || null;
  }, [sessions, activeSessionId]);

  const messages = currentSession ? currentSession.messages : [];

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SESSIONS_STORAGE_KEY);
        if (saved) {
          const parsed: ChatSession[] = JSON.parse(saved);
          if (parsed.length > 0) {
            setSessions(parsed);
            setActiveSessionId(parsed[0].id);
            return;
          }
        }
        startNewChat();
      } catch (e) {
        console.log('Oturum yükleme hatası:', e);
      }
    })();
  }, [userId]);

  const saveSessionsToStorage = async (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    try {
      await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
    } catch (e) {
      console.log('Oturum kaydetme hatası:', e);
    }
  };

  const startNewChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Yeni Sohbet',
      createdAt: Date.now(),
      messages: [],
    };
    const updated = [newSession, ...sessions.filter((s) => s.messages.length > 0)];
    saveSessionsToStorage(updated);
    setActiveSessionId(newSession.id);
    setHistoryModalVisible(false);
  };

  const deleteSession = (sessionId: string) => {
    Alert.alert('Sohbeti Sil', 'Bu sohbet kaydı kalıcı olarak silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          const filtered = sessions.filter((s) => s.id !== sessionId);
          saveSessionsToStorage(filtered);
          if (activeSessionId === sessionId) {
            if (filtered.length > 0) {
              setActiveSessionId(filtered[0].id);
            } else {
              startNewChat();
            }
          }
        },
      },
    ]);
  };

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages.length, chat.isPending]);

  const handleUpgradeSuccess = async () => {
    try {
      await api.post('/api/auth/upgrade', { userId });
      await setPremium();
      Alert.alert('Tebrikler! 🎉', 'FitIntel PRO aktif edildi. Tüm koçluk özellikleri sınırsız!');
    } catch (e: any) {
      Alert.alert('Hata', 'Üyelik yükseltilemedi: ' + (e?.message || ''));
    }
  };

  const send = async (text?: string) => {
    const content = (text ?? draft).trim();
    if (!content || chat.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userMsg: ChatMessage = { role: 'user', content };
    const currentMsgs = currentSession ? currentSession.messages : [];
    const newMessages = [...currentMsgs, userMsg];

    const sessionTitle =
      currentMsgs.length === 0
        ? content.slice(0, 24) + (content.length > 24 ? '…' : '')
        : currentSession?.title || 'Sohbet';

    const updatedSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? { ...s, title: sessionTitle, messages: newMessages }
        : s
    );
    saveSessionsToStorage(updatedSessions);
    setDraft('');

    try {
      const res = await chat.mutateAsync({ message: content, history: currentMsgs });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const withAssistant = [...newMessages, { role: 'assistant', content: res.reply } as ChatMessage];
      const finalizedSessions = updatedSessions.map((s) =>
        s.id === activeSessionId ? { ...s, messages: withAssistant } : s
      );
      saveSessionsToStorage(finalizedSessions);
    } catch (err: any) {
      if (err?.response?.data?.code === 'LIMIT_REACHED') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setPaywallVisible(true);
        return;
      }

      const rawError = JSON.stringify(err?.response?.data || err?.message || '');
      let friendlyNote = 'Şu an bağlantıda kısa bir gecikme oldu. Lütfen 10-15 saniye sonra tekrar dene.';
      if (rawError.includes('429') || rawError.includes('quota') || rawError.includes('RESOURCE_EXHAUSTED')) {
        friendlyNote = 'AI Koçun kısa bir mola veriyor. Birkaç saniye sonra tekrar sorabilirsin! ⚡';
      }

      const withError = [...newMessages, { role: 'assistant', content: friendlyNote } as ChatMessage];
      saveSessionsToStorage(
        updatedSessions.map((s) => (s.id === activeSessionId ? { ...s, messages: withError } : s))
      );
    }
  };

  return (
    <View style={styles.rootContainer}>
      {/* 🌟 Gelişmiş Dinamik Aurora Mesh Arka Plan */}
      <DynamicAmbientBackground />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Minimalist Header */}
        <View style={styles.headerGlass}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => setHistoryModalVisible(true)}
              hitSlop={12}
              style={styles.headerCircleBtn}
            >
              <Ionicons name="menu" size={22} color="#0F172A" />
            </Pressable>

            <View style={styles.modelBadgeGlass}>
              <View style={styles.onlinePulsingDot} />
              <Text style={styles.modelBadgeText}>FitIntel AI 3.6</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={startNewChat}
              hitSlop={10}
              style={styles.newChatGlassBtn}
            >
              <Ionicons name="add" size={18} color="#059669" />
              <Text style={styles.newChatGlassText}>Yeni</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('Profile')}
              hitSlop={10}
              style={styles.avatarGlow}
            >
              <Text style={styles.avatarText}>{firstName.charAt(0)}</Text>
            </Pressable>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}
        >
          {messages.length === 0 ? (
            <View style={styles.heroCenterContainer}>
              <View style={styles.heroGlowWrapper}>
                <Animated.View
                  style={[
                    styles.heroPulsingHalo,
                    {
                      transform: [{ scale: pulseScale }],
                      opacity: pulseOpacity,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['rgba(16, 185, 129, 0.55)', 'rgba(5, 150, 105, 0)']}
                    style={{ flex: 1, borderRadius: 60 }}
                  />
                </Animated.View>
                <View style={styles.heroCoreStar}>
                  <Ionicons name="sparkles" size={32} color="#059669" />
                </View>
              </View>

              <Text style={styles.heroGreetingText}>
                Sorabilirsiniz, {firstName}.
              </Text>
              <Text style={styles.heroSubText}>
                Beslenme hedefin, kalori dengesi veya pratik tarifler hakkında konuşalım.
              </Text>

              <View style={styles.heroSuggestions}>
                {suggestions.map((s, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => send(s)}
                    style={styles.heroSuggestionCard}
                  >
                    <View style={styles.suggestionSparkleDot}>
                      <Ionicons name="sparkle" size={12} color="#059669" />
                    </View>
                    <Text style={styles.heroSuggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.messagesScroll}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((m, i) => (
                <AnimatedMessageBubble key={`${i}-${m.role}`} role={m.role} content={m.content} />
              ))}

              {chat.isPending && (
                <View style={styles.loadingRow}>
                  <View style={styles.loadingGlassBox}>
                    <ActivityIndicator size="small" color="#059669" />
                    <Text style={styles.loadingText}>Koç hazırlıyor…</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* Giriş Adası */}
          <View style={styles.inputWrapper}>
            <View style={styles.floatingInputBar}>
              <Pressable
                onPress={startNewChat}
                hitSlop={10}
                style={styles.inputPlusCircle}
              >
                <Ionicons name="add" size={20} color="#475569" />
              </Pressable>

              <TextInput
                placeholder="FitIntel Koç'a bir şey sor…"
                placeholderTextColor="#94A3B8"
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={() => send()}
                multiline
                style={styles.inputField}
                editable={!chat.isPending}
              />

              {draft.trim() ? (
                <Pressable
                  onPress={() => send()}
                  disabled={chat.isPending}
                  style={styles.sendButtonGlow}
                >
                  <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                </Pressable>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 4 }}>
                  <Ionicons name="mic-outline" size={20} color="#64748B" />
                  <View style={styles.waveMicroIcon}>
                    <Ionicons name="pulse" size={15} color="#059669" />
                  </View>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Sohbet Geçmişi Modal */}
        <Modal
          visible={historyModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setHistoryModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sohbet Geçmişi</Text>
              <Pressable
                onPress={() => setHistoryModalVisible(false)}
                hitSlop={12}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#334155" />
              </Pressable>
            </View>

            <Pressable onPress={startNewChat} style={styles.modalNewChatBtn}>
              <Ionicons name="add-circle" size={22} color="#059669" />
              <Text style={styles.modalNewChatText}>Yeni Sohbet Başlat</Text>
            </Pressable>

            <ScrollView style={{ flex: 1, marginTop: 14 }}>
              {sessions.map((sess) => {
                const isSelected = sess.id === activeSessionId;
                return (
                  <View
                    key={sess.id}
                    style={[
                      styles.historyItem,
                      isSelected && styles.historyItemSelected,
                    ]}
                  >
                    <Pressable
                      onPress={() => {
                        setActiveSessionId(sess.id);
                        setHistoryModalVisible(false);
                      }}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    >
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={18}
                        color={isSelected ? '#059669' : '#64748B'}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.historyItemTitle,
                          isSelected && { color: '#059669', fontWeight: '700' },
                        ]}
                      >
                        {sess.title || 'İsimsiz Sohbet'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => deleteSession(sess.id)}
                      hitSlop={8}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={17} color="#94A3B8" />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </Modal>

        <PaywallModal
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          onSuccess={handleUpgradeSuccess}
        />
      </SafeAreaView>
    </View>
  );
}

function AnimatedMessageBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';

  const slideAnim = useRef(new Animated.Value(isUser ? 14 : 18)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 75,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 75,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacityAnim, slideAnim, scaleAnim]);

  if (isUser) {
    return (
      <Animated.View
        style={[
          styles.userBubbleWrapper,
          {
            opacity: opacityAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#059669', '#10B981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userBubbleGradient}
        >
          <Text style={styles.userBubbleText}>{content}</Text>
        </LinearGradient>
      </Animated.View>
    );
  }

  const paragraphs = content.split('\n').filter((p) => p.trim().length > 0);

  return (
    <Animated.View
      style={[
        styles.assistantCardWrapper,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.assistantCard}>
        <View style={styles.assistantHeader}>
          <View style={styles.assistantIconGlow}>
            <Ionicons name="sparkles" size={13} color="#059669" />
          </View>
          <Text style={styles.assistantBadgeText}>FITINTEL AI</Text>
        </View>

        <View style={{ gap: 8 }}>
          {paragraphs.map((para, idx) => {
            const isBullet = para.trim().startsWith('* ') || para.trim().startsWith('- ');
            const cleanText = para.replace(/^[\*\-\•]\s*/, '').trim();

            return (
              <View key={idx} style={isBullet ? styles.bulletRow : null}>
                {isBullet && <Text style={styles.bulletSymbol}>•</Text>}
                <Text style={styles.assistantBodyText}>
                  {renderFormattedText(cleanText)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*\*.*?\*\*\*|\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('***') && part.endsWith('***')) {
      return (
        <Text key={index} style={styles.highlightText}>
          {part.slice(3, -3)}
        </Text>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={index} style={styles.boldText}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part.replace(/\*/g, '');
  });
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Aurora Mesh Arka Plan Katmanları
  auroraOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  fillRounded: {
    flex: 1,
    borderRadius: 999,
  },
  orbTopRight: {
    top: -height * 0.12,
    right: -width * 0.25,
    width: width * 1.35,
    height: width * 1.35,
  },
  orbMidLeft: {
    top: height * 0.28,
    left: -width * 0.35,
    width: width * 1.25,
    height: width * 1.25,
  },
  orbBottomRight: {
    bottom: -height * 0.1,
    right: -width * 0.2,
    width: width * 1.2,
    height: width * 1.2,
  },

  // Cam Header
  headerGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.65)',
  },
  headerCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modelBadgeGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  onlinePulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  modelBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  newChatGlassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 253, 245, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 3,
  },
  newChatGlassText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  avatarGlow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Karşılama Ekranı
  heroCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: -20,
  },
  heroGlowWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heroPulsingHalo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  heroCoreStar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 4,
  },
  heroGreetingText: {
    fontSize: 27,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  heroSubText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
    paddingHorizontal: 12,
  },
  heroSuggestions: {
    width: '100%',
    marginTop: 26,
    gap: 9,
  },
  heroSuggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    gap: 10,
  },
  suggestionSparkleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSuggestionText: {
    color: '#334155',
    fontSize: 13.5,
    fontWeight: '600',
    flex: 1,
  },

  // Mesaj Akışı
  messagesScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  userBubbleWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 6,
  },
  userBubbleGradient: {
    maxWidth: '82%',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderTopRightRadius: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
  },
  userBubbleText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  assistantCardWrapper: {
    marginVertical: 6,
    maxWidth: '90%',
  },
  assistantCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderTopLeftRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  assistantIconGlow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.8,
  },
  assistantBodyText: {
    fontSize: 15,
    color: '#1E293B',
    lineHeight: 23,
    flex: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingLeft: 4,
  },
  bulletSymbol: {
    fontSize: 16,
    color: '#059669',
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '800',
    color: '#0F172A',
  },
  highlightText: {
    fontWeight: '800',
    color: '#059669',
  },

  // Loading
  loadingRow: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  loadingGlassBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },

  // Giriş Çubuğu (Floating Island)
  inputWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 4,
  },
  floatingInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 32,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.98)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  inputPlusCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingHorizontal: 12,
    maxHeight: 100,
    minHeight: 26,
  },
  sendButtonGlow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  waveMicroIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalNewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  modalNewChatText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginVertical: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyItemSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  historyItemTitle: {
    fontSize: 14.5,
    color: '#334155',
    fontWeight: '500',
  },
});

export default ChatScreen;
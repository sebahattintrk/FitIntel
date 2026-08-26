import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/colors';
import { useUserStore } from '@/store/userStore';
import { useChat, type ChatMessage } from '@/api/queries';

const SUGGESTIONS = [
  'Bugün param az, ne yiyebilirim?',
  'Protein hedefimi tutturabiliyor muyum?',
  'Gece acıkıyorum, ne yapayım?',
  'Bel çevrem inmiyor, sebep ne olabilir?',
];

export function ChatScreen() {
  const navigation = useNavigation();
  const userId = useUserStore((s) => s.userId);
  const chat = useChat(userId);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Selam! Ben FitIntel AI Koçun. Bugünkü planına, hedeflerine ve son 7 günlük datana baktım — neyi merak ediyorsun?',
    },
  ]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages.length, chat.isPending]);

  const send = async (text?: string) => {
    const content = (text ?? draft).trim();
    if (!content || chat.isPending) return;
    Haptics.selectionAsync();

    const userMsg: ChatMessage = { role: 'user', content };
    const history = messages;
    setMessages((m) => [...m, userMsg]);
    setDraft('');

    try {
      const res = await chat.mutateAsync({ message: content, history });
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Bağlantı problemi oldu — birazdan tekrar dene.' },
      ]);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 18,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={{ paddingRight: 12 }}
        >
          <Text style={{ color: colors.textHi, fontSize: 22, fontWeight: '600' }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textHi, fontSize: 16, fontWeight: '700' }}>AI Koç</Text>
          <Text style={{ color: colors.textLow, fontSize: 11, marginTop: 1 }}>
            Gemini · senin datanla
          </Text>
        </View>
        <View
          style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: colors.success, marginRight: 6,
          }}
        />
        <Text style={{ color: colors.textLow, fontSize: 11 }}>Çevrimiçi</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} content={m.content} />
          ))}

          {chat.isPending && (
            <View style={{ flexDirection: 'row', marginVertical: 6 }}>
              <View
                style={{
                  maxWidth: '80%',
                  backgroundColor: colors.surface,
                  paddingVertical: 12, paddingHorizontal: 14,
                  borderRadius: 16, borderTopLeftRadius: 4,
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                }}
              >
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.textMid, fontSize: 13 }}>Düşünüyor…</Text>
              </View>
            </View>
          )}

          {messages.length === 1 && !chat.isPending && (
            <View style={{ marginTop: 14 }}>
              <Text
                style={{
                  color: colors.textLow, fontSize: 10, letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                ÖRNEK SORULAR
              </Text>
              <View style={{ gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => send(s)}
                    style={{
                      backgroundColor: colors.surface2,
                      borderRadius: 14,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.textMid, fontSize: 13 }}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Composer */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 12 : 14,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.bg,
            gap: 8,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: Platform.OS === 'ios' ? 10 : 4,
              minHeight: 40,
              maxHeight: 120,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <TextInput
              placeholder="Koç'a bir şey sor…"
              placeholderTextColor={colors.textLow}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => send()}
              multiline
              style={{
                color: colors.textHi,
                fontSize: 14,
                minHeight: 20,
                maxHeight: 100,
              }}
              editable={!chat.isPending}
            />
          </View>
          <Pressable
            onPress={() => send()}
            disabled={!draft.trim() || chat.isPending}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: draft.trim() && !chat.isPending ? colors.primary : colors.surface2,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18, marginTop: -2 }}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginVertical: 4,
      }}
    >
      <View
        style={{
          maxWidth: '82%',
          backgroundColor: isUser ? colors.primary : colors.surface,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 18,
          borderTopRightRadius: isUser ? 4 : 18,
          borderTopLeftRadius: isUser ? 18 : 4,
          borderWidth: isUser ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{
            color: isUser ? '#fff' : colors.textHi,
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {content}
        </Text>
      </View>
    </View>
  );
}

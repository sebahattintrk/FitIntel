// AI Chat service — Gemini 2.5 Flash Lite based conversational coach.
// Receives the user's profile + today's data + 7-day trend + meal plan as system context,
// plus the recent message history, and returns a single Turkish reply.

const GOAL_TR = {
  fat_loss: 'yağ kaybı',
  muscle_gain: 'kas kazanımı',
  recomp: 'vücut yenileme',
};
const ACTIVITY_TR = {
  sedentary: 'hareketsiz',
  light: 'hafif aktif',
  moderate: 'orta aktif',
  active: 'aktif',
  very_active: 'çok aktif',
};
const SLOT_TR = {
  breakfast: 'Kahvaltı',
  lunch: 'Öğle',
  dinner: 'Akşam',
  snack: 'Ara öğün',
};

const MAX_HISTORY = 12; // last 6 user+assistant pairs
const TIMEOUT_MS = 12_000;
const MAX_MESSAGE_LEN = 800;

async function chat({ user, today, last7, plan, history, message }) {
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('empty_message');
  }
  const trimmedMessage = message.trim().slice(0, MAX_MESSAGE_LEN);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      reply: 'AI Koç şu an çevrimdışı. (GEMINI_API_KEY tanımlı değil — backend .env dosyasına ekledikten sonra tekrar dene.)',
      source: 'offline',
    };
  }

  const systemPrompt = buildSystemPrompt({ user, today, last7, plan });
  const contents = buildContents(history, trimmedMessage);

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 500,
          topP: 0.95,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) throw new Error('empty_response');

    return { reply, source: 'gemini' };
  } catch (err) {
    console.warn('[aiChat] failed:', err.message);
    return {
      reply: 'Şu an cevap üretemedim — bağlantı veya kota sorunu olabilir. Birazdan tekrar dene.',
      source: 'error',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildSystemPrompt({ user, today, last7, plan }) {
  const goal = GOAL_TR[user.goal] || user.goal;
  const activity = ACTIVITY_TR[user.activity_level] || user.activity_level;
  const disliked = Array.isArray(user.disliked_foods) && user.disliked_foods.length
    ? user.disliked_foods.join(', ')
    : 'belirtilmemiş';
  const budget = user.budget ? `${user.budget} TL/ay` : 'belirtilmemiş';

  const planLines = (plan?.meals || [])
    .map((m) => {
      const status = m.done ? '✓ tamamlandı' : 'planlandı';
      return `- ${SLOT_TR[m.slot] || m.slot}: ${m.name} (${m.calories} kcal, ${Math.round(Number(m.protein_g))} g protein) — ${status}`;
    })
    .join('\n');

  const trendLines = (last7 || []).map((r) => {
    const parts = [];
    if (r.weight_kg != null) parts.push(`${Number(r.weight_kg).toFixed(1)} kg`);
    if (r.calories_eaten)    parts.push(`${r.calories_eaten} kcal`);
    if (r.protein_eaten)     parts.push(`${r.protein_eaten} g protein`);
    if (r.water_ml)          parts.push(`${r.water_ml} ml su`);
    if (r.compliance != null) parts.push(`uyum %${r.compliance}`);
    return `  ${r.log_date}: ${parts.join(', ') || 'log boş'}`;
  }).join('\n');

  return [
    'Sen FitIntel uygulamasının AI Beslenme Koçu\'sun. Türk kullanıcılarla doğal, samimi, Türkçe konuşursun. PT (kişisel antrenör) gibi davranırsın — ama hekim değilsin, tıbbi tavsiye vermezsin.',
    '',
    'KARAKTER:',
    '- Doğrudan ve net konuş. Lafı dolandırma. 2-4 cümle ideal.',
    '- "Hocam" gibi laubali değil ama sıcak: "Anladım, şöyle yapalım..."',
    '- Veriye dayan. Sayı ver. Genel klişelerden ("bol su iç", "düzenli ol") kaçın.',
    '- Türk yemek kültürünü bil: menemen, dürüm, pilav, mercimek, çiğköfte, simit, ev köftesi, kuru fasulye — bunları öner.',
    '- Bütçeyi düşün. Pahalı supplement veya ithal gıda yerine erişilebilir alternatif sun.',
    '- Kullanıcının disliked_foods listesindekileri ASLA önerme.',
    '',
    'YAPMA:',
    '- Tıbbi teşhis koyma. "Doktoruna danış" de gerekirse.',
    '- Aşırı kısıtlama önerme (çok düşük kalori, aç kalma vb.).',
    '- Madde işareti listesi ile cevap verme — diyalog gibi konuş.',
    '- Emoji aşırı kullanma. Maks 1 tane, sadece doğal yerine düşerse.',
    '',
    '--- KULLANICI PROFİLİ ---',
    `İsim: ${user.name || 'Kullanıcı'}`,
    `Yaş/Cinsiyet: ${user.age}, ${user.gender}`,
    `Kilo/Boy: ${user.weight_kg} kg / ${user.height_cm} cm`,
    `Aktivite: ${activity}`,
    `Hedef: ${goal}`,
    `Bütçe: ${budget}`,
    `Sevmediği yiyecekler: ${disliked}`,
    `TDEE: ${user.tdee} kcal · Hedef Kalori: ${user.calorie_target} kcal · Protein Hedefi: ${user.protein_target} g`,
    '',
    '--- BUGÜN ---',
    `Şimdiye kadar: ${today?.calories_eaten || 0} kcal, ${today?.protein_eaten || 0} g protein, ${today?.water_ml || 0} ml su`,
    `Uyum skoru: %${today?.compliance || 0}`,
    '',
    '--- BUGÜNKÜ PLAN ---',
    planLines || '  (henüz plan yok)',
    '',
    `--- SON 7 GÜN (${(last7 || []).length} kayıt) ---`,
    trendLines || '  henüz log yok',
  ].join('\n');
}

function buildContents(history, message) {
  const arr = [];
  const recent = Array.isArray(history) ? history.slice(-MAX_HISTORY) : [];
  for (const h of recent) {
    if (!h || typeof h.content !== 'string') continue;
    arr.push({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content.slice(0, MAX_MESSAGE_LEN) }],
    });
  }
  arr.push({ role: 'user', parts: [{ text: message }] });
  return arr;
}

module.exports = { chat };

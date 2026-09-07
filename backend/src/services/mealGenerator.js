// AI-driven daily meal plan generator.
//
// Calls Gemini 2.5 Flash Lite with the user's profile, asks for 4 Turkish meals
// (breakfast / lunch / dinner / snack) tuned to their macro targets, budget, dislikes
// and produces practical metadata (gramaj, prep time, ingredients, rationale).
//
// Validation layers (any failure → retry with feedback; 2nd fail → caller falls back to RANDOM):
//   1) Schema (4 meals, all required fields present)
//   2) Disliked food substring check across name + description + ingredients + tags
//   3) Per-meal macro–calorie consistency (protein*4 + carbs*4 + fat*9 ≈ calories ±20%)
//   4) Per-slot calorie share (within ±35% of expected slot share)
//   5) Total calories within ±6% of target
//   6) Total protein at least 90% of target, at most 140%

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

const TIMEOUT_MS = 15_000;
const SLOT_SHARE = { breakfast: 0.25, lunch: 0.32, dinner: 0.33, snack: 0.10 };

// Acceptance thresholds — slightly tighter than v1 since we now also do per-meal
// macro-calorie consistency and per-slot distribution checks.
const CAL_TOLERANCE        = 0.06;   // total: ±6%
const SLOT_CAL_TOLERANCE   = 0.35;   // per-slot: ±35% of expected share
const PROTEIN_MIN_RATIO    = 0.90;   // total protein: ≥ 90% of target
const PROTEIN_MAX_RATIO    = 1.40;
const MACRO_CAL_TOLERANCE  = 0.20;   // per-meal: protein*4+carb*4+fat*9 within ±20% of calories

const MEAL_SCHEMA = {
  type: 'object',
  properties: {
    meals: {
      type: 'array',
      minItems: 4,
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          slot:           { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          name:           { type: 'string' },
          description:    { type: 'string' },
          calories:       { type: 'integer' },
          protein_g:      { type: 'number' },
          carbs_g:        { type: 'number' },
          fats_g:         { type: 'number' },
          serving_size_g: { type: 'integer' },
          prep_time_min:  { type: 'integer' },
          ingredients:    { type: 'array', items: { type: 'string' } },
          rationale:      { type: 'string' },
          tags:           { type: 'array', items: { type: 'string' } },
        },
        required: ['slot', 'name', 'description', 'calories', 'protein_g', 'carbs_g', 'fats_g',
                   'serving_size_g', 'prep_time_min', 'ingredients', 'rationale'],
        propertyOrdering: ['slot', 'name', 'description', 'calories', 'protein_g', 'carbs_g',
                           'fats_g', 'serving_size_g', 'prep_time_min', 'ingredients',
                           'rationale', 'tags'],
      },
    },
  },
  required: ['meals'],
};

async function generateMeals({ user, excludeNames = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) return null;

  let result = await tryOnce({ user, excludeNames, feedback: null });
  if (result.ok) return result.meals;

  console.warn('[mealGenerator] attempt 1 rejected:', result.reason);
  result = await tryOnce({ user, excludeNames, feedback: result.reason });
  if (result.ok) return result.meals;

  console.warn('[mealGenerator] attempt 2 rejected:', result.reason, '→ falling back to RANDOM');
  return null;
}

async function tryOnce({ user, excludeNames, feedback }) {
  let meals;
  try {
    meals = await callGemini({ user, excludeNames, feedback });
  } catch (err) {
    return { ok: false, reason: `api_error: ${err.message}` };
  }
  if (!meals || meals.length !== 4) {
    return { ok: false, reason: 'bad_meal_count' };
  }
  // Ensure exactly one meal per slot
  const slots = new Set(meals.map((m) => m.slot));
  if (slots.size !== 4) {
    return { ok: false, reason: 'duplicate_slot' };
  }

  const validation = validate(meals, user);
  if (!validation.ok) return { ok: false, reason: validation.reason };
  return { ok: true, meals };
}

async function callGemini({ user, excludeNames, feedback }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const prompt = buildPrompt(user, excludeNames, feedback);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: feedback ? 0.5 : 0.9,
          maxOutputTokens: 2400,
          responseMimeType: 'application/json',
          responseSchema: MEAL_SCHEMA,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('empty_response');

    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed?.meals) ? parsed.meals : null;
    if (!arr) return null;
    return arr.map((m) => normalizeMeal(m)).filter(Boolean);
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt(user, excludeNames, feedback) {
  const goal     = GOAL_TR[user.goal] || user.goal;
  const activity = ACTIVITY_TR[user.activity_level] || user.activity_level;
  const dislikedList = Array.isArray(user.disliked_foods) ? user.disliked_foods.filter(Boolean) : [];
  const dislikedStr = dislikedList.length ? dislikedList.join(', ') : 'yok';
  const budget = user.budget ? `${user.budget} TL aylık` : 'belirtilmemiş';

  const slotKcal = {
    breakfast: Math.round(user.calorie_target * SLOT_SHARE.breakfast),
    lunch:     Math.round(user.calorie_target * SLOT_SHARE.lunch),
    dinner:    Math.round(user.calorie_target * SLOT_SHARE.dinner),
    snack:     Math.round(user.calorie_target * SLOT_SHARE.snack),
  };

  const excludeBlock = excludeNames.length
    ? `\n\nSON ZAMANLARDA ÖNERİLEN (TEKRAR ETME):\n${excludeNames.map((n) => `- ${n}`).join('\n')}`
    : '';

  const feedbackBlock = feedback
    ? `\n\nÖNCEKİ ÇIKTIN REDDEDİLDİ: ${feedback}\nBu sefer kuralları AYNEN uygula.`
    : '';

  const dislikedRules = dislikedList.length
    ? [
        '',
        '⚠️ SEVMEDİĞİ YİYECEKLER — KESİNLİKLE YOK:',
        ...dislikedList.map((d) => `- "${d}" → yemek isminde, açıklamasında, malzeme listesinde GEÇMEYECEK.`),
      ].join('\n')
    : '';

  return [
    'Sen FitIntel uygulamasının Türk beslenme planlayıcısısın. Türk kullanıcısı için 1 GÜNLÜK 4 öğünlük plan üreteceksin.',
    '',
    'KURALLAR:',
    '- SADECE gerçek Türk yemekleri: menemen, mercimek çorbası, kuru fasulye, pilav, ev köftesi, dürüm, ızgara tavuk, çiğköfte, simit, börek, kısır, lor peyniri, süzme yoğurt, ezogelin, sebze yemekleri, fırın tavuk, bulgur pilavı, balık ızgara, salata, yumurta, omlet, tost, vb.',
    '- 4 öğün: kahvaltı, öğle, akşam, ara öğün (snack). Her slot için TAM 1 öğün, slot tekrar etmez.',
    '',
    'MAKRO HEDEFLERİ (sıkı kontrol):',
    `- Toplam kalori: hedef ${user.calorie_target} kcal, kabul aralığı ${Math.round(user.calorie_target * (1 - CAL_TOLERANCE))}-${Math.round(user.calorie_target * (1 + CAL_TOLERANCE))} kcal.`,
    `- Toplam protein: en az ${Math.round(user.protein_target * PROTEIN_MIN_RATIO)} g (hedef ${user.protein_target} g).`,
    `- Karbonhidrat ~${user.carbs_target} g, yağ ~${user.fats_target} g.`,
    `- Slot kalorisi yaklaşık: kahvaltı ${slotKcal.breakfast}, öğle ${slotKcal.lunch}, akşam ${slotKcal.dinner}, ara öğün ${slotKcal.snack}.`,
    '- HER ÖĞÜNDE makro-kalori tutarlılığı: protein*4 + karbonhidrat*4 + yağ*9 ≈ kalori (±%20). Yani 500 kcal bir öğün için makrolar toplamı 400-600 kcal\'a denk gelmeli.',
    '',
    'YEMEK METADATA (her öğün için zorunlu alanlar):',
    '- name: Türkçe, 4-7 kelime (örn. "Tavuklu Bulgur Pilavı + Cacık").',
    '- description: 1 cümle, malzemeleri ima eder.',
    '- serving_size_g: porsiyon ağırlığı tahmini (gram). Örn. omlet ~200 g, tavuklu pilav ~350 g, salata ~300 g, snack ~150-250 g.',
    '- prep_time_min: hazırlama süresi (dakika). Çiğ/hazır: 1-5, basit pişen: 10-15, etli yemek: 25-45.',
    '- ingredients: 4-8 maddelik Türkçe malzeme listesi (örn. ["tavuk göğsü", "bulgur", "domates", "yoğurt", "sarımsak"]).',
    '- rationale: 1 cümle — bu öğün NEDEN bu kullanıcı için seçildi? Hedefe + protein durumuna + slot pozisyonuna referans ver (örn. "Yağ kaybı hedefinde öğle için yüksek protein + lifli karbonhidrat: tokluk uzun sürer").',
    '- tags: 1-3 etiket — "ekonomik", "yüksek-protein", "pratik", "ev-yemeği", "vejetaryen", "klasik", "az-yağ", "post-workout".',
    '',
    `- Bütçe: ${budget} — pahalı / ithal gıda önerme.`,
    `- Hedef: ${goal} (${activity} aktivite seviyesi).`,
    dislikedRules,
    excludeBlock,
    feedbackBlock,
    '',
    'JSON: { "meals": [ { slot, name, description, calories, protein_g, carbs_g, fats_g, serving_size_g, prep_time_min, ingredients, rationale, tags }, ... ] }',
  ].join('\n');
}

// ---------- validation ----------

function validate(meals, user) {
  const disliked = Array.isArray(user.disliked_foods) ? user.disliked_foods : [];

  // 1) Per-meal: disliked foods + macro-cal consistency
  for (const m of meals) {
    const haystackParts = [m.name, m.description, ...(m.tags || []), ...(m.ingredients || [])];
    const haystack = haystackParts.filter(Boolean).map(turkishLower).join(' || ');
    for (const d of disliked) {
      const needle = turkishLower(String(d).trim());
      if (!needle) continue;
      if (haystack.includes(needle)) {
        return { ok: false, reason: `disliked_food_detected: "${d}" in "${m.name}"` };
      }
    }

    // Macro-calorie internal consistency. AI sometimes invents numbers; this catches
    // obvious arithmetic nonsense (e.g. 800 kcal meal with 5g protein, 10g carbs, 2g fat).
    const cal = Number(m.calories) || 0;
    if (cal > 0) {
      const computed = (Number(m.protein_g) || 0) * 4
                     + (Number(m.carbs_g) || 0)   * 4
                     + (Number(m.fats_g) || 0)    * 9;
      const ratio = computed / cal;
      if (ratio < 1 - MACRO_CAL_TOLERANCE || ratio > 1 + MACRO_CAL_TOLERANCE) {
        return {
          ok: false,
          reason: `macro_cal_inconsistent: "${m.name}" - kcal ${cal} ama makrolar ${Math.round(computed)} kcal\'a karşılık geliyor (sapma %${Math.round(Math.abs(ratio - 1) * 100)}). protein*4+karb*4+yağ*9 = kalori olmalı.`,
        };
      }
    }
  }

  // 2) Slot calorie distribution
  for (const m of meals) {
    const expected = (user.calorie_target || 0) * (SLOT_SHARE[m.slot] || 0);
    if (expected === 0) continue;
    const ratio = (Number(m.calories) || 0) / expected;
    if (ratio < 1 - SLOT_CAL_TOLERANCE || ratio > 1 + SLOT_CAL_TOLERANCE) {
      return {
        ok: false,
        reason: `slot_distribution_off: "${m.slot}" öğünü ${m.calories} kcal — bu slot için beklenen ~${Math.round(expected)} kcal (±%${Math.round(SLOT_CAL_TOLERANCE * 100)}). Slot dağılımını ayarla.`,
      };
    }
  }

  // 3) Macro totals
  const sum = meals.reduce(
    (acc, m) => ({
      cal: acc.cal + Number(m.calories  || 0),
      pro: acc.pro + Number(m.protein_g || 0),
    }),
    { cal: 0, pro: 0 }
  );

  const calLow  = user.calorie_target * (1 - CAL_TOLERANCE);
  const calHigh = user.calorie_target * (1 + CAL_TOLERANCE);
  if (sum.cal < calLow || sum.cal > calHigh) {
    return {
      ok: false,
      reason: `calories_off: toplam ${Math.round(sum.cal)} kcal hedef ${user.calorie_target} ±%${Math.round(CAL_TOLERANCE * 100)} dışında.`,
    };
  }

  const proteinTarget = Number(user.protein_target) || 0;
  if (proteinTarget > 0) {
    const ratio = sum.pro / proteinTarget;
    if (ratio < PROTEIN_MIN_RATIO) {
      return {
        ok: false,
        reason: `protein_low: toplam ${Math.round(sum.pro)} g, hedef ${proteinTarget} g'ın %${Math.round(PROTEIN_MIN_RATIO * 100)}'inden az. Yüksek-protein kaynaklar ekle.`,
      };
    }
    if (ratio > PROTEIN_MAX_RATIO) {
      return {
        ok: false,
        reason: `protein_high: toplam ${Math.round(sum.pro)} g, hedefin %${Math.round(PROTEIN_MAX_RATIO * 100)}'inden fazla. Dengeli dağıt.`,
      };
    }
  }

  return { ok: true };
}

// Turkish-aware lowercase: ı/İ pairs and dotted I.
function turkishLower(s) {
  return String(s)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR');
}

// ---------- normalization ----------

function normalizeMeal(m) {
  if (!m || !m.slot || !m.name) return null;
  const slot = String(m.slot).toLowerCase();
  if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(slot)) return null;

  return {
    slot,
    category: slot,
    name: String(m.name).trim().slice(0, 90),
    description: String(m.description || '').trim().slice(0, 280),
    calories: clampInt(m.calories, 80, 1500),
    protein_g: clampNum(m.protein_g, 0, 120),
    carbs_g:   clampNum(m.carbs_g,   0, 200),
    fats_g:    clampNum(m.fats_g,    0, 90),
    serving_size_g: clampInt(m.serving_size_g, 50, 800),
    prep_time_min:  clampInt(m.prep_time_min, 1, 90),
    ingredients: Array.isArray(m.ingredients)
      ? m.ingredients.slice(0, 12).map((x) => String(x).trim()).filter(Boolean)
      : [],
    rationale: String(m.rationale || '').trim().slice(0, 220),
    tags: Array.isArray(m.tags) ? m.tags.slice(0, 4).map(String) : [],
  };
}

function clampInt(v, lo, hi) {
  const n = Math.round(Number(v) || 0);
  return Math.max(lo, Math.min(hi, n));
}
function clampNum(v, lo, hi) {
  const n = Math.round((Number(v) || 0) * 10) / 10;
  return Math.max(lo, Math.min(hi, n));
}

module.exports = { generateMeals, turkishLower };

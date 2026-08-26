// "Akıllı Hareket Önerisi" — data-driven exercise recommendation.
//
// Reads the user's recent trend + today's nutrition state and chooses a workout
// shape (low_intensity / strength / core / mobility / recovery). Picks 2-4 real
// exercises from the ExerciseDB cache matching the chosen profile.
//
// Pure deterministic — no LLM. Premium-quality coaching feel comes from solid
// rules, not generated prose. Same inputs always → same output.

const { getAllExercises } = require('./exerciseDb');

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

async function recommend({ user, last7, today, plan }) {
  const context  = buildContext(user, last7, today, plan);
  const decision = decide(user, context);

  let exercises = [];
  try {
    const catalog = await getAllExercises();
    exercises = pickForProfile(catalog, decision);
  } catch (err) {
    // If ExerciseDB is dead we still ship the coaching block — just empty exercises.
    console.warn('[exerciseRecommendation] exerciseDb failed:', err.message);
  }

  return {
    context,
    recommendation: { ...decision, exercises },
  };
}

// ---------- Context aggregation ----------
function buildContext(user, last7, today, plan) {
  // Filter null/undefined BEFORE Number() — Number(null)===0 which would
  // otherwise pretend a missing weight is "0 kg" and wreck the trend.
  const weights = (last7 || [])
    .filter((r) => r.weight_kg != null)
    .map((r) => Number(r.weight_kg))
    .filter(Number.isFinite);
  const waists = (last7 || [])
    .filter((r) => r.waist_cm != null)
    .map((r) => Number(r.waist_cm))
    .filter(Number.isFinite);
  const complianceVals = (last7 || []).map((r) => Number(r.compliance)).filter((v) => v > 0);

  const weightTrend = weights.length >= 2
    ? round1(weights[weights.length - 1] - weights[0])
    : null;
  const waistTrend = waists.length >= 2
    ? round1(waists[waists.length - 1] - waists[0])
    : null;
  const complianceAvg = complianceVals.length
    ? Math.round(complianceVals.reduce((a, b) => a + b, 0) / complianceVals.length)
    : null;

  const proteinRatio = (Number(user.protein_target) > 0)
    ? round2((today?.protein_eaten || 0) / Number(user.protein_target))
    : null;
  const calorieRatio = (Number(user.calorie_target) > 0)
    ? round2((today?.calories_eaten || 0) / Number(user.calorie_target))
    : null;

  const mealsDone = plan
    ? SLOTS.filter((s) => plan[`${s}_done`]).length
    : 0;

  return {
    goal: user.goal,
    waist_trend_cm:        waistTrend,
    weight_trend_kg:       weightTrend,
    compliance_avg:        complianceAvg,
    protein_today_ratio:   proteinRatio,
    calories_today_ratio:  calorieRatio,
    water_today_ml:        Number(today?.water_ml) || 0,
    meals_done:            mealsDone,
    samples_count:         (last7 || []).length,
  };
}

// ---------- Decision tree ----------
function decide(user, ctx) {
  // 1) Adherence floor — never penalize with a hard workout when nutrition isn't dialed in.
  if (ctx.compliance_avg != null && ctx.compliance_avg < 70) {
    return {
      tone: 'warning',
      title: 'Önce uyumu oturtalım',
      reason: `7 günlük uyum %${ctx.compliance_avg}. Plan zayıfken ağır antrenman katlamaz — bugün hafif tut.`,
      session_type: 'low_intensity',
      duration_min: 20,
      intensity: 'low',
      timing: 'Akşamüstü, yemekten önce',
      tags_required: ['body weight'],
      tags_preferred: ['mobility', 'cardio'],
      avoid_target: [],
    };
  }

  // 2) Protein deficit today — don't add a tax to recovery.
  if (ctx.protein_today_ratio != null && ctx.protein_today_ratio < 0.5) {
    return {
      tone: 'neutral',
      title: 'Protein eksik, yoğunluğu düşür',
      reason: `Bugün protein hedefinin %${Math.round(ctx.protein_today_ratio * 100)}'sindesin. Ağır strength öncesi protein tamamla.`,
      session_type: 'low_intensity',
      duration_min: 25,
      intensity: 'low',
      timing: 'Akşam öğününden ~1 saat sonra',
      tags_required: ['body weight'],
      tags_preferred: ['mobility', 'cardio'],
      avoid_target: [],
    };
  }

  // 3) Fat-loss plateau (kilo+bel ikisi de sabit) — debunk spot reduction, push activity volume.
  if (
    user.goal === 'fat_loss' &&
    ctx.weight_trend_kg != null && Math.abs(ctx.weight_trend_kg) < 0.2 &&
    (ctx.waist_trend_cm == null || Math.abs(ctx.waist_trend_cm) < 0.3)
  ) {
    return {
      tone: 'warning',
      title: 'Plato — core + toplam aktivite',
      reason:
        'Kilo ve bel ikisi de sabit. Karın egzersizi bölgesel yağ eritmez; toplam aktivite hacmi + core stabilite hedeflenmeli.',
      session_type: 'core',
      duration_min: 30,
      intensity: 'medium',
      timing: 'Bugün, mümkünse sabah/erken',
      tags_required: [],
      tags_preferred: ['waist', 'cardio', 'body weight'],
      avoid_target: [],
    };
  }

  // 4) Recomp signal — kilo sabit ama bel düşüyor. Mevcut planı bozma, strength sürdür.
  if (
    user.goal === 'fat_loss' &&
    ctx.weight_trend_kg != null && Math.abs(ctx.weight_trend_kg) < 0.3 &&
    ctx.waist_trend_cm != null && ctx.waist_trend_cm <= -0.6
  ) {
    return {
      tone: 'positive',
      title: 'Recomp çalışıyor — strength sürdür',
      reason: `Kilo sabit (${ctx.weight_trend_kg >= 0 ? '+' : ''}${ctx.weight_trend_kg} kg) ama bel ${Math.abs(ctx.waist_trend_cm)} cm düştü. Yağ gidip kas geliyor; mevcut antrenman hacmini koru.`,
      session_type: 'strength',
      duration_min: 40,
      intensity: 'medium',
      timing: 'Bugün',
      tags_required: [],
      tags_preferred: ['barbell', 'dumbbell', 'cable'],
      avoid_target: [],
    };
  }

  // 5) Muscle gain stalled — heavier strength, bileşik hareketler.
  if (
    user.goal === 'muscle_gain' &&
    ctx.weight_trend_kg != null && ctx.weight_trend_kg < 0.1
  ) {
    return {
      tone: 'neutral',
      title: 'Strength günü — bileşik hareketler',
      reason: 'Kas kazanımı için büyük kas gruplarına ağırlık vur. Antrenman çevresinde karbonhidrat al.',
      session_type: 'strength',
      duration_min: 50,
      intensity: 'high',
      timing: 'Bugün, mümkünse öğleden sonra',
      tags_required: [],
      tags_preferred: ['barbell', 'dumbbell'],
      avoid_target: [],
    };
  }

  // 6) Fast weight loss — back off, prioritize recovery
  if (
    user.goal === 'fat_loss' &&
    ctx.weight_trend_kg != null && ctx.weight_trend_kg <= -1.5
  ) {
    return {
      tone: 'warning',
      title: 'Toparlanma günü',
      reason: `Son 7 günde ${Math.abs(ctx.weight_trend_kg)} kg düştün — bu hızlı. Bugün recovery: yürüyüş + mobility, ağır iş yok.`,
      session_type: 'recovery',
      duration_min: 25,
      intensity: 'low',
      timing: 'Bugün',
      tags_required: ['body weight'],
      tags_preferred: ['mobility', 'cardio'],
      avoid_target: [],
    };
  }

  // 7) Default: on track — orta yoğunluk strength.
  return {
    tone: 'positive',
    title: 'Plana sadık kal',
    reason: 'Veriler hedefe uyumlu — orta yoğunluk antrenman yeterli, hacmi büyütmeye gerek yok.',
    session_type: 'strength',
    duration_min: 35,
    intensity: 'medium',
    timing: 'Bugün',
    tags_required: [],
    tags_preferred: ['barbell', 'dumbbell', 'body weight'],
    avoid_target: [],
  };
}

// ---------- Exercise selection from catalog ----------
function pickForProfile(catalog, decision) {
  if (!Array.isArray(catalog) || catalog.length === 0) return [];

  const targetByType = {
    low_intensity: { bodyParts: ['cardio', 'back', 'upper legs'], muscles: [], equipments: ['body weight'] },
    strength:      { bodyParts: ['upper legs', 'chest', 'back', 'shoulders'], muscles: ['quads', 'pecs', 'lats'], equipments: ['barbell', 'dumbbell', 'cable'] },
    core:          { bodyParts: ['waist'], muscles: ['abs', 'obliques'], equipments: ['body weight'] },
    mobility:      { bodyParts: ['back', 'upper legs', 'shoulders'], muscles: ['spine', 'hamstrings'], equipments: ['body weight'] },
    recovery:      { bodyParts: ['cardio', 'back'], muscles: ['spine'], equipments: ['body weight'] },
  };

  const profile = targetByType[decision.session_type] || targetByType.strength;
  const requiredEquip = (decision.tags_required || []).map((s) => s.toLowerCase());
  const preferredEquip = (decision.tags_preferred || []).map((s) => s.toLowerCase());

  // Score every exercise. Higher score → better match for this decision.
  const scored = catalog.map((ex) => {
    const bps = (ex.bodyParts || []).map((s) => String(s).toLowerCase());
    const muscles = [...(ex.targetMuscles || []), ...(ex.secondaryMuscles || [])].map((s) => String(s).toLowerCase());
    const eqs = (ex.equipments || []).map((s) => String(s).toLowerCase());

    let score = 0;
    // Body part match
    for (const want of profile.bodyParts) {
      if (bps.includes(want)) { score += 5; break; }
    }
    // Muscle target match
    for (const want of profile.muscles) {
      if (muscles.includes(want)) { score += 4; break; }
    }
    // Equipment required (hard requirement)
    if (requiredEquip.length > 0) {
      const ok = requiredEquip.some((e) => eqs.includes(e));
      if (!ok) return { ex, score: -1 };
      score += 6;
    }
    // Equipment preferred
    for (const want of preferredEquip) {
      if (eqs.includes(want)) { score += 3; break; }
    }
    // Slight randomness so repeated calls don't return the same exact 4 hours later
    score += Math.random() * 0.5;

    return { ex, score };
  }).filter((s) => s.score >= 0);

  scored.sort((a, b) => b.score - a.score);

  // Take top 6, then dedupe by name (some catalogs have variants with same name).
  const picked = [];
  const seenNames = new Set();
  for (const s of scored) {
    const key = s.ex.name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    picked.push(s.ex);
    if (picked.length >= 4) break;
  }
  return picked;
}

function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }

module.exports = { recommend };

// Premium feature: Otomatik Plan Ayarlama.
//
// Reads the user's last 7 days of logs and proposes a calorie / protein target tweak
// based on a transparent decision tree. The user can then accept the suggestion,
// which updates their `users.calorie_target` / `users.protein_target` directly.
//
// Design choices:
//   - DETERMINISTIC. No LLM. Premium users need to trust the recommendation, and the
//     same inputs must always give the same answer. Easier to audit and tune.
//   - Reason codes are returned alongside Turkish-language explanations so the
//     frontend can both show prose and (later) keep analytics.
//   - Adjustments are small (±100 kcal, ±10 g protein) — we want gentle steering,
//     not whiplash.

const CALORIE_STEP = 100;
const PROTEIN_STEP = 10;

const REASON_CODES = {
  INSUFFICIENT_DATA:   'insufficient_data',
  LOW_ADHERENCE:       'low_adherence',
  FAT_LOSS_STALLED:    'fat_loss_stalled',
  FAT_LOSS_TOO_FAST:   'fat_loss_too_fast',
  RECOMP_SIGNAL:       'recomp_signal',
  MUSCLE_GAIN_STALL:   'muscle_gain_stall',
  LOW_PROTEIN_INTAKE:  'low_protein_intake',
  ON_TRACK:            'on_track',
};

function computePlanAdjustment(user, last7) {
  const current = {
    calorie_target: Number(user.calorie_target) || 0,
    protein_target: Number(user.protein_target) || 0,
  };
  const noChange = (reason_code, reason_tr, action_tr, confidence = 'medium') => ({
    reason_code,
    reason_tr,
    action_tr,
    confidence,
    current,
    suggested: { ...current },
    calorie_delta: 0,
    protein_delta: 0,
    has_change: false,
  });

  if (!Array.isArray(last7) || last7.length < 3) {
    return noChange(
      REASON_CODES.INSUFFICIENT_DATA,
      'Son 7 günde 3\'ten az log var — sağlıklı bir ayarlama önerisi için yeterli veri yok.',
      'Bu hafta her gün tartı ve uyum girişini eksiksiz yap, hafta sonu plan ayarı önerisi gelecek.',
      'low'
    );
  }

  // Aggregate signals
  const compliances = last7.map((r) => Number(r.compliance) || 0).filter((v) => v > 0);
  const avgCompliance = compliances.length
    ? Math.round(compliances.reduce((a, b) => a + b, 0) / compliances.length)
    : 0;

  const weights = last7.map((r) => Number(r.weight_kg)).filter(Boolean);
  const weightDelta = weights.length >= 2 ? weights[weights.length - 1] - weights[0] : null;

  const waists = last7.map((r) => Number(r.waist_cm)).filter(Boolean);
  const waistDelta = waists.length >= 2 ? waists[waists.length - 1] - waists[0] : null;

  const proteinSamples = last7.map((r) => Number(r.protein_eaten) || 0).filter((v) => v > 0);
  const avgProtein = proteinSamples.length
    ? Math.round(proteinSamples.reduce((a, b) => a + b, 0) / proteinSamples.length)
    : 0;
  const proteinRatio = current.protein_target > 0
    ? avgProtein / current.protein_target
    : 0;

  // Rule 1: Adherence floor. If compliance < 70%, refuse to tweak calories —
  // fixing the plan does nothing if the user isn't sticking to it.
  if (compliances.length >= 3 && avgCompliance < 70) {
    return noChange(
      REASON_CODES.LOW_ADHERENCE,
      `Son 7 günde ortalama uyum %${avgCompliance}. Plan ayarı yapmadan önce mevcut planı uygulamak gerekiyor.`,
      'Bu hafta hedef %85 uyum. Sayıyı geçince bir sonraki öneri kalori ayarı olacak.',
      'high'
    );
  }

  // Rule 2: Protein deficit — boost protein target, keep calories.
  if (proteinSamples.length >= 4 && proteinRatio < 0.85 && current.protein_target > 0) {
    const newProtein = current.protein_target + PROTEIN_STEP;
    return {
      reason_code: REASON_CODES.LOW_PROTEIN_INTAKE,
      reason_tr: `Son ${proteinSamples.length} günde ortalama protein alımın ${avgProtein} g — hedefin (${current.protein_target} g) %${Math.round(proteinRatio * 100)}'si.`,
      action_tr: `Protein hedefini ${current.protein_target} → ${newProtein} g'a çıkar, kalori aynı kalsın. Öğün planı yeni hedefe göre üretilecek.`,
      confidence: 'high',
      current,
      suggested: { calorie_target: current.calorie_target, protein_target: newProtein },
      calorie_delta: 0,
      protein_delta: PROTEIN_STEP,
      has_change: true,
    };
  }

  // Goal-specific rules
  if (user.goal === 'fat_loss' && weights.length >= 4 && weightDelta != null) {
    // Rule 3a: too-fast loss — slow it down
    if (weightDelta <= -1.5) {
      const newCal = current.calorie_target + CALORIE_STEP;
      return {
        reason_code: REASON_CODES.FAT_LOSS_TOO_FAST,
        reason_tr: `Son 7 günde ${Math.abs(weightDelta).toFixed(1)} kg düştün — sürdürülebilir tempo haftada 0.5-1 kg.`,
        action_tr: `Kaloriyi ${current.calorie_target} → ${newCal} kcal'a yükselt. Kas kaybı riskini düşür, hızı yumuşat.`,
        confidence: 'high',
        current,
        suggested: { calorie_target: newCal, protein_target: current.protein_target },
        calorie_delta: CALORIE_STEP,
        protein_delta: 0,
        has_change: true,
      };
    }

    // Rule 3b: stalled — but waist is still moving → recomp, don't cut
    if (weightDelta > -0.2 && waistDelta != null && waistDelta <= -0.7) {
      return noChange(
        REASON_CODES.RECOMP_SIGNAL,
        `Kilon ${weights[0].toFixed(1)} → ${weights[weights.length - 1].toFixed(1)} kg (sabit) ama bel ${waists[0].toFixed(1)} → ${waists[waists.length - 1].toFixed(1)} cm (${Math.abs(waistDelta).toFixed(1)} cm aşağı).`,
        'Plan çalışıyor: yağ gidip kas geliyor. Kalori değişmeyecek, mevcut planı 7 gün daha sürdür.',
        'high'
      );
    }

    // Rule 3c: stalled both — cut a notch
    if (weightDelta > -0.2 && avgCompliance >= 80) {
      const newCal = current.calorie_target - CALORIE_STEP;
      return {
        reason_code: REASON_CODES.FAT_LOSS_STALLED,
        reason_tr: `Son 7 günde kilon ${weights[0].toFixed(1)} → ${weights[weights.length - 1].toFixed(1)} kg, uyumun %${avgCompliance}.`,
        action_tr: `Plana iyi uyuyorsun ama ilerleme yok. Kaloriyi ${current.calorie_target} → ${newCal} kcal'a indir, protein sabit kalsın.`,
        confidence: 'high',
        current,
        suggested: { calorie_target: newCal, protein_target: current.protein_target },
        calorie_delta: -CALORIE_STEP,
        protein_delta: 0,
        has_change: true,
      };
    }
  }

  // Rule 4: muscle gain stalled — add calories
  if (
    user.goal === 'muscle_gain' &&
    weights.length >= 4 && weightDelta != null && weightDelta < 0.1 &&
    avgCompliance >= 80
  ) {
    const newCal = current.calorie_target + CALORIE_STEP;
    return {
      reason_code: REASON_CODES.MUSCLE_GAIN_STALL,
      reason_tr: `Son 7 günde kilon ${weights[0].toFixed(1)} → ${weights[weights.length - 1].toFixed(1)} kg — yukarı yönlü hareket yok.`,
      action_tr: `Kaloriyi ${current.calorie_target} → ${newCal} kcal'a yükselt (antrenman çevresinde karbonhidrat ekle).`,
      confidence: 'high',
      current,
      suggested: { calorie_target: newCal, protein_target: current.protein_target },
      calorie_delta: CALORIE_STEP,
      protein_delta: 0,
      has_change: true,
    };
  }

  // Rule 5: on track — hold
  return noChange(
    REASON_CODES.ON_TRACK,
    'Veriler hedefe uyumlu ilerliyor — kalori ve protein hedefin doğru ayarda.',
    'Bu hafta planı sürdür. Bir sonraki öneri 7 gün sonra yeniden hesaplanacak.',
    'medium'
  );
}

module.exports = { computePlanAdjustment, REASON_CODES };

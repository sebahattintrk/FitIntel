// Premium feature: Hedef Simülasyonu.
//
// Pure math, no LLM. Takes the user's recent weight trend (up to 14 days) and
// projects forward to the target weight. Returns:
//   - current weekly velocity (kg/week)
//   - ETA at current pace
//   - "fast" scenario (velocity × 1.2 — better adherence)
//   - "slow" scenario (velocity × 0.5 — current pace halves)
//
// Confidence is "low" if we have <5 weight samples, "medium" up to 10, "high" with 10+.

const MIN_SAMPLES = 4;
const SAFE_VELOCITY_KG_WEEK = { fat_loss: 0.5, muscle_gain: 0.25, recomp: 0.1 };

function simulate(user, weights) {
  const target = Number(user.target_weight_kg);
  const targetIsSet = Number.isFinite(target) && target > 0;

  const samples = (weights || [])
    .map((r) => ({ date: r.log_date, weight: Number(r.weight_kg) }))
    .filter((s) => Number.isFinite(s.weight));

  // Not enough data → return informational state
  if (samples.length < MIN_SAMPLES) {
    return {
      state: 'insufficient_data',
      message: `Trend için en az ${MIN_SAMPLES} farklı günde kilo logu gerekiyor — şu an ${samples.length} kayıt var.`,
      samples_count: samples.length,
      target_weight_kg: targetIsSet ? target : null,
    };
  }

  const first = samples[0];
  const last  = samples[samples.length - 1];
  const days  = Math.max(1, daysBetween(first.date, last.date));
  const deltaKg = last.weight - first.weight;
  const velocityPerDay = deltaKg / days;
  const velocityPerWeek = Math.round(velocityPerDay * 7 * 100) / 100;

  // Target hasn't been set — return trend only, prompt UI to ask
  if (!targetIsSet) {
    return {
      state: 'no_target',
      message: 'Hedef kilonu girer girmez simülasyon hesaplanacak.',
      current_weight_kg: round1(last.weight),
      velocity_per_week_kg: velocityPerWeek,
      samples_count: samples.length,
    };
  }

  const current = last.weight;
  const remainingKg = current - target; // positive = need to lose; negative = need to gain
  const goal = user.goal;
  const direction = goal === 'muscle_gain' ? 'gain' : 'lose';

  // If user is already at/past target
  if ((direction === 'lose' && remainingKg <= 0) || (direction === 'gain' && remainingKg >= 0)) {
    return {
      state: 'reached',
      message: `Hedefe ulaşmışsın — ${round1(current)} kg / hedef ${target} kg.`,
      current_weight_kg: round1(current),
      target_weight_kg: target,
      velocity_per_week_kg: velocityPerWeek,
    };
  }

  const movingRight = direction === 'lose' ? velocityPerWeek < -0.05 : velocityPerWeek > 0.05;
  if (!movingRight) {
    return {
      state: 'wrong_direction',
      message: direction === 'lose'
        ? `Son ${days} günde kilo değişimin ${velocityPerWeek >= 0 ? '+' : ''}${velocityPerWeek} kg/hafta — hedefe doğru ilerlemiyorsun.`
        : `Son ${days} günde kilo değişimin ${velocityPerWeek >= 0 ? '+' : ''}${velocityPerWeek} kg/hafta — kas kazanımı için yetersiz.`,
      current_weight_kg: round1(current),
      target_weight_kg: target,
      velocity_per_week_kg: velocityPerWeek,
      samples_count: samples.length,
    };
  }

  // ETA at current pace
  const absVelocity = Math.abs(velocityPerWeek);
  const weeksCurrent = absVelocity > 0 ? Math.round((Math.abs(remainingKg) / absVelocity) * 10) / 10 : null;
  const dateCurrent = weeksCurrent != null ? addDays(new Date(), Math.round(weeksCurrent * 7)) : null;

  // Scenarios — bound at "safe" weekly velocity for the goal
  const safeVel = SAFE_VELOCITY_KG_WEEK[goal] || 0.5;
  const fastVel = Math.min(safeVel * 1.4, absVelocity * 1.25);
  const slowVel = absVelocity * 0.5;
  const weeksFast = fastVel > 0 ? Math.round((Math.abs(remainingKg) / fastVel) * 10) / 10 : null;
  const weeksSlow = slowVel > 0 ? Math.round((Math.abs(remainingKg) / slowVel) * 10) / 10 : null;

  const confidence = samples.length >= 10 ? 'high' : samples.length >= 6 ? 'medium' : 'low';

  return {
    state: 'projecting',
    current_weight_kg: round1(current),
    target_weight_kg: target,
    velocity_per_week_kg: velocityPerWeek,
    remaining_kg: round1(remainingKg),
    weeks_at_current_pace: weeksCurrent,
    eta_date: dateCurrent ? dateCurrent.toISOString().slice(0, 10) : null,
    weeks_if_better:  weeksFast,
    weeks_if_slower:  weeksSlow,
    samples_count:    samples.length,
    days_window:      days,
    confidence,
  };
}

function daysBetween(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return Math.round(Math.abs(db - da) / (1000 * 60 * 60 * 24));
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function round1(n) { return Math.round(Number(n) * 10) / 10; }

module.exports = { simulate };

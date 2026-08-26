// Premium feature: Akıllı Bildirimler.
//
// Computes today's notification schedule for one user. The frontend then schedules
// them as LOCAL notifications via expo-notifications (so they fire even without
// network / without a push token — Expo Go-friendly).
//
// We pick one rule-driven message per "slot" of the day. Each item has:
//   { hour, minute, title, body, tag }
//
// Empty slots (where the rule chose to stay silent) are simply omitted. Times that
// have already passed for "today" are filtered out by the route before responding.

function buildDailyNotifications({ user, last7, todayLog, plan, eaten, streak }) {
  const items = [];
  const name = user.name || '';

  // -------- 09:00 — morning kick-off (always) --------
  items.push({
    hour: 9, minute: 0,
    tag: 'morning',
    title: name ? `Günaydın, ${name}!` : 'Günaydın!',
    body: 'Bugünkü planın hazır. İlk öğünü işaretle, sayım kendi kendine ilerlesin.',
  });

  // -------- 14:00 — midday plan reminder --------
  if (plan && !plan.lunch_done) {
    items.push({
      hour: 14, minute: 0,
      tag: 'midday',
      title: 'Öğle öğünü zamanı',
      body: 'Öğleni tikleyince protein hedefin otomatik güncellenir.',
    });
  }

  // -------- 16:30 — snack / protein nudge --------
  const proteinTarget = Number(user.protein_target) || 0;
  const proteinSoFar  = Math.round(eaten.protein);
  const proteinRatio  = proteinTarget > 0 ? proteinSoFar / proteinTarget : 1;
  if (proteinRatio < 0.55 && proteinTarget > 0) {
    const gap = Math.round(proteinTarget - proteinSoFar);
    items.push({
      hour: 16, minute: 30,
      tag: 'protein',
      title: 'Ara öğünü atlama',
      body: `Protein hedefinin %${Math.round(proteinRatio * 100)}'sindesin. ~${gap} g kaldı — süzme yoğurt + ceviz veya whey shake iyi gider.`,
    });
  } else if (plan && !plan.snack_done) {
    items.push({
      hour: 16, minute: 30,
      tag: 'snack',
      title: 'Ara öğün',
      body: 'Plandaki ara öğünü tamamlayıp kan şekerini stabilde tut.',
    });
  }

  // -------- 19:00 — dinner --------
  if (plan && !plan.dinner_done) {
    items.push({
      hour: 19, minute: 0,
      tag: 'dinner',
      title: 'Akşam öğünün hazır',
      body: 'Akşamı zamanında ye, geç saat acıkmasın.',
    });
  }

  // -------- 21:00 — log reminder --------
  // Rule: if today's log doesn't have weight or compliance yet, nudge for it.
  const needsLog = !todayLog || (todayLog.weight_kg == null && todayLog.compliance == null);
  const waterAvg7 = avg((last7 || []).map((r) => Number(r.water_ml) || 0).filter((v) => v > 0));
  if (needsLog) {
    items.push({
      hour: 21, minute: 0,
      tag: 'log',
      title: 'Bugünü logla',
      body: waterAvg7 && waterAvg7 < 2000
        ? `Son 7 günde su ortalaman ${Math.round(waterAvg7)} ml — yarın 2.5 L hedefle. Kilo + su + uyumu gir, 15 sn.`
        : 'Kilo, su ve günün uyumunu gir. 15 saniyelik iş, trendi açık tutar.',
    });
  }

  // -------- 22:00 — streak preserver --------
  if (streak && streak.current >= 3 && !streak.today_logged) {
    items.push({
      hour: 22, minute: 0,
      tag: 'streak',
      title: '🔥 Serini koru',
      body: `${streak.current} gündür planlısın. Bugün bir öğün işaretlemek veya log girmek seriyi taşır.`,
    });
  }

  return items;
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

module.exports = { buildDailyNotifications };

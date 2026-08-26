// Streak / momentum service.
//
// A day "counts" for the streak if EITHER:
//   - At least one meal on that day's plan was marked done, OR
//   - A daily_log row was saved with water/weight/compliance.
//
// The bar is intentionally low: tick one meal OR open the app and tap "İyi" — the day
// counts. This is for adherence momentum, not perfection.
//
// Today UX rule: if today has activity, the streak ends today. If today has none yet,
// we anchor the streak at yesterday — so the user doesn't see a broken streak just
// because they haven't opened the app yet today.

const MILESTONES = [3, 7, 14, 30];
const LOOKBACK_DAYS = 60;

async function computeStreak(db, userId) {
  const r = await db.query(
    `SELECT DISTINCT day FROM (
        SELECT plan_date AS day FROM meal_plans
          WHERE user_id = $1
            AND plan_date >= CURRENT_DATE - INTERVAL '${LOOKBACK_DAYS} days'
            AND (breakfast_done OR lunch_done OR dinner_done OR snack_done)
       UNION
        SELECT log_date AS day FROM daily_logs
          WHERE user_id = $1
            AND log_date >= CURRENT_DATE - INTERVAL '${LOOKBACK_DAYS} days'
            AND (
              COALESCE(water_ml, 0) > 0
              OR weight_kg IS NOT NULL
              OR compliance IS NOT NULL
            )
     ) t
     ORDER BY day DESC`,
    [userId]
  );

  // Use a Set of YYYY-MM-DD strings to avoid Date object equality pitfalls.
  const activeDays = new Set(r.rows.map((row) => toISODateString(row.day)));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toISODateString(today);
  const todayLogged = activeDays.has(todayKey);

  // Walk backwards from today (or yesterday if today is empty) and count consecutive days.
  const cursor = new Date(today);
  if (!todayLogged) cursor.setDate(cursor.getDate() - 1);

  let current = 0;
  while (true) {
    const key = toISODateString(cursor);
    if (activeDays.has(key)) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Best streak: longest run of consecutive days anywhere in the lookback window.
  const best = longestRun(activeDays, today, LOOKBACK_DAYS);

  const next = MILESTONES.find((m) => m > current) ?? null;
  const days_to_next = next != null ? next - current : null;
  const just_hit = MILESTONES.includes(current);

  return {
    current,
    best,
    today_logged: todayLogged,
    next_milestone: next,
    days_to_next,
    just_hit_milestone: just_hit,
    milestone_label: labelFor(current),
  };
}

function labelFor(current) {
  if (current === 0)  return null;
  if (current < 3)    return null;
  if (current < 7)    return '3 gün! İlk hedef geçildi.';
  if (current < 14)   return 'Bir hafta üst üste — alışkanlık oluşmaya başladı.';
  if (current < 30)   return '2 hafta. Çoğu insan burayı göremez.';
  return '30+ gün. Sistem artık senin için çalışıyor.';
}

function longestRun(activeDays, today, windowDays) {
  let best = 0;
  let run = 0;
  const cursor = new Date(today);
  for (let i = 0; i < windowDays; i++) {
    const key = toISODateString(cursor);
    if (activeDays.has(key)) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return best;
}

function toISODateString(d) {
  if (typeof d === 'string') return d.slice(0, 10);
  // pg returns DATE columns as JS Date in the server's local timezone. We want YYYY-MM-DD
  // matching the server's "today" view, so use the local components (not UTC).
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

module.exports = { computeStreak };

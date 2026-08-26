const router = require('express').Router();
const db = require('../db');

// POST /daily-log   — upsert today's log for a user.
// Body (all optional): { user_id, log_date?, weight_kg?, waist_cm?, water_ml?, compliance? }
//
// Calorie/protein intake is NO LONGER taken from the body — it's derived from completed
// meals in meal_plans by /dashboard. We do still write calories_eaten / protein_eaten
// columns here (mirroring the same derived numbers) so historical trend queries remain
// fast and consistent.
//
// `compliance` may be sent explicitly by the client (0-100 self-rating: "Kötü/Orta/İyi"
// mapped to 40/70/95). If absent, we compute it from the meal-plan completion ratio
// and water target.
router.post('/', async (req, res, next) => {
  try {
    const {
      user_id,
      log_date = null,
      weight_kg = null,
      waist_cm = null,
      water_ml = 0,
      compliance: complianceInput = null,
    } = req.body || {};

    if (!user_id) return res.status(400).json({ error: 'user_id_required' });

    const userR = await db.query('SELECT calorie_target, protein_target FROM users WHERE id = $1', [user_id]);
    if (userR.rows.length === 0) return res.status(404).json({ error: 'user_not_found' });
    const { calorie_target, protein_target } = userR.rows[0];

    // Compute today's eaten kcal/protein from done meals on the active plan.
    const planR = await db.query(
      `SELECT
         breakfast_done, lunch_done, dinner_done, snack_done,
         breakfast_snapshot, lunch_snapshot, dinner_snapshot, snack_snapshot
       FROM meal_plans
        WHERE user_id = $1 AND plan_date = COALESCE($2::date, CURRENT_DATE)`,
      [user_id, log_date]
    );
    const planRow = planR.rows[0];
    const eaten = planRow ? sumCompletedFromPlan(planRow) : { calories: 0, protein: 0 };

    // Compliance: user-provided takes priority, else derive from plan completion + water.
    const compliance = complianceInput != null
      ? clampInt(Number(complianceInput), 0, 100)
      : computeCompliance({
          planRow,
          water_ml,
          protein_eaten:  eaten.protein,
          protein_target,
          calories_eaten: eaten.calories,
          calorie_target,
        });

    const { rows } = await db.query(
      `INSERT INTO daily_logs
        (user_id, log_date, weight_kg, waist_cm, water_ml, calories_eaten, protein_eaten, compliance)
       VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, log_date) DO UPDATE SET
         weight_kg      = COALESCE(EXCLUDED.weight_kg,      daily_logs.weight_kg),
         waist_cm       = COALESCE(EXCLUDED.waist_cm,       daily_logs.waist_cm),
         water_ml       = EXCLUDED.water_ml,
         calories_eaten = EXCLUDED.calories_eaten,
         protein_eaten  = EXCLUDED.protein_eaten,
         compliance     = EXCLUDED.compliance
       RETURNING *`,
      [user_id, log_date, weight_kg, waist_cm, water_ml, eaten.calories, Math.round(eaten.protein), compliance]
    );

    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

function sumCompletedFromPlan(plan) {
  let cal = 0;
  let pro = 0;
  for (const slot of SLOTS) {
    if (!plan[`${slot}_done`]) continue;
    const snap = plan[`${slot}_snapshot`];
    if (snap && typeof snap === 'object') {
      cal += Number(snap.calories  || 0);
      pro += Number(snap.protein_g || 0);
    }
  }
  return { calories: cal, protein: pro };
}

function computeCompliance({ planRow, water_ml, protein_eaten, protein_target, calories_eaten, calorie_target }) {
  // 60% — plan completion ratio (how many of 4 meals you actually did)
  let mealRatio = 0;
  if (planRow) {
    const total = SLOTS.length;
    const done = SLOTS.filter((s) => planRow[`${s}_done`]).length;
    mealRatio = done / total;
  }
  // 25% — protein adequacy (cap at 1)
  const proteinRatio = protein_target > 0
    ? Math.min(1, protein_eaten / protein_target)
    : 0;
  // 15% — water target (3 L)
  const waterRatio = Math.min(1, (water_ml || 0) / 3000);

  return Math.round((mealRatio * 0.6 + proteinRatio * 0.25 + waterRatio * 0.15) * 100);
}

function clampInt(v, lo, hi) {
  const n = Math.round(Number(v) || 0);
  return Math.max(lo, Math.min(hi, n));
}

module.exports = router;

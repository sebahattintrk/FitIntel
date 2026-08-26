// Exercise Intelligence routes.
//
// Filters operate on the cached normalized list — no extra upstream calls per
// request. All matching is case-insensitive substring against the relevant
// string-array fields.

const router = require('express').Router();
const db = require('../db');
const { getAllExercises, getExerciseById } = require('../services/exerciseDb');
const { recommend } = require('../services/exerciseRecommendation');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

// GET /exercises?q=&bodyPart=&muscle=&equipment=&limit=
router.get('/', async (req, res, next) => {
  try {
    const list = await getAllExercises();
    const q          = lc(req.query.q);
    const bodyPart   = lc(req.query.bodyPart);
    const muscle     = lc(req.query.muscle);
    const equipment  = lc(req.query.equipment);

    const limit = clampLimit(req.query.limit);

    let result = list;
    if (q)         result = result.filter((e) => lc(e.name).includes(q));
    if (bodyPart)  result = result.filter((e) => anyIncludes(e.bodyParts, bodyPart));
    if (muscle)    result = result.filter((e) =>
      anyIncludes(e.targetMuscles, muscle) || anyIncludes(e.secondaryMuscles, muscle));
    if (equipment) result = result.filter((e) => anyIncludes(e.equipments, equipment));

    res.json(result.slice(0, limit));
  } catch (err) {
    res.status(503).json({
      error: 'exercisedb_unavailable',
      message: 'Hareket veritabanına şu an ulaşılamıyor. Birazdan tekrar dene.',
    });
  }
});

// GET /exercises/recommendations/:userId — Akıllı Hareket Önerisi
// IMPORTANT: declared BEFORE /:id so "recommendations" doesn't get caught as an id.
router.get('/recommendations/:userId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });

    const [userR, todayLogR, last7R, planR] = await Promise.all([
      db.query('SELECT * FROM users WHERE id = $1', [userId]),
      db.query(`SELECT * FROM daily_logs WHERE user_id = $1 AND log_date = CURRENT_DATE`, [userId]),
      db.query(
        `SELECT log_date, weight_kg, waist_cm, water_ml, calories_eaten, protein_eaten, compliance
           FROM daily_logs
          WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '6 days'
          ORDER BY log_date ASC`,
        [userId]
      ),
      db.query(
        `SELECT breakfast_done, lunch_done, dinner_done, snack_done,
                breakfast_snapshot, lunch_snapshot, dinner_snapshot, snack_snapshot
           FROM meal_plans WHERE user_id = $1 AND plan_date = CURRENT_DATE`,
        [userId]
      ),
    ]);

    if (userR.rows.length === 0) return res.status(404).json({ error: 'user_not_found' });
    const user = userR.rows[0];
    const todayLog = todayLogR.rows[0];
    const last7 = last7R.rows;
    const plan = planR.rows[0];

    // Derive today's eaten kcal/protein from completed meal snapshots — same logic
    // the dashboard uses so the recommendation sees the same state.
    let cal = 0, pro = 0;
    if (plan) {
      for (const s of SLOTS) {
        if (!plan[`${s}_done`]) continue;
        const snap = plan[`${s}_snapshot`];
        if (snap && typeof snap === 'object') {
          cal += Number(snap.calories  || 0);
          pro += Number(snap.protein_g || 0);
        }
      }
    }
    const today = {
      calories_eaten: cal,
      protein_eaten:  Math.round(pro),
      water_ml:       todayLog?.water_ml ?? 0,
      compliance:     todayLog?.compliance ?? null,
    };

    const out = await recommend({ user, last7, today, plan });
    res.json(out);
  } catch (err) { next(err); }
});

// GET /exercises/:id
router.get('/:id', async (req, res, next) => {
  try {
    const ex = await getExerciseById(req.params.id);
    if (!ex) return res.status(404).json({ error: 'not_found' });
    res.json(ex);
  } catch (err) {
    res.status(503).json({ error: 'exercisedb_unavailable' });
  }
});

function lc(v) {
  return typeof v === 'string' ? v.toLocaleLowerCase('tr-TR').trim() : '';
}
function anyIncludes(arr, needle) {
  if (!Array.isArray(arr)) return false;
  for (const v of arr) {
    if (lc(v).includes(needle)) return true;
  }
  return false;
}
function clampLimit(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(n));
}

module.exports = router;

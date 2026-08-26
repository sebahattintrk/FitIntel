const router = require('express').Router();
const db = require('../db');
const { buildInsight } = require('../services/aiInsight');
const { computeStreak } = require('../services/streak');

// GET /dashboard/:userId
router.get('/:userId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });

    const userQ = db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const todayLogQ = db.query(
      `SELECT * FROM daily_logs WHERE user_id = $1 AND log_date = CURRENT_DATE`,
      [userId]
    );
    const planQ = db.query(
      `SELECT
         breakfast_done, lunch_done, dinner_done, snack_done,
         breakfast_snapshot, lunch_snapshot, dinner_snapshot, snack_snapshot,
         breakfast_id, lunch_id, dinner_id, snack_id
       FROM meal_plans WHERE user_id = $1 AND plan_date = CURRENT_DATE`,
      [userId]
    );
    const last7Q = db.query(
      `SELECT log_date, weight_kg, waist_cm, water_ml, calories_eaten, protein_eaten, compliance
         FROM daily_logs
        WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '6 days'
        ORDER BY log_date ASC`,
      [userId]
    );

    const [userR, todayR, planR, last7R] = await Promise.all([userQ, todayLogQ, planQ, last7Q]);
    if (userR.rows.length === 0) return res.status(404).json({ error: 'user_not_found' });

    const user = userR.rows[0];
    const todayLog = todayR.rows[0];
    const planRow = planR.rows[0];

    // Derive today's calories_eaten + protein_eaten from completed (done=true) meals.
    // We prefer the snapshot column; if it's a legacy plan with only meal_id, we'd need a
    // separate join — for now legacy rows simply contribute 0 (they predate the snapshot
    // refactor and their done flags weren't set anyway).
    const eaten = planRow ? sumCompletedFromPlan(planRow) : { calories: 0, protein: 0 };

    const today = {
      calories_eaten: eaten.calories,
      protein_eaten:  Math.round(eaten.protein),
      water_ml:       todayLog?.water_ml ?? 0,
      compliance:     todayLog?.compliance ?? null,
    };

    const last7 = last7R.rows;
    const [insight, streak] = await Promise.all([
      buildInsight(user, last7, today),
      computeStreak(db, userId),
    ]);

    res.json({
      user,
      today: {
        calories_eaten: today.calories_eaten,
        calories_target: user.calorie_target,
        protein_eaten:  today.protein_eaten,
        protein_target: user.protein_target,
        water_ml:       today.water_ml,
        water_target_ml: 3000,
        compliance:     today.compliance ?? 0,
      },
      trend: last7,
      insight,
      streak,
    });
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

module.exports = router;

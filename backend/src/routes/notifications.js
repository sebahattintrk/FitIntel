const router = require('express').Router();
const db = require('../db');
const { buildDailyNotifications } = require('../services/notificationRules');
const { computeStreak } = require('../services/streak');

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

// GET /notifications/schedule/:userId
// Returns today's notifications to schedule LOCALLY on the device.
// Items whose hour:minute has already passed today are filtered out.
router.get('/schedule/:userId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });

    const userR = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userR.rows.length === 0) return res.status(404).json({ error: 'user_not_found' });
    const user = userR.rows[0];

    const [todayLogR, last7R, planR] = await Promise.all([
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

    const todayLog = todayLogR.rows[0] || null;
    const last7    = last7R.rows;
    const plan     = planR.rows[0] || null;

    const eaten = plan ? sumCompletedFromPlan(plan) : { calories: 0, protein: 0 };
    const streak = await computeStreak(db, userId);

    const items = buildDailyNotifications({ user, last7, todayLog, plan, eaten, streak });

    // Filter out items that should have fired earlier today.
    const now = new Date();
    const upcoming = items.filter((i) => {
      const t = new Date();
      t.setHours(i.hour, i.minute, 0, 0);
      return t > now;
    });

    res.json({ date: now.toISOString().slice(0, 10), items: upcoming });
  } catch (err) { next(err); }
});

function sumCompletedFromPlan(plan) {
  let cal = 0, pro = 0;
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

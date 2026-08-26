const router = require('express').Router();
const db = require('../db');
const { chat } = require('../services/aiChat');

// POST /chat/:userId   body: { message: string, history?: [{role, content}] }
router.post('/:userId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });

    const { message, history = [] } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message_required' });
    }

    // Pull all the context we'll inject into the prompt.
    const [userR, todayR, last7R, planR] = await Promise.all([
      db.query('SELECT * FROM users WHERE id = $1', [userId]),
      db.query(
        `SELECT * FROM daily_logs WHERE user_id = $1 AND log_date = CURRENT_DATE`,
        [userId]
      ),
      db.query(
        `SELECT log_date, weight_kg, waist_cm, water_ml, calories_eaten, protein_eaten, compliance
           FROM daily_logs
          WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '6 days'
          ORDER BY log_date ASC`,
        [userId]
      ),
      db.query(
        `SELECT mp.*,
                bm.name AS b_name, bm.calories AS b_cal, bm.protein_g AS b_pro,
                lm.name AS l_name, lm.calories AS l_cal, lm.protein_g AS l_pro,
                dm.name AS d_name, dm.calories AS d_cal, dm.protein_g AS d_pro,
                sm.name AS s_name, sm.calories AS s_cal, sm.protein_g AS s_pro
           FROM meal_plans mp
           LEFT JOIN meals bm ON bm.id = mp.breakfast_id
           LEFT JOIN meals lm ON lm.id = mp.lunch_id
           LEFT JOIN meals dm ON dm.id = mp.dinner_id
           LEFT JOIN meals sm ON sm.id = mp.snack_id
          WHERE mp.user_id = $1 AND mp.plan_date = CURRENT_DATE`,
        [userId]
      ),
    ]);

    if (userR.rows.length === 0) return res.status(404).json({ error: 'user_not_found' });

    const user = userR.rows[0];
    const today = todayR.rows[0] || { calories_eaten: 0, protein_eaten: 0, water_ml: 0, compliance: 0 };
    const last7 = last7R.rows;

    const planRow = planR.rows[0];
    const plan = planRow ? {
      meals: [
        planRow.b_name && { slot: 'breakfast', name: planRow.b_name, calories: planRow.b_cal, protein_g: planRow.b_pro, done: planRow.breakfast_done },
        planRow.l_name && { slot: 'lunch',     name: planRow.l_name, calories: planRow.l_cal, protein_g: planRow.l_pro, done: planRow.lunch_done },
        planRow.d_name && { slot: 'dinner',    name: planRow.d_name, calories: planRow.d_cal, protein_g: planRow.d_pro, done: planRow.dinner_done },
        planRow.s_name && { slot: 'snack',     name: planRow.s_name, calories: planRow.s_cal, protein_g: planRow.s_pro, done: planRow.snack_done },
      ].filter(Boolean),
    } : null;

    const result = await chat({ user, today, last7, plan, history, message });
    res.json(result);
  } catch (err) {
    if (err.message === 'empty_message') {
      return res.status(400).json({ error: 'empty_message' });
    }
    next(err);
  }
});

module.exports = router;

// Premium automation endpoints.
// All require user.is_premium = TRUE (returns 402 otherwise).

const router = require('express').Router();
const db = require('../db');
const { computePlanAdjustment } = require('../services/planAdjustment');
const { buildWeeklyReport } = require('../services/weeklyReport');
const { suggestSwap } = require('../services/mealSwap');
const { recommendEatingOut } = require('../services/eatingOut');
const { buildPlanRationale } = require('../services/planRationale');
const { simulate } = require('../services/goalSimulation');
const { buildCrisisResponse } = require('../services/crisisMode');

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

async function loadUser(userId) {
  const r = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  return r.rows[0] || null;
}

async function loadLast7(userId) {
  const r = await db.query(
    `SELECT log_date, weight_kg, waist_cm, water_ml, calories_eaten, protein_eaten, compliance
       FROM daily_logs
      WHERE user_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '6 days'
      ORDER BY log_date ASC`,
    [userId]
  );
  return r.rows;
}

function premiumGuard(user, res) {
  if (!user) { res.status(404).json({ error: 'user_not_found' }); return false; }
  if (!user.is_premium) {
    res.status(402).json({
      error: 'premium_required',
      message: 'Bu özellik premium kullanıcılara açıktır.',
    });
    return false;
  }
  return true;
}

// GET /premium/plan-adjustment/:userId
router.get('/plan-adjustment/:userId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });
    const user = await loadUser(userId);
    if (!premiumGuard(user, res)) return;
    const last7 = await loadLast7(userId);
    res.json(computePlanAdjustment(user, last7));
  } catch (err) { next(err); }
});

// POST /premium/plan-adjustment/:userId/apply
//   body: { calorie_target, protein_target }  — both required, must match the suggestion
router.post('/plan-adjustment/:userId/apply', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });

    const user = await loadUser(userId);
    if (!premiumGuard(user, res)) return;

    const { calorie_target, protein_target } = req.body || {};
    if (!Number.isFinite(Number(calorie_target)) || !Number.isFinite(Number(protein_target))) {
      return res.status(400).json({ error: 'invalid_targets' });
    }

    // Recompute carbs target from the calorie + protein + fat split (mirrors the
    // nutrition.js logic so the plan-generator still gets sensible macros).
    const fatRatio = user.goal === 'fat_loss' ? 0.30 : 0.25;
    const fats = Math.round((calorie_target * fatRatio) / 9);
    const remaining = calorie_target - protein_target * 4 - fats * 9;
    const carbs = Math.max(0, Math.round(remaining / 4));

    const r = await db.query(
      `UPDATE users
          SET calorie_target = $1, protein_target = $2, carbs_target = $3, fats_target = $4
        WHERE id = $5
        RETURNING *`,
      [calorie_target, protein_target, carbs, fats, userId]
    );
    res.json({ ok: true, user: r.rows[0] });
  } catch (err) { next(err); }
});

// POST /premium/meal-swap/:userId/:slot
//   body: { reason?: string }  → returns 3 alternative meals (no DB write)
router.post('/meal-swap/:userId/:slot', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const slot = String(req.params.slot);
    if (!userId)                return res.status(400).json({ error: 'invalid_user_id' });
    if (!SLOTS.includes(slot))  return res.status(400).json({ error: 'invalid_slot' });

    const user = await loadUser(userId);
    if (!premiumGuard(user, res)) return;

    const planR = await db.query(
      `SELECT ${slot}_snapshot AS snap FROM meal_plans
        WHERE user_id = $1 AND plan_date = CURRENT_DATE`,
      [userId]
    );
    const snap = planR.rows[0]?.snap;
    if (!snap) {
      return res.status(404).json({ error: 'meal_not_found_for_slot' });
    }

    const reason = (req.body && typeof req.body.reason === 'string') ? req.body.reason.slice(0, 200) : null;
    const result = await suggestSwap({ user, slot, currentMeal: snap, reason });

    if (!result || result.source === 'error') {
      return res.status(503).json({ error: 'swap_unavailable' });
    }
    if (result.source === 'rate_limited') {
      return res.status(200).json({
        alternatives: [],
        status: 'rate_limited',
        message: 'AI günlük kullanım limiti doldu. Birkaç saat sonra dene.',
      });
    }
    if (result.alternatives.length === 0) {
      return res.status(200).json({
        alternatives: [],
        status: 'no_valid_alternatives',
        message: 'Uygun alternatif üretilemedi. Tekrar dene.',
      });
    }
    res.json({ alternatives: result.alternatives, source: result.source });
  } catch (err) { next(err); }
});

// POST /premium/meal-swap/:userId/:slot/apply
//   body: { meal: { name, description, calories, protein_g, carbs_g, fats_g, tags? } }
router.post('/meal-swap/:userId/:slot/apply', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const slot = String(req.params.slot);
    if (!userId)                return res.status(400).json({ error: 'invalid_user_id' });
    if (!SLOTS.includes(slot))  return res.status(400).json({ error: 'invalid_slot' });

    const user = await loadUser(userId);
    if (!premiumGuard(user, res)) return;

    const meal = req.body?.meal;
    if (!meal || !meal.name) return res.status(400).json({ error: 'meal_required' });

    const snapshot = {
      slot,
      category: slot,
      name: String(meal.name).slice(0, 80),
      description: String(meal.description || '').slice(0, 240),
      calories: Math.round(Number(meal.calories) || 0),
      protein_g: Number(meal.protein_g) || 0,
      carbs_g: Number(meal.carbs_g) || 0,
      fats_g: Number(meal.fats_g) || 0,
      tags: Array.isArray(meal.tags) ? meal.tags : [],
      image_url: null,
      source: 'ai_swap',
    };

    // Grow the catalog (best-effort, never overwrite an existing canonical row).
    await db.query(
      `INSERT INTO meals (name, category, calories, protein_g, carbs_g, fats_g, description, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (name) DO NOTHING`,
      [snapshot.name, slot, snapshot.calories, snapshot.protein_g, snapshot.carbs_g, snapshot.fats_g, snapshot.description, snapshot.tags]
    );

    // Update today's plan snapshot for this slot. Reset the slot's done flag since
    // we just swapped the meal — it counts as not-eaten again.
    const r = await db.query(
      `UPDATE meal_plans
          SET ${slot}_snapshot = $1,
              ${slot}_id = NULL,
              ${slot}_done = FALSE
        WHERE user_id = $2 AND plan_date = CURRENT_DATE
        RETURNING *`,
      [snapshot, userId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'plan_not_found' });

    res.json({ ok: true, slot, snapshot });
  } catch (err) { next(err); }
});

// POST /premium/eating-out/:userId  body: { venue: 'doner' | 'kebap' | ... }
router.post('/eating-out/:userId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });
    const user = await loadUser(userId);
    if (!premiumGuard(user, res)) return;

    const venue = String(req.body?.venue || '');
    if (!venue) return res.status(400).json({ error: 'venue_required' });

    // Compute today's remaining macros from completed meals.
    const planR = await db.query(
      `SELECT
         breakfast_done, lunch_done, dinner_done, snack_done,
         breakfast_snapshot, lunch_snapshot, dinner_snapshot, snack_snapshot
       FROM meal_plans WHERE user_id = $1 AND plan_date = CURRENT_DATE`,
      [userId]
    );
    const eaten = planR.rows[0] ? sumCompletedFromPlan(planR.rows[0]) : { calories: 0, protein: 0 };
    const remainingCal     = Math.max(0, (user.calorie_target || 0) - eaten.calories);
    const remainingProtein = Math.max(0, (user.protein_target || 0) - eaten.protein);

    const result = await recommendEatingOut({
      user, venue,
      remainingCal,
      remainingProtein: Math.round(remainingProtein),
    });

    if (result.error) {
      if (result.error === 'rate_limited') {
        return res.status(200).json({
          status: 'rate_limited',
          message: 'AI günlük kullanım limiti doldu. Birkaç saat sonra dene.',
        });
      }
      if (result.error === 'invalid_venue') {
        return res.status(400).json({ error: 'invalid_venue' });
      }
      return res.status(503).json({ error: result.error });
    }

    res.json({
      ...result,
      context: { remaining_kcal: remainingCal, remaining_protein_g: Math.round(remainingProtein) },
    });
  } catch (err) { next(err); }
});

// GET /premium/plan-rationale/:userId  — pure deterministic explanation
router.get('/plan-rationale/:userId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });
    const user = await loadUser(userId);
    if (!premiumGuard(user, res)) return;
    res.json(buildPlanRationale(user));
  } catch (err) { next(err); }
});

// GET /premium/goal-simulation/:userId  — projection at current pace
router.get('/goal-simulation/:userId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });
    const user = await loadUser(userId);
    if (!premiumGuard(user, res)) return;

    const r = await db.query(
      `SELECT log_date, weight_kg FROM daily_logs
        WHERE user_id = $1 AND weight_kg IS NOT NULL
          AND log_date >= CURRENT_DATE - INTERVAL '14 days'
        ORDER BY log_date ASC`,
      [userId]
    );
    res.json(simulate(user, r.rows));
  } catch (err) { next(err); }
});

// POST /premium/goal-simulation/:userId/target  — set target_weight_kg
router.post('/goal-simulation/:userId/target', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });
    const user = await loadUser(userId);
    if (!premiumGuard(user, res)) return;

    const raw = req.body?.target_weight_kg;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 30 || n > 250) {
      return res.status(400).json({ error: 'target_out_of_range', message: 'Hedef kilo 30 – 250 kg arasında olmalı.' });
    }
    await db.query('UPDATE users SET target_weight_kg = $1 WHERE id = $2', [n, userId]);
    res.json({ ok: true, target_weight_kg: n });
  } catch (err) { next(err); }
});

// POST /premium/crisis/:userId  body: { kind: 'ate_out' | 'cheat_meal' | ... }
router.post('/crisis/:userId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });
    const user = await loadUser(userId);
    if (!premiumGuard(user, res)) return;

    const kind = String(req.body?.kind || '');
    if (!kind) return res.status(400).json({ error: 'kind_required' });

    // Remaining macros from today's plan completion
    const planR = await db.query(
      `SELECT
         breakfast_done, lunch_done, dinner_done, snack_done,
         breakfast_snapshot, lunch_snapshot, dinner_snapshot, snack_snapshot
       FROM meal_plans WHERE user_id = $1 AND plan_date = CURRENT_DATE`,
      [userId]
    );
    const eaten = planR.rows[0] ? sumCompletedFromPlan(planR.rows[0]) : { calories: 0, protein: 0 };
    const remainingCal     = Math.max(0, (user.calorie_target || 0) - eaten.calories);
    const remainingProtein = Math.max(0, (user.protein_target || 0) - Math.round(eaten.protein));

    const result = await buildCrisisResponse({ user, kind, remainingCal, remainingProtein });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
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

// GET /premium/weekly-report/:userId
router.get('/weekly-report/:userId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });
    const user = await loadUser(userId);
    if (!premiumGuard(user, res)) return;
    const last7 = await loadLast7(userId);
    const report = await buildWeeklyReport(user, last7);
    res.json(report);
  } catch (err) { next(err); }
});

module.exports = router;

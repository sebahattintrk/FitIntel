const router = require('express').Router();
const db = require('../db');
const { generateMeals, turkishLower } = require('../services/mealGenerator');

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
const RECENT_NAMES_TO_EXCLUDE = 16;

// GET /meal-plan/:userId   – returns today's plan, generating one if missing
router.get('/:userId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });

    const userR = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userR.rows.length === 0) return res.status(404).json({ error: 'user_not_found' });
    const user = userR.rows[0];

    let planRow = await getTodayPlan(userId);
    if (!planRow) planRow = await generatePlan(user);

    return res.json(serializePlan(user, planRow));
  } catch (err) { next(err); }
});

// POST /meal-plan/:userId/regenerate  – delete today's plan and create a fresh one
router.post('/:userId/regenerate', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });

    const userR = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userR.rows.length === 0) return res.status(404).json({ error: 'user_not_found' });
    const user = userR.rows[0];

    await db.query(
      `DELETE FROM meal_plans WHERE user_id = $1 AND plan_date = CURRENT_DATE`,
      [userId]
    );
    const planRow = await generatePlan(user);
    return res.json(serializePlan(user, planRow));
  } catch (err) { next(err); }
});

// PATCH /meal-plan/:userId/meal   body: { slot, done }
router.patch('/:userId/meal', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const { slot, done } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });
    if (!SLOTS.includes(slot)) return res.status(400).json({ error: 'invalid_slot' });
    if (typeof done !== 'boolean') return res.status(400).json({ error: 'invalid_done' });

    const column = `${slot}_done`;
    const r = await db.query(
      `UPDATE meal_plans
          SET ${column} = $1
        WHERE user_id = $2 AND plan_date = CURRENT_DATE
        RETURNING *`,
      [done, userId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'plan_not_found' });

    res.json({ slot, done });
  } catch (err) { next(err); }
});

// ---------- core ----------

async function getTodayPlan(userId) {
  const r = await db.query(
    `SELECT * FROM meal_plans WHERE user_id = $1 AND plan_date = CURRENT_DATE`,
    [userId]
  );
  return r.rows[0] || null;
}

// RANDOM fallback. Disliked check now uses ILIKE across name + description (substring match).
async function pickMeal(category, disliked, excludeId = null) {
  const r = await db.query(
    `SELECT * FROM meals
       WHERE category = $1
         AND ($2::int IS NULL OR id <> $2)
         AND NOT EXISTS (
           SELECT 1 FROM unnest($3::text[]) AS d
            WHERE position(LOWER(d) IN LOWER(name)) > 0
               OR position(LOWER(d) IN LOWER(COALESCE(description, ''))) > 0
         )
       ORDER BY RANDOM() LIMIT 1`,
    [category, excludeId, disliked || []]
  );
  return r.rows[0];
}

// Pull recent meal names this user has been served (from either snapshot or legacy id-join).
async function recentMealNames(userId, limit) {
  const r = await db.query(
    `SELECT DISTINCT name FROM (
        SELECT
          COALESCE(mp.breakfast_snapshot->>'name', bm.name) AS name
          FROM meal_plans mp
          LEFT JOIN meals bm ON bm.id = mp.breakfast_id
         WHERE mp.user_id = $1 AND mp.plan_date >= CURRENT_DATE - INTERVAL '14 days'
        UNION
        SELECT COALESCE(mp.lunch_snapshot->>'name',  lm.name)
          FROM meal_plans mp LEFT JOIN meals lm ON lm.id = mp.lunch_id
         WHERE mp.user_id = $1 AND mp.plan_date >= CURRENT_DATE - INTERVAL '14 days'
        UNION
        SELECT COALESCE(mp.dinner_snapshot->>'name', dm.name)
          FROM meal_plans mp LEFT JOIN meals dm ON dm.id = mp.dinner_id
         WHERE mp.user_id = $1 AND mp.plan_date >= CURRENT_DATE - INTERVAL '14 days'
        UNION
        SELECT COALESCE(mp.snack_snapshot->>'name', sm.name)
          FROM meal_plans mp LEFT JOIN meals sm ON sm.id = mp.snack_id
         WHERE mp.user_id = $1 AND mp.plan_date >= CURRENT_DATE - INTERVAL '14 days'
     ) t WHERE name IS NOT NULL
     ORDER BY name LIMIT $2`,
    [userId, limit]
  );
  return r.rows.map((row) => row.name);
}

async function generatePlan(user) {
  const exclude = await recentMealNames(user.id, RECENT_NAMES_TO_EXCLUDE);
  const aiMeals = await generateMeals({ user, excludeNames: exclude });

  let bySlot = {}; // { breakfast: snapshot, ... }
  let idsBySlot = { breakfast: null, lunch: null, dinner: null, snack: null };

  if (aiMeals && aiMeals.length === 4) {
    // AI path — use AI meals as snapshots. We also DO-NOTHING insert into the catalog
    // so the meals table grows for future analytics / fallback, but never overwrite
    // an existing entry's macros (preserves historical accuracy).
    for (const m of aiMeals) {
      bySlot[m.slot] = mealToSnapshot(m, 'ai');
    }
    await Promise.all(aiMeals.map((m) => insertMealIfMissing(m)));
  } else {
    // Fallback path — pick from catalog, validated. We try up to 3 random
    // combinations and accept the first one that hits the calorie band; if none
    // pass, we accept the closest combination so the user still has a plan
    // rather than nothing.
    const fallback = await pickValidatedFallback(user);
    for (const slot of SLOTS) {
      const row = fallback.picked[slot];
      if (row) {
        idsBySlot[slot] = row.id;
        bySlot[slot] = catalogRowToSnapshot(row, fallback.passed ? 'random' : 'random_best_effort');
      }
    }
  }

  const r = await db.query(
    `INSERT INTO meal_plans (
        user_id, plan_date,
        breakfast_id, lunch_id, dinner_id, snack_id,
        breakfast_snapshot, lunch_snapshot, dinner_snapshot, snack_snapshot
     ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id, plan_date) DO UPDATE SET
       breakfast_id       = EXCLUDED.breakfast_id,
       lunch_id           = EXCLUDED.lunch_id,
       dinner_id          = EXCLUDED.dinner_id,
       snack_id           = EXCLUDED.snack_id,
       breakfast_snapshot = EXCLUDED.breakfast_snapshot,
       lunch_snapshot     = EXCLUDED.lunch_snapshot,
       dinner_snapshot    = EXCLUDED.dinner_snapshot,
       snack_snapshot     = EXCLUDED.snack_snapshot,
       breakfast_done     = FALSE,
       lunch_done         = FALSE,
       dinner_done        = FALSE,
       snack_done         = FALSE
     RETURNING *`,
    [
      user.id,
      idsBySlot.breakfast, idsBySlot.lunch, idsBySlot.dinner, idsBySlot.snack,
      bySlot.breakfast ?? null, bySlot.lunch ?? null, bySlot.dinner ?? null, bySlot.snack ?? null,
    ]
  );
  return r.rows[0];
}

// Insert into the meals catalog only if a meal with this name doesn't exist yet.
// (Macros are preserved canonical — never overwritten.)
async function insertMealIfMissing(m) {
  await db.query(
    `INSERT INTO meals (name, category, calories, protein_g, carbs_g, fats_g, description, tags,
                        serving_size_g, prep_time_min, ingredients)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (name) DO NOTHING`,
    [
      m.name, m.category, m.calories, m.protein_g, m.carbs_g, m.fats_g, m.description, m.tags,
      m.serving_size_g ?? null,
      m.prep_time_min ?? null,
      m.ingredients ?? [],
    ]
  );
}

// Fallback: try up to 3 random combinations; pick the first that's within the
// calorie band, otherwise return the closest. Better-than-nothing semantics so
// users always get a plan even when Gemini is down.
async function pickValidatedFallback(user) {
  const FALLBACK_CAL_TOLERANCE = 0.10;
  const FALLBACK_PROTEIN_MIN_RATIO = 0.85;
  const target = Number(user.calorie_target) || 0;
  const proteinTarget = Number(user.protein_target) || 0;

  let bestCombo = null;
  let bestDistance = Infinity;

  const prev = await getTodayPlan(user.id);
  const exId = {
    breakfast: prev?.breakfast_id ?? null,
    lunch:     prev?.lunch_id     ?? null,
    dinner:    prev?.dinner_id    ?? null,
    snack:     prev?.snack_id     ?? null,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const [b, l, d, s] = await Promise.all([
      pickMeal('breakfast', user.disliked_foods, exId.breakfast),
      pickMeal('lunch',     user.disliked_foods, exId.lunch),
      pickMeal('dinner',    user.disliked_foods, exId.dinner),
      pickMeal('snack',     user.disliked_foods, exId.snack),
    ]);
    const combo = { breakfast: b, lunch: l, dinner: d, snack: s };
    const rows = Object.values(combo).filter(Boolean);
    if (rows.length < 4) continue;

    const totalCal = rows.reduce((s, r) => s + Number(r.calories || 0), 0);
    const totalPro = rows.reduce((s, r) => s + Number(r.protein_g || 0), 0);

    const calOK = target === 0 ||
      (totalCal >= target * (1 - FALLBACK_CAL_TOLERANCE) &&
       totalCal <= target * (1 + FALLBACK_CAL_TOLERANCE));
    const proOK = proteinTarget === 0 || totalPro >= proteinTarget * FALLBACK_PROTEIN_MIN_RATIO;

    if (calOK && proOK) {
      return { picked: combo, passed: true, totals: { cal: totalCal, pro: totalPro } };
    }
    const distance = Math.abs(totalCal - target) + Math.abs(totalPro - proteinTarget);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCombo = combo;
    }
  }
  return { picked: bestCombo || {}, passed: false };
}

function mealToSnapshot(m, source) {
  return {
    slot: m.slot,
    category: m.category,
    name: m.name,
    description: m.description,
    calories: m.calories,
    protein_g: m.protein_g,
    carbs_g: m.carbs_g,
    fats_g: m.fats_g,
    tags: m.tags || [],
    image_url: null,
    serving_size_g: m.serving_size_g ?? null,
    prep_time_min:  m.prep_time_min ?? null,
    ingredients:    m.ingredients ?? [],
    rationale:      m.rationale ?? null,
    source,
  };
}

function catalogRowToSnapshot(row, source) {
  return {
    slot: row.category,
    category: row.category,
    name: row.name,
    description: row.description,
    calories: Number(row.calories),
    protein_g: Number(row.protein_g),
    carbs_g: Number(row.carbs_g),
    fats_g: Number(row.fats_g),
    tags: row.tags || [],
    image_url: row.image_url || null,
    serving_size_g: row.serving_size_g != null ? Number(row.serving_size_g) : null,
    prep_time_min:  row.prep_time_min  != null ? Number(row.prep_time_min)  : null,
    ingredients:    Array.isArray(row.ingredients) ? row.ingredients : [],
    rationale:      null,  // catalog rows don't carry rationale
    source,
  };
}

// ---------- response shaping ----------

function totalsFor(meals) {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + Number(m.calories  || 0),
      protein:  acc.protein  + Number(m.protein_g || 0),
      carbs:    acc.carbs    + Number(m.carbs_g   || 0),
      fats:     acc.fats     + Number(m.fats_g    || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

function serializePlan(user, planRow) {
  const meals = SLOTS
    .map((slot) => {
      const snap = planRow[`${slot}_snapshot`];
      const done = !!planRow[`${slot}_done`];
      const id   = planRow[`${slot}_id`];
      if (!snap) return null;
      // Frontend keys off `id`; for AI meals without an id we synthesize one from plan+slot
      // so React keys stay stable. -planRow.id ensures it never collides with real meal ids.
      const effectiveId = id != null ? id : -(planRow.id * 10 + SLOTS.indexOf(slot));
      return {
        slot,
        id: effectiveId,
        category: snap.category,
        name: snap.name,
        description: snap.description,
        calories: snap.calories,
        protein_g: snap.protein_g,
        carbs_g:   snap.carbs_g,
        fats_g:    snap.fats_g,
        image_url: snap.image_url || '',
        tags: snap.tags || [],
        // v2 — practical metadata
        serving_size_g: snap.serving_size_g ?? null,
        prep_time_min:  snap.prep_time_min  ?? null,
        ingredients:    Array.isArray(snap.ingredients) ? snap.ingredients : [],
        rationale:      snap.rationale ?? null,
        done,
      };
    })
    .filter(Boolean);

  return {
    date: planRow.plan_date,
    targets: {
      calories: user.calorie_target,
      protein:  user.protein_target,
      carbs:    user.carbs_target,
      fats:     user.fats_target,
    },
    totals: totalsFor(meals),
    meals,
  };
}

module.exports = router;

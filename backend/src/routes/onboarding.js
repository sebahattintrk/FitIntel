const router = require('express').Router();
const db = require('../db');
const { buildPlan } = require('../services/nutrition');

// POST /onboarding  — create a user profile and compute targets
router.post('/', async (req, res, next) => {
  try {
    const {
      name = null,
      age,
      gender,
      weight_kg,
      height_cm,
      activity_level,
      goal,
      budget = 0,
      disliked_foods = [],
      starting_waist_cm = null,
    } = req.body || {};

    if (!age || !gender || !weight_kg || !height_cm || !activity_level || !goal) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }

    // Bel çevresi 40-200 cm range — opsiyonel ama girilmişse sağlıklı bir aralıkta olmalı.
    let validatedWaist = null;
    if (starting_waist_cm != null && starting_waist_cm !== '') {
      const n = Number(starting_waist_cm);
      if (!Number.isFinite(n) || n < 40 || n > 200) {
        return res.status(400).json({
          error: 'starting_waist_out_of_range',
          message: 'Başlangıç bel çevresi 40-200 cm arasında olmalı.',
        });
      }
      validatedWaist = Math.round(n * 100) / 100;
    }

    const targets = buildPlan({ age, gender, weight_kg, height_cm, activity_level, goal });

    const { rows } = await db.query(
      `INSERT INTO users
        (name, age, gender, weight_kg, height_cm, activity_level, goal, budget, disliked_foods,
         bmr, tdee, calorie_target, protein_target, carbs_target, fats_target, starting_waist_cm)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        name, age, gender, weight_kg, height_cm, activity_level, goal, budget, disliked_foods,
        targets.bmr, targets.tdee, targets.calorie_target,
        targets.protein_target, targets.carbs_target, targets.fats_target,
        validatedWaist,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;

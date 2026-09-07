const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    // 1. Kullanıcı bilgilerini al
    const userRes = await db.query('SELECT * FROM users ORDER BY id DESC LIMIT 1');
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Kayıtlı kullanıcı bulunamadı.' });
    }
    const user = userRes.rows[0];

    // 2. food_logs tablosundan BUGÜN tüketilen gerçek makroları topla
    const foodSummaryRes = await db.query(`
      SELECT 
        COALESCE(SUM(calories), 0)::int AS total_calories,
        COALESCE(SUM(protein_g), 0)::numeric(6,1) AS total_protein,
        COALESCE(SUM(carbs_g), 0)::numeric(6,1) AS total_carbs,
        COALESCE(SUM(fats_g), 0)::numeric(6,1) AS total_fats
      FROM food_logs
      WHERE user_id = $1 AND log_date = CURRENT_DATE
    `, [user.id]);

    const eaten = foodSummaryRes.rows[0];

    // 3. Su takibini daily_logs tablosundan al
    const logRes = await db.query(
      'SELECT water_ml FROM daily_logs WHERE user_id = $1 AND log_date = CURRENT_DATE',
      [user.id]
    );
    const waterMl = logRes.rows[0]?.water_ml || 0;

    // 4. Kalan hedefler
    const remainingKcal = Math.max(0, user.calorie_target - eaten.total_calories);
    const remainingProtein = Math.max(0, Number(user.protein_target) - Number(eaten.total_protein));

    const aiRecommendation = remainingKcal > 0
      ? `Bugün hedefine ${remainingKcal} kcal ve ${remainingProtein.toFixed(1)}g protein kaldı. Tempoyu koru!`
      : 'Tebrikler! Bugünün kalori hedefini başarıyla tamamladın.';

    return res.status(200).json({
      caloriesTarget: user.calorie_target,
      caloriesConsumed: eaten.total_calories,
      caloriesRemaining: remainingKcal,
      proteinTarget: user.protein_target,
      proteinConsumed: Number(eaten.total_protein),
      carbsTarget: user.carbs_target || 350,
      carbsConsumed: Number(eaten.total_carbs),
      fatTarget: user.fats_target || 52,
      fatConsumed: Number(eaten.total_fats),
      waterTargetLiters: 3.0,
      waterDrankLiters: (waterMl / 1000).toFixed(1),
      streakDays: 1,
      aiRecommendation,
    });
  } catch (error) {
    console.error('Dashboard DB Error:', error);
    return res.status(500).json({ error: 'Dashboard verileri alınamadı: ' + error.message });
  }
});

// Su Ekleme Endpoint'i (+250ml)
router.post('/water', async (req, res) => {
  try {
    const userRes = await db.query('SELECT id FROM users ORDER BY id DESC LIMIT 1');
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Kullanıcı yok' });

    const userId = userRes.rows[0].id;
    await db.query(`
      INSERT INTO daily_logs (user_id, log_date, water_ml)
      VALUES ($1, CURRENT_DATE, 250)
      ON CONFLICT (user_id, log_date)
      DO UPDATE SET water_ml = daily_logs.water_ml + 250;
    `, [userId]);

    const updated = await db.query(
      'SELECT water_ml FROM daily_logs WHERE user_id = $1 AND log_date = CURRENT_DATE',
      [userId]
    );

    return res.json({ success: true, waterDrankLiters: (updated.rows[0].water_ml / 1000).toFixed(1) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/', async (req, res) => {
  try {
    const {
      name,
      age,
      gender,
      height,
      weight,
      goal,
      activityLevel,
      monthlyBudget,
      dislikedFoods,
    } = req.body;

    // 1. Şema CHECK kısıtlamalarına uygun eşlemeler
    const genderMap = { Erkek: 'male', Kadın: 'female', Diğer: 'other' };
    const goalMap = {
      'Kilo Vermek': 'fat_loss',
      'Kas Kazanımı': 'muscle_gain',
      'Formu Korumak': 'recomp',
    };
    const activityMap = {
      Hareketsiz: 'sedentary',
      'Az Hareketli': 'light',
      Orta: 'moderate',
      Aktif: 'active',
      'Çok Aktif': 'very_active',
    };

    const mappedGender = genderMap[gender] || 'male';
    const mappedGoal = goalMap[goal] || 'muscle_gain';
    const mappedActivity = activityMap[activityLevel] || 'moderate';

    const numAge = parseInt(age, 10) || 24;
    const numHeight = parseFloat(height) || 180;
    const numWeight = parseFloat(weight) || 75;
    const numBudget = parseFloat(monthlyBudget) || 2000;
    const foodArray = Array.isArray(dislikedFoods) ? dislikedFoods : [];

    // 2. Mifflin-St Jeor Formülü ile BMR ve Hedef Makro Hesaplama
    let bmr = 10 * numWeight + 6.25 * numHeight - 5 * numAge;
    bmr += mappedGender === 'female' ? -161 : 5;

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    const tdee = Math.round(bmr * (activityMultipliers[mappedActivity] || 1.55));

    let calorieTarget = tdee;
    if (mappedGoal === 'fat_loss') calorieTarget -= 400;
    else if (mappedGoal === 'muscle_gain') calorieTarget += 300;

    const proteinTarget = Math.round(numWeight * 2.0); // 2g/kg
    const fatsTarget = Math.round(numWeight * 0.9);    // 0.9g/kg
    const remainingKcal = calorieTarget - (proteinTarget * 4 + fatsTarget * 9);
    const carbsTarget = Math.max(50, Math.round(remainingKcal / 4));

    // 3. Kullanıcıyı `users` Tablosuna Kaydet
    const userInsertQuery = `
      INSERT INTO users (
        name, age, gender, height_cm, weight_kg, activity_level,
        goal, budget, disliked_foods, bmr, tdee,
        calorie_target, protein_target, carbs_target, fats_target, is_premium
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;

    const userValues = [
      name || 'Sebahattin',
      numAge,
      mappedGender,
      numHeight,
      numWeight,
      mappedActivity,
      mappedGoal,
      numBudget,
      foodArray,
      Math.round(bmr),
      tdee,
      calorieTarget,
      proteinTarget,
      carbsTarget,
      fatsTarget,
      true,
    ];

    const { rows: userRows } = await db.query(userInsertQuery, userValues);
    const newUser = userRows[0];

    // 4. Bugünün İlk Günlük Takip Kaydını (`daily_logs`) Oluştur
    const todayQuery = `
      INSERT INTO daily_logs (user_id, log_date, weight_kg, water_ml, calories_eaten, protein_eaten)
      VALUES ($1, CURRENT_DATE, $2, 0, 0, 0)
      ON CONFLICT (user_id, log_date) DO NOTHING;
    `;
    await db.query(todayQuery, [newUser.id, numWeight]);

    return res.status(200).json({
      success: true,
      message: 'Kullanıcı ve hedefler veritabanına kaydedildi.',
      user: {
        id: newUser.id,
        name: newUser.name,
        age: newUser.age,
        gender: newUser.gender,
        height: newUser.height_cm,
        weight: newUser.weight_kg,
        goal: goal,
        monthlyBudget: newUser.budget,
        calorieTarget: newUser.calorie_target,
        proteinTarget: newUser.protein_target,
        carbsTarget: newUser.carbs_target,
        fatsTarget: newUser.fats_target,
      },
    });
  } catch (error) {
    console.error('Onboarding DB Error:', error);
    return res.status(500).json({ error: 'Veritabanına kaydedilirken hata oluştu: ' + error.message });
  }
});

module.exports = router;
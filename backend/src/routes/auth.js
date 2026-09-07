const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'fitintel_super_secret_jwt_key_2026';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Ad, e-posta ve şifre alanları zorunludur.' });
  }

  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanımda.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Yeni kullanıcıyı oluştur (Onboarding öncesi geçici varsayılanlarla)
    const result = await db.query(`
      INSERT INTO users (
        name, email, password_hash, is_premium, trial_ends_at,
        weight_kg, height_cm, age, goal, calorie_target, protein_target, carbs_target, fats_target
      ) VALUES (
        $1, $2, $3, false, NOW() + INTERVAL '1 day',
        70.0, 175, 25, 'muscle_gain', 2500, 130, 300, 65
      )
      RETURNING id, name, email, is_premium, trial_ends_at
    `, [
      name.trim(),
      email.toLowerCase().trim(),
      hash
    ]);

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register Hatası:', err);
    return res.status(500).json({ error: 'Kayıt yapılırken bir hata oluştu: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-posta ve şifre gereklidir.' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'E-posta veya şifre hatalı.' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'E-posta veya şifre hatalı.' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    delete user.password_hash;
    return res.json({ token, user });
  } catch (err) {
    console.error('Login Hatası:', err);
    return res.status(500).json({ error: 'Giriş yapılırken bir hata oluştu: ' + err.message });
  }
});

// POST /api/auth/onboarding
router.post('/onboarding', async (req, res) => {
  const {
    userId,
    goal,           // 'fat_loss' | 'weight_gain' | 'maintain' | 'muscle_gain'
    age,
    height_cm,
    weight_kg,
    disliked_foods,
    budget,
  } = req.body;

  if (!userId || !goal || !age || !height_cm || !weight_kg) {
    return res.status(400).json({ error: 'Eksik biyometrik veri gönderildi.' });
  }

  try {
    const ageNum = Number(age);
    const heightNum = Number(height_cm);
    const weightNum = Number(weight_kg);

    // 1. Bilimsel BMR Hesabı (Mifflin-St Jeor)
    const bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum + 5;
    const tdee = Math.round(bmr * 1.45);

    // 2. Hedefe Göre Dinamik Kalori & Protein Belirleme
    let calorieTarget = tdee;
    let proteinTarget = Math.round(weightNum * 2.0);

    if (goal === 'fat_loss') {
      calorieTarget = Math.round(tdee - 450);
      proteinTarget = Math.round(weightNum * 2.2);
    } else if (goal === 'weight_gain') {
      calorieTarget = Math.round(tdee + 500);
      proteinTarget = Math.round(weightNum * 1.8);
    } else if (goal === 'muscle_gain') {
      calorieTarget = Math.round(tdee + 300);
      proteinTarget = Math.round(weightNum * 2.0);
    } else if (goal === 'maintain') {
      calorieTarget = tdee;
      proteinTarget = Math.round(weightNum * 1.6);
    }

    const carbsTarget = Math.round((calorieTarget * 0.50) / 4);
    const fatsTarget = Math.round((calorieTarget * 0.25) / 9);

    const dislikesArray = Array.isArray(disliked_foods)
      ? disliked_foods
      : String(disliked_foods || '').split(',').map((s) => s.trim()).filter(Boolean);

    // 3. Veritabanını Güncelle
    const updated = await db.query(`
      UPDATE users SET
        goal = $1,
        age = $2,
        height_cm = $3,
        weight_kg = $4,
        calorie_target = $5,
        protein_target = $6,
        carbs_target = $7,
        fats_target = $8,
        disliked_foods = $9,
        budget = $10
      WHERE id = $11
      RETURNING *
    `, [
      goal,
      ageNum,
      heightNum,
      weightNum,
      calorieTarget,
      proteinTarget,
      carbsTarget,
      fatsTarget,
      dislikesArray,
      budget ? Number(budget) : null,
      userId
    ]);

    const user = updated.rows[0];
    delete user.password_hash;

    return res.json({ success: true, user });
  } catch (err) {
    console.error('Onboarding Hatası:', err);
    return res.status(500).json({ error: 'Onboarding verileri kaydedilemedi: ' + err.message });
  }
});

// POST /api/auth/upgrade - PRO üyeliğe yükseltir
router.post('/upgrade', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Kullanıcı kimliği eksik.' });

  try {
    const result = await db.query(
      'UPDATE users SET is_premium = true WHERE id = $1 RETURNING id, name, email, is_premium',
      [userId]
    );
    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Üyelik güncellenemedi: ' + err.message });
  }
});

// DELETE /api/auth/delete-account - Apple App Store 5.1.1 Uyumlu Hesap Silme
router.delete('/delete-account', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Kullanıcı kimliği eksik.' });

  try {
    await db.query('DELETE FROM food_logs WHERE user_id = $1', [userId]).catch(() => {});
    await db.query('DELETE FROM daily_logs WHERE user_id = $1', [userId]).catch(() => {});
    await db.query('DELETE FROM meal_plans WHERE user_id = $1', [userId]).catch(() => {});
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    return res.json({ success: true, message: 'Hesap ve tüm veriler başarıyla silindi.' });
  } catch (err) {
    return res.status(500).json({ error: 'Hesap silinirken hata oluştu: ' + err.message });
  }
});

module.exports = router;
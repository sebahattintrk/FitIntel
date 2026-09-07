const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'fitintel_super_secret_jwt_key_2026';

module.exports = async function checkLimit(req, res, next) {
  try {
    let userId = Number(req.body.userId || req.params.userId || req.query.userId);

    if (!userId && req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = Number(decoded.userId);
      } catch (e) {}
    }

    if (!userId) {
      return res.status(400).json({ error: 'Kullanıcı kimliği bulunamadı.' });
    }

    // PostgreSQL üzerinden tarih ve sayaç kontrolü (Saat dilimi farkı bug'ını engeller)
    const result = await db.query(`
      SELECT 
        id, is_premium, trial_ends_at,
        (CASE WHEN last_ai_date = CURRENT_DATE THEN daily_ai_count ELSE 0 END) AS effective_count,
        (trial_ends_at > NOW()) AS is_trial_active
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const user = result.rows[0];

    // PRO kullanıcı veya 1 günlük deneme süresi devam ediyorsa doğrudan izin ver
    if (user.is_premium || user.is_trial_active) {
      return next();
    }

    // Günlük 3 hak dolmuşsa Paywall tetikle
    if (Number(user.effective_count) >= 3) {
      return res.status(403).json({
        code: 'LIMIT_REACHED',
        error: 'Günlük 3 ücretsiz AI koçluk hakkın doldu. Sınırsız erişim için FitIntel PRO’ya geç!',
      });
    }

    // Sayacı artır ve tarihi güncelle
    await db.query(`
      UPDATE users SET 
        daily_ai_count = (CASE WHEN last_ai_date = CURRENT_DATE THEN daily_ai_count + 1 ELSE 1 END),
        last_ai_date = CURRENT_DATE
      WHERE id = $1
    `, [userId]);

    next();
  } catch (err) {
    console.error('Limit middleware hatası:', err);
    next(err);
  }
};
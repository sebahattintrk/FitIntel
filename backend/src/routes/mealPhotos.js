// Premium feature: Fotoğraflı Öğün Tahmini endpoints.
//
// Storage parallels progress_photos: files on disk under uploads/users/<id>/meals/,
// metadata + AI estimate cached in the meal_photos table.

const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db');
const { estimateMealFromPhoto } = require('../services/mealPhotoEstimation');

const UPLOADS_ROOT = path.resolve(__dirname, '..', '..', 'uploads');

// iOS photos default to HEIC. Gemini multimodal accepts JPEG / PNG / WEBP / HEIC / HEIF,
// so we mirror that on the inbound side.
const ALLOWED_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg':  '.jpg',     // some clients emit the typo variant
  'image/png':  '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = req.params.userId;
    if (!/^\d+$/.test(String(userId))) return cb(new Error('invalid_user_id'));
    const dir = path.join(UPLOADS_ROOT, 'users', userId, 'meals');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME[file.mimetype] || '.jpg';
    cb(null, crypto.randomBytes(12).toString('hex') + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 }, // HEIC sometimes 8-10 MB; raise ceiling
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME[file.mimetype]) {
      return cb(new Error('invalid_mime'));
    }
    cb(null, true);
  },
});

// Multer puts fileFilter / size errors on `next(err)` — by default they hit the
// global error handler and become a 500. Wrap upload.single() so they become
// proper 4xx responses with a friendly Turkish message.
function uploadOrError(field) {
  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (!err) return next();
      if (err.message === 'invalid_mime') {
        return res.status(400).json({
          error: 'invalid_mime',
          message: `Bu format desteklenmiyor (${err.detail || ''}). JPEG, PNG, WEBP veya HEIC seç.`,
        });
      }
      if (err.message === 'invalid_user_id') {
        return res.status(400).json({ error: 'invalid_user_id' });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'file_too_large', message: 'Dosya 12 MB sınırını aştı.' });
      }
      next(err);
    });
  };
}

async function premiumCheck(userId, res) {
  const r = await db.query('SELECT is_premium FROM users WHERE id = $1', [userId]);
  if (r.rows.length === 0) { res.status(404).json({ error: 'user_not_found' }); return false; }
  if (!r.rows[0].is_premium) {
    res.status(402).json({ error: 'premium_required', message: 'Fotoğraflı öğün tahmini premium özelliktir.' });
    return false;
  }
  return true;
}

// POST /premium/meal-photo/:userId  — multipart upload + Gemini estimate
router.post('/:userId', uploadOrError('photo'), async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });
    if (!req.file) return res.status(400).json({ error: 'photo_required' });
    if (!(await premiumCheck(userId, res))) return;

    const filePath = `users/${userId}/meals/${req.file.filename}`;

    const result = await estimateMealFromPhoto({ filePath });

    // Insert the row regardless of AI success — the user still has their photo;
    // they can retry estimation later via PATCH or just edit user_label/kcal manually.
    const est = result.estimate;
    const ins = await db.query(
      `INSERT INTO meal_photos
         (user_id, file_path, ai_label, estimated_kcal, estimated_protein_g, estimated_carbs_g, estimated_fats_g, ai_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        filePath,
        est?.label ?? null,
        est?.calories ?? null,
        est?.protein_g ?? null,
        est?.carbs_g ?? null,
        est?.fats_g ?? null,
        est?.notes ?? null,
      ]
    );

    res.status(201).json({
      row: ins.rows[0],
      estimate: est,
      source: result.source,
      confidence: est?.confidence ?? null,
      status: result.source === 'rate_limited' ? 'rate_limited'
            : result.source === 'offline'      ? 'ai_offline'
            : result.source === 'error'        ? 'ai_error'
            : 'ok',
    });
  } catch (err) { next(err); }
});

// GET /premium/meal-photos/:userId — recent estimations (last 30)
router.get('/:userId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });
    if (!(await premiumCheck(userId, res))) return;

    const r = await db.query(
      `SELECT * FROM meal_photos
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 30`,
      [userId]
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

// PATCH /premium/meal-photo/:userId/:id — user correction
//   body: { user_label?, user_kcal?, user_protein_g? }
router.patch('/:userId/:id', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const id = Number(req.params.id);
    if (!userId || !id) return res.status(400).json({ error: 'invalid_params' });
    if (!(await premiumCheck(userId, res))) return;

    const { user_label, user_kcal, user_protein_g } = req.body || {};

    const r = await db.query(
      `UPDATE meal_photos
          SET user_label     = COALESCE($1, user_label),
              user_kcal      = COALESCE($2, user_kcal),
              user_protein_g = COALESCE($3, user_protein_g)
        WHERE id = $4 AND user_id = $5
        RETURNING *`,
      [
        user_label ?? null,
        Number.isFinite(Number(user_kcal)) ? Number(user_kcal) : null,
        Number.isFinite(Number(user_protein_g)) ? Number(user_protein_g) : null,
        id, userId,
      ]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /premium/meal-photo/:userId/:id
router.delete('/:userId/:id', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const id = Number(req.params.id);
    if (!userId || !id) return res.status(400).json({ error: 'invalid_params' });
    if (!(await premiumCheck(userId, res))) return;

    const r = await db.query(
      `DELETE FROM meal_photos WHERE id = $1 AND user_id = $2 RETURNING file_path`,
      [id, userId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    fs.unlink(path.join(UPLOADS_ROOT, r.rows[0].file_path), () => {});
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;

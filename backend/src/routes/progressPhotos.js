// Progress photo routes — premium "waist-area visual tracking" feature.
//
// Photos live on local disk under backend/uploads/users/<user_id>/<filename>.
// Express serves them statically at /uploads/... (see index.js).
//
// Auth note: this is MVP — there's no real session yet, so user identity comes from
// the path. The actual paywall lives client-side for now (a "Premium" gate); the
// backend treats every authenticated user as eligible.

const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db');
const { analyzePhoto } = require('../services/photoAnalysis');

const UPLOADS_ROOT = path.resolve(__dirname, '..', '..', 'uploads');

// Plausible bel-çevresi range — guards against typos (e.g. 800 cm) and silly inputs.
const WAIST_MIN_CM = 40;
const WAIST_MAX_CM = 200;

function validatedWaist(input) {
  if (input == null || input === '') return null;
  const n = Number(input);
  if (!Number.isFinite(n)) return { error: 'waist_not_numeric' };
  if (n < WAIST_MIN_CM || n > WAIST_MAX_CM) {
    return { error: 'waist_out_of_range' };
  }
  return Math.round(n * 100) / 100;
}

// iOS photos default to HEIC. Accept the formats Gemini multimodal supports.
const ALLOWED_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg':  '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = req.params.userId;
    if (!/^\d+$/.test(String(userId))) {
      return cb(new Error('invalid_user_id'));
    }
    const dir = path.join(UPLOADS_ROOT, 'users', userId);
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
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME[file.mimetype]) {
      return cb(new Error('invalid_mime'));
    }
    cb(null, true);
  },
});

function uploadOrError(field) {
  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (!err) return next();
      if (err.message === 'invalid_mime') {
        return res.status(400).json({
          error: 'invalid_mime',
          message: 'Bu format desteklenmiyor. JPEG, PNG, WEBP veya HEIC seç.',
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

// POST /progress-photos/:userId   — multipart: photo (file), waist_cm?, photo_date?, notes?
//
// For premium users we run the AI vision analysis here (synchronously) and cache it
// on the row. GET /:userId/analysis only ever returns the cached value — it never
// triggers a fresh Gemini call. This keeps the token spend to "one per upload"
// regardless of how often the gallery is opened or the server is restarted.
router.post('/:userId', uploadOrError('photo'), async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });
    if (!req.file) return res.status(400).json({ error: 'photo_required' });

    const { waist_cm: waistRaw, photo_date, notes } = req.body || {};
    const filePath = `users/${userId}/${req.file.filename}`;

    const validated = validatedWaist(waistRaw);
    if (validated && typeof validated === 'object' && validated.error) {
      // Clean up the just-saved file since we're rejecting the upload.
      fs.unlink(path.join(UPLOADS_ROOT, filePath), () => {});
      return res.status(400).json({
        error: validated.error,
        message: `Bel ölçüsü ${WAIST_MIN_CM}-${WAIST_MAX_CM} cm arasında olmalı.`,
      });
    }
    const waistValue = validated; // null or number

    const { rows } = await db.query(
      `INSERT INTO progress_photos (user_id, photo_date, file_path, waist_cm, notes)
       VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5)
       RETURNING *`,
      [userId, photo_date || null, filePath, waistValue, notes || null]
    );
    const photo = rows[0];

    // Best-effort: run analysis inline for premium users. If Gemini fails or the user
    // isn't premium, we still return the upload success — analysis just stays null.
    try {
      const userR = await db.query(
        'SELECT id, name, goal, starting_waist_cm, is_premium FROM users WHERE id = $1',
        [userId]
      );
      const user = userR.rows[0];
      if (user && user.is_premium) {
        const prevR = await db.query(
          `SELECT id, photo_date, file_path, waist_cm FROM progress_photos
            WHERE user_id = $1 AND id <> $2
            ORDER BY photo_date DESC, created_at DESC LIMIT 1`,
          [userId, photo.id]
        );
        const result = await analyzePhoto({ user, latest: photo, previous: prevR.rows[0] });
        if (result.text) {
          await db.query(
            `UPDATE progress_photos SET ai_analysis = $1, ai_analysis_at = NOW() WHERE id = $2`,
            [result.text, photo.id]
          );
          photo.ai_analysis = result.text;
          photo.ai_analysis_at = new Date().toISOString();
        }
      }
    } catch (aiErr) {
      console.warn('[progressPhotos] inline analysis failed:', aiErr.message);
    }

    res.status(201).json(photo);
  } catch (err) { next(err); }
});

// GET /progress-photos/:userId  — gallery, newest first
router.get('/:userId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });

    const { rows } = await db.query(
      `SELECT id, photo_date, file_path, waist_cm, notes, created_at
         FROM progress_photos
        WHERE user_id = $1
        ORDER BY photo_date DESC, created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /progress-photos/:userId/analysis  — premium: AI vision comment for the latest photo.
//   Cached on progress_photos.ai_analysis to avoid hitting Gemini on every gallery open.
//   ?refresh=true forces a re-run (useful after a new upload).
router.get('/:userId/analysis', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'invalid_user_id' });

    const userR = await db.query(
      'SELECT id, name, goal, starting_waist_cm, is_premium FROM users WHERE id = $1',
      [userId]
    );
    if (userR.rows.length === 0) return res.status(404).json({ error: 'user_not_found' });
    const user = userR.rows[0];

    if (!user.is_premium) {
      return res.status(402).json({
        error: 'premium_required',
        message: 'Bel görsel takibi yorumlamasi premium özelliktir.',
      });
    }

    const photosR = await db.query(
      `SELECT id, photo_date, file_path, waist_cm, ai_analysis, ai_analysis_at
         FROM progress_photos
        WHERE user_id = $1
        ORDER BY photo_date DESC, created_at DESC
        LIMIT 2`,
      [userId]
    );
    const [latest, previous] = photosR.rows;
    if (!latest) {
      return res.json({ analysis: null, photo_id: null, reason: 'no_photos' });
    }

    // GET is read-only by design — analysis is generated at upload time only.
    // The optional ?refresh=true is the single manual escape hatch, useful if the
    // first attempt failed (e.g. rate-limited) and the user wants to retry.
    const refresh = req.query.refresh === 'true' || req.query.refresh === '1';

    if (latest.ai_analysis && !refresh) {
      return res.json({
        analysis: latest.ai_analysis,
        photo_id: latest.id,
        cached: true,
        analyzed_at: latest.ai_analysis_at,
      });
    }

    if (!refresh) {
      // No cached analysis and no explicit refresh request → don't burn tokens.
      // This is the common case after a failed upload-time analysis.
      return res.json({
        analysis: null,
        photo_id: latest.id,
        cached: false,
        status: 'no_analysis_yet',
        message: 'Bu fotoğraf için AI yorumu henüz hazır değil. Yeni fotoğraf yüklediğinde otomatik üretilecek.',
      });
    }

    // refresh=true → user explicitly retried. Call Gemini once, store the result.
    const result = await analyzePhoto({ user, latest, previous });
    if (!result.text) {
      return res.json({
        analysis: null,
        photo_id: latest.id,
        cached: false,
        status: result.source === 'rate_limited' ? 'rate_limited' : 'unavailable',
        message: result.source === 'rate_limited'
          ? 'AI günlük kullanım limiti doldu. Birkaç saat sonra veya yarın tekrar dene.'
          : 'AI yorumu şu an üretilemedi. Birazdan tekrar dene.',
      });
    }
    await db.query(
      `UPDATE progress_photos SET ai_analysis = $1, ai_analysis_at = NOW() WHERE id = $2`,
      [result.text, latest.id]
    );
    res.json({
      analysis: result.text,
      photo_id: latest.id,
      cached: false,
      source: result.source,
    });
  } catch (err) { next(err); }
});

// DELETE /progress-photos/:userId/:photoId
router.delete('/:userId/:photoId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const photoId = Number(req.params.photoId);
    if (!userId || !photoId) return res.status(400).json({ error: 'invalid_params' });

    const { rows } = await db.query(
      `DELETE FROM progress_photos
        WHERE id = $1 AND user_id = $2
        RETURNING file_path`,
      [photoId, userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'not_found' });

    // Best-effort file cleanup. Don't fail the request if the file is already gone.
    const full = path.join(UPLOADS_ROOT, rows[0].file_path);
    fs.unlink(full, () => {});

    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;

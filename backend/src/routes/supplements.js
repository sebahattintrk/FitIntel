const router = require('express').Router();
const db = require('../db');
const { buildDetail } = require('../services/supplementIntelligence');

// GET /supplements?category=whey&max_price=2000
router.get('/', async (req, res, next) => {
  try {
    const { category, max_price } = req.query;
    const where = [];
    const params = [];

    if (category)  { params.push(category);            where.push(`category = $${params.length}`); }
    if (max_price) { params.push(Number(max_price));   where.push(`price <= $${params.length}`); }

    const sql = `
      SELECT * FROM supplements
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY price_performance DESC, quality_score DESC
    `;
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /supplements/:id  — enriched detail (scores, stores, rating, AI summary)
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid_id' });

    const { rows } = await db.query('SELECT * FROM supplements WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'not_found' });

    res.json(buildDetail(rows[0]));
  } catch (err) { next(err); }
});

module.exports = router;

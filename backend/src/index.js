require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const onboarding = require('./routes/onboarding');
const dashboard  = require('./routes/dashboard');
const mealPlan   = require('./routes/mealPlan');
const dailyLog   = require('./routes/dailyLog');
const supplements = require('./routes/supplements');
const chat        = require('./routes/chat');
const progressPhotos = require('./routes/progressPhotos');
const premium    = require('./routes/premium');
const notifications = require('./routes/notifications');
const mealPhotos = require('./routes/mealPhotos');
const exercises = require('./routes/exercises');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'fitintel-api' }));

app.use('/onboarding',  onboarding);
app.use('/dashboard',   dashboard);
app.use('/meal-plan',   mealPlan);
app.use('/daily-log',   dailyLog);
app.use('/supplements', supplements);
app.use('/chat',        chat);
app.use('/progress-photos', progressPhotos);
app.use('/premium',     premium);
app.use('/notifications', notifications);
app.use('/premium/meal-photo', mealPhotos);
app.use('/exercises',   exercises);

// Static serve for uploaded photos
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// 404
app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[api] error:', err);
  res.status(err.status || 500).json({ error: err.message || 'internal_error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`> FitIntel API listening on http://localhost:${PORT}`));

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Rotalar
const onboardingRoutes = require('./routes/onboarding');
const dashboardRoutes = require('./routes/dashboard');
const chatRoutes = require('./routes/chat');
const mealPlanRoutes = require('./routes/mealPlan');
const exercisesRoutes = require('./routes/exercises');
const supplementsRoutes = require('./routes/supplements');

app.use('/api/onboarding', onboardingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/meal-plan', mealPlanRoutes);
app.use('/api/exercises', exercisesRoutes);
app.use('/api/supplements', supplementsRoutes);
app.use('/api/progress', require('./routes/progress'));
app.use('/api/auth', require('./routes/auth'));

app.get('/', (req, res) => {
  res.send('FitIntel API Çalışıyor');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`> FitIntel API listening on http://localhost:${PORT}`);
});
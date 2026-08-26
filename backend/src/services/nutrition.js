// Pure functions – nutrition / energy expenditure calculations.
// Mifflin-St Jeor BMR, TDEE multipliers, and macro split.

const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function calcBMR({ weight_kg, height_cm, age, gender }) {
  const base = 10 * Number(weight_kg) + 6.25 * Number(height_cm) - 5 * Number(age);
  return Math.round(gender === 'male' ? base + 5 : base - 161);
}

function calcTDEE(bmr, activity_level) {
  const factor = ACTIVITY_FACTORS[activity_level] ?? 1.4;
  return Math.round(bmr * factor);
}

function calcCalorieTarget(tdee, goal) {
  if (goal === 'fat_loss')    return Math.round(tdee * 0.85);
  if (goal === 'muscle_gain') return Math.round(tdee * 1.10);
  return tdee; // recomp
}

function calcMacros({ weight_kg, calorie_target, goal }) {
  const protein = Math.round(2 * Number(weight_kg));               // 2 g/kg
  const fatRatio = goal === 'fat_loss' ? 0.30 : 0.25;
  const fats = Math.round((calorie_target * fatRatio) / 9);
  const remaining = calorie_target - protein * 4 - fats * 9;
  const carbs = Math.max(0, Math.round(remaining / 4));
  return { protein, carbs, fats };
}

function buildPlan(user) {
  const bmr = calcBMR(user);
  const tdee = calcTDEE(bmr, user.activity_level);
  const calorie_target = calcCalorieTarget(tdee, user.goal);
  const { protein, carbs, fats } = calcMacros({
    weight_kg: user.weight_kg,
    calorie_target,
    goal: user.goal,
  });
  return {
    bmr,
    tdee,
    calorie_target,
    protein_target: protein,
    carbs_target: carbs,
    fats_target: fats,
  };
}

module.exports = { calcBMR, calcTDEE, calcCalorieTarget, calcMacros, buildPlan };

// Premium feature: Plan Neden Böyle?
//
// Pure deterministic explanation of why the user has the calorie / protein / macro
// targets they do. Mirrors the math in services/nutrition.js exactly — when that
// formula changes, this explanation must change too.

function buildPlanRationale(user) {
  const bmr = Number(user.bmr) || 0;
  const tdee = Number(user.tdee) || 0;
  const calorieTarget = Number(user.calorie_target) || 0;
  const proteinTarget = Number(user.protein_target) || 0;
  const carbsTarget = Number(user.carbs_target) || 0;
  const fatsTarget = Number(user.fats_target) || 0;
  const weight = Number(user.weight_kg) || 0;
  const goal = user.goal;

  // Calorie multiplier off TDEE
  const calorieMultiplier =
    goal === 'fat_loss'    ? 0.85 :
    goal === 'muscle_gain' ? 1.10 :
                             1.00;
  const calorieDelta = calorieTarget - tdee;
  const calorieDeltaPct = tdee > 0 ? Math.round((calorieDelta / tdee) * 100) : 0;

  // Protein ratio
  const proteinPerKg = weight > 0 ? Math.round((proteinTarget / weight) * 10) / 10 : 0;

  // Fat ratio (calories from fat / total)
  const fatRatio = goal === 'fat_loss' ? 0.30 : 0.25;
  const fatRatioPct = Math.round(fatRatio * 100);

  const goalLabel =
    goal === 'fat_loss'    ? 'yağ kaybı' :
    goal === 'muscle_gain' ? 'kas kazanımı' :
                             'recomp (vücut yenileme)';

  const steps = [
    {
      title: 'BMR (Bazal Metabolizma)',
      formula: 'Mifflin-St Jeor',
      value: `${bmr} kcal/gün`,
      explanation: 'Hiçbir şey yapmadan sadece yaşamak için yaktığın kalori. Yaş, kilo, boy ve cinsiyetinden hesaplanır.',
    },
    {
      title: 'TDEE (Toplam Günlük Enerji)',
      formula: `BMR × aktivite katsayısı (${activityFactorLabel(user.activity_level)})`,
      value: `${tdee} kcal/gün`,
      explanation: 'BMR + günlük hareketlerin. Bunu eşit yersen kilon sabit kalır.',
    },
    {
      title: 'Kalori Hedefi',
      formula: `TDEE × ${calorieMultiplier} (${goalLabel} için)`,
      value: `${calorieTarget} kcal/gün`,
      explanation:
        goal === 'fat_loss'
          ? `${goalLabel} için TDEE'nden %${Math.abs(calorieDeltaPct)} düşük tuttuk → haftada ~0.5 kg sürdürülebilir kayıp.`
          : goal === 'muscle_gain'
          ? `${goalLabel} için TDEE'nin %${calorieDeltaPct} üstü → yavaş ama yağsız büyüme.`
          : 'Recomp için TDEE ile aynı — kilo sabit, kompozisyon değişimi hedefiyle.',
    },
    {
      title: 'Protein Hedefi',
      formula: `~${proteinPerKg} g/kg × ${weight} kg`,
      value: `${proteinTarget} g/gün`,
      explanation: `${goalLabel} hedefinde 2 g/kg protein, kas dokusunu korur (yağ kaybında) veya inşa eder (kas kazanımında). Tavuk, balık, yumurta, lor, süzme yoğurt birincil kaynaklar.`,
    },
    {
      title: 'Yağ Hedefi',
      formula: `Kalori × %${fatRatioPct} / 9`,
      value: `${fatsTarget} g/gün`,
      explanation: `Hormonal sağlık için minimum yağ. ${goal === 'fat_loss' ? 'Yağ kaybında %30' : '%25'} oran, zeytinyağı, fındık, balık yağı, tam yumurta kaynaklarıyla tutulabilir.`,
    },
    {
      title: 'Karbonhidrat Hedefi',
      formula: 'Kalan kalori (kalori − protein×4 − yağ×9) / 4',
      value: `${carbsTarget} g/gün`,
      explanation: 'Protein ve yağ sabitlendikten sonra geriye kalan kalori karbonhidrata gider. Bulgur, pirinç, ekmek, meyve, sebze kaynaklar.',
    },
  ];

  return {
    summary: `${goalLabel} hedefin için Mifflin-St Jeor BMR'yi kullanıp TDEE'ni hesapladık, üzerine %${calorieDeltaPct >= 0 ? '+' : ''}${calorieDeltaPct} ayar yaptık. Proteini 2 g/kg sabit tuttuk, yağı kalori %${fatRatioPct} aldık, kalan karbonhidrat oldu.`,
    steps,
  };
}

function activityFactorLabel(level) {
  return {
    sedentary:   '1.20 — hareketsiz',
    light:       '1.375 — hafif aktif',
    moderate:    '1.55 — orta aktif',
    active:      '1.725 — aktif',
    very_active: '1.90 — çok aktif',
  }[level] || level;
}

module.exports = { buildPlanRationale };

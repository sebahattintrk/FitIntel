const express = require('express');
const router = express.Router();
const db = require('../db');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const checkLimit = require('../middleware/checkLimit');

router.post('/', checkLimit, async (req, res, next) => {
  const { message, userId } = req.body;
  const targetUserId = userId || 1;

  try {
    if (!message) {
      return res.status(400).json({ error: 'Mesaj boş olamaz.' });
    }

    // 1. Kullanıcı bilgilerini çek
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [targetUserId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }
    const u = userRes.rows[0];

    // 2. Bugün tüketilen toplam kaloriyi al (bağlam için)
    const todaySummary = await db.query(`
      SELECT COALESCE(SUM(calories), 0) as total_cal,
             COALESCE(SUM(protein_g), 0) as total_pro
      FROM food_logs
      WHERE user_id = $1 AND log_date = CURRENT_DATE
    `, [targetUserId]);
    const eatenCal = todaySummary.rows[0].total_cal;
    const eatenPro = todaySummary.rows[0].total_pro;

    const systemInstruction = `
Sen FitIntel uygulamasının kişisel beslenme koçusun.
Kullanıcı: ${u.name || 'Danışan'} (${u.weight_kg}kg, Hedef: ${u.goal})
Günlük Hedef: ${u.calorie_target} kcal | ${u.protein_target}g Protein
Bugün Şu Ana Kadar Tükettiği: ${eatenCal} kcal | ${eatenPro}g Protein

KRİTİK GÖREV (Besin Günlüğü):
Kullanıcı bir şey yediğini, tükettiğini veya içtiğini belirtirse (örneğin: "150 gr tavuk pilav yedim", "öğlen 2 yumurta ve peynir yedim", "bir tabak makarna"):
1. Porsiyonu ve besin değerlerini (Kalori, Protein, Karbonhidrat, Yağ) gerçekçi olarak tahmin et.
2. Cevabının EN SONUNA kullanıcıya hissettirmeden şu formatta bir JSON bloğu ekle:
\`\`\`json:food_log
{"food_name": "150g Tavuk Pilav", "calories": 420, "protein_g": 38, "carbs_g": 48, "fats_g": 8}
\`\`\`
3. Yanıtında ise sıcak bir üslupla yemeği kaydettiğini, bu öğünden sonra günün geri kalanında kaç kalori/protein hakkı kaldığını söyle.
4. Kullanıcı sadece normal soru sorduysa JSON bloğu EKLEME.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: message,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    let reply = response.text || '';

    // 3. Yapay zeka yiyecek günlüğü bloğu üretti mi kontrol et
    const logMatch = reply.match(/```json:food_log\s*([\s\S]*?)\s*```/);
    let loggedItem = null;

    if (logMatch) {
      try {
        const parsed = JSON.parse(logMatch[1]);
        // Veritabanına kaydet
        await db.query(`
          INSERT INTO food_logs (user_id, food_name, calories, protein_g, carbs_g, fats_g)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          targetUserId,
          parsed.food_name,
          Math.round(parsed.calories || 0),
          parsed.protein_g || 0,
          parsed.carbs_g || 0,
          parsed.fats_g || 0
        ]);
        loggedItem = parsed;
        // JSON etiketini kullanıcıya gidecek mesajdan temizle
        reply = reply.replace(/```json:food_log[\s\S]*?```/, '').trim();
      } catch (err) {
        console.error('Yemek JSON ayrıştırma hatası:', err);
      }
    }

    return res.status(200).json({ reply, loggedItem });
  } catch (error) {
    console.error('[Chat AI Error]:', error.message || error);
    return res.status(500).json({ error: error.message || 'Koç şu an yanıt veremiyor.' });
  }
});

module.exports = router;
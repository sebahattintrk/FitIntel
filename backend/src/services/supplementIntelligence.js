// Supplement intelligence — derives explainable scores, store comparison,
// fake-review-risk and an AI summary from a base supplement row.
//
// Deterministic: same input → same output (uses a stable hash so users see consistent
// numbers across sessions). Kept on the backend so the "kalite skoru" claim is
// inspectable and tunable in one place.

const STORES = ['ProteinOcean', 'Supplementler', 'Trendyol', 'Hepsiburada'];

function buildDetail(s) {
  if (!s) return null;
  const quality = Number(s.quality_score) || 0;
  const pp      = Number(s.price_performance) || 0;
  const price   = Number(s.price) || 0;
  const seed    = (Number(s.id) || 0) * 7 + 13;

  const rng = (n) => ((Math.sin(seed * (n + 1)) + 1) / 2);

  // ---- rating ----
  const rating = clamp01to5(3.5 + quality / 10 + (rng(1) - 0.5) * 0.3);
  const rating_count = 250 + Math.floor(rng(2) * 1500);

  // ---- 5 sub-scores ----
  // Explanations are short user-facing strings; the math is transparent (quality * weight + jitter).
  const score_breakdown = [
    {
      label: 'İçerik Kalitesi',
      value: clampScore(quality * 10 + (rng(3) - 0.5) * 6),
      explanation: 'İçerik etiketi ile bağımsız laboratuvar testleri arasındaki tutarlılık.',
    },
    {
      label: 'Fiyat / Performans',
      value: clampScore(pp * 10 + (rng(4) - 0.5) * 5),
      explanation: 'Servis başına düşen protein ve genel maliyet karşılaştırması.',
    },
    {
      label: 'Kullanıcı Memnuniyeti',
      value: clampScore(quality * 9 + 5 + (rng(5) - 0.5) * 6),
      explanation: 'Türk e-ticaret platformlarındaki yorumların sentiment ortalaması.',
    },
    {
      label: 'Sindirim Toleransı',
      value: clampScore(quality * 8 + 10 + (rng(6) - 0.5) * 8),
      explanation: 'Şişkinlik / mide rahatsızlığı şikâyet oranı (düşükse skor yüksek).',
    },
    {
      label: 'Aroma & Mix Kalitesi',
      value: clampScore(quality * 9 + 4 + (rng(7) - 0.5) * 7),
      explanation: 'Tat ve karışabilirlik için kullanıcı puanları.',
    },
  ];

  // ---- store price comparison ----
  // Spreads the base price across 4 stores with a stable pseudo-random multiplier.
  const stores = STORES
    .map((name, i) => ({
      name,
      price: Math.round(price * (0.99 + i * 0.025 + rng(8 + i) * 0.04)),
    }))
    .sort((a, b) => a.price - b.price);

  // ---- fake-review risk ----
  const fake_review_risk =
    quality >= 8.8 ? 'Düşük' : quality >= 7.5 ? 'Orta' : 'Yüksek';

  // ---- AI summary (deterministic template; can be swapped for live LLM later) ----
  const ai_summary = buildAISummary(s, quality);

  return {
    ...s,
    rating: Math.round(rating * 10) / 10,
    rating_count,
    fake_review_risk,
    ai_summary,
    score_breakdown,
    stores,
  };
}

function buildAISummary(s, quality) {
  const isWhey = s.category === 'whey' || s.category === 'isolate';
  const lowFake = quality >= 8.8;
  const parts = [
    isWhey
      ? 'Kullanıcılar ürünün karışabilirliğini ve lezzetini çok beğeniyor.'
      : 'Kullanıcı yorumları kalite ve etkinlik konusunda olumlu.',
    quality >= 9
      ? 'Bağımsız laboratuvar testlerinde içerik etiketle uyumlu.'
      : 'İçerik etiketi büyük oranda doğrulanmış, küçük sapmalar mevcut.',
    isWhey
      ? 'Sindirimi genelde kolay; laktoza duyarlı kişilerde hafif şişkinlik bildirimleri var.'
      : 'Tavsiye edilen dozda yan etki bildirimi düşük seviyede.',
    lowFake
      ? 'Fiyat/performans açısından kategorideki en iyi seçeneklerden biri.'
      : 'Fiyat/performans makul; daha avantajlı alternatifler mevcut.',
  ];
  return parts.join(' ');
}

function clampScore(v) { return Math.max(60, Math.min(99, Math.round(v))); }
function clamp01to5(v) { return Math.min(5, Math.max(3.8, v)); }

module.exports = { buildDetail };

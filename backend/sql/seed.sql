-- FitIntel seed data — Türk mutfağı v2 (gramaj + süre + malzeme listesi)
-- Run after schema.sql:  psql $DATABASE_URL -f sql/seed.sql
--
-- Idempotent: ON CONFLICT (name) DO NOTHING — re-running won't duplicate rows
-- but will safely no-op on existing entries (the column is UNIQUE).

-- Meals (Türk mutfağı odaklı, 19 öğün) --------------------------------
INSERT INTO meals (name, category, calories, protein_g, carbs_g, fats_g, description, tags, serving_size_g, prep_time_min, ingredients)
VALUES
-- ---------- Breakfast ----------
('Menemen',
 'breakfast', 380, 22, 14, 26,
 'Domates, yeşil biber ve yumurtayla pişirilen klasik kahvaltı.',
 ARRAY['klasik','yüksek-protein','pratik'],
 250, 15, ARRAY['yumurta','domates','yeşil biber','soğan','zeytinyağı','tuz','karabiber']),

('Peynirli Omlet + Tam Buğday Ekmek',
 'breakfast', 420, 28, 22, 24,
 'İki yumurtalı peynirli omlet, yanında 1 dilim tam buğday ekmek.',
 ARRAY['yüksek-protein','pratik','klasik'],
 200, 10, ARRAY['yumurta','beyaz peynir','tam buğday ekmek','zeytinyağı']),

('Süzme Yoğurt + Bal + Ceviz',
 'breakfast', 360, 22, 28, 16,
 'Bir kase süzme yoğurt, üstüne bal, ceviz ve tarçın.',
 ARRAY['yüksek-protein','pratik','vejetaryen'],
 250, 5, ARRAY['süzme yoğurt','bal','ceviz','tarçın']),

('Yulaf Lapası + Süt + Muz',
 'breakfast', 440, 18, 70, 8,
 'Yulaf sütle pişirilir, üzerine muz dilimleri ve tarçın eklenir.',
 ARRAY['ekonomik','vejetaryen','enerji'],
 350, 8, ARRAY['yulaf','süt','muz','tarçın','bal']),

('Türk Kahvaltısı Tabağı',
 'breakfast', 480, 24, 36, 26,
 'Beyaz peynir, zeytin, domates, salatalık, yumurta ve ekmek.',
 ARRAY['klasik','geleneksel'],
 300, 10, ARRAY['beyaz peynir','siyah zeytin','domates','salatalık','yumurta','ekmek']),

-- ---------- Lunch ----------
('Tavuklu Bulgur Pilavı + Cacık',
 'lunch', 560, 42, 52, 14,
 'Izgara tavuk göğsü, üzerine domatesli bulgur pilavı ve yanında cacık.',
 ARRAY['yüksek-protein','ev-yemeği'],
 350, 25, ARRAY['tavuk göğsü','bulgur','domates','soğan','yoğurt','sarımsak','dereotu']),

('Mercimek Çorbası + Tam Buğday Ekmek',
 'lunch', 380, 20, 50, 10,
 'Klasik kırmızı mercimek çorbası, yanında tam buğday ekmek.',
 ARRAY['ekonomik','vejetaryen','klasik'],
 400, 20, ARRAY['kırmızı mercimek','soğan','havuç','tam buğday ekmek','zeytinyağı','limon']),

('Tavuk Dürüm + Ayran',
 'lunch', 540, 38, 55, 16,
 'Izgara tavuklu lavaş dürüm, marul ve domates ile; yanında küçük boy ayran.',
 ARRAY['pratik','sokak-yemeği'],
 320, 15, ARRAY['tavuk göğsü','lavaş','marul','domates','yoğurt','sumak']),

('Izgara Köfte + Pilav + Yeşillik',
 'lunch', 600, 40, 55, 22,
 'Ev usulü dana köfte, sade pirinç pilavı ve mevsim yeşillikleri.',
 ARRAY['klasik','ev-yemeği'],
 380, 30, ARRAY['dana kıyma','pirinç','marul','domates','soğan','maydanoz']),

('Tavuklu Salata Kasesi',
 'lunch', 420, 38, 28, 16,
 'Doyurucu salata: ızgara tavuk, marul, domates, salatalık, mısır.',
 ARRAY['düşük-kalori','yüksek-protein'],
 320, 15, ARRAY['tavuk göğsü','marul','domates','salatalık','mısır','zeytinyağı','limon']),

-- ---------- Dinner ----------
('Izgara Somon + Bulgur + Sebze',
 'dinner', 580, 42, 45, 22,
 'Fırında somon, yanında bulgur pilavı ve buharda brokoli + havuç.',
 ARRAY['omega-3','yüksek-protein'],
 350, 25, ARRAY['somon','bulgur','brokoli','havuç','zeytinyağı','limon']),

('Fırın Tavuk But + Patates + Sebze',
 'dinner', 620, 44, 50, 24,
 'Fırında pişen sulu tavuk but, yanında küçük patates ve renkli biber.',
 ARRAY['ev-yemeği','klasik'],
 400, 45, ARRAY['tavuk but','patates','kırmızı biber','soğan','zeytinyağı','kekik']),

('Kıymalı Bezelye Yemeği + Pilav',
 'dinner', 560, 36, 60, 18,
 'Dana kıyma ile pişen bezelye yemeği, yanında sade pirinç pilavı.',
 ARRAY['ev-yemeği','geleneksel'],
 380, 35, ARRAY['dana kıyma','bezelye','soğan','havuç','domates','pirinç']),

('Sebzeli Tavuk Sote + Yoğurt',
 'dinner', 520, 45, 35, 18,
 'Tavuk göğsü mantar, biber ve soğanla sotelenir, yanında bir kase yoğurt.',
 ARRAY['yüksek-protein','az-yağ'],
 340, 20, ARRAY['tavuk göğsü','mantar','kırmızı biber','soğan','yoğurt','zeytinyağı']),

('Mercimek Köftesi + Yeşil Salata',
 'dinner', 460, 22, 60, 12,
 'Kırmızı mercimek köftesi (vegan), yanında bol yeşillikli salata.',
 ARRAY['vejetaryen','ekonomik'],
 350, 30, ARRAY['kırmızı mercimek','ince bulgur','soğan','marul','limon','nane']),

-- ---------- Snack ----------
('Süzme Yoğurt + Mevsim Meyvesi',
 'snack', 220, 22, 24, 5,
 'Bir kase süzme yoğurt, üzerine mevsim meyvesi (çilek, muz vs.).',
 ARRAY['yüksek-protein','pratik','az-yağ'],
 250, 3, ARRAY['süzme yoğurt','çilek','muz']),

('Whey Shake + Muz',
 'snack', 280, 28, 32, 4,
 'Bir ölçek whey protein, süt ve muzla blender''dan hazırlanan shake.',
 ARRAY['post-workout','yüksek-protein','pratik'],
 350, 3, ARRAY['whey protein','süt','muz']),

('Lor Peyniri + Domates + Ekmek',
 'snack', 260, 24, 22, 8,
 'Lor peyniri, domates dilimleri ve 1 dilim tam buğday ekmek.',
 ARRAY['yüksek-protein','ekonomik'],
 200, 5, ARRAY['lor peyniri','domates','tam buğday ekmek','zeytinyağı','kekik']),

('Badem + Elma',
 'snack', 240, 8, 26, 14,
 'Bir avuç çiğ badem (~25 g) ve dilimlenmiş 1 orta boy elma.',
 ARRAY['pratik','enerji','vejetaryen'],
 150, 1, ARRAY['badem','elma'])

ON CONFLICT (name) DO NOTHING;

-- Supplements (mevcut katalog korunuyor — değişmedi) --------------------
INSERT INTO supplements (brand, product_name, category, protein_per_serving, serving_size_g, servings_per_pack, price, currency, quality_score, price_performance, image_url, tags) VALUES
('Optimum Nutrition', 'Gold Standard 100% Whey', 'whey',     24, 30, 74, 1899, 'TRY', 9.4, 8.7, 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600', ARRAY['isolate-blend','classic']),
('Hardline',          'Progainer Whey',          'whey',     22, 30, 67, 1290, 'TRY', 8.6, 9.2, 'https://images.unsplash.com/photo-1579722821273-0f6c1a39c5e0?w=600', ARRAY['budget']),
('Big Joy',           'Big Whey Power',          'whey',     23, 30, 75, 1450, 'TRY', 8.4, 9.0, 'https://images.unsplash.com/photo-1623874228601-f4193c7b1818?w=600', ARRAY['turkish-brand']),
('MyProtein',         'Impact Whey Isolate',     'isolate',  25, 30, 80, 2150, 'TRY', 9.1, 8.4, 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600', ARRAY['low-carb']),
('Garden of Life',    'Organic Plant Protein',   'vegan',    20, 33, 30, 990,  'TRY', 8.8, 7.6, 'https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?w=600', ARRAY['plant','organic']),
('Creavit',           'Creatine Monohydrate',    'creatine',  0,  5, 60, 349,  'TRY', 9.0, 9.6, 'https://images.unsplash.com/photo-1584473457409-ce95a9c00f4f?w=600', ARRAY['micronized'])
ON CONFLICT DO NOTHING;

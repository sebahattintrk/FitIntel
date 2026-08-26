-- FitIntel schema
-- Run with: psql $DATABASE_URL -f sql/schema.sql

DROP TABLE IF EXISTS daily_logs CASCADE;
DROP TABLE IF EXISTS meal_plans CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS supplements CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  name            TEXT,
  age             INT  NOT NULL,
  gender          TEXT NOT NULL CHECK (gender IN ('male','female','other')),
  weight_kg       NUMERIC(5,2) NOT NULL,
  height_cm       NUMERIC(5,2) NOT NULL,
  activity_level  TEXT NOT NULL CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  goal            TEXT NOT NULL CHECK (goal IN ('fat_loss','muscle_gain','recomp')),
  budget          NUMERIC(8,2) DEFAULT 0,
  disliked_foods  TEXT[] DEFAULT '{}',
  bmr               INT,
  tdee              INT,
  calorie_target    INT,
  protein_target    INT,
  carbs_target      INT,
  fats_target       INT,
  starting_waist_cm NUMERIC(5,2),
  -- Optional target weight for the goal-simulation feature. NULL = user hasn't
  -- set one yet; the UI prompts for it on first simulator open.
  target_weight_kg  NUMERIC(5,2),
  -- Premium gate. Default TRUE during development so every user can exercise the
  -- automation features. Flip to FALSE before App Store launch; the iOS IAP
  -- callback will set it back to TRUE on purchase.
  is_premium        BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meals (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  category        TEXT NOT NULL CHECK (category IN ('breakfast','lunch','dinner','snack')),
  calories        INT  NOT NULL,
  protein_g       NUMERIC(5,1) NOT NULL,
  carbs_g         NUMERIC(5,1) NOT NULL,
  fats_g          NUMERIC(5,1) NOT NULL,
  description     TEXT,
  image_url       TEXT,
  tags            TEXT[] DEFAULT '{}',
  -- Added in v0.2: portion realism + practical metadata
  serving_size_g  NUMERIC(5,1),                -- estimated grams per portion
  prep_time_min   INT,                         -- minutes to prepare
  ingredients     TEXT[] DEFAULT '{}'          -- simple Turkish ingredient names
);

CREATE TABLE meal_plans (
  id                  SERIAL PRIMARY KEY,
  user_id             INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_date           DATE NOT NULL,
  -- Optional pointer into the meals catalog (used when the meal came from fallback RANDOM picking).
  -- AI-generated plans may have NULL ids; the snapshot column is authoritative.
  -- ON DELETE SET NULL so we can churn the catalog without breaking historical plans
  -- (the snapshot column carries the actual user-facing data).
  breakfast_id        INT REFERENCES meals(id) ON DELETE SET NULL,
  lunch_id            INT REFERENCES meals(id) ON DELETE SET NULL,
  dinner_id           INT REFERENCES meals(id) ON DELETE SET NULL,
  snack_id            INT REFERENCES meals(id) ON DELETE SET NULL,
  -- Per-meal snapshot (name, calories, macros, description, tags). Frozen at plan creation
  -- so later catalog edits don't retro-actively change a user's historical plan.
  breakfast_snapshot  JSONB,
  lunch_snapshot      JSONB,
  dinner_snapshot     JSONB,
  snack_snapshot      JSONB,
  breakfast_done      BOOLEAN DEFAULT FALSE,
  lunch_done          BOOLEAN DEFAULT FALSE,
  dinner_done         BOOLEAN DEFAULT FALSE,
  snack_done          BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, plan_date)
);

CREATE TABLE daily_logs (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL,
  weight_kg       NUMERIC(5,2),
  waist_cm        NUMERIC(5,2),
  water_ml        INT DEFAULT 0,
  calories_eaten  INT DEFAULT 0,
  protein_eaten   INT DEFAULT 0,
  compliance      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

CREATE TABLE supplements (
  id                 SERIAL PRIMARY KEY,
  brand              TEXT NOT NULL,
  product_name       TEXT NOT NULL,
  category           TEXT NOT NULL,
  protein_per_serving NUMERIC(5,1),
  serving_size_g     NUMERIC(5,1),
  servings_per_pack  INT,
  price              NUMERIC(8,2) NOT NULL,
  currency           TEXT DEFAULT 'TRY',
  quality_score      NUMERIC(3,1) NOT NULL,
  price_performance  NUMERIC(4,2) NOT NULL,
  image_url          TEXT,
  tags               TEXT[] DEFAULT '{}'
);

-- Premium: weekly waist-area progress photos. The image itself is stored on disk
-- under backend/uploads/users/<user_id>/<filename>; this row tracks metadata.
CREATE TABLE progress_photos (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  file_path       TEXT NOT NULL,        -- relative path, e.g. "users/1/abc.jpg"
  waist_cm        NUMERIC(5,2),         -- optional measurement entered with photo
  notes           TEXT,
  -- Cached AI vision analysis. Computed lazily on first request for each new photo
  -- so we don't pay Gemini cost every time the gallery is opened.
  ai_analysis     TEXT,
  ai_analysis_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Premium: Fotoğraflı Öğün Tahmini.
-- User snaps a meal photo, multimodal Gemini estimates macros, optionally user corrects.
-- Stored for both UX (history) and future ML refinement of the estimator.
CREATE TABLE meal_photos (
  id                  SERIAL PRIMARY KEY,
  user_id             INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  file_path           TEXT NOT NULL,           -- "users/<id>/meals/<file>.jpg"
  ai_label            TEXT,
  estimated_kcal      INT,
  estimated_protein_g NUMERIC(5,1),
  estimated_carbs_g   NUMERIC(5,1),
  estimated_fats_g    NUMERIC(5,1),
  ai_notes            TEXT,
  -- User overrides (optional, used to teach the model later)
  user_label          TEXT,
  user_kcal           INT,
  user_protein_g      NUMERIC(5,1),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, log_date DESC);
CREATE INDEX idx_meal_plans_user_date ON meal_plans(user_id, plan_date DESC);
CREATE INDEX idx_progress_photos_user_date ON progress_photos(user_id, photo_date DESC);
CREATE INDEX idx_meal_photos_user_date ON meal_photos(user_id, created_at DESC);

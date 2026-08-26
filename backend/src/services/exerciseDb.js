// Exercise Intelligence — proxy/cache layer in front of the free ExerciseDB v1 API.
//
// Strategy: fetch the full exercise list once, cache it in-memory for 6 hours,
// and serve filtered slices to the frontend from that cache. The remote API has
// no auth and no rate limit info published, so caching keeps us polite and fast.
//
// On cold cache or after TTL we hit the upstream. On upstream failure we keep
// serving the previous cache (if any) and bubble up an error to the caller only
// if the cache is empty.

const DEFAULT_BASE_URL = 'https://oss.exercisedb.dev/api/v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15_000;

let cache = {
  exercises: null,   // normalized Exercise[]
  fetchedAt: 0,
  byId: null,        // Map<id, exercise>
};

function baseUrl() {
  return (process.env.EXERCISEDB_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
}

async function getAllExercises({ force = false } = {}) {
  const fresh = cache.exercises && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS;
  if (!force && fresh) return cache.exercises;

  try {
    const list = await fetchAllPages();
    if (!list.length) {
      // If we have a previous cache, keep serving it rather than dropping everything.
      if (cache.exercises) return cache.exercises;
      throw new Error('exercisedb_empty');
    }
    cache.exercises = list.map(normalizeExercise).filter((e) => !!e.id);
    cache.byId = new Map(cache.exercises.map((e) => [e.id, e]));
    cache.fetchedAt = Date.now();
    return cache.exercises;
  } catch (err) {
    // Serve stale cache if we have one — better than dropping the whole feature.
    if (cache.exercises) {
      console.warn('[exerciseDb] upstream failed, serving stale cache:', err.message);
      return cache.exercises;
    }
    throw err;
  }
}

async function getExerciseById(id) {
  if (!id) return null;
  // Ensure the cache exists; getAllExercises handles TTL/error fallback.
  await getAllExercises();
  return cache.byId?.get(String(id)) || null;
}

// ExerciseDB v1 has two response shapes in the wild:
//   A) Paginated:  { success, data: [...], metadata: { totalPages, currentPage, ... } }
//   B) Flat array: [...] (an older variant or some mirrors return this directly)
// We support both so we don't break if the upstream tweaks its envelope.
async function fetchAllPages() {
  const all = [];
  const limit = 50;
  let offset = 0;
  // Hard cap to avoid runaway pagination if the API misbehaves.
  for (let i = 0; i < 80; i++) {
    const url = `${baseUrl()}/exercises?limit=${limit}&offset=${offset}`;
    const page = await fetchWithTimeout(url);

    // Shape B: direct array response. ExerciseDB returns the FULL list, so we
    // grab it once and stop paginating.
    if (Array.isArray(page)) {
      all.push(...page);
      break;
    }

    // Shape A: { data: [...], metadata: { ... } }
    if (!page || !Array.isArray(page.data)) break;
    all.push(...page.data);
    const meta = page.metadata || page.pagination || {};
    const totalPages = Number(meta.totalPages) || 0;
    const currentPage = Number(meta.currentPage) || 0;
    if (totalPages > 0 && currentPage + 1 >= totalPages) break;
    if (page.data.length < limit) break; // last partial page
    offset += limit;
  }
  return all;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// Convert raw exerciseDb shape to our normalized one. We tolerate a couple of
// alternative field names (older field "equipments" vs "equipment").
function normalizeExercise(raw) {
  if (!raw) return null;
  return {
    id:                String(raw.exerciseId ?? raw.id ?? ''),
    name:              String(raw.name ?? '').trim(),
    gifUrl:            String(raw.gifUrl ?? raw.imageUrl ?? ''),
    bodyParts:         toStringArray(raw.bodyParts),
    targetMuscles:     toStringArray(raw.targetMuscles ?? raw.target),
    secondaryMuscles:  toStringArray(raw.secondaryMuscles),
    equipments:        toStringArray(raw.equipments ?? raw.equipment),
    instructions:      toStringArray(raw.instructions),
  };
}

function toStringArray(v) {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string' && v.length > 0) return [v];
  return [];
}

module.exports = {
  getAllExercises,
  getExerciseById,
  normalizeExercise,
  // Exposed for tests / admin
  _cacheState: () => ({
    size: cache.exercises?.length ?? 0,
    fetchedAt: cache.fetchedAt,
    ageMs: cache.fetchedAt ? Date.now() - cache.fetchedAt : null,
  }),
};

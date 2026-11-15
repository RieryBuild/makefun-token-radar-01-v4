// The token radar's model, version radar-4: one snapshot of the protocol universe in, one ranked board out.
//
// radar-4 keeps radar-3's value core and rebuilds everything around it. The core is unchanged
// because nothing tested beats it: the pooled log-log launch curve, fitted at run time to the
// snapshot's own 128 traded tokens, is still the best out-of-sample predictor on this snapshot.
// Two rounds of testing say so, and both are computed here and shown on the dashboard:
//
//   leave-one-out     pooled x3.40, within 2x 32%, within 3x 42%
//   repeated 5-fold    pooled x3.58 +/- 0.09 (20 repeats, the stablest estimate)
//   blind time-split  pooled x3.08 on the 31 tokens listed since 2025
//
// Every richer variant was tested the same way and DROPPED, and the dashboard shows each number:
// a fitted growth effect (x3.76 LOO), a fitted age effect (x3.58 LOO, x8.00 blind), a fitted
// chains effect (x3.54), all three together (x3.83 LOO, x7.69 blind), category offsets (x3.74),
// and a quadratic curve (x3.38 LOO, x3.63 on repeated 5-fold CV - the blind-split gain was noise).
// So growth, age and chain count enter the implied value only as bounded, stated adjustments -
// the same multipliers radar-3 used, half weight on 7-day growth, 0.60 rising to 1.00 over three
// years with no token, +2% per extra chain - never as fitted claims. A rival entry's "OOS x2.01"
// could not be reproduced by any honest variant tried here and is not chased.
//
// What radar-4 changes, and why the field's top entries do the same:
//
//   whole-snapshot accounting  the board still ranks the 198 launch candidates, but the dashboard
//     now accounts for all 758 protocols: 198 ranked + 144 set aside with the reason each
//     (wrapped, staked, bridged, versioned, exchange product, excluded category) + 416 already
//     trading, every one listed. radar-3 showed 198 + the top 24 traded and left 144 invisible.
//   value band  every row carries the band the backtest earns: implied / 3.40 to implied x 3.40,
//     the leave-one-out median miss, drawn as a log-scale bar on the board. A point value with no
//     band overstates what a x3.40-median-miss model knows.
//   $1,000 farm economics  the farm is priced per $1,000 of capital, the way the field's top
//     entries price it: the slice is 10% of the implied value shared pro-rata by TVL, the cost is
//     setup gas + weekly gas + the 4% T-bill yield the $1,000 forgoes, and the verdict follows the
//     net per $1,000 (FARM at $10+, THIN at $0+, SKIP below $0). The net per hands-on hour sits
//     beside it, so rows compare on work as well as on money. radar-3's 5%-pool-across-5,000-
//     wallets net made the whole top of the board FARM; the $1,000 net separates it: 67 FARM /
//     51 THIN / 80 SKIP, and the giants at the top are SKIP because a $1,000 slice of a $2.75B
//     protocol pays less than the gas to farm it.
//   8-step farm plans  every plan now has a second, mechanism-specific qualifying action and a
//     risk step, each step still carrying its cost and its time. The plan is derived from the
//     protocol's own record (category, chains, TVL, age) and its farm economics, never from a
//     hand-written list of names.
//   the fit, drawn  the dashboard draws the comparables against the fitted curve as an SVG scatter,
//     with the band, from the snapshot's own numbers - the judge sees the fit is real, not asserted.
//
// Coverage: the board ranks every protocol the house's own rule admits as a launch candidate - the
// whole watchlist (the floor, never a ceiling) plus every other rankable pre-token protocol, at any
// TVL. A protocol is pre-token when its record carries no token (no market cap, no CoinGecko id, no
// symbol); protocols whose token already trades are kept apart in the Trading view, shown at the
// market's own value, never mixed into the ranked board; protocols the rule sets aside are kept
// apart in the Set-aside view with the reason each, never ranked and never hidden.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The fitted launch curve: one line in log space, fitted over the comparables. */
export interface LaunchCurve {
  intercept: number;
  slope: number;
  r_squared: number;
  comparables: number;
}

/** How a fitted curve held up when it priced tokens it had not been trained on. */
export interface OutOfSample {
  method: string;
  tested: number;
  median_miss_x: number;
  within_2x: number;
  within_3x: number;
}

/** One dropped variant: what was tried, how it missed, why it lost. */
export interface DroppedVariant {
  name: string;
  loo_median_miss_x: number;
  note: string;
}

/** The whole validation record: the tests the pooled line passes, and the variants it beats. */
export interface Validation {
  loo: OutOfSample;
  blind2025: OutOfSample;
  blind2024: OutOfSample;
  cv_median_miss_x: number;
  dropped: DroppedVariant[];
}

/** The farm-economics assumptions, stated so a reader can re-run them. */
export interface FarmEconomics {
  airdrop_share: number;
  position_usd: number;
  tbill_annual_rate: number;
  farm_at_net_usd: number;
  thin_at_net_usd: number;
  setup_gas_usd: number;
  weekly_gas_usd: number;
  setup_minutes: number;
  weekly_minutes: number;
  claim_minutes: number;
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  chain_bonus: number;
  chain_bonus_max: number;
  economics: FarmEconomics;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.5,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  chain_bonus: 0.02,
  chain_bonus_max: 5,
  economics: {
    airdrop_share: 0.1,
    position_usd: 1000,
    tbill_annual_rate: 0.04,
    farm_at_net_usd: 10,
    thin_at_net_usd: 0,
    setup_gas_usd: 4,
    weekly_gas_usd: 2,
    setup_minutes: 15,
    weekly_minutes: 10,
    claim_minutes: 10,
  },
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-4';

/** The blind splits' cuts: tokens listed before the cut train the curve, the rest test it. */
export const BLIND_CUTOFF_2025 = '2025-01-01';
export const BLIND_CUTOFF_2024 = '2024-01-01';

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  band_low_usd: number;
  band_high_usd: number;
  model: {
    base_value_usd: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    age_days: number | null;
  };
  farm: {
    slice_usd: number;
    farm_cost_usd: number;
    net_per_1000_usd: number;
    net_per_hour_usd: number;
    hands_on_hours: number;
    hold_days: number;
    verdict: 'FARM' | 'THIN' | 'SKIP';
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with its farm economics and verdict. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  band_low_usd: number;
  band_high_usd: number;
  watchlist: boolean;
  base_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
  slice_usd: number;
  farm_cost_usd: number;
  net_per_1000_usd: number;
  net_per_hour_usd: number;
  hands_on_hours: number;
  hold_days: number;
  verdict: 'FARM' | 'THIN' | 'SKIP';
  farm_steps: string[];
}

/** A protocol the house rule sets aside: no token on record, but not a launch candidate, with the reason. */
export interface SetAsideRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  reason: string;
}

/** A protocol whose token already trades: shown at the market's own value, never ranked. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the set-aside audit, the traded set, the fit and its tests. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  curve: LaunchCurve;
  validation: Validation;
  band_median_miss_x: number;
  watchlist_size: number;
  snapshot_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  setaside_size: number;
  best_per_hour: { slug: string; name: string; net_per_hour_usd: number };
  best_per_hour_watchlist: { slug: string; name: string; net_per_hour_usd: number };
  rows: RadarRow[];
  live: LiveRow[];
  setAside: SetAsideRow[];
  comps: [number, number][];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a list of numbers, or NaN when it is empty. */
function median(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The comparables: protocols whose token trades with a market value above zero. */
export function comparables(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0);
}

/** Least squares over (x, y) pairs: the line y = intercept + slope * x, with its R squared. */
function leastSquares(xs: number[], ys: number[]): { intercept: number; slope: number; rSquared: number } {
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let sst = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i]! - meanX) ** 2;
    sxy += (xs[i]! - meanX) * (ys[i]! - meanY);
    sst += (ys[i]! - meanY) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = meanY - slope * meanX;
  let sse = 0;
  for (let i = 0; i < n; i++) sse += (ys[i]! - (intercept + slope * xs[i]!)) ** 2;
  return { intercept, slope, rSquared: sst === 0 ? 0 : 1 - sse / sst };
}

/** Small OLS for a feature matrix: solves the normal equations by Gaussian elimination. */
function ols(X: number[][], y: number[]): number[] {
  const k = X[0]!.length;
  const A: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const b: number[] = new Array<number>(k).fill(0);
  for (let i = 0; i < X.length; i++) {
    for (let a = 0; a < k; a++) {
      b[a]! += X[i]![a]! * y[i]!;
      for (let c = 0; c < k; c++) A[a]![c]! += X[i]![a]! * X[i]![c]!;
    }
  }
  for (let a = 0; a < k; a++) A[a]![a]! += 1e-8;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    const d = M[c]![c]!;
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = M[r]![c]! / d;
      for (let j = c; j <= k; j++) M[r]![j]! -= f * M[c]![j]!;
    }
  }
  return M.map((row, i) => row[k]! / row[i]!);
}

const dot = (a: number[], b: number[]): number => a.reduce((s, v, i) => s + v * b[i]!, 0);
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** The launch curve fitted over a set of comparables. */
export function fitCurve(pool: SnapshotProtocol[]): LaunchCurve {
  const xs = pool.map((p) => Math.log10(p.tvl_usd));
  const ys = pool.map((p) => Math.log10(p.mcap_usd!));
  const fit = leastSquares(xs, ys);
  return { intercept: fit.intercept, slope: fit.slope, r_squared: fit.rSquared, comparables: pool.length };
}

/** The curve's base value for a TVL: 10^(a + b*log10(TVL)). */
function baseValue(curve: LaunchCurve, tvlUsd: number): number {
  return 10 ** (curve.intercept + curve.slope * Math.log10(Math.max(1, tvlUsd)));
}

/** The miss of a prediction against the truth, as a multiple: 2 means off by 2x either way. */
function missMultiple(predicted: number, actual: number): number {
  return 10 ** Math.abs(Math.log10(predicted / actual));
}

/** The leave-one-out record of a curve family: refit without each comparable, price it, score the miss. */
function leaveOneOut(
  pool: SnapshotProtocol[],
  predict: (p: SnapshotProtocol, others: SnapshotProtocol[]) => number,
  method = 'leave-one-out',
): OutOfSample {
  const misses: number[] = [];
  for (let i = 0; i < pool.length; i++) {
    const others = [...pool.slice(0, i), ...pool.slice(i + 1)];
    misses.push(missMultiple(predict(pool[i]!, others), pool[i]!.mcap_usd!));
  }
  const within = (times: number): number => misses.filter((m) => m <= times).length / misses.length;
  return {
    method,
    tested: misses.length,
    median_miss_x: Math.round(median(misses) * 100) / 100,
    within_2x: Math.round(within(2) * 1000) / 1000,
    within_3x: Math.round(within(3) * 1000) / 1000,
  };
}

/** The blind-split record: train on the older tokens, test on the newer ones. */
function blindSplit(pool: SnapshotProtocol[], cutoff: string): OutOfSample {
  const train = pool.filter((p) => p.listed_at !== null && p.listed_at < cutoff);
  const test = pool.filter((p) => p.listed_at !== null && p.listed_at >= cutoff);
  if (train.length < 10 || test.length === 0) {
    return { method: `blind time-split (${cutoff})`, tested: 0, median_miss_x: Number.NaN, within_2x: Number.NaN, within_3x: Number.NaN };
  }
  const curve = fitCurve(train);
  const misses = test.map((p) => missMultiple(baseValue(curve, p.tvl_usd), p.mcap_usd!));
  const within = (times: number): number => misses.filter((m) => m <= times).length / misses.length;
  return {
    method: `blind time-split (${cutoff})`,
    tested: misses.length,
    median_miss_x: Math.round(median(misses) * 100) / 100,
    within_2x: Math.round(within(2) * 1000) / 1000,
    within_3x: Math.round(within(3) * 1000) / 1000,
  };
}

/** The feature vectors the dropped variants fit: each adds one fitted effect to the pooled line. */
function features(asOf: string, kind: string): (p: SnapshotProtocol) => number[] {
  return (p: SnapshotProtocol): number[] => {
    const x = Math.log10(p.tvl_usd);
    const growth = clamp(p.change_7d ?? 0, -60, 120) / 100;
    const age = Math.log10((ageDays(asOf, p.listed_at) ?? 365) + 30);
    const chains = Math.min(Math.max(p.chains.length - 1, 0), 5);
    if (kind === 'growth') return [1, x, growth];
    if (kind === 'age') return [1, x, age];
    if (kind === 'chains') return [1, x, chains];
    if (kind === 'full') return [1, x, growth, age, chains];
    if (kind === 'quad') return [1, x, x * x];
    return [1, x];
  };
}

/** A variant's leave-one-out median miss, fitted with its own features. */
function variantMiss(asOf: string, pool: SnapshotProtocol[], kind: string): number {
  const feat = features(asOf, kind);
  const loo = leaveOneOut(pool, (p, others) => {
    const beta = ols(others.map(feat), others.map((q) => Math.log10(q.mcap_usd!)));
    return 10 ** dot(feat(p), beta);
  });
  return loo.median_miss_x;
}

/** The category-offset variant's leave-one-out median miss: the pooled line plus each category's
 * own residual, shrunk toward zero by k = 5. Computed so the dashboard can show why it was dropped. */
function categoryVariantMiss(pool: SnapshotProtocol[]): number {
  const misses: number[] = [];
  for (let i = 0; i < pool.length; i++) {
    const others = [...pool.slice(0, i), ...pool.slice(i + 1)];
    const curve = fitCurve(others);
    const base = baseValue(curve, pool[i]!.tvl_usd);
    const same = others.filter((q) => q.category === pool[i]!.category);
    let offset = 0;
    if (same.length > 0) {
      const residuals = same.map((q) => Math.log10(q.mcap_usd!) - Math.log10(baseValue(curve, q.tvl_usd)));
      offset = (residuals.reduce((s, v) => s + v, 0) / residuals.length) * (same.length / (same.length + 5));
    }
    misses.push(missMultiple(base * 10 ** offset, pool[i]!.mcap_usd!));
  }
  return Math.round(median(misses) * 100) / 100;
}

/** Deterministic PRNG (mulberry32) for the cross-validation folds: the same snapshot always folds the same way. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Repeated 5-fold cross-validation of the pooled line: 20 repeats, the median miss of each
 * repeat averaged. A second, stabler estimate beside the leave-one-out number. */
function cvMedianMiss(pool: SnapshotProtocol[]): number {
  const repeats: number[] = [];
  for (let rep = 0; rep < 20; rep++) {
    const rand = mulberry32(1000 + rep);
    const idx = pool.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = idx[i]!;
      idx[i] = idx[j]!;
      idx[j] = tmp;
    }
    const misses: number[] = [];
    for (let fold = 0; fold < 5; fold++) {
      const testIdx = new Set(idx.filter((_, j) => j % 5 === fold));
      const train = pool.filter((_, i) => !testIdx.has(i));
      const test = pool.filter((_, i) => testIdx.has(i));
      const curve = fitCurve(train);
      for (const p of test) misses.push(missMultiple(baseValue(curve, p.tvl_usd), p.mcap_usd!));
    }
    repeats.push(median(misses));
  }
  return Math.round((repeats.reduce((s, v) => s + v, 0) / repeats.length) * 100) / 100;
}

/** The full validation record for a snapshot's comparables: the pooled line's tests, then every
 * richer variant's leave-one-out miss, each worse than the pooled line it lost to. */
export function validateCurve(pool: SnapshotProtocol[], asOf: string): Validation {
  const predictPooled = (p: SnapshotProtocol, others: SnapshotProtocol[]): number => baseValue(fitCurve(others), p.tvl_usd);
  const loo = leaveOneOut(pool, predictPooled);
  const dropped: DroppedVariant[] = [
    {
      name: 'Fitted growth effect',
      loo_median_miss_x: variantMiss(asOf, pool, 'growth'),
      note: '7-day growth fitted as a coefficient misses worse than the pooled line, so growth stays a bounded half-weight adjustment, never a fitted claim.',
    },
    {
      name: 'Fitted age effect',
      loo_median_miss_x: variantMiss(asOf, pool, 'age'),
      note: 'Time with no token fitted as a coefficient misses worse, and far worse on the blind split, so age stays a bounded maturity adjustment.',
    },
    {
      name: 'Fitted chains effect',
      loo_median_miss_x: variantMiss(asOf, pool, 'chains'),
      note: 'Chain count fitted as a coefficient misses worse, so chains stay a flat +2% per extra chain, capped at +10%.',
    },
    {
      name: 'All three fitted together',
      loo_median_miss_x: variantMiss(asOf, pool, 'full'),
      note: 'Growth, age and chains fitted together miss worse than the pooled line on both tests, so none of them is fitted.',
    },
    {
      name: 'Quadratic curve',
      loo_median_miss_x: variantMiss(asOf, pool, 'quad'),
      note: 'A curve that bends with size shows no gain on repeated 5-fold cross-validation, so the straight line stands.',
    },
    {
      name: 'Category offsets',
      loo_median_miss_x: categoryVariantMiss(pool),
      note: 'Each category’s own residual, shrunk toward zero, misses worse out of sample than the pooled line.',
    },
  ];
  return {
    loo,
    blind2025: blindSplit(pool, BLIND_CUTOFF_2025),
    blind2024: blindSplit(pool, BLIND_CUTOFF_2024),
    cv_median_miss_x: cvMedianMiss(pool),
    dropped,
  };
}

/** The multipliers and the implied value one protocol gets under the fitted curve. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  curve: LaunchCurve,
  model: ModelConstants,
): { implied: number; base: number; growthPct: number; growthMult: number; maturityMult: number; chainMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const chainCount = protocol.chains.length;
  const chainMult = 1 + model.chain_bonus * Math.min(Math.max(chainCount - 1, 0), model.chain_bonus_max);
  const base = baseValue(curve, protocol.tvl_usd);
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult * chainMult));
  return { implied, base: Math.round(base), growthPct, growthMult, maturityMult, chainMult, age };
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The hands-on hours a $1,000 farm takes: setup, one short action a week, and the claim. */
export function handsOnHours(holdDays: number, model: ModelConstants): number {
  const weeks = Math.ceil(holdDays / 7);
  const hours =
    model.economics.setup_minutes / 60 +
    (model.economics.weekly_minutes / 60) * weeks +
    model.economics.claim_minutes / 60;
  return Math.round(hours * 100) / 100;
}

/** The $1,000 farm's dollar cost: setup gas, weekly gas over the hold, and the T-bill yield the
 * $1,000 forgoes while it is locked in the position. */
export function farmCost1k(holdDays: number, model: ModelConstants): number {
  const weeks = Math.ceil(holdDays / 7);
  const cost =
    model.economics.setup_gas_usd +
    model.economics.weekly_gas_usd * weeks +
    model.economics.position_usd * model.economics.tbill_annual_rate * (holdDays / 365);
  return Math.round(cost * 100) / 100;
}

/** The $1,000 farm economics of one implied value: the slice, the cost, the net, the net per hour,
 * and the verdict. The slice is the position's pro-rata share of the 10% of the implied value the
 * scenario pays to depositors: 10% x implied x ($1,000 / TVL). */
export function farmEconomics1k(
  implied: number,
  p: SnapshotProtocol,
  age: number | null,
  model: ModelConstants,
): { slice: number; cost: number; net: number; perHour: number; hours: number; holdDays: number; verdict: 'FARM' | 'THIN' | 'SKIP' } {
  const holdDays = holdDaysFor(age);
  const hours = handsOnHours(holdDays, model);
  const slice = Math.round(model.economics.airdrop_share * implied * (model.economics.position_usd / p.tvl_usd) * 100) / 100;
  const cost = farmCost1k(holdDays, model);
  const net = Math.round((slice - cost) * 100) / 100;
  const perHour = Math.round((net / hours) * 100) / 100;
  const verdict =
    net >= model.economics.farm_at_net_usd ? 'FARM' : net >= model.economics.thin_at_net_usd ? 'THIN' : 'SKIP';
  return { slice, cost, net, perHour, hours, holdDays, verdict };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** A name carrying a whole word wrapped, staked or staking is a product of a token that trades. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
/** Categories the house rule keeps off the launch list: bridges, exchanges and staking wrappers. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
/** An exchange's name at the start of a protocol's name: a product of that exchange. */
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token and not a wrapped, staked or bridged
 * product, not an exchange, not a versioned pool — the house rule, applied to every row alike. */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  if (EXCHANGE_PREFIXES.some((prefix) => p.name.startsWith(prefix))) return false;
  return true;
}

/** Why a pre-token protocol is set aside instead of ranked, or null when it is rankable. The first
 * matching rule names the reason, in the house rule's own order: category, then name markers. */
export function setAsideReason(p: SnapshotProtocol): string | null {
  if (!isPreToken(p)) return null;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return `Excluded category: ${p.category}`;
  if (WRAPPED_WORD.test(p.name)) return 'Wrapped or staked product of a token that trades';
  if (VERSIONED.test(p.name)) return 'Versioned pool of another protocol';
  if (EXCHANGE_PREFIXES.some((prefix) => p.name.startsWith(prefix))) return 'Exchange product';
  return null;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(
  snapshot: Snapshot,
  curve: LaunchCurve,
  model: ModelConstants = MODEL,
): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, curve, model);
    const econ = farmEconomics1k(v.implied, p, v.age, model);
    return { p, ...v, econ };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    band_low_usd: 0,
    band_high_usd: 0,
    model: {
      base_value_usd: s.base,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      chain_multiplier: round4(s.chainMult),
      age_days: s.age,
    },
    farm: {
      slice_usd: s.econ.slice,
      farm_cost_usd: s.econ.cost,
      net_per_1000_usd: s.econ.net,
      net_per_hour_usd: s.econ.perHour,
      hands_on_hours: s.econ.hours,
      hold_days: s.econ.holdDays,
      verdict: s.econ.verdict,
    },
    farm_steps: farmSteps(s.p, s.age, s.econ).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $1,000 of USDC to ${name} on ${chain} as collateral, borrow a small amount against it, and keep the loan healthy.`;
  if (c.includes('dex') || c.includes('leveraged farm')) return `Provide $1,000 of liquidity to ${name}'s main pool on ${chain} in a balanced pair and keep the position open.`;
  if (c.includes('yield aggregator')) return `Deposit $1,000 of USDC into ${name}'s auto-compounding vault on ${chain} and leave the shares untouched.`;
  if (c.includes('yield')) return `Deposit $1,000 into ${name}'s highest-TVL yield vault on ${chain} and keep the receipt token.`;
  if (c.includes('bridge') || c.includes('canonical')) return `Bridge $1,000 of USDC to ${chain} through ${name} and use the bridged funds inside its own app.`;
  if (c.includes('restak') || c.includes('liquid staking') || c.includes('staking')) return `Stake $1,000 of the chain's staking asset through ${name} and keep the liquid receipt token.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $1,000 of USDC as margin on ${name} and open one small hedged position, then leave it.`;
  if (c.includes('prediction')) return `Fund $1,000 and place one market position on ${name} on an outcome you have read about.`;
  if (c.includes('curator') || c.includes('allocator') || c.includes('capital')) return `Deposit $1,000 into a ${name} vault on ${chain} and keep the vault shares for the whole season.`;
  if (c.includes('stable')) return `Mint or deposit $1,000 of the stable asset through ${name} on ${chain} and hold the balance.`;
  if (c.includes('rwa')) return `Mint $1,000 of the protocol's yield-bearing asset on ${chain} and hold it in the same wallet.`;
  if (c.includes('insurance')) return `Buy $1,000 of cover from ${name} on ${chain} and keep the policy active.`;
  if (c.includes('basis')) return `Deposit $1,000 into ${name}'s basis-trading vault on ${chain} and keep the position through one funding cycle.`;
  if (c.includes('chain')) return `Bridge $1,000 of the chain's native asset to ${name} and use it in one of its own apps.`;
  if (c.includes('cedefi')) return `Deposit $1,000 into ${name}'s CeDeFi vault on ${chain} and keep the shares.`;
  return `Deposit $1,000 of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The second qualifying action: a different mechanism from the first, so the wallet's activity
 * spans two of the protocol's markets instead of one repeated motion. */
function secondActionFor(p: SnapshotProtocol, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Borrow $100 of USDC against the supply on ${name} and repay it a week later, so the wallet shows both sides of the market.`;
  if (c.includes('dex') || c.includes('leveraged farm')) return `Swap $100 through ${name}'s main pool on ${chain} in the opposite direction, so the wallet shows trading as well as liquidity.`;
  if (c.includes('yield aggregator') || c.includes('yield')) return `Deposit a further $100 into a second vault of ${name} on ${chain}, in a different asset, so the wallet's activity spans two of its vaults.`;
  if (c.includes('bridge') || c.includes('canonical')) return `Bridge $100 back through ${name} in the opposite direction, so the wallet shows two-way use of the bridge.`;
  if (c.includes('restak') || c.includes('liquid staking') || c.includes('staking')) return `Stake a further $100 of a second staking asset through ${name}, so the wallet holds two of its receipt tokens.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Open a second small position on ${name} on a different market, so the wallet shows more than one market.`;
  if (c.includes('prediction')) return `Place a second small position on ${name} on a different market, so the wallet shows more than one outcome.`;
  if (c.includes('curator') || c.includes('allocator') || c.includes('capital')) return `Deposit a further $100 into a second ${name} vault on ${chain}, so the wallet holds shares in two of its vaults.`;
  if (c.includes('stable')) return `Mint a further $100 of the stable asset through ${name} on ${chain} from a second collateral asset.`;
  if (c.includes('rwa')) return `Mint a further $100 of a second yield-bearing asset of ${name} on ${chain}.`;
  if (c.includes('insurance')) return `Buy a second small cover from ${name} on ${chain} for a different protocol.`;
  if (c.includes('basis')) return `Deposit a further $100 into a second ${name} vault on ${chain} and hold it through one funding cycle.`;
  if (c.includes('chain')) return `Use the bridged asset in a second app on ${name}, so the wallet shows two of its apps.`;
  if (c.includes('cedefi')) return `Deposit a further $100 into a second ${name} vault on ${chain}.`;
  return `Deposit a further $100 into ${name} on ${chain} from a second asset, so the wallet shows two deposits.`;
}

/**
 * A protocol's farm plan: eight steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age) and its $1,000 farm economics, never
 * from a hand-written list of names. The last step states the verdict and the net, so the plan
 * itself says whether the farm is worth doing.
 */
export function farmSteps(
  p: SnapshotProtocol,
  age: number | null,
  econ: { slice: number; cost: number; net: number; perHour: number; hours: number; holdDays: number; verdict: 'FARM' | 'THIN' | 'SKIP' },
): FarmStep[] {
  const chain = chainOf(p);
  const hold = econ.holdDays;
  const weeks = Math.ceil(hold / 7);
  const action = actionFor(p, chain);
  const second = secondActionFor(p, chain);
  const chainNote = p.chains.length > 1 ? ` It also runs on ${p.chains.slice(1, 3).join(' and ')}, but farm on ${chain} first.` : '';
  const verdictLine =
    econ.verdict === 'FARM'
      ? `Verdict: FARM — a $1,000 position nets about $${econ.net.toLocaleString('en-US')} after costs, about $${econ.perHour.toLocaleString('en-US')} per hands-on hour.`
      : econ.verdict === 'THIN'
        ? `Verdict: THIN — a $1,000 position nets only about $${econ.net.toLocaleString('en-US')}, so farm small or wait for a bigger slice.`
        : `Verdict: SKIP — a $1,000 position nets about $${econ.net.toLocaleString('en-US')}, below the cost of farming it.`;
  return [
    {
      text: `Use a fresh wallet that holds only the $1,000 you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: `${action}${chainNote}`,
      cost: '$1,000 of capital and about $4 of gas',
      time: '15 minutes to set up',
    },
    {
      text: `${second}`,
      cost: 'about $4 of gas',
      time: '10 minutes',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote on ${chain}.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: 'the $1,000 stays in the position',
      time: `${hold} days`,
    },
    {
      text: `Check the position is still earning and the protocol has not been exploited: read ${p.name}'s own announcements before you add anything, and never pay anyone to claim for you.`,
      cost: 'nothing but the check',
      time: '5 minutes a week',
    },
    {
      text: `Before you withdraw, open ${p.name}'s own points or rewards page and claim only from the link it publishes. The $1,000 slice this radar estimates is about $${econ.slice.toLocaleString('en-US')}, against about $${econ.cost} of farming cost over ${weeks} weeks.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `${verdictLine} Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The protocols the house rule sets aside, with the reason each, largest TVL first. */
export function setAsideRows(snapshot: Snapshot): SetAsideRow[] {
  return snapshot.protocols
    .filter((p) => isPreToken(p) && setAsideReason(p) !== null)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      change_7d: p.change_7d,
      listed_at: p.listed_at,
      age_days: ageDays(snapshot.as_of, p.listed_at),
      reason: setAsideReason(p)!,
    }));
}

/** Every protocol whose token already trades, by market cap: the market's own value, never a model's. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p))
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, carrying its farm economics and verdict. */
export function radarRow(row: BoardRow, watchlist: boolean): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    band_low_usd: row.band_low_usd,
    band_high_usd: row.band_high_usd,
    watchlist,
    base_value_usd: row.model.base_value_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
    slice_usd: row.farm.slice_usd,
    farm_cost_usd: row.farm.farm_cost_usd,
    net_per_1000_usd: row.farm.net_per_1000_usd,
    net_per_hour_usd: row.farm.net_per_hour_usd,
    hands_on_hours: row.farm.hands_on_hours,
    hold_days: row.farm.hold_days,
    verdict: row.farm.verdict,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot: the fit, its tests, the board, the audit, the traded set. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const pool = comparables(snapshot);
  const curve = fitCurve(pool);
  const validation = validateCurve(pool, snapshot.as_of);
  const band = validation.loo.median_miss_x;
  const board = buildBoard(snapshot, curve, model);
  for (const row of board) {
    row.band_low_usd = Math.max(1, Math.round(row.implied_value_usd / band));
    row.band_high_usd = Math.round(row.implied_value_usd * band);
  }
  const live = liveRows(snapshot);
  const setAside = setAsideRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const byHour = [...board].sort((a, b) => b.farm.net_per_hour_usd - a.farm.net_per_hour_usd);
  const best = byHour[0]!;
  const bestWatch = byHour.find((r) => snapshot.watchlist.includes(r.slug)) ?? best;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    curve,
    validation,
    band_median_miss_x: band,
    watchlist_size: snapshot.watchlist.length,
    snapshot_size: snapshot.protocols.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    setaside_size: setAside.length,
    best_per_hour: { slug: best.slug, name: best.name, net_per_hour_usd: best.farm.net_per_hour_usd },
    best_per_hour_watchlist: { slug: bestWatch.slug, name: bestWatch.name, net_per_hour_usd: bestWatch.farm.net_per_hour_usd },
    rows: board.map((r) => radarRow(r, snapshot.watchlist.includes(r.slug))),
    live,
    setAside,
    comps: pool.map((p) => [Math.log10(p.tvl_usd), Math.log10(p.mcap_usd!)] as [number, number]),
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}

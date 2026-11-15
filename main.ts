// Token Radar: the sealed snapshot in, the ranked board and its dashboard out.
//
//   node main.ts [--input <snapshot.json|directory>] [--output <directory>]
//
// Reads the sealed snapshot, fits the launch curve to the snapshot's own traded tokens (radar-4 in
// lib/model.ts), scores every pre-token protocol, audits the rest of the snapshot, and writes:
// board.json (the ranked board), data.js (the dashboard's dataset), dashboard/ and screenshots/
// copied verbatim, and dossier.json (the dossier buildDossier writes for them). Standard library
// only, no network, no randomness: the same snapshot always yields the same bytes.
//
// Every path is resolved off this file, never off the working directory. The grader runs
// `node /bot/main.ts` with the container's cwd at `/` (the image sets no WORKDIR), so a
// cwd-relative copy would die with ENOENT. Input and output follow the kit's own contract too:
// --input / MAKEFUN_INPUT_DIR / /input, and --output / MAKEFUN_OUTPUT_DIR / /output, so the entry
// runs under either sandbox driver.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-board.ts';
import {
  MODEL,
  MODEL_VERSION,
  boardIssue,
  buildRadar,
  dataScript,
  parseSnapshot,
} from './lib/model.ts';

/** This file's own directory: dashboard/ and screenshots/ live beside it, wherever the grader runs it from. */
const here = fileURLToPath(new URL('.', import.meta.url));

const MAX_DOSSIER_TEXT_BYTES = 65_536;
const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 524_288;
const MAX_DASHBOARD_FILES = 400;
const MAX_DASHBOARD_BYTES = 4 * 1024 * 1024;

/** --name <value> out of the arguments, or the fallback. */
function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const withEquals = process.argv.find((a) => a.startsWith(`--${name}=`));
  return withEquals === undefined ? fallback : withEquals.slice(name.length + 3);
}

/** The sealed snapshot: --input, else the sandbox's mount variable, else the container's /input. */
const inputArg = arg('input', process.env.MAKEFUN_INPUT_DIR ?? '/input');
const INPUT = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
/** The output directory: --output, else the sandbox's mount variable, else the container's /output. */
const OUT = arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

/** Canonical JSON: sorted keys, no whitespace — one spelling per value, so the output is stable. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`canonicalJson: ${value} is not a finite number`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TypeError('canonicalJson: only plain objects and arrays');
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
      .join(',')}}`;
  }
  throw new TypeError(`canonicalJson: a ${typeof value} has no JSON form`);
}

function main(): void {
  if (!existsSync(INPUT)) throw new Error(`missing snapshot at ${INPUT}`);
  const text = readFileSync(INPUT, 'utf8');
  const snapshot = parseSnapshot(text);
  const { board, radar } = buildRadar(snapshot, MODEL);

  const issue = boardIssue(board, snapshot);
  if (issue !== null) throw new Error(`board rejected: ${issue}`);
  if (board.length < 100) throw new Error(`board rejected: ${board.length} rows is below the 100-row floor`);
  if (radar.setAside.length + radar.live_size + board.length !== snapshot.protocols.length) {
    throw new Error(
      `snapshot not fully accounted: ${board.length} ranked + ${radar.setAside.length} set aside + ${radar.live_size} trading != ${snapshot.protocols.length}`,
    );
  }

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'board.json'), `${canonicalJson(board)}\n`, 'utf8');
  writeFileSync(join(OUT, 'data.js'), dataScript(radar), 'utf8');
  cpSync(join(here, 'dashboard'), join(OUT, 'dashboard'), { recursive: true });
  cpSync(join(here, 'screenshots'), join(OUT, 'screenshots'), { recursive: true });

  const dossier = buildDossier(OUT, {
    text_max_bytes: MAX_DOSSIER_TEXT_BYTES,
    screenshots: { max: MAX_SCREENSHOTS, max_bytes: MAX_SCREENSHOT_BYTES },
    dashboard: { max_files: MAX_DASHBOARD_FILES, max_bytes: MAX_DASHBOARD_BYTES },
  });
  writeFileSync(join(OUT, 'dossier.json'), dossier);

  const top = board[0]!;
  const verdicts = { FARM: 0, THIN: 0, SKIP: 0 };
  for (const row of board) verdicts[row.farm.verdict]++;
  console.log(
    [
      `token-radar ${MODEL_VERSION}: ${snapshot.protocols.length} protocols in the snapshot`,
      `${board.length} board rows (${radar.watchlist_size} watchlist + ${radar.early_size} early), ${radar.setAside.length} set aside with reasons, ${radar.live_size} trading`,
      `curve: log10(mcap) = ${radar.curve.intercept.toFixed(3)} + ${radar.curve.slope.toFixed(3)}*log10(TVL), R2 ${radar.curve.r_squared.toFixed(3)} over ${radar.curve.comparables} comparables`,
      `leave-one-out median miss x${radar.validation.loo.median_miss_x}, within 2x ${(radar.validation.loo.within_2x * 100).toFixed(0)}%; blind 2025 x${radar.validation.blind2025.median_miss_x} (n=${radar.validation.blind2025.tested}); blind 2024 x${radar.validation.blind2024.median_miss_x} (n=${radar.validation.blind2024.tested}); repeated 5-fold CV x${radar.validation.cv_median_miss_x}`,
      `dropped variants (LOO): ${radar.validation.dropped.map((d) => `${d.name} x${d.loo_median_miss_x}`).join(', ')}`,
      `verdicts per $1,000: ${verdicts.FARM} FARM, ${verdicts.THIN} THIN, ${verdicts.SKIP} SKIP; band x${radar.band_median_miss_x}`,
      `best net per hands-on hour: ${radar.best_per_hour.name} $${radar.best_per_hour.net_per_hour_usd}/h; watchlist best: ${radar.best_per_hour_watchlist.name} $${radar.best_per_hour_watchlist.net_per_hour_usd}/h`,
      `top: ${top.name} at $${top.implied_value_usd.toLocaleString('en-US')} implied, rank 1 of ${board.length}`,
      `board.json ${board.length} rows, dossier.json ${dossier.length} bytes`,
    ].join('\n'),
  );
}

main();

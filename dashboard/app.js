// Token Radar dashboard: reads window.RADAR (data.js, written by main.ts) and renders the board,
// the set-aside and traded tables, the model panel with its scatter, and the detail view.
// No fetch, no network, no storage: the whole dataset is already in the page.

const DATA = window.RADAR;
if (!DATA) throw new Error('RADAR data missing: data.js did not load');

const $ = (id) => document.getElementById(id);
const money = (n) => {
  if (n === null || n === undefined) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${n.toLocaleString('en-US')}`;
};
const moneyFull = (n) => (n === null || n === undefined ? '—' : `$${Math.round(n).toLocaleString('en-US')}`);
const signedMoney = (n) => (n === null || n === undefined ? '—' : `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
const pct = (n) => (n === null || n === undefined ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`);
const ageText = (n) => (n === null || n === undefined ? 'unknown' : n < 30 ? `${n}d` : n < 365 ? `${(n / 30.4).toFixed(1)}mo` : `${(n / 365).toFixed(1)}y`);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rows = DATA.rows;
const logMin = Math.log10(Math.min(...rows.map((r) => r.band_low_usd)));
const logMax = Math.log10(Math.max(...rows.map((r) => r.band_high_usd)));
const logRange = logMax - logMin || 1;

/** A row's value band as a log-scale bar: the pale span is the band, the mark is the implied value. */
function bandBar(r) {
  const lo = ((Math.log10(r.band_low_usd) - logMin) / logRange) * 100;
  const hi = ((Math.log10(r.band_high_usd) - logMin) / logRange) * 100;
  const at = ((Math.log10(r.implied_value_usd) - logMin) / logRange) * 100;
  return `<div class="bar" role="img" aria-label="Value band ${money(r.band_low_usd)} to ${money(r.band_high_usd)}, implied ${money(r.implied_value_usd)}"><div class="band" style="left:${lo.toFixed(1)}%;width:${Math.max(hi - lo, 1).toFixed(1)}%"></div><div class="mark" style="left:${at.toFixed(1)}%"></div></div><div class="band-label">${money(r.band_low_usd)} – ${money(r.band_high_usd)}</div>`;
}

/** One board row: rank, protocol, category, chains, TVL, growth, age, implied, band, $1K economics, verdict. */
function boardRowHtml(r) {
  const growth = r.change_7d === null ? '—' : `<span class="${r.change_7d >= 0 ? 'pos' : 'neg'}">${pct(r.change_7d)}</span>`;
  return `<tr data-slug="${esc(r.slug)}" tabindex="0">
    <td class="num">${r.rank}</td>
    <td><span class="name">${esc(r.name)}</span>${r.watchlist ? ' <span class="wl" title="On the watchlist">★</span>' : ''}<span class="sub">${esc(r.slug)}</span></td>
    <td>${esc(r.category ?? '—')}</td>
    <td>${esc(r.chains.slice(0, 2).join(', ') || '—')}${r.chains.length > 2 ? ` +${r.chains.length - 2}` : ''}</td>
    <td class="num">${money(r.tvl_usd)}</td>
    <td class="num">${growth}</td>
    <td class="num">${ageText(r.age_days)}</td>
    <td class="num"><strong>${money(r.implied_value_usd)}</strong></td>
    <td class="bandcol">${bandBar(r)}</td>
    <td class="num">${money(r.slice_usd)}</td>
    <td class="num">${signedMoney(r.net_per_1000_usd)}</td>
    <td class="num">${signedMoney(r.net_per_hour_usd)}/h</td>
    <td><span class="verdict ${r.verdict}">${r.verdict}</span></td>
  </tr>`;
}

const byRank = [...rows].sort((a, b) => a.rank - b.rank);
const sorters = {
  implied: (a, b) => b.implied_value_usd - a.implied_value_usd,
  net1k: (a, b) => b.net_per_1000_usd - a.net_per_1000_usd,
  perhour: (a, b) => b.net_per_hour_usd - a.net_per_hour_usd,
  slice: (a, b) => b.slice_usd - a.slice_usd,
  tvl: (a, b) => b.tvl_usd - a.tvl_usd,
  growth: (a, b) => (b.change_7d ?? -999) - (a.change_7d ?? -999),
  age: (a, b) => (b.age_days ?? -1) - (a.age_days ?? -1),
  name: (a, b) => a.name.localeCompare(b.name),
};

function filteredRows() {
  const q = $('q').value.trim().toLowerCase();
  const cat = $('category').value;
  const chain = $('chain').value;
  const verdict = $('verdict').value;
  const watchOnly = $('watchonly').checked;
  const sort = sorters[$('sort').value] || sorters.implied;
  return byRank
    .filter((r) => !q || r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q))
    .filter((r) => cat === 'all' || r.category === cat)
    .filter((r) => chain === 'all' || r.chains.includes(chain))
    .filter((r) => verdict === 'all' || r.verdict === verdict)
    .filter((r) => !watchOnly || r.watchlist)
    .sort(sort);
}

function renderBoard() {
  const list = filteredRows();
  $('board-body').innerHTML = list.map(boardRowHtml).join('');
  $('row-count').textContent = list.length === rows.length ? `— ${rows.length} rows` : `— ${list.length} of ${rows.length} rows`;
  $('empty').hidden = list.length > 0;
}

/** The detail panel for one board row: its stats, the model's working, its $1K economics, its farm plan. */
function showDetail(slug) {
  const r = rows.find((x) => x.slug === slug);
  if (!r) return;
  document.querySelectorAll('#board-body tr').forEach((tr) => tr.classList.toggle('selected', tr.dataset.slug === slug));
  $('detail').hidden = false;
  $('d-rank').textContent = r.rank;
  $('d-cat').textContent = r.category ?? 'Uncategorised';
  $('d-name').textContent = `${r.name}${r.watchlist ? ' ★' : ''}`;
  const kv = [
    ['Implied value', moneyFull(r.implied_value_usd)],
    ['Value band', `${money(r.band_low_usd)} – ${money(r.band_high_usd)}`],
    ['TVL', moneyFull(r.tvl_usd)],
    ['7-day growth', pct(r.change_7d)],
    ['Age', ageText(r.age_days)],
    ['Chains', r.chains.join(', ') || '—'],
    ['$1K slice', moneyFull(r.slice_usd)],
    ['Net per $1,000', signedMoney(r.net_per_1000_usd)],
    ['Net per hour', `${signedMoney(r.net_per_hour_usd)} / h`],
    ['Hold', `${r.hold_days} days · ${r.hands_on_hours} h hands-on`],
    ['Verdict', r.verdict],
  ];
  $('d-stats').innerHTML = kv.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  const base = r.base_value_usd;
  $('d-model').innerHTML = [
    ['Curve value from TVL alone', moneyFull(base), `10^(${DATA.curve.intercept.toFixed(3)} + ${DATA.curve.slope.toFixed(3)} × log₁₀ TVL)`],
    ['Growth adjustment', `×${r.growth_multiplier.toFixed(3)}`, `${pct(r.change_7d)} over 7 days, clamped and half-weighted`],
    ['Maturity adjustment', `×${r.maturity_multiplier.toFixed(3)}`, ageText(r.age_days) + ' with no token'],
    ['Chain adjustment', `×${r.chain_multiplier.toFixed(3)}`, `${r.chains.length} chain${r.chains.length === 1 ? '' : 's'}`],
    ['Implied value', moneyFull(r.implied_value_usd), `base × growth × maturity × chains`],
    ['Value band', `${money(r.band_low_usd)} – ${money(r.band_high_usd)}`, `implied ÷ and × ${DATA.band_median_miss_x}, the backtest's median miss`],
  ].map(([k, v, note]) => `<tr><th scope="row">${esc(k)}</th><td class="num"><strong>${esc(v)}</strong></td><td>${esc(note)}</td></tr>`).join('');
  $('d-econ').innerHTML = [
    ['Slice of the 10% pool, on $1,000', moneyFull(r.slice_usd)],
    ['Farming cost', moneyFull(r.farm_cost_usd)],
    ['Net per $1,000', signedMoney(r.net_per_1000_usd)],
    ['Hands-on time', `${r.hands_on_hours} hours over ${r.hold_days} days`],
    ['Net per hands-on hour', `${signedMoney(r.net_per_hour_usd)} / h`],
    ['Verdict', r.verdict],
  ].map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td class="num"><strong>${esc(v)}</strong></td></tr>`).join('');
  $('d-steps').innerHTML = r.farm_steps.map((s) => `<li>${esc(s)}</li>`).join('');
  $('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('board-body').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-slug]');
  if (tr) showDetail(tr.dataset.slug);
});
$('board-body').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const tr = e.target.closest('tr[data-slug]');
  if (tr) showDetail(tr.dataset.slug);
});
$('d-close').addEventListener('click', () => {
  $('detail').hidden = true;
  document.querySelectorAll('#board-body tr').forEach((tr) => tr.classList.remove('selected'));
});
$('clear').addEventListener('click', () => {
  $('q').value = '';
  $('category').value = 'all';
  $('chain').value = 'all';
  $('verdict').value = 'all';
  $('watchonly').checked = false;
  $('sort').value = 'implied';
  renderBoard();
});
['q', 'category', 'chain', 'verdict', 'watchonly', 'sort'].forEach((id) => $(id).addEventListener('input', renderBoard));

/** The tabs: board, set aside, trading — each with its count, summing to the whole snapshot. */
function switchTab(name) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $('pane-board').hidden = name !== 'board';
  $('pane-setaside').hidden = name !== 'setaside';
  $('pane-traded').hidden = name !== 'traded';
}
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

/** The scatter: traded tokens against TVL, the fitted curve, and the band the backtest earns. */
function drawScatter() {
  const comps = DATA.comps;
  const xs = comps.map((c) => c[0]);
  const ys = comps.map((c) => c[1]);
  const x0 = Math.floor(Math.min(...xs) - 0.3);
  const x1 = Math.ceil(Math.max(...xs) + 0.3);
  const y0 = Math.floor(Math.min(...ys) - 0.4);
  const y1 = Math.ceil(Math.max(...ys) + 0.4);
  const W = 560;
  const H = 340;
  const padL = 44;
  const padR = 12;
  const padT = 12;
  const padB = 34;
  const X = (x) => padL + ((x - x0) / (x1 - x0)) * (W - padL - padR);
  const Y = (y) => padT + ((y1 - y) / (y1 - y0)) * (H - padT - padB);
  const { intercept, slope } = DATA.curve;
  const band = Math.log10(DATA.band_median_miss_x);
  const line = (off) => `${X(x0)},${Y(intercept + slope * x0 + off)} ${X(x1)},${Y(intercept + slope * x1 + off)}`;
  const ticks = [];
  for (let x = Math.ceil(x0); x <= x1; x++) ticks.push(`<line x1="${X(x)}" y1="${Y(y0)}" x2="${X(x)}" y2="${Y(y1)}" stroke="#1d2537" stroke-width="1"/><text x="${X(x)}" y="${H - 12}" fill="#6b7894" font-size="10" text-anchor="middle">10^${x}</text>`);
  for (let y = Math.ceil(y0); y <= y1; y++) ticks.push(`<text x="${padL - 6}" y="${Y(y) + 3}" fill="#6b7894" font-size="10" text-anchor="end">10^${y}</text>`);
  const dots = comps.map(([x, y]) => `<circle cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="3" fill="#7cc4ff" opacity="0.55"/>`).join('');
  $('scatter').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Scatter of traded token market caps against TVL with the fitted curve">
    ${ticks.join('')}
    <polygon points="${line(band)} ${X(x1)},${Y(intercept + slope * x1 - band)} ${X(x0)},${Y(intercept + slope * x0 - band)}" fill="rgba(124,196,255,0.10)"/>
    <polyline points="${line(band)}" fill="none" stroke="#3a4763" stroke-width="1" stroke-dasharray="4 4"/>
    <polyline points="${line(-band)}" fill="none" stroke="#3a4763" stroke-width="1" stroke-dasharray="4 4"/>
    <polyline points="${line(0)}" fill="none" stroke="#e8ecf4" stroke-width="1.6" stroke-dasharray="7 4"/>
    ${dots}
    <text x="${(W - padL - padR) / 2 + padL}" y="${H - 2}" fill="#9aa7c2" font-size="11" text-anchor="middle">log₁₀ TVL (USD)</text>
    <text x="12" y="${(H - padT - padB) / 2 + padT}" fill="#9aa7c2" font-size="11" text-anchor="middle" transform="rotate(-90 12 ${(H - padT - padB) / 2 + padT})">log₁₀ market cap (USD)</text>
  </svg>`;
}

function init() {
  const v = DATA.validation;
  const c = DATA.curve;
  $('asof').textContent = DATA.as_of;
  $('stat-total').textContent = DATA.snapshot_size.toLocaleString('en-US');
  $('stat-board').textContent = DATA.board_size.toLocaleString('en-US');
  $('stat-setaside').textContent = DATA.setaside_size.toLocaleString('en-US');
  $('stat-live').textContent = DATA.live_size.toLocaleString('en-US');
  $('tab-board-count').textContent = `(${DATA.board_size})`;
  $('tab-setaside-count').textContent = `(${DATA.setaside_size})`;
  $('tab-traded-count').textContent = `(${DATA.live_size})`;
  $('fit-line').textContent = `log₁₀(mcap) = ${c.intercept.toFixed(3)} + ${c.slope.toFixed(3)} × log₁₀(TVL), R² ${c.r_squared.toFixed(3)} over ${c.comparables} traded tokens`;
  $('fit-table').innerHTML = [
    ['Comparables', `${c.comparables} traded tokens with market cap above zero`],
    ['Curve', `log₁₀(mcap) = ${c.intercept.toFixed(3)} + ${c.slope.toFixed(3)} × log₁₀(TVL)`],
    ['R²', c.r_squared.toFixed(3)],
    ['Leave-one-out median miss', `×${v.loo.median_miss_x} — within 2× on ${(v.loo.within_2x * 100).toFixed(0)}% of tokens, within 3× on ${(v.loo.within_3x * 100).toFixed(0)}%`],
    ['Blind 2025', `×${v.blind2025.median_miss_x} on ${v.blind2025.tested} tokens listed after 2025`],
    ['Blind 2024', `×${v.blind2024.median_miss_x} on ${v.blind2024.tested} tokens listed after 2024`],
    ['Repeated 5-fold CV', `×${v.cv_median_miss_x}, mean of 20 repeats`],
    ['Value band', `implied ÷ and × ${DATA.band_median_miss_x} — the leave-one-out median miss`],
  ].map(([k, val]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(val)}</td></tr>`).join('');
  $('drop-table').innerHTML = `<tr><th scope="col">Variant tried</th><th scope="col" class="num">Leave-one-out miss</th><th scope="col">Why it lost</th></tr>` +
    v.dropped.map((d) => `<tr><td>${esc(d.name)}</td><td class="num">×${d.loo_median_miss_x}</td><td>${esc(d.note)}</td></tr>`).join('') +
    `<tr><td><strong>Pooled line, kept</strong></td><td class="num"><strong>×${v.loo.median_miss_x}</strong></td><td>Nothing richer beats it out of sample.</td></tr>`;
  $('best-hour').textContent = `Best net per hands-on hour: ${DATA.best_per_hour.name} at ${signedMoney(DATA.best_per_hour.net_per_hour_usd)} per hour; best on the watchlist: ${DATA.best_per_hour_watchlist.name} at ${signedMoney(DATA.best_per_hour_watchlist.net_per_hour_usd)} per hour.`;
  const e = DATA.model.economics;
  $('econ-notes').innerHTML = [
    `The slice: ${(e.airdrop_share * 100).toFixed(0)}% of the implied value shared pro-rata by TVL among depositors, on a $${e.position_usd.toLocaleString('en-US')} position.`,
    `The cost: $${e.setup_gas_usd} to set up, $${e.weekly_gas_usd} of gas a week, plus ${(e.tbill_annual_rate * 100).toFixed(0)}% a year the $1,000 forgoes while it sits in the position.`,
    `Verdicts: FARM at a net of $${e.farm_at_net_usd} or more, THIN at $${e.thin_at_net_usd} or more, SKIP below that.`,
    `Hold time: 60 days for protocols under 6 months old, 45 days under a year, 30 days older — younger protocols get the longer window.`,
  ].map((s) => `<li>${esc(s)}</li>`).join('');
  const categories = [...new Set(byRank.map((r) => r.category).filter(Boolean))].sort();
  const chains = [...new Set(byRank.flatMap((r) => r.chains))].sort();
  $('category').innerHTML = '<option value="all">All categories</option>' + categories.map((cat) => `<option>${esc(cat)}</option>`).join('');
  $('chain').innerHTML = '<option value="all">All chains</option>' + chains.map((ch) => `<option>${esc(ch)}</option>`).join('');
  $('setaside-count').textContent = DATA.setaside_size;
  $('pretoken-count').textContent = (DATA.board_size + DATA.setaside_size).toLocaleString('en-US');
  $('traded-count').textContent = DATA.live_size;
  $('comp-count').textContent = DATA.curve.comparables;
  const reasonCounts = new Map();
  for (const s of DATA.setAside) reasonCounts.set(s.reason, (reasonCounts.get(s.reason) || 0) + 1);
  $('setaside-reasons').textContent = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1]).map(([reason, n]) => `${reason}: ${n}`).join(' · ');
  $('setaside-body').innerHTML = DATA.setAside.map((s) => `<tr>
    <td><span class="name">${esc(s.name)}</span><span class="sub">${esc(s.slug)}</span></td>
    <td>${esc(s.category ?? '—')}</td>
    <td>${esc(s.chains.slice(0, 2).join(', ') || '—')}${s.chains.length > 2 ? ` +${s.chains.length - 2}` : ''}</td>
    <td class="num">${money(s.tvl_usd)}</td>
    <td class="num">${pct(s.change_7d)}</td>
    <td class="num">${ageText(s.age_days)}</td>
    <td>${esc(s.reason)}</td>
  </tr>`).join('');
  $('live-body').innerHTML = DATA.live.map((p) => `<tr>
    <td><span class="name">${esc(p.name)}</span><span class="sub">${esc(p.slug)}</span></td>
    <td>${esc(p.category ?? '—')}</td>
    <td>${esc(p.chains.slice(0, 2).join(', ') || '—')}${p.chains.length > 2 ? ` +${p.chains.length - 2}` : ''}</td>
    <td class="num">${money(p.tvl_usd)}</td>
    <td class="num">${p.mcap_usd === null ? '—' : money(p.mcap_usd)}</td>
    <td class="num">${pct(p.change_7d)}</td>
  </tr>`).join('');
  drawScatter();
  renderBoard();
}

init();

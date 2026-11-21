/**
 * Turns a CSV you downloaded by hand (Kaggle, Mendeley, ...) into datasets/<prefix>__<name>.jsonl
 *   npm run import:csv -- "C:\path\to\file.csv" kaggle
 * Finds the text and label columns automatically; scam-like labels become 1, the rest 0.
 */
import fs from 'fs';
import path from 'path';

const [file, prefix = 'kaggle'] = process.argv.slice(2);
if (!file || !fs.existsSync(file)) {
  console.error('Usage: npm run import:csv -- "<path to .csv>" [kaggle|mendeley|...]');
  process.exit(1);
}

function parseCsv(src: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const rows = parseCsv(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const head = rows[0].map((h) => h.trim().toLowerCase());
const body = rows.slice(1);
const pick = (names: string[]) => head.findIndex((h) => names.some((n) => h === n || h.includes(n)));
let ti = pick(['dialogue', 'conversation', 'transcript', 'text', 'message', 'content', 'call']);
let li = pick(['label', 'class', 'category', 'type', 'is_scam', 'scam', 'target']);
if (ti < 0) { // fall back: the column with the longest text
  ti = head.map((_, i) => body.reduce((a, r) => a + (r[i]?.length || 0), 0)).reduce((b, v, i, a) => (v > a[b] ? i : b), 0);
}
if (li < 0) { console.error('No label column found. Columns:', head.join(', ')); process.exit(1); }
console.log(`text column: "${head[ti]}", label column: "${head[li]}", ${body.length} rows`);

const NEG = /^(0|false|no|normal|non[-_ ]?scam|legit\w*|ham|safe|benign|not[-_ ]?(scam|fraud|spam))$/i;
const name = path.basename(file).replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '-').toLowerCase();
const out = path.resolve(__dirname, `../datasets/${prefix}__${name}.jsonl`);
const seen = new Set<string>();
let s = 0, n = 0;
const lines: string[] = [];
for (const r of body) {
  const text = (r[ti] || '').replace(/[ \t]+/g, ' ').trim();
  if (text.length < 8 || seen.has(text)) continue;
  seen.add(text);
  const label = NEG.test((r[li] || '').trim()) ? 0 : 1;
  label ? s++ : n++;
  lines.push(JSON.stringify({ text, label }));
}
fs.writeFileSync(out, lines.join('\n') + '\n');
console.log(`wrote ${out}: ${s} scam, ${n} normal`);

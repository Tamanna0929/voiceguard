/**
 * Run VoiceGuard's on-device engine over many public datasets and print a results table.
 *   npm run eval:data                       (call datasets only, 300 rows each)
 *   npm run eval:data -- --all              (also the SMS / message datasets)
 *   npm run eval:data -- --n 600            (more rows per dataset)
 *   npm run eval:data -- org/name org/name2 (your own Hugging Face datasets)
 *
 * It streams a spread-out sample through the Hugging Face datasets-server, so nothing large is downloaded and
 * no Python or login is needed. Gated or private datasets are skipped with a note.
 * Messages (SMS) are scored with checkMessage; conversations are split into turns and fed to the RiskEngine,
 * and the highest risk reached counts. "Alert" means risk >= 70, "caution" means risk >= 35.
 * A report is also written to eval-report.md.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { RiskEngine, ALERT_THRESHOLD, CAUTION_THRESHOLD } from '../src/engine/engine';
import { checkMessage } from '../src/engine/messageCheck';
import { maskSensitive } from '../src/privacy/mask';
import { BUILTIN, LABEL_COLS, TEXT_COLS, fileNameOf, getJson, listSplits, rowsUrl, toLabel, type Spec } from './hf-common';

const argv = process.argv.slice(2);
const nIdx = argv.indexOf('--n');
const PER_DATASET = nIdx >= 0 ? Math.max(100, Number(argv[nIdx + 1]) || 300) : 300;
const custom = argv.filter((a, i) => !a.startsWith('--') && !(nIdx >= 0 && i === nIdx + 1));
const WITH_TEXT = argv.includes('--all');
const LOCAL = path.resolve(__dirname, '../datasets');
/** --local: every extra file in datasets/ (GitHub sets and the team-written call scripts), no network needed. */
const LOCAL_SPECS: Spec[] = fs.existsSync(LOCAL)
  ? fs.readdirSync(LOCAL).filter((f) => /^(gh__|kaggle__|mendeley__|voiceguard-).*\.jsonl$/.test(f)).map((f) => ({ id: f.replace(/\.jsonl$/, ''), note: 'local file' }))
  : [];
const SPECS: Spec[] = argv.includes('--local')
  ? LOCAL_SPECS
  : custom.length
    ? custom.map((id) => ({ id, note: 'custom' }))
    : BUILTIN.filter((s) => WITH_TEXT || s.kind === 'call');

interface Sample {
  text: string;
  label: 0 | 1;
}

/** Prefers the file saved by `npm run get:data`; otherwise samples the dataset over the network. */
async function sample(spec: Spec): Promise<{ samples: Sample[]; textCol: string; labelCol: string }> {
  const local = path.join(LOCAL, fileNameOf(spec.id));
  if (fs.existsSync(local)) {
    const all: Sample[] = fs.readFileSync(local, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    // keep a spread-out sample so a sorted file does not give only one class
    const step = Math.max(1, Math.floor(all.length / PER_DATASET));
    return { samples: all.filter((_, i) => i % step === 0).slice(0, PER_DATASET), textCol: 'local file', labelCol: 'label' };
  }
  const splits = await listSplits(spec.id);
  const pick = splits.find((s) => s.split === (spec.split || 'train')) || splits.find((s) => s.split === 'test') || splits[0];
  const first = await getJson(rowsUrl(spec.id, pick, 0, 100));
  const total: number = first.num_rows_total ?? first.rows?.length ?? 0;
  const feats: string[] = (first.features || []).map((f: any) => f.name);
  const textCol = TEXT_COLS.find((c) => feats.includes(c));
  const labelCol = LABEL_COLS.find((c) => feats.includes(c));
  if (!textCol || !labelCol) throw new Error(`could not find text/label columns in [${feats.join(', ')}]`);
  const pages = Math.max(1, Math.ceil(PER_DATASET / 100));
  const offsets = new Set<number>([0]);
  for (let i = 1; i < pages; i++) offsets.add(Math.max(0, Math.floor(((total - 100) * i) / pages)));
  const rows: any[] = [...(first.rows || [])];
  for (const off of [...offsets].filter((o) => o !== 0)) {
    try {
      rows.push(...((await getJson(rowsUrl(spec.id, pick, off, 100))).rows || []));
    } catch {
      /* a failed page just means a smaller sample */
    }
  }
  const out: Sample[] = [];
  for (const r of rows) {
    const t = r.row?.[textCol];
    const l = toLabel(r.row?.[labelCol]);
    if (typeof t === 'string' && t.trim() && l !== null) out.push({ text: t, label: l });
  }
  return { samples: out.slice(0, PER_DATASET), textCol, labelCol };
}

function turnsOf(text: string): string[] {
  return text
    .split(/\r?\n+|(?<=[.?!।])\s+(?=[A-Zऀ-ॿ਀-੿])/)
    .map((s) => s.replace(/^\s*[A-Za-z][A-Za-z ]{1,18}:\s*/, '').trim())
    .filter(Boolean);
}
function peakRisk(text: string): number {
  const long = text.length > 300 || /\n/.test(text);
  if (!long) return checkMessage(text).risk;
  const e = new RiskEngine();
  let peak = 0;
  for (const t of turnsOf(maskSensitive(text).text).slice(0, 80)) peak = Math.max(peak, e.push(t).peak);
  return peak;
}
function scriptOf(text: string): 'Hindi' | 'Punjabi' | 'Roman or English' {
  if (/[਀-੿]/.test(text)) return 'Punjabi';
  if (/[ऀ-ॿ]/.test(text)) return 'Hindi';
  return 'Roman or English';
}

interface Tally {
  scam: number;
  ham: number;
  scamAlert: number;
  scamCaution: number;
  hamAlert: number;
  hamCaution: number;
}
const zero = (): Tally => ({ scam: 0, ham: 0, scamAlert: 0, scamCaution: 0, hamAlert: 0, hamCaution: 0 });
function add(t: Tally, label: 0 | 1, risk: number) {
  if (label === 1) {
    t.scam++;
    if (risk >= ALERT_THRESHOLD) t.scamAlert++;
    if (risk >= CAUTION_THRESHOLD) t.scamCaution++;
  } else {
    t.ham++;
    if (risk >= ALERT_THRESHOLD) t.hamAlert++;
    if (risk >= CAUTION_THRESHOLD) t.hamCaution++;
  }
}
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) + '%' : 'n/a');

async function main() {
  console.log(`VoiceGuard dataset evaluation (${custom.length ? 'custom' : WITH_TEXT ? 'calls and messages' : 'calls only'}), up to ${PER_DATASET} rows per dataset (rules only, alert >= ${ALERT_THRESHOLD}, caution >= ${CAUTION_THRESHOLD})\n`);
  const lines: string[] = [];
  const bySc: Record<string, Tally> = {};
  const total = zero();
  const skipped: string[] = [];
  for (const spec of SPECS) {
    process.stdout.write(`- ${spec.id} ... `);
    try {
      const { samples, textCol, labelCol } = await sample(spec);
      if (!samples.length) throw new Error('no usable rows');
      const t = zero();
      for (const s of samples) {
        const risk = peakRisk(s.text);
        add(t, s.label, risk);
        add((bySc[scriptOf(s.text)] ||= zero()), s.label, risk);
        add(total, s.label, risk);
      }
      console.log(`${samples.length} rows (text=${textCol}, label=${labelCol})`);
      lines.push(`| ${spec.id} | ${spec.note} | ${t.scam} | ${t.ham} | ${pct(t.scamAlert, t.scam)} | ${pct(t.scamCaution, t.scam)} | ${pct(t.hamAlert, t.ham)} | ${pct(t.hamCaution, t.ham)} |`);
    } catch (e) {
      console.log('skipped: ' + (e as Error).message);
      skipped.push(`${spec.id}: ${(e as Error).message}`);
    }
  }
  const head = '| Dataset | What it is | Scam rows | Normal rows | Scams alerted | Scams alerted or cautioned | Normal falsely alerted | Normal falsely alerted or cautioned |\n|---|---|---|---|---|---|---|---|';
  const scHead = '| Script | Scam rows | Normal rows | Scams alerted | Scams alerted or cautioned | Normal falsely alerted |\n|---|---|---|---|---|---|';
  const scLines = Object.entries(bySc).map(([k, t]) => `| ${k} | ${t.scam} | ${t.ham} | ${pct(t.scamAlert, t.scam)} | ${pct(t.scamCaution, t.scam)} | ${pct(t.hamAlert, t.ham)} |`);
  const report = [
    '# VoiceGuard rule engine on public datasets',
    '',
    `Sample: up to ${PER_DATASET} rows per dataset, spread across the split. Alert = risk >= ${ALERT_THRESHOLD}; caution = risk >= ${CAUTION_THRESHOLD}. No model training: this is the on-device rule engine as shipped.`,
    '',
    head,
    ...lines,
    `| **All datasets** | | ${total.scam} | ${total.ham} | ${pct(total.scamAlert, total.scam)} | ${pct(total.scamCaution, total.scam)} | ${pct(total.hamAlert, total.ham)} | ${pct(total.hamCaution, total.ham)} |`,
    '',
    '## By script of the text',
    '',
    scHead,
    ...scLines,
    '',
    skipped.length ? '## Skipped\n\n' + skipped.map((s) => '- ' + s).join('\n') : '',
    '',
    'Notes: many "spam" rows in SMS sets are promotions, not scams, so recall there understates scam detection and caution flags on them are not all false alarms. Several sets are synthetic or machine-translated.',
  ].join('\n');
  fs.writeFileSync('eval-report.md', report);
  console.log('\n' + report + '\n\nSaved to eval-report.md');
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

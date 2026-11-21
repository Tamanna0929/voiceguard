/**
 * Regression + dataset evaluation for the on-device VoiceGuard engine.
 *   npx tsx scripts/evaluate.ts [icfdExamplesDir] [sms.tsv]
 * Data is NOT bundled in this repo, see DATASETS.md and scripts/fetch-datasets.sh.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { RiskEngine, ALERT_THRESHOLD, CAUTION_THRESHOLD } from '../src/engine/engine';
import { SCRIPTS } from '../src/data/scripts';
import { scamModel } from '../src/model';

const verbose = process.argv.includes('--verbose');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const icfdDir = args[0] ?? path.resolve(__dirname, '../datasets/icfd/examples/source_conversations');
const smsFile = args[1] ?? path.resolve(__dirname, '../datasets/sms/sms.tsv');

function row(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(34)} ${detail}`);
}

// ---------- 1. built-in scripts ----------
console.log(`\nTrained model: ${scamModel.enabled ? 'ON (pivot ' + scamModel.pivot + ')' : 'OFF (stub, rules only): run python training/train.py'}`);
console.log('\n== Built-in scripts (every utterance, both voices) ==');
let scriptFails = 0;
for (const s of SCRIPTS) {
  const e = new RiskEngine({ model: scamModel });
  let alertAt = -1;
  let last = e.snapshot();
  s.turns.forEach((t, i) => {
    last = e.push(t.text);
    if (alertAt < 0 && last.alert) alertAt = i + 1;
    if (verbose) console.log(`   [${last.risk}] ${t.text.slice(0, 70)} -> ${last.utterance?.hits.map((h) => h.tactic).join(',')}`);
  });
  const ok = s.scam ? last.peak >= ALERT_THRESHOLD : last.peak < CAUTION_THRESHOLD;
  if (!ok) scriptFails++;
  row(s.id, ok, `peak=${last.peak} final=${last.risk} alertAtTurn=${alertAt}/${s.turns.length}`);
}

// ---------- 2. ICFD-31k sample conversations ----------
console.log('\n== ICFD-31k sample conversations ==');
let icfdStats: any = null;
if (fs.existsSync(icfdDir)) {
  const files: string[] = [];
  const walk = (d: string) => fs.readdirSync(d, { withFileTypes: true }).forEach((f) => (f.isDirectory() ? walk(path.join(d, f.name)) : f.name.endsWith('.json') && files.push(path.join(d, f.name))));
  walk(icfdDir);
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const times: number[] = [];
  const missed: string[] = [];
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!d.transcript || !d.final_verdict) continue;
    const fraud = String(d.final_verdict).toUpperCase().startsWith('Y');
    const e = new RiskEngine({ model: scamModel });
    let alertTime = -1;
    for (const turn of d.transcript) {
      const s = e.push(turn.text);
      if (alertTime < 0 && s.alert) alertTime = turn.timestamp_end ?? -1;
    }
    const flagged = alertTime >= 0;
    if (fraud && flagged) { tp++; times.push(alertTime); }
    else if (fraud) { fn++; missed.push(path.basename(f)); }
    else if (flagged) { fp++; missed.push('FP ' + path.basename(f)); }
    else tn++;
  }
  times.sort((a, b) => a - b);
  const med = times.length ? times[Math.floor(times.length / 2)] : NaN;
  const n = tp + fp + tn + fn;
  icfdStats = { n, tp, fp, tn, fn, med };
  console.log(`n=${n}  fraud caught=${tp}/${tp + fn}  false alarms=${fp}/${fp + tn}  median seconds to alert=${med}`);
  if (missed.length) console.log('   misses:', missed.join(', '));
} else console.log(`(skipped: ${icfdDir} not found, run scripts/fetch-datasets.sh)`);

// ---------- 3. SMS Spam Collection (UCI) as a false-alarm stress test ----------
console.log('\n== SMS Spam Collection (UCI, English) ==');
if (fs.existsSync(smsFile)) {
  const lines = fs.readFileSync(smsFile, 'utf8').split('\n').filter(Boolean);
  let hamN = 0, hamFlag = 0, hamCaution = 0, spamN = 0, spamFlag = 0, spamCaution = 0;
  for (const ln of lines) {
    const tab = ln.indexOf('\t');
    const [a, b] = [ln.slice(0, tab), ln.slice(tab + 1)];
    const [label, text] = a === 'ham' || a === 'spam' ? [a, b] : [b, a];
    const e = new RiskEngine({ model: scamModel });
    const s = e.push(text);
    if (label === 'ham') { hamN++; if (s.risk >= ALERT_THRESHOLD) hamFlag++; if (s.risk >= CAUTION_THRESHOLD) hamCaution++; }
    else { spamN++; if (s.risk >= ALERT_THRESHOLD) spamFlag++; if (s.risk >= CAUTION_THRESHOLD) spamCaution++; }
  }
  const pct = (a: number, b: number) => ((100 * a) / b).toFixed(1) + '%';
  console.log(`ham  n=${hamN}: red alert ${pct(hamFlag, hamN)}, amber-or-above ${pct(hamCaution, hamN)}`);
  console.log(`spam n=${spamN}: red alert ${pct(spamFlag, spamN)}, amber-or-above ${pct(spamCaution, spamN)}  (promo spam is mostly out of scope: this is a call-scam detector)`);
} else console.log(`(skipped: ${smsFile} not found)`);

if (scriptFails) process.exitCode = 1;

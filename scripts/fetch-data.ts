/**
 * Download public scam-call and scam-message datasets into ./datasets as JSON Lines ({"text","label"} per line,
 * label 1 = scam, 0 = normal). Works without Python or a login. Resumable: files that already exist are skipped.
 *   npm run get:data                  (up to 5000 rows per dataset)
 *   npm run get:data -- --max 20000   (more rows)
 *   npm run get:data -- org/name      (one dataset of your own choice)
 * Gated datasets (for example SpamShield) need you to accept their terms on huggingface.co first, so they are skipped.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BUILTIN, LABEL_COLS, TEXT_COLS, fileNameOf, getJson, listSplits, rowsUrl, toLabel, type Spec } from './hf-common';

const argv = process.argv.slice(2);
const mIdx = argv.indexOf('--max');
const MAX = mIdx >= 0 ? Math.max(100, Number(argv[mIdx + 1]) || 5000) : 5000;
const custom = argv.filter((a, i) => !a.startsWith('--') && !(mIdx >= 0 && i === mIdx + 1));
const SPECS: Spec[] = custom.length ? custom.map((id) => ({ id, note: 'custom' })) : BUILTIN;
const OUT = path.resolve(__dirname, '../datasets');

async function fetchOne(spec: Spec): Promise<number> {
  const splits = await listSplits(spec.id);
  const per = Math.ceil(MAX / splits.length);
  const seen = new Set<string>();
  const lines: string[] = [];
  let textCol = '';
  let labelCol = '';
  for (const sp of splits) {
    let offset = 0;
    let got = 0;
    for (;;) {
      const page = await getJson(rowsUrl(spec.id, sp, offset, 100));
      const feats: string[] = (page.features || []).map((f: any) => f.name);
      textCol ||= TEXT_COLS.find((c) => feats.includes(c)) || '';
      labelCol ||= LABEL_COLS.find((c) => feats.includes(c)) || '';
      if (!textCol || !labelCol) throw new Error(`could not find text/label columns in [${feats.join(', ')}]`);
      const rows: any[] = page.rows || [];
      for (const r of rows) {
        const t = r.row?.[textCol];
        const l = toLabel(r.row?.[labelCol]);
        if (typeof t !== 'string' || !t.trim() || l === null || seen.has(t)) continue;
        seen.add(t);
        lines.push(JSON.stringify({ text: t, label: l }));
        got++;
      }
      offset += rows.length;
      process.stdout.write(`\r- ${spec.id} [${sp.split}] ${lines.length} rows   `);
      if (!rows.length || got >= per || offset >= (page.num_rows_total ?? offset)) break;
    }
  }
  if (!lines.length) throw new Error('no usable rows');
  fs.writeFileSync(path.join(OUT, fileNameOf(spec.id)), lines.join('\n') + '\n');
  return lines.length;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log(`Saving to ${OUT} (up to ${MAX} rows per dataset)\n`);
  const done: string[] = [];
  const failed: string[] = [];
  for (const spec of SPECS) {
    const file = path.join(OUT, fileNameOf(spec.id));
    if (fs.existsSync(file)) {
      console.log(`- ${spec.id}: already downloaded, skipping`);
      done.push(spec.id);
      continue;
    }
    try {
      const n = await fetchOne(spec);
      console.log(`\r- ${spec.id}: saved ${n} rows                         `);
      done.push(spec.id);
    } catch (e) {
      console.log(`\r- ${spec.id}: skipped (${(e as Error).message})                         `);
      failed.push(spec.id);
    }
  }
  console.log(`\nDone. ${done.length} dataset files in ${OUT}` + (failed.length ? `; ${failed.length} skipped: ${failed.join(', ')}` : ''));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

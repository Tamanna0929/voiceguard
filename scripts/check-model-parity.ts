/** Proves the TypeScript inference equals scikit-learn on the same texts.  npx tsx scripts/check-model-parity.ts */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ScamModel, type ModelFile } from '../src/engine/model';

const file = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/model/model.json'), 'utf8')) as ModelFile;
if (file.meta.stub) {
  console.log('model.json is the disabled stub: run python training/train.py first. SKIP');
  process.exit(0);
}
const model = new ScamModel(file);
const fixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../training/parity.json'), 'utf8')) as Array<{ text: string; p: number }>;
let worst = 0;
for (const { text, p } of fixture) worst = Math.max(worst, Math.abs(model.predict(text) - p));
console.log(`${fixture.length} texts, max |TS - sklearn| = ${worst.toExponential(2)}  ->  ${worst < 2e-3 ? 'PASS' : 'FAIL'}`);
if (worst >= 2e-3) process.exitCode = 1;

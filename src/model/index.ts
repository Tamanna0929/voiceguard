import { ScamModel, type ModelFile } from '../engine/model';
// Replaced by `python training/train.py`. The committed stub is disabled so the app runs on rules alone.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const file = require('./model.json') as ModelFile;
export const scamModel = new ScamModel(file);

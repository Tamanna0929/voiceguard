/**
 * On-device inference for the model trained by training/train.py
 * (TF-IDF over word-bounded character n-grams + logistic regression).
 * The feature extraction here MUST match scikit-learn exactly: see scripts/check-model-parity.ts.
 */
export interface ModelFile {
  meta: { stub?: boolean; reliable?: boolean; pivot?: number; window_turns?: number; trained_on?: Record<string, number> };
  ngram: [number, number];
  bias: number;
  features: Record<string, [number, number]>; // n-gram -> [idf, coef]
}

const STRIP = /[0-9!-/:-@[-`{-~।॥“”‘’…₹–—]+/g;

/** Same as clean() in training/data.py. */
export function cleanText(t: string): string {
  return t.toLowerCase().replace(STRIP, ' ').replace(/\s+/g, ' ').trim();
}

/** sklearn analyzer='char_wb': pad each whitespace-separated word with spaces, take n-grams of every size. */
function charWb(text: string, lo: number, hi: number): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\s+/)) {
    if (!raw) continue;
    const w = ` ${raw} `;
    const len = w.length;
    for (let n = lo; n <= hi; n++) {
      let off = 0;
      out.push(w.slice(off, off + n));
      while (off + n < len) {
        off += 1;
        out.push(w.slice(off, off + n));
      }
      if (off === 0) break; // sklearn counts a word shorter than n only once
    }
  }
  return out;
}

export class ScamModel {
  readonly pivot: number;
  readonly enabled: boolean;
  readonly windowTurns: number;
  constructor(private f: ModelFile) {
    this.enabled = !f.meta.stub && Object.keys(f.features).length > 0;
    this.pivot = f.meta.pivot ?? 0.8;
    this.windowTurns = f.meta.window_turns ?? 4;
  }

  /** Probability (0..1) that this window of speech is part of a scam call. */
  predict(text: string): number {
    if (!this.enabled) return 0;
    const counts = new Map<string, number>();
    for (const g of charWb(cleanText(text), this.f.ngram[0], this.f.ngram[1])) {
      if (this.f.features[g]) counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    if (counts.size === 0) return 0;
    let norm = 0;
    let z = this.f.bias;
    const tf: Array<[string, number]> = [];
    for (const [g, c] of counts) {
      const v = (1 + Math.log(c)) * this.f.features[g][0]; // sublinear tf * idf
      tf.push([g, v]);
      norm += v * v;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [g, v] of tf) z += (v / norm) * this.f.features[g][1];
    return 1 / (1 + Math.exp(-z));
  }

  /** Evidence above the calibrated pivot, rescaled to 0..1 (the pivot is the unseen-benign 98th percentile). */
  evidence(p: number): number {
    return Math.max(0, (p - this.pivot) / (1 - this.pivot));
  }
}

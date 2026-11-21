import { ADVICE_RE, PAIR_COMBOS, TACTICS, TACTIC_BASE } from './lexicon';
import type { ScamModel } from './model';
import type { EngineOptions, Hit, RiskLevel, Snapshot, TacticId, Utterance } from './types';

interface Compiled {
  id: TacticId;
  adviceGuard: boolean;
  re: RegExp;
  w: number;
  requires?: RegExp;
}

/** Compile defensively: if a JS engine lacks lookbehind, drop the left word-boundary rather than crash. */
function safeRegExp(src: string): RegExp | null {
  try {
    return new RegExp(src, 'giu');
  } catch {
    try {
      return new RegExp(src.split('(?<![a-z0-9_])').join(''), 'giu');
    } catch {
      return null;
    }
  }
}

const COMPILED: Compiled[] = TACTICS.flatMap((t) =>
  t.patterns.flatMap((pt) => {
    const re = safeRegExp(pt.re);
    if (!re) return [];
    return [{ id: t.id, adviceGuard: !!t.adviceGuard, re, w: pt.w ?? 1, requires: pt.requires ? new RegExp(pt.requires, 'iu') : undefined }];
  }),
);

export const ALERT_THRESHOLD = 70;
export const CAUTION_THRESHOLD = 35;
/** Strength of a tactic multiplies by this on every quiet utterance. */
const DECAY = 0.9;
const MAX_STRENGTH = 3;
const MAX_P = 0.92;

/** Pure function: find tactic hits in one piece of text (also used for live interim preview). */
export function analyze(text: string): Hit[] {
  const lower = text.toLowerCase();
  const hits: Hit[] = [];
  for (const c of COMPILED) {
    if (c.requires && !c.requires.test(lower)) continue;
    c.re.lastIndex = 0;
    for (const m of lower.matchAll(c.re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (end === start) continue;
      if (c.adviceGuard) {
        const win = lower.slice(Math.max(0, start - 70), Math.min(lower.length, end + 45));
        if (ADVICE_RE.test(win)) continue;
      }
      hits.push({ tactic: c.id, start, end, text: text.slice(start, end), source: 'rules', w: c.w });
    }
  }
  return dedupe(hits);
}

function dedupe(hits: Hit[]): Hit[] {
  // Keep the longest hit per overlapping span of the same tactic.
  const sorted = [...hits].sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const out: Hit[] = [];
  for (const h of sorted) {
    const clash = out.find((o) => o.tactic === h.tactic && h.start < o.end && h.end > o.start);
    if (!clash) out.push(h);
    else if (h.end - h.start > clash.end - clash.start) out[out.indexOf(clash)] = h;
  }
  return out;
}

export class RiskEngine {
  private strength = new Map<TacticId, number>();
  private shown = 0;
  private peak = 0;
  private nextId = 1;
  private latched = false;
  /** One-sentence jump: a direct demand for an OTP, password or remote access is dangerous even on its own. */
  private floorNow = 0;
  private dismissed = false;
  private utterances: Utterance[] = [];
  private alertAt: number;
  private cautionAt: number;
  private model?: ScamModel;
  private modelEvidence = 0;
  /** Last probability from the trained model (0..1), for display and debugging. */
  modelP = 0;

  constructor(opts: EngineOptions = {}) {
    this.alertAt = opts.alertThreshold ?? ALERT_THRESHOLD;
    this.cautionAt = opts.cautionThreshold ?? CAUTION_THRESHOLD;
    this.model = opts.model && opts.model.enabled ? opts.model : undefined;
  }

  reset() {
    this.strength.clear();
    this.shown = 0;
    this.peak = 0;
    this.nextId = 1;
    this.latched = false;
    this.dismissed = false;
    this.utterances = [];
    this.modelEvidence = 0;
    this.modelP = 0;
  }

  getUtterances() {
    return this.utterances;
  }

  /** Feed one finished sentence/utterance. Optional AI tags are merged in immediately. */
  push(text: string, t = Date.now(), aiTags: TacticId[] = []): Snapshot {
    const hits = analyze(text);
    const utt: Utterance = { id: this.nextId++, text, t, hits };
    this.utterances.push(utt);
    this.absorbAI(utt, aiTags);

    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const gain = new Map<TacticId, number>();
    for (const h of utt.hits) {
      const prev = gain.get(h.tactic) ?? 0;
      // first hit of a tactic in a sentence counts fully, extra distinct hits add a little
      gain.set(h.tactic, Math.min(1.5, prev + (prev === 0 ? h.w ?? 1 : 0.25)));
    }
    if (this.model) {
      const win = this.utterances.slice(-this.model.windowTurns).map((u) => u.text).join(' ');
      this.modelP = this.model.predict(win);
      this.modelEvidence = this.model.evidence(this.modelP);
    }
    this.floorNow = this.demandFloor(utt);
    this.advance(gain, words >= 3 || gain.size > 0);
    return this.snapshot(utt);
  }

  /**
   * A single sentence that demands an OTP, password/PIN or remote-access app is a strong warning by itself.
   * Safety advice ("never share your OTP") never produces these hits, so bank warnings do not trigger it.
   * With another scam tactic in the same sentence, or the trained model agreeing, it goes straight to red (75).
   * On its own it only reaches a high caution (58), because honest delivery apps also ask for an OTP.
   */
  private demandFloor(utt: Utterance): number {
    const tactics = new Set(utt.hits.map((h) => h.tactic));
    const demand = tactics.has('OTP') || tactics.has('CREDENTIALS') || tactics.has('REMOTE_ACCESS');
    const isolation = tactics.has('ISOLATION');
    if (!demand && !isolation) return 0;
    const core = new Set<TacticId>(['OTP', 'CREDENTIALS', 'REMOTE_ACCESS', 'ISOLATION', 'PERSONAL_ID']);
    const others = [...tactics].filter((x) => !core.has(x)).length;
    const kinds = [...tactics].filter((x) => core.has(x) && x !== 'PERSONAL_ID').length;
    const agrees = this.modelP >= 0.6;
    if (kinds >= 2 || others >= 2 || (agrees && others >= 1)) return 75;
    return demand ? 72 : 0;
  }

  /** Late-arriving AI tags for an utterance that was already pushed. */
  applyAI(utteranceId: number, aiTags: TacticId[]): Snapshot {
    const utt = this.utterances.find((u) => u.id === utteranceId);
    if (!utt) return this.snapshot();
    const fresh = this.absorbAI(utt, aiTags);
    if (fresh.length) {
      const gain = new Map<TacticId, number>(fresh.map((id) => [id, 0.8]));
      this.advance(gain, false);
    }
    return this.snapshot(utt);
  }

  /** User dismissed the alert: only escalate again if risk climbs even higher. */
  dismissAlert() {
    this.dismissed = true;
    this.latched = false;
  }

  snapshot(utterance?: Utterance, newAlert = this.pendingNewAlert): Snapshot {
    this.pendingNewAlert = false;
    const { target, active } = this.evidence();
    return {
      risk: Math.round(this.shown),
      target: Math.round(target),
      level: this.levelOf(this.shown),
      alert: this.latched,
      newAlert,
      active,
      peak: Math.round(this.peak),
      utterance,
    };
  }

  private pendingNewAlert = false;

  private absorbAI(utt: Utterance, tags: TacticId[]): TacticId[] {
    const fresh: TacticId[] = [];
    for (const tag of tags) {
      if (!TACTIC_BASE[tag]) continue;
      if (utt.hits.some((h) => h.tactic === tag)) continue;
      utt.hits.push({ tactic: tag, start: -1, end: -1, text: '', source: 'ai' });
      fresh.push(tag);
    }
    return fresh;
  }

  private advance(gain: Map<TacticId, number>, quietCounts: boolean) {
    for (const id of Object.keys(TACTIC_BASE) as TacticId[]) {
      const cur = this.strength.get(id) ?? 0;
      const g = gain.get(id);
      if (g) this.strength.set(id, Math.min(MAX_STRENGTH, cur + g));
      else if (quietCounts && cur > 0) {
        const next = cur * DECAY;
        if (next < 0.05) this.strength.delete(id);
        else this.strength.set(id, next);
      }
    }
    const { target } = this.evidence();
    // rise fast, fall slowly
    if (target > this.shown) this.shown += (target - this.shown) * 0.85;
    else this.shown = Math.max(target, this.shown - 5);
    if (this.floorNow > this.shown) this.shown = this.floorNow;
    this.floorNow = 0;
    this.peak = Math.max(this.peak, this.shown);

    const threshold = this.dismissed ? Math.max(this.alertAt, 90) : this.alertAt;
    if (!this.latched && this.shown >= threshold) {
      this.latched = true;
      this.pendingNewAlert = true;
    }
    if (this.shown < this.cautionAt && this.latched) this.latched = false;
    if (this.shown < this.cautionAt) this.dismissed = false;
  }

  private evidence(): { target: number; active: TacticId[] } {
    let safe = 1;
    const contrib: Array<[TacticId, number]> = [];
    const present = new Set<TacticId>();
    for (const [id, s] of this.strength) {
      const p = Math.min(MAX_P, TACTIC_BASE[id] * (0.6 + 0.4 * s));
      safe *= 1 - p;
      contrib.push([id, p]);
      if (s >= 0.5) present.add(id);
    }
    for (const c of PAIR_COMBOS) {
      if (c.a.some((x) => present.has(x)) && c.b.some((x) => present.has(x))) safe *= 1 - c.p;
    }
    // trained model: probability above its calibrated pivot counts as one more independent source of evidence
    if (this.modelEvidence > 0) safe *= 1 - Math.min(MAX_P, 0.95 * this.modelEvidence);
    contrib.sort((x, y) => y[1] - x[1]);
    return { target: 100 * (1 - safe), active: contrib.map(([id]) => id) };
  }

  private levelOf(v: number): RiskLevel {
    return v >= this.alertAt ? 'danger' : v >= this.cautionAt ? 'caution' : 'safe';
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MASK_KINDS, type MaskKind } from '../privacy/mask';

/** Counters only. They never contain the masked values themselves. */
export interface PrivacyStats {
  since: number;
  sessions: number;
  masked: Record<MaskKind, number>;
  /** Sentences (already masked, text only) sent to the user's own AI proxy. */
  proxySentences: number;
}

const K = 'vg.privacy.v1';
const KEYS = ['vg.settings.v1', 'vg.history.v1', 'vg.incidents.v1', K];

const empty = (): PrivacyStats => ({
  since: Date.now(),
  sessions: 0,
  masked: Object.fromEntries(MASK_KINDS.map((k) => [k, 0])) as Record<MaskKind, number>,
  proxySentences: 0,
});

export async function loadPrivacyStats(): Promise<PrivacyStats> {
  try {
    const raw = await AsyncStorage.getItem(K);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<PrivacyStats>;
    const e = empty();
    return { ...e, ...p, masked: { ...e.masked, ...(p.masked ?? {}) } };
  } catch {
    return empty();
  }
}

export async function addPrivacyStats(d: { masked?: Partial<Record<MaskKind, number>>; proxySentences?: number; sessions?: number }): Promise<void> {
  try {
    const s = await loadPrivacyStats();
    for (const k of MASK_KINDS) s.masked[k] += d.masked?.[k] ?? 0;
    s.proxySentences += d.proxySentences ?? 0;
    s.sessions += d.sessions ?? 0;
    await AsyncStorage.setItem(K, JSON.stringify(s));
  } catch {
    /* non-fatal */
  }
}

export const totalMasked = (s: PrivacyStats) => MASK_KINDS.reduce((n, k) => n + s.masked[k], 0);

/** Everything VoiceGuard keeps, as one JSON string the user can export. */
export async function exportAllData(): Promise<string> {
  const out: Record<string, unknown> = {};
  for (const k of KEYS) {
    try {
      const raw = await AsyncStorage.getItem(k);
      if (raw) out[k] = JSON.parse(raw);
    } catch {
      /* skip */
    }
  }
  return JSON.stringify(out, null, 2);
}

export async function wipeAllData(): Promise<void> {
  try {
    for (const k of KEYS) await AsyncStorage.removeItem(k);
  } catch {
    /* non-fatal */
  }
}

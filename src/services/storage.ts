import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TacticId } from '../engine/types';

export type Lang = 'en' | 'hi' | 'pa';

export interface Settings {
  lang: Lang;
  /** Send each finished sentence (text only, never audio) to your own AI proxy for a second opinion. */
  cloudAI: boolean;
  aiEndpoint: string;
  familyName: string;
  familyNumber: string;
  /** Prefer on-device speech recognition where the phone supports it. */
  /** Master switch: nothing leaves the phone. Forces on-device speech and turns the cloud AI off. */
  strictOffline: boolean;
  onDevice: boolean;
  /** Only used when on-device recognition is unavailable: allow the phone's cloud speech service (less private). */
  allowCloudSpeech: boolean;
  saveHistory: boolean;
  /** Hide OTPs, PINs, card/Aadhaar/phone/account numbers before they are shown, stored or sent anywhere. */
  maskSensitive: boolean;
  /** Session summaries older than this many days are deleted automatically (0 = keep until deleted by hand). */
  historyDays: number;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'en',
  cloudAI: false,
  aiEndpoint: '',
  familyName: '',
  familyNumber: '',
  strictOffline: true,
  onDevice: true,
  allowCloudSpeech: false,
  saveHistory: true,
  maskSensitive: true,
  historyDays: 30,
};

export interface SessionRecord {
  id: string;
  startedAt: number;
  durationSec: number;
  peak: number;
  tactics: TacticId[];
  demo: boolean;
}

const K_SETTINGS = 'vg.settings.v1';
const K_HISTORY = 'vg.history.v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(K_SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(K_SETTINGS, JSON.stringify(s));
  } catch {
    /* non-fatal */
  }
}

/** Only a summary is stored (no transcript, no audio). */
export async function loadHistory(keepDays = 0): Promise<SessionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(K_HISTORY);
    const all = raw ? (JSON.parse(raw) as SessionRecord[]) : [];
    if (keepDays > 0) {
      const cutoff = Date.now() - keepDays * 86_400_000;
      const kept = all.filter((r) => r.startedAt >= cutoff);
      if (kept.length !== all.length) await AsyncStorage.setItem(K_HISTORY, JSON.stringify(kept));
      return kept;
    }
    return all;
  } catch {
    return [];
  }
}

export async function addHistory(r: SessionRecord): Promise<void> {
  try {
    const all = await loadHistory();
    await AsyncStorage.setItem(K_HISTORY, JSON.stringify([r, ...all].slice(0, 50)));
  } catch {
    /* non-fatal */
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(K_HISTORY);
  } catch {
    /* non-fatal */
  }
}

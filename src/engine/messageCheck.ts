import { RiskEngine, ALERT_THRESHOLD, CAUTION_THRESHOLD } from './engine';
import { scamModel } from '../model';
import type { RiskLevel, TacticId } from './types';
import { maskSensitive, type MaskKind } from '../privacy/mask';

export interface LinkFinding {
  url: string;
  reasons: Array<'shortener' | 'apk' | 'tld' | 'ip' | 'punycode'>;
}
export interface MessageCheck {
  /** The text with sensitive numbers hidden. This is the only version that is ever displayed or kept. */
  masked: string;
  maskedKinds: MaskKind[];
  risk: number;
  level: RiskLevel;
  tactics: TacticId[];
  links: LinkFinding[];
}

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"')]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:xyz|top|click|link|info|online|site|live|shop|vip|icu|cfd|apk|buzz|rest)\b[^\s<>"')]*|\b(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|rb\.gy|cutt\.ly|is\.gd|shorturl\.at|tiny\.cc)\/[^\s<>"')]*/gi;
const SHORTENERS = /(?:^|\/\/|\.)(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|rb\.gy|cutt\.ly|is\.gd|shorturl\.at|tiny\.cc)(?:\/|$)/i;
const RISKY_TLD = /\.(?:xyz|top|click|link|info|online|site|live|shop|vip|icu|cfd|buzz|rest)(?:[/:?#]|$)/i;
const IP_HOST = /^(?:https?:\/\/)?\d{1,3}(?:\.\d{1,3}){3}(?:[/:?#]|$)/i;

export function findLinks(text: string): LinkFinding[] {
  const out: LinkFinding[] = [];
  for (const m of text.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:!?]+$/, '');
    const reasons: LinkFinding['reasons'] = [];
    if (SHORTENERS.test(url)) reasons.push('shortener');
    if (/\.apk(?:[?#]|$)/i.test(url)) reasons.push('apk');
    if (RISKY_TLD.test(url)) reasons.push('tld');
    if (IP_HOST.test(url)) reasons.push('ip');
    if (/xn--/i.test(url)) reasons.push('punycode');
    out.push({ url, reasons });
  }
  return out;
}

/** Scores a pasted SMS / WhatsApp message with the same on-device engine used for calls. Nothing leaves the phone. */
export function checkMessage(raw: string): MessageCheck {
  const m = maskSensitive(raw);
  const links = findLinks(m.text);
  const e = new RiskEngine({ model: scamModel });
  const snap = e.push(m.text);
  let risk = snap.risk;
  const flagged = links.filter((l) => l.reasons.length > 0);
  if (flagged.length && snap.active.length) risk += 10;
  if (flagged.some((l) => l.reasons.includes('apk'))) risk += 30;
  if (flagged.some((l) => l.reasons.includes('shortener') || l.reasons.includes('ip')) && snap.active.length === 0) risk = Math.max(risk, CAUTION_THRESHOLD);
  risk = Math.min(99, Math.round(risk));
  return {
    masked: m.text,
    maskedKinds: m.found,
    risk,
    level: risk >= ALERT_THRESHOLD ? 'danger' : risk >= CAUTION_THRESHOLD ? 'caution' : 'safe',
    tactics: snap.active,
    links,
  };
}

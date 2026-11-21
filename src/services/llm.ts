import type { TacticId } from '../engine/types';

/**
 * Optional second opinion from a language model, called through YOUR OWN proxy
 * (see /server/proxy.js) so no API key ever ships inside the app.
 * Only text of the last few sentences is sent, never audio. If the proxy is slow
 * or down the app keeps working on the on-device rules alone.
 */
export interface AIResult {
  tactics: TacticId[];
  reason?: string;
}

const TIMEOUT_MS = 2500;
let failures = 0;
let pausedUntil = 0;

export async function classifyWithAI(endpoint: string, sentence: string, context: string[], lang: string): Promise<AIResult | null> {
  if (!endpoint || Date.now() < pausedUntil) return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(endpoint.replace(/\/$/, '') + '/classify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sentence, context: context.slice(-6), lang }),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = (await res.json()) as AIResult;
    failures = 0;
    return { tactics: Array.isArray(data.tactics) ? data.tactics : [], reason: data.reason };
  } catch {
    failures += 1;
    if (failures >= 3) {
      pausedUntil = Date.now() + 60_000; // back off for a minute, rules keep protecting meanwhile
      failures = 0;
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Shared helpers for reading public Hugging Face datasets through the datasets-server (no login, no Python). */
export const BASE = process.env.HF_API_BASE || 'https://datasets-server.huggingface.co';

export interface Spec {
  id: string;
  note: string;
  split?: string;
  /** 'call' = spoken conversations or call lines; 'text' = SMS / chat messages. */
  kind?: 'call' | 'text';
}

export const BUILTIN: Spec[] = [
  { kind: 'call', id: 'ysangam/Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset', note: 'Indian scam / normal call lines, Hinglish' },
  { kind: 'call', id: 'rishia2220/icfd-31k', note: 'ICFD-31k Indian conversational fraud calls (IJCAI 2026)', split: 'test' },
  { kind: 'call', id: 'BothBosu/scam-dialogue', note: 'English scam call dialogues' },
  { kind: 'call', id: 'BothBosu/single-agent-scam-conversations', note: 'English scam call dialogues' },
  { kind: 'call', id: 'BothBosu/multi-agent-scam-conversation', note: 'English scam call dialogues' },
  { kind: 'call', id: 'BothBosu/youtube-scam-conversations', note: 'Transcripts of real scam calls from YouTube (English)' },
  { kind: 'call', id: '436-4/youtube-scam-conversations', note: 'Scam call transcripts from YouTube (English)' },
  { kind: 'text', id: 'CloveAI/india-spam-sms', note: 'Indian SMS, English' },
  { kind: 'text', id: 'bolewara/hinglish-scam-text-dataset', note: 'Hinglish and English scam text' },
  { kind: 'text', id: 'ashu0311/SMS_Spam_Multilingual_Collection_Dataset', note: 'SMS spam, machine-translated into Hindi, Punjabi and more' },
  { kind: 'text', id: 'Atlas-AI-Labs/GCT-100K', note: 'Mixed scam calls, SMS and chats' },
];

export const TEXT_COLS = ['text', 'Text', 'message', 'Message', 'sms', 'SMS', 'dialogue', 'cumulative_text', 'conversation', 'transcript', 'text_transcript', 'content', 'body', 'sentence'];
export const LABEL_COLS = ['label', 'labels', 'Label', 'LABEL', 'class', 'Class', 'is_scam', 'scam', 'spam', 'is_spam', 'final_verdict', 'verdict', 'category', 'Category', 'type'];
const POS = /^(y|yes|true|1|fraud|scam|fraudulent|malicious|spam|smish|smishing|phish|phishing)/;
const NEG = /^(n|no|false|0|safe|legit|legitimate|genuine|benign|normal|ham|not|non|none)/;

export function toLabel(v: unknown): 0 | 1 | null {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number') return v === 1 ? 1 : v === 0 ? 0 : null;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  if (NEG.test(s)) return 0; // "not scam" / "non-spam" must be checked before "scam" / "spam"
  if (POS.test(s)) return 1;
  return null;
}

export async function getJson(url: string): Promise<any> {
  let err: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (res.status === 401 || res.status === 403) throw new Error('gated or private (HTTP ' + res.status + ')');
      if (res.status === 404) throw new Error('not found (HTTP 404)');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      err = e;
      if (/^(gated|not found)/.test(String((e as Error).message))) break;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw err;
}

export interface SplitRef {
  config: string;
  split: string;
}
export async function listSplits(id: string): Promise<SplitRef[]> {
  const s = await getJson(`${BASE}/splits?dataset=${encodeURIComponent(id)}`);
  const list: SplitRef[] = s.splits || [];
  if (!list.length) throw new Error('no splits found');
  return list;
}
export const rowsUrl = (id: string, s: SplitRef, offset: number, length: number) =>
  `${BASE}/rows?dataset=${encodeURIComponent(id)}&config=${encodeURIComponent(s.config)}&split=${encodeURIComponent(s.split)}&offset=${offset}&length=${length}`;

export const fileNameOf = (id: string) => id.replace(/[\\/]/g, '__') + '.jsonl';

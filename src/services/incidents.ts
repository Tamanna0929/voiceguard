import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from './storage';
import type { SituationId, When } from '../recovery/guide';

export type SuspectKind = 'phone' | 'upi' | 'account' | 'link' | 'app' | 'other';

export interface Txn {
  id: string;
  amount: string;
  at: string;
  ref: string; // UTR / transaction ID
  receiver: string; // receiver UPI ID, phone or account
}
export interface Suspect {
  id: string;
  kind: SuspectKind;
  value: string;
}
export interface LogEntry {
  at: number;
  text: string;
}

export interface Incident {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  happened: When;
  situations: SituationId[];
  amountLost: string;
  bankName: string;
  bankNumber: string;
  txns: Txn[];
  suspects: Suspect[];
  evidence: Record<string, boolean>;
  refs: { call1930: string; portal: string; bank: string; fir: string };
  done: Record<string, boolean>;
  notes: string;
  log: LogEntry[];
  status: 'open' | 'reported' | 'closed';
}

type L3 = Record<Lang, string>;
export const EVIDENCE_ITEMS: Array<{ id: string; label: L3 }> = [
  { id: 'chat', label: { en: 'Screenshots of chats, SMS or e-mails', hi: 'चैट, SMS या ईमेल के स्क्रीनशॉट', pa: 'ਚੈਟ, SMS ਜਾਂ ਈਮੇਲ ਦੇ ਸਕ੍ਰੀਨਸ਼ਾਟ' } },
  { id: 'calllog', label: { en: 'Call log showing the number, date and time', hi: 'नंबर, तारीख और समय दिखाता कॉल लॉग', pa: 'ਨੰਬਰ, ਤਾਰੀਖ਼ ਅਤੇ ਸਮਾਂ ਦਿਖਾਉਂਦਾ ਕਾਲ ਲੌਗ' } },
  { id: 'payment', label: { en: 'Payment confirmation and the bank SMS', hi: 'भुगतान की पुष्टि और बैंक का SMS', pa: 'ਭੁਗਤਾਨ ਦੀ ਪੁਸ਼ਟੀ ਅਤੇ ਬੈਂਕ ਦਾ SMS' } },
  { id: 'statement', label: { en: 'Bank statement showing the debit', hi: 'डेबिट दिखाता बैंक स्टेटमेंट', pa: 'ਡੈਬਿਟ ਦਿਖਾਉਂਦੀ ਬੈਂਕ ਸਟੇਟਮੈਂਟ' } },
  { id: 'links', label: { en: 'Links and app names (do not open them again)', hi: 'लिंक और ऐप के नाम (उन्हें दोबारा न खोलें)', pa: 'ਲਿੰਕ ਅਤੇ ਐਪਾਂ ਦੇ ਨਾਮ (ਉਨ੍ਹਾਂ ਨੂੰ ਦੁਬਾਰਾ ਨਾ ਖੋਲ੍ਹੋ)' } },
  { id: 'profile', label: { en: "Screenshot of the scammer's profile or number", hi: 'ठग की प्रोफ़ाइल या नंबर का स्क्रीनशॉट', pa: 'ਠੱਗ ਦੀ ਪ੍ਰੋਫ਼ਾਈਲ ਜਾਂ ਨੰਬਰ ਦਾ ਸਕ੍ਰੀਨਸ਼ਾਟ' } },
];

const K = 'vg.incidents.v1';
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function newIncident(p: Partial<Incident> & Pick<Incident, 'situations' | 'happened'>): Incident {
  const now = Date.now();
  return {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    title: '',
    amountLost: '',
    bankName: '',
    bankNumber: '',
    txns: [],
    suspects: [],
    evidence: {},
    refs: { call1930: '', portal: '', bank: '', fir: '' },
    done: {},
    notes: '',
    log: [{ at: now, text: 'Incident created' }],
    status: 'open',
    ...p,
  };
}

export async function loadIncidents(): Promise<Incident[]> {
  try {
    const raw = await AsyncStorage.getItem(K);
    const list = raw ? (JSON.parse(raw) as Incident[]) : [];
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function saveIncident(inc: Incident): Promise<void> {
  try {
    const all = (await loadIncidents()).filter((i) => i.id !== inc.id);
    await AsyncStorage.setItem(K, JSON.stringify([{ ...inc, updatedAt: Date.now() }, ...all]));
  } catch {
    /* non-fatal */
  }
}

export async function deleteIncident(id: string): Promise<void> {
  try {
    const all = (await loadIncidents()).filter((i) => i.id !== id);
    await AsyncStorage.setItem(K, JSON.stringify(all));
  } catch {
    /* non-fatal */
  }
}

export const withLog = (inc: Incident, text: string): Incident => ({ ...inc, log: [{ at: Date.now(), text }, ...inc.log].slice(0, 100) });

/** Plain-text summary in English, to paste into the cybercrime.gov.in form or hand to the bank or police. */
export function summarizeIncident(inc: Incident, situationLabels: string[]): string {
  const d = (t: number) => new Date(t).toLocaleString('en-IN');
  const lines: string[] = [];
  lines.push(`CYBER FRAUD INCIDENT SUMMARY${inc.title ? ' - ' + inc.title : ''}`);
  lines.push(`Recorded: ${d(inc.createdAt)}   Last updated: ${d(inc.updatedAt)}`);
  if (situationLabels.length) lines.push(`What happened: ${situationLabels.join('; ')}`);
  if (inc.amountLost) lines.push(`Amount lost: Rs ${inc.amountLost}`);
  if (inc.bankName) lines.push(`My bank: ${inc.bankName}`);
  const r = inc.refs;
  const refs = [r.call1930 && `1930 complaint no. ${r.call1930}`, r.portal && `cybercrime.gov.in acknowledgement ${r.portal}`, r.bank && `Bank complaint ref ${r.bank}`, r.fir && `FIR ${r.fir}`].filter(Boolean);
  if (refs.length) lines.push(`Reference numbers: ${refs.join('; ')}`);
  if (inc.txns.length) {
    lines.push('', 'Transactions:');
    inc.txns.forEach((t, i) => lines.push(`${i + 1}. Rs ${t.amount || '?'} | ${t.at || 'time not noted'} | Txn/UTR: ${t.ref || '-'} | Receiver: ${t.receiver || '-'}`));
  }
  if (inc.suspects.length) {
    lines.push('', 'Suspect details:');
    inc.suspects.forEach((s) => lines.push(`- ${s.kind}: ${s.value}`));
  }
  const ev = EVIDENCE_ITEMS.filter((e) => inc.evidence[e.id]).map((e) => e.label.en);
  if (ev.length) lines.push('', 'Evidence I hold: ' + ev.join('; '));
  if (inc.notes.trim()) lines.push('', 'Notes:', inc.notes.trim());
  const events = [...inc.log].reverse().map((l) => `${d(l.at)}  ${l.text}`);
  if (events.length) lines.push('', 'Timeline:', ...events);
  return lines.join('\n');
}

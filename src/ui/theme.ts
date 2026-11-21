import type { RiskLevel, TacticId } from '../engine/types';

export const C = {
  bg: '#0B1220',
  card: '#131C31',
  cardHi: '#1A2542',
  line: '#26324F',
  text: '#E8ECF5',
  dim: '#93A0BC',
  green: '#22C55E',
  amber: '#F59E0B',
  red: '#EF4444',
  redDark: '#7F1111',
  blue: '#4C8DFF',
};

export const levelColor = (l: RiskLevel) => (l === 'danger' ? C.red : l === 'caution' ? C.amber : C.green);

/** Severity bands used to colour-code flags in the transcript. */
export type Severity = 'high' | 'mid' | 'low';
const SEVERITY: Record<TacticId, Severity> = {
  OTP: 'high',
  CREDENTIALS: 'high',
  REMOTE_ACCESS: 'high',
  PAYMENT: 'high',
  ISOLATION: 'high',
  THREAT: 'mid',
  SECRECY: 'mid',
  EMERGENCY: 'mid',
  LURE: 'mid',
  URGENCY: 'low',
  AUTHORITY: 'low',
  ACCOUNT_PRETEXT: 'low',
  PERSONAL_ID: 'low',
};
export const severityOf = (t: TacticId) => SEVERITY[t];
export const sevColor = (s: Severity) => (s === 'high' ? C.red : s === 'mid' ? '#F97316' : C.amber);
export const sevBg = (s: Severity) => (s === 'high' ? 'rgba(239,68,68,0.38)' : s === 'mid' ? 'rgba(249,115,22,0.34)' : 'rgba(245,158,11,0.28)');

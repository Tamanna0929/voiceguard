export type TacticId =
  | 'URGENCY'
  | 'AUTHORITY'
  | 'OTP'
  | 'CREDENTIALS'
  | 'SECRECY'
  | 'PAYMENT'
  | 'THREAT'
  | 'REMOTE_ACCESS'
  | 'LURE'
  | 'ACCOUNT_PRETEXT'
  | 'ISOLATION'
  | 'PERSONAL_ID'
  | 'EMERGENCY';

export type RiskLevel = 'safe' | 'caution' | 'danger';

export interface Hit {
  tactic: TacticId;
  start: number;
  end: number;
  text: string;
  source: 'rules' | 'ai';
  /** Strength multiplier of the pattern that produced this hit. */
  w?: number;
}

export interface Utterance {
  id: number;
  text: string;
  t: number;
  hits: Hit[];
}

export interface Snapshot {
  /** Smoothed 0-100 value shown on the meter. */
  risk: number;
  /** Raw evidence-based value before smoothing. */
  target: number;
  level: RiskLevel;
  /** True while the full-screen HANG UP alert should be visible. */
  alert: boolean;
  /** True only on the push that first raised (or re-raised) the alert. */
  newAlert: boolean;
  /** Tactics currently contributing, strongest first. */
  active: TacticId[];
  peak: number;
  utterance?: Utterance;
}

import type { ScamModel } from './model';

export interface EngineOptions {
  /** Model trained by training/train.py. Ignored when it is a stub. */
  model?: ScamModel;
  alertThreshold?: number;
  cautionThreshold?: number;
}

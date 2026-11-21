/** Masking + recovery-plan tests.   npx tsx scripts/test-privacy.ts */
import { maskSensitive } from '../src/privacy/mask';
import { RiskEngine } from '../src/engine/engine';
import { SCRIPTS } from '../src/data/scripts';
import { buildPlan, SITUATIONS } from '../src/recovery/guide';
import { checkMessage, findLinks } from '../src/engine/messageCheck';

let fails = 0;
const ok = (name: string, cond: boolean, detail = '') => {
  if (!cond) fails++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name.padEnd(44)} ${detail}`);
};

// ---- masking: must hide
const hide: Array<[string, string, string]> = [
  ['otp digits', 'your OTP is 482913 please tell me', '482913'],
  ['otp hindi roman', 'otp bata do 482913 abhi', '482913'],
  ['otp devanagari', 'आपका ओटीपी 482913 है', '482913'],
  ['otp spaced', 'the code is 4 8 2 9 1 3', '4 8 2 9 1 3'],
  ['mobile', 'call me on 9876543210', '9876543210'],
  ['mobile +91', 'whatsapp +91 98765 43210 now', '98765 43210'],
  ['mobile 0-prefixed', 'ring 09876543210', '9876543210'],
  ['card spaced', 'card number 4111 1111 1111 1111', '4111 1111 1111 1111'],
  ['card dashes', 'my card is 5500-0000-0000-0004', '5500-0000-0000-0004'],
  ['aadhaar', 'aadhaar 2345 6789 0123', '2345 6789 0123'],
  ['account', 'account number 123456789012345', '123456789012345'],
  ['upi', 'pay to ramesh.kumar@oksbi', 'ramesh.kumar@oksbi'],
  ['upi number', 'send to 9876543210@ybl', '9876543210'],
  ['email', 'mail me at a.b@example.co.in', 'a.b@example.co.in'],
  ['pan', 'my PAN is ABCDE1234F', 'ABCDE1234F'],
  ['ifsc', 'ifsc SBIN0001234', 'SBIN0001234'],
  ['cvv', 'cvv 123', '123'],
  ['pin', 'my pin is 4821', '4821'],
  ['spoken digits en', 'the otp is four eight two one nine six', 'four eight two one nine six'],
  ['spoken digits hi', 'ओटीपी चार आठ दो एक नौ छह है', 'चार आठ दो एक नौ छह'],
];
for (const [name, text, secret] of hide) {
  const r = maskSensitive(text);
  ok(`hides: ${name}`, !r.text.includes(secret) && r.found.length > 0, r.text);
}

// ---- masking: must keep
const keep: Array<[string, string]> = [
  ['helpline 1930', 'call 1930 now'],
  ['toll free', 'call 1800 123 4567 for help'],
  ['rupee amount', 'transfer ₹ 50000 to the account'],
  ['rs amount', 'pay rs 150000 as fine'],
  ['plain sentence', 'this is the police, you are under arrest'],
  ['year', 'in the year 2024 it happened'],
  ['few digits', 'you have 3 pending parcels'],
];
for (const [name, text] of keep) {
  const r = maskSensitive(text);
  ok(`keeps: ${name}`, r.text === text, r.text);
}

// ---- masking must not change what the detector concludes
const synthetic = [
  'This is the cyber police, your Aadhaar 2345 6789 0123 is linked to money laundering.',
  'Do not tell anyone. Share the OTP 482913 that came to 9876543210 right now.',
  'Transfer 150000 rupees to account number 123456789012 IFSC SBIN0001234 within 30 minutes.',
  'Tell me your card number 4111 1111 1111 1111 and cvv 123 to verify your KYC.',
  'Pay to ramesh@oksbi immediately or your number will be blocked.',
];
for (const s of SCRIPTS) {
  const raw = new RiskEngine();
  const msk = new RiskEngine();
  let a = 0;
  let b = 0;
  for (const t of s.turns) {
    a = raw.push(t.text).peak;
    b = msk.push(maskSensitive(t.text).text).peak;
  }
  ok(`risk unchanged: ${s.id}`, Math.abs(a - b) <= 3, `raw ${a} vs masked ${b}`);
}
{
  const raw = new RiskEngine();
  const msk = new RiskEngine();
  let a = 0;
  let b = 0;
  for (const t of synthetic) {
    a = raw.push(t).peak;
    b = msk.push(maskSensitive(t).text).peak;
  }
  ok('risk unchanged: synthetic digit-heavy call', Math.abs(a - b) <= 5 && b >= 70, `raw ${a} vs masked ${b}`);
}

// ---- recovery plans
const plan = (ids: any[], when: any = 'hour') => buildPlan({ situations: ids, when });
const moneyPlan = plan(['money']);
ok('money: 1930 is the first step', moneyPlan[0]?.id === 'call1930', moneyPlan.map((s) => s.id).join(','));
ok('money: bank call present', moneyPlan.some((s) => s.id === 'callBank'));
ok('plan ordered by urgency', (() => {
  const rank = { now: 0, hour: 1, today: 2, week: 3 } as const;
  return moneyPlan.every((s, i) => i === 0 || rank[moneyPlan[i - 1].urgency] <= rank[s.urgency]);
})());
ok('app: airplane before uninstall', (() => {
  const p = plan(['app']).map((s) => s.id);
  return p.indexOf('airplane') >= 0 && p.indexOf('airplane') < p.indexOf('uninstallApp');
})());
ok('ids: aadhaar lock + SIM check', (() => {
  const p = plan(['ids']).map((s) => s.id);
  return p.includes('lockAadhaar') && p.includes('checkSims');
})());
ok('no duplicate steps when combined', (() => {
  const p = plan(['money', 'otp', 'credentials', 'app', 'ids', 'link', 'blackmail']).map((s) => s.id);
  return new Set(p).size === p.length;
})());
ok('every situation yields a plan', SITUATIONS.every((s) => plan([s.id]).length >= 3));
ok('empty selection still gives basics', plan([]).length >= 2);
ok('every step has en/hi/pa text', buildPlan({ situations: SITUATIONS.map((s) => s.id), when: 'hour' }).every((s) => ['en', 'hi', 'pa'].every((l) => (s.text as any)[l]?.title && (s.text as any)[l]?.body)));

// ---- message checker
const scamSms = 'Dear customer your SBI account will be blocked today. Update KYC immediately: http://bit.ly/sbi-kyc-upd8 or install https://sbi-kyc.example.xyz/update.apk and share OTP 482913 sent to 9876543210';
const c1 = checkMessage(scamSms);
ok('message: scam SMS is danger', c1.level === 'danger', `risk ${c1.risk} tactics ${c1.tactics.join(',')}`);
ok('message: digits hidden in output', !c1.masked.includes('482913') && !c1.masked.includes('9876543210'), c1.masked.slice(0, 80));
ok('message: shortener and apk flagged', c1.links.some((l) => l.reasons.includes('shortener')) && c1.links.some((l) => l.reasons.includes('apk')));
const c2 = checkMessage('Hi, your order #4821 has been shipped and will arrive on Monday. Thanks for shopping with us.');
ok('message: normal order SMS is safe', c2.level === 'safe', `risk ${c2.risk}`);
const c3 = checkMessage('Hey are we meeting at 6? I will call you from 9876543210 later');
ok('message: friend text is safe and number hidden', c3.level === 'safe' && !c3.masked.includes('9876543210'), `risk ${c3.risk}`);
ok('links: plain https site not flagged', findLinks('see https://www.sbi.co.in/web/personal-banking').every((l) => l.reasons.length === 0));

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

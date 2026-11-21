/**
 * Sensitive-data masking. Runs on the phone, on every sentence, BEFORE the text reaches the transcript,
 * the history, the risk engine or the optional AI proxy. The original digits are never stored or sent.
 *
 * It masks the things a scammer extracts or that would hurt if leaked: OTPs, PINs, CVV, card numbers, Aadhaar,
 * phone numbers, bank account numbers, UPI IDs, e-mail addresses, PAN and IFSC codes. Amounts of money are kept
 * (the scam detector needs them), and short numbers such as 1930 are kept.
 */

export type MaskKind = 'otp' | 'pin' | 'card' | 'aadhaar' | 'phone' | 'account' | 'upi' | 'email' | 'pan' | 'ifsc';
export const MASK_KINDS: MaskKind[] = ['otp', 'pin', 'card', 'aadhaar', 'phone', 'account', 'upi', 'email', 'pan', 'ifsc'];

export interface MaskResult {
  text: string;
  found: MaskKind[];
}

const TOKEN: Record<Exclude<MaskKind, 'otp' | 'pin'>, string> = {
  card: '[card no.]',
  aadhaar: '[ID no.]',
  phone: '[phone no.]',
  account: '[account no.]',
  upi: '[upi id]',
  email: '[email]',
  pan: '[PAN]',
  ifsc: '[IFSC]',
};

const OTP_CTX = /(?:otp|o\.t\.p|one[\s-]?time|verification|verify|code|passcode|ओटीपी|कोड|ਓਟੀਪੀ|ਕੋਡ)\W*(?:\w+\W+){0,3}$/i;
const PIN_CTX = /(?:pin|cvv|cvc|cv2|पिन|सीवीवी|ਪਿਨ|ਪਿੰਨ|ਸੀਵੀਵੀ)\W*(?:\w+\W+){0,3}$/i;
const ACC_CTX = /(?:account|a\/c|acct|khata|khate|खाता|खाते|अकाउंट|ਖਾਤਾ|ਖਾਤੇ)\W*(?:\w+\W+){0,4}$/i;
const MONEY_BEFORE = /(?:₹|rs\.?|inr|rupees?|rupaye|rupay|रुपये|रुपए|ਰੁਪਏ)\s*$/i;

const luhn = (digits: string) => {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
};

/** Digits spoken as words ("four eight two one") are also a leak, so runs of four or more are masked. */
const DIGIT_WORDS = new Set(
  (
    'zero one two three four five six seven eight nine ' +
    'ek do teen tin char chaar paanch panch chhe chhah cheh saat sat aath ath nau nao shunya sifar ' +
    'एक दो तीन चार पांच पाँच छह छः छे सात आठ नौ शून्य ज़ीरो ' +
    'ਇੱਕ ਦੋ ਤਿੰਨ ਚਾਰ ਪੰਜ ਛੇ ਸੱਤ ਅੱਠ ਨੌਂ ਸਿਫਰ'
  ).split(' '),
);
const stripPunct = (w: string) => w.replace(/^[^\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+$/gu, '').toLowerCase();

function maskSpokenDigits(text: string, found: MaskKind[]): string {
  const toks = Array.from(text.matchAll(/\S+/g)).map((m) => ({ s: m.index!, e: m.index! + m[0].length, w: stripPunct(m[0]) }));
  const cuts: Array<[number, number, MaskKind]> = [];
  let i = 0;
  while (i < toks.length) {
    if (!DIGIT_WORDS.has(toks[i].w)) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < toks.length && DIGIT_WORDS.has(toks[j + 1].w)) j++;
    if (j - i + 1 >= 4) {
      const before = text.slice(Math.max(0, toks[i].s - 40), toks[i].s);
      cuts.push([toks[i].s, toks[j].e, OTP_CTX.test(before) ? 'otp' : PIN_CTX.test(before) ? 'pin' : 'account']);
    }
    i = j + 1;
  }
  let out = text;
  for (const [s, e, k] of cuts.reverse()) {
    out = out.slice(0, s) + (k === 'account' ? TOKEN.account : '••••') + out.slice(e);
    found.push(k);
  }
  return out;
}

export function maskSensitive(input: string): MaskResult {
  const found: MaskKind[] = [];
  let t = input;

  // identifiers with a fixed shape
  t = t.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, () => (found.push('email'), TOKEN.email));
  t = t.replace(/\b[\w.-]{2,}@[a-z][a-z0-9]{1,}\b/gi, () => (found.push('upi'), TOKEN.upi));
  t = t.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/gi, () => (found.push('pan'), TOKEN.pan));
  t = t.replace(/\b[A-Z]{4}0[A-Z0-9]{6}\b/gi, () => (found.push('ifsc'), TOKEN.ifsc));

  // "cvv 123" has only three digits, so it needs its own rule
  t = t.replace(/\b(cvv|cvc|cv2|सीवीवी|ਸੀਵੀਵੀ)(\D{0,14}?)(\d{3,4})(?!\d)/gi, (_m, k, mid) => (found.push('pin'), `${k}${mid}••••`));

  // digit groups: 4+ digits, optionally separated by a space or dash ("4111 1111 1111 1111", "98765-43210")
  t = t.replace(/\+?\d(?:[ -]?\d){3,}/g, (m, offset: number, whole: string) => {
    const digits = m.replace(/\D/g, '');
    const n = digits.length;
    const before = whole.slice(Math.max(0, offset - 40), offset);
    if (MONEY_BEFORE.test(before)) return m; // an amount, keep it
    if (/^1(?:800|860)/.test(digits)) return m; // toll-free numbers are public
    if (n >= 13 && n <= 19 && (luhn(digits) || n === 16)) return (found.push('card'), TOKEN.card);
    const isPhone =
      (n === 10 && /^[6-9]/.test(digits)) || (n === 11 && /^0[6-9]/.test(digits)) || (n === 12 && /^91[6-9]/.test(digits)) || (n === 13 && /^0091[6-9]/.test(digits));
    if (isPhone) return (found.push('phone'), TOKEN.phone);
    if (n === 12 && /^[2-9]/.test(digits)) return (found.push('aadhaar'), TOKEN.aadhaar);
    if (n >= 4 && n <= 8 && OTP_CTX.test(before)) return (found.push('otp'), '•'.repeat(n));
    if (n >= 3 && n <= 6 && PIN_CTX.test(before)) return (found.push('pin'), '••••');
    if (n >= 9 && n <= 18 && (ACC_CTX.test(before) || n >= 11)) return (found.push('account'), TOKEN.account);
    return m;
  });

  t = maskSpokenDigits(t, found);
  return { text: t, found };
}

export const isMasked = (r: MaskResult) => r.found.length > 0;

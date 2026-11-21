import * as Linking from 'expo-linking';
import * as SMS from 'expo-sms';
import type { Lang } from './storage';
import type { TacticId } from '../engine/types';
import { tacticLabel } from '../ui/i18n';

export function familyMessage(lang: Lang, risk: number, flags: TacticId[]): string {
  const f = flags.slice(0, 4).map((t) => tacticLabel(lang, t)).join(', ');
  if (lang === 'hi') return `⚠️ VoiceGuard चेतावनी: मैं अभी शायद किसी ठग की कॉल पर हूँ (जोखिम ${risk}/100: ${f})। कृपया मुझे तुरंत फोन करें।`;
  if (lang === 'pa') return `⚠️ VoiceGuard ਚੇਤਾਵਨੀ: ਮੈਂ ਹੁਣੇ ਸ਼ਾਇਦ ਕਿਸੇ ਠੱਗ ਦੀ ਕਾਲ ਤੇ ਹਾਂ (ਜੋਖਮ ${risk}/100: ${f})। ਕਿਰਪਾ ਕਰਕੇ ਮੈਨੂੰ ਤੁਰੰਤ ਫ਼ੋਨ ਕਰੋ।`;
  return `⚠️ VoiceGuard alert: I may be on a scam call right now (risk ${risk}/100: ${f}). Please call me straight away.`;
}

const digits = (n: string) => n.replace(/[^\d+]/g, '');

/** Opens the phone's SMS composer pre-filled. iOS/Android never let apps send SMS silently, so one tap is needed. */
export async function sendFamilySMS(number: string, body: string): Promise<boolean> {
  const to = digits(number);
  if (!to) return false;
  try {
    if (await SMS.isAvailableAsync()) {
      await SMS.sendSMSAsync([to], body);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    await Linking.openURL(`sms:${to}?body=${encodeURIComponent(body)}`);
    return true;
  } catch {
    return false;
  }
}

export async function sendFamilyWhatsApp(number: string, body: string): Promise<boolean> {
  let to = digits(number).replace('+', '');
  if (to.length === 10) to = '91' + to;
  if (!to) return false;
  try {
    await Linking.openURL(`https://wa.me/${to}?text=${encodeURIComponent(body)}`);
    return true;
  } catch {
    return false;
  }
}

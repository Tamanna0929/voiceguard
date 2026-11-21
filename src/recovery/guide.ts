/**
 * Recovery guide: given what the person already did, build an ordered, personalised emergency checklist.
 * Content follows India's official channels: the 1930 helpline and cybercrime.gov.in, the RBI customer-protection
 * rules, UIDAI (Aadhaar biometric lock) and DoT Sanchar Saathi (Chakshu, TAFCOP). Hindi and Punjabi text should be
 * reviewed by a native speaker before release.
 */
import type { Lang } from '../services/storage';

export type SituationId = 'money' | 'otp' | 'credentials' | 'app' | 'ids' | 'link' | 'blackmail';
export type Urgency = 'now' | 'hour' | 'today' | 'week';
export type When = 'hour' | 'today' | 'earlier';

type L3 = Record<Lang, string>;
const L = (en: string, hi: string, pa: string): L3 => ({ en, hi, pa });

export interface Situation {
  id: SituationId;
  icon: string;
  label: L3;
}

export const SITUATIONS: Situation[] = [
  { id: 'money', icon: '💸', label: L('I sent money', 'मैंने पैसे भेज दिए', 'ਮੈਂ ਪੈਸੇ ਭੇਜ ਦਿੱਤੇ') },
  { id: 'otp', icon: '🔢', label: L('I shared an OTP', 'मैंने OTP बता दिया', 'ਮੈਂ OTP ਦੱਸ ਦਿੱਤਾ') },
  {
    id: 'credentials',
    icon: '💳',
    label: L('I shared card, PIN, CVV or a banking password', 'मैंने कार्ड, PIN, CVV या बैंकिंग पासवर्ड बता दिया', 'ਮੈਂ ਕਾਰਡ, PIN, CVV ਜਾਂ ਬੈਂਕਿੰਗ ਪਾਸਵਰਡ ਦੱਸ ਦਿੱਤਾ'),
  },
  {
    id: 'app',
    icon: '📲',
    label: L('I installed an app or gave remote access', 'मैंने कोई ऐप इंस्टॉल किया या रिमोट एक्सेस दिया', 'ਮੈਂ ਕੋਈ ਐਪ ਇੰਸਟਾਲ ਕੀਤੀ ਜਾਂ ਰਿਮੋਟ ਐਕਸੈਸ ਦਿੱਤਾ'),
  },
  { id: 'ids', icon: '🪪', label: L('I shared Aadhaar, PAN or ID documents', 'मैंने आधार, PAN या ID दस्तावेज़ दिए', 'ਮੈਂ ਆਧਾਰ, PAN ਜਾਂ ID ਦਸਤਾਵੇਜ਼ ਦਿੱਤੇ') },
  { id: 'link', icon: '🔗', label: L('I opened a link or entered details on a site', 'मैंने लिंक खोला या किसी साइट पर जानकारी भरी', 'ਮੈਂ ਲਿੰਕ ਖੋਲ੍ਹਿਆ ਜਾਂ ਕਿਸੇ ਸਾਈਟ ਤੇ ਜਾਣਕਾਰੀ ਭਰੀ') },
  {
    id: 'blackmail',
    icon: '⚠️',
    label: L("I'm being threatened or blackmailed (for example a “digital arrest”)", 'मुझे धमकाया या ब्लैकमेल किया जा रहा है (जैसे “डिजिटल अरेस्ट”)', 'ਮੈਨੂੰ ਧਮਕਾਇਆ ਜਾਂ ਬਲੈਕਮੇਲ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ (ਜਿਵੇਂ “ਡਿਜੀਟਲ ਅਰੈਸਟ”)'),
  },
];

export type Action =
  | { kind: 'call'; number: string; label: L3 }
  | { kind: 'url'; url: string; label: L3 }
  | { kind: 'bank'; label: L3 };

interface StepDef {
  id: string;
  /** Situations this step applies to; 'any' means it is always included. */
  for: Array<SituationId | 'any'>;
  urgency: Urgency | ((s: Set<SituationId>) => Urgency);
  title: L3;
  body: L3;
  actions?: Action[];
}

export interface PlanStep {
  id: string;
  urgency: Urgency;
  text: Record<Lang, { title: string; body: string }>;
  actions: Action[];
}

const CALL_1930: Action = { kind: 'call', number: '1930', label: L('Call 1930', '1930 पर कॉल करें', '1930 ਤੇ ਕਾਲ ਕਰੋ') };
const PORTAL: Action = { kind: 'url', url: 'https://cybercrime.gov.in', label: L('Open cybercrime.gov.in', 'cybercrime.gov.in खोलें', 'cybercrime.gov.in ਖੋਲ੍ਹੋ') };

/** The order of this array decides the order of steps that share the same urgency. */
const STEPS: StepDef[] = [
  {
    id: 'stopContact',
    for: ['blackmail'],
    urgency: 'now',
    title: L('Stop and do not pay', 'रुकें और पैसे न दें', 'ਰੁਕੋ ਅਤੇ ਪੈਸੇ ਨਾ ਦਿਓ'),
    body: L(
      'No police, CBI, court or customs officer arrests anyone or collects money over a call or video call. Do not pay, do not share anything more and do not stay on the video call. Hang up and block the number.',
      'कोई पुलिस, CBI, कोर्ट या कस्टम अधिकारी फोन या वीडियो कॉल पर न गिरफ्तार करता है, न पैसे मांगता है। पैसे न दें, और जानकारी न दें, वीडियो कॉल पर न रुकें। कॉल काटें और नंबर ब्लॉक करें।',
      'ਕੋਈ ਪੁਲਿਸ, CBI, ਅਦਾਲਤ ਜਾਂ ਕਸਟਮ ਅਧਿਕਾਰੀ ਫ਼ੋਨ ਜਾਂ ਵੀਡੀਓ ਕਾਲ ਤੇ ਨਾ ਗ੍ਰਿਫ਼ਤਾਰ ਕਰਦਾ ਹੈ, ਨਾ ਪੈਸੇ ਮੰਗਦਾ ਹੈ। ਪੈਸੇ ਨਾ ਦਿਓ, ਹੋਰ ਜਾਣਕਾਰੀ ਨਾ ਦਿਓ, ਵੀਡੀਓ ਕਾਲ ਤੇ ਨਾ ਰੁਕੋ। ਕਾਲ ਕੱਟੋ ਅਤੇ ਨੰਬਰ ਬਲੌਕ ਕਰੋ।',
    ),
  },
  {
    id: 'airplane',
    for: ['app'],
    urgency: 'now',
    title: L('Cut the connection', 'कनेक्शन काट दें', 'ਕਨੈਕਸ਼ਨ ਕੱਟ ਦਿਓ'),
    body: L(
      'Switch on airplane mode, or turn off Wi-Fi and mobile data. This stops anyone watching or controlling your phone while you clean it up.',
      'एयरप्लेन मोड चालू करें या वाई-फाई और मोबाइल डेटा बंद करें। इससे सफाई के दौरान कोई आपका फोन देख या चला नहीं पाएगा।',
      'ਏਅਰਪਲੇਨ ਮੋਡ ਚਾਲੂ ਕਰੋ ਜਾਂ ਵਾਈ-ਫਾਈ ਅਤੇ ਮੋਬਾਈਲ ਡਾਟਾ ਬੰਦ ਕਰੋ। ਇਸ ਨਾਲ ਸਫ਼ਾਈ ਦੌਰਾਨ ਕੋਈ ਤੁਹਾਡਾ ਫ਼ੋਨ ਵੇਖ ਜਾਂ ਚਲਾ ਨਹੀਂ ਸਕੇਗਾ।',
    ),
  },
  {
    id: 'call1930',
    for: ['money'],
    urgency: 'now',
    title: L('Call 1930 right now', 'अभी 1930 पर कॉल करें', 'ਹੁਣੇ 1930 ਤੇ ਕਾਲ ਕਰੋ'),
    body: L(
      "This is India's cyber-fraud helpline. Tell them what happened, the amount, the time and the receiving account or UPI ID. They can alert the bank that received your money so it can be put on hold. The first hour matters most. You will get an SMS with a complaint number: keep it.",
      'यह साइबर ठगी की राष्ट्रीय हेल्पलाइन है। उन्हें बताएं कि क्या हुआ, कितनी रकम गई, कब और किस खाते या UPI ID में गई। वे पैसे लेने वाले बैंक को सूचित कर सकते हैं ताकि रकम रोकी जा सके। पहला घंटा सबसे अहम है। आपको शिकायत नंबर का SMS मिलेगा, उसे संभालकर रखें।',
      'ਇਹ ਸਾਈਬਰ ਠੱਗੀ ਦੀ ਰਾਸ਼ਟਰੀ ਹੈਲਪਲਾਈਨ ਹੈ। ਉਨ੍ਹਾਂ ਨੂੰ ਦੱਸੋ ਕਿ ਕੀ ਹੋਇਆ, ਕਿੰਨੀ ਰਕਮ ਗਈ, ਕਦੋਂ ਅਤੇ ਕਿਸ ਖਾਤੇ ਜਾਂ UPI ID ਵਿੱਚ ਗਈ। ਉਹ ਪੈਸੇ ਲੈਣ ਵਾਲੇ ਬੈਂਕ ਨੂੰ ਸੂਚਿਤ ਕਰ ਸਕਦੇ ਹਨ ਤਾਂ ਜੋ ਰਕਮ ਰੋਕੀ ਜਾ ਸਕੇ। ਪਹਿਲਾ ਘੰਟਾ ਸਭ ਤੋਂ ਅਹਿਮ ਹੈ। ਤੁਹਾਨੂੰ ਸ਼ਿਕਾਇਤ ਨੰਬਰ ਵਾਲਾ SMS ਮਿਲੇਗਾ, ਇਸਨੂੰ ਸੰਭਾਲ ਕੇ ਰੱਖੋ।',
    ),
    actions: [CALL_1930],
  },
  {
    id: 'callBank',
    for: ['money', 'otp', 'credentials', 'app'],
    urgency: 'now',
    title: L("Call your bank's official fraud line", 'अपने बैंक की आधिकारिक फ्रॉड लाइन पर कॉल करें', 'ਆਪਣੇ ਬੈਂਕ ਦੀ ਅਧਿਕਾਰਤ ਫ੍ਰਾਡ ਲਾਈਨ ਤੇ ਕਾਲ ਕਰੋ'),
    body: L(
      "Use the number on the back of your card or inside the bank's own app, never a number from a search result or from the caller. Ask them to block the card, UPI and net banking, and to put a hold or dispute on the transaction. Ask for a complaint reference number and write it down.",
      'कार्ड के पीछे छपा नंबर या बैंक के अपने ऐप का नंबर इस्तेमाल करें, सर्च रिज़ल्ट या कॉल करने वाले का दिया नंबर कभी नहीं। कार्ड, UPI और नेट बैंकिंग ब्लॉक करने और लेनदेन पर होल्ड या डिस्प्यूट लगाने को कहें। शिकायत का रेफ़रेंस नंबर मांगकर लिख लें।',
      'ਕਾਰਡ ਦੇ ਪਿੱਛੇ ਛਪਿਆ ਨੰਬਰ ਜਾਂ ਬੈਂਕ ਦੀ ਆਪਣੀ ਐਪ ਦਾ ਨੰਬਰ ਵਰਤੋ, ਸਰਚ ਨਤੀਜੇ ਜਾਂ ਕਾਲ ਕਰਨ ਵਾਲੇ ਦਾ ਦਿੱਤਾ ਨੰਬਰ ਕਦੇ ਨਹੀਂ। ਕਾਰਡ, UPI ਅਤੇ ਨੈੱਟ ਬੈਂਕਿੰਗ ਬਲੌਕ ਕਰਨ ਅਤੇ ਲੈਣ-ਦੇਣ ਤੇ ਹੋਲਡ ਜਾਂ ਡਿਸਪਿਊਟ ਲਗਾਉਣ ਲਈ ਕਹੋ। ਸ਼ਿਕਾਇਤ ਦਾ ਰੈਫ਼ਰੈਂਸ ਨੰਬਰ ਮੰਗ ਕੇ ਲਿਖ ਲਓ।',
    ),
    actions: [{ kind: 'bank', label: L('Call my bank', 'मेरे बैंक को कॉल करें', 'ਮੇਰੇ ਬੈਂਕ ਨੂੰ ਕਾਲ ਕਰੋ') }],
  },
  {
    id: 'uninstallApp',
    for: ['app'],
    urgency: 'now',
    title: L('Remove the app and its permissions', 'ऐप और उसकी अनुमतियाँ हटाएं', 'ਐਪ ਅਤੇ ਉਸਦੀਆਂ ਇਜਾਜ਼ਤਾਂ ਹਟਾਓ'),
    body: L(
      'Uninstall AnyDesk, TeamViewer, QuickSupport or any app you were told to install. If it will not uninstall, open Settings and remove its Device admin and Accessibility access first, or restart in safe mode. Then run Google Play Protect or a trusted security scan.',
      'AnyDesk, TeamViewer, QuickSupport या जो भी ऐप आपसे इंस्टॉल करवाया गया, उसे अनइंस्टॉल करें। न हटे तो पहले सेटिंग्स में उसका Device admin और Accessibility एक्सेस हटाएं, या सेफ़ मोड में फोन चालू करें। फिर Google Play Protect या किसी भरोसेमंद सिक्योरिटी ऐप से स्कैन करें।',
      'AnyDesk, TeamViewer, QuickSupport ਜਾਂ ਜੋ ਵੀ ਐਪ ਤੁਹਾਨੂੰ ਇੰਸਟਾਲ ਕਰਵਾਈ ਗਈ, ਉਸਨੂੰ ਅਨਇੰਸਟਾਲ ਕਰੋ। ਨਾ ਹਟੇ ਤਾਂ ਪਹਿਲਾਂ ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਉਸਦਾ Device admin ਅਤੇ Accessibility ਐਕਸੈਸ ਹਟਾਓ, ਜਾਂ ਸੇਫ਼ ਮੋਡ ਵਿੱਚ ਫ਼ੋਨ ਚਾਲੂ ਕਰੋ। ਫਿਰ Google Play Protect ਜਾਂ ਕਿਸੇ ਭਰੋਸੇਮੰਦ ਸਕਿਓਰਿਟੀ ਐਪ ਨਾਲ ਸਕੈਨ ਕਰੋ।',
    ),
  },
  {
    id: 'noteTxn',
    for: ['money'],
    urgency: 'now',
    title: L('Write down the payment details', 'भुगतान का ब्योरा लिख लें', 'ਭੁਗਤਾਨ ਦਾ ਵੇਰਵਾ ਲਿਖ ਲਓ'),
    body: L(
      "Amount, date and time, the transaction ID or UTR number, the receiver's UPI ID, phone number or account number, and the app you used. Take a screenshot of the payment confirmation. You need these for 1930, the bank and the portal.",
      'रकम, तारीख और समय, ट्रांज़ैक्शन ID या UTR नंबर, पाने वाले की UPI ID, फोन नंबर या खाता नंबर, और इस्तेमाल किया गया ऐप। भुगतान की पुष्टि का स्क्रीनशॉट लें। 1930, बैंक और पोर्टल पर ये सब चाहिए होंगे।',
      'ਰਕਮ, ਤਾਰੀਖ਼ ਅਤੇ ਸਮਾਂ, ਟ੍ਰਾਂਜ਼ੈਕਸ਼ਨ ID ਜਾਂ UTR ਨੰਬਰ, ਪੈਸੇ ਲੈਣ ਵਾਲੇ ਦੀ UPI ID, ਫ਼ੋਨ ਨੰਬਰ ਜਾਂ ਖਾਤਾ ਨੰਬਰ, ਅਤੇ ਵਰਤੀ ਗਈ ਐਪ। ਭੁਗਤਾਨ ਦੀ ਪੁਸ਼ਟੀ ਦਾ ਸਕ੍ਰੀਨਸ਼ਾਟ ਲਓ। 1930, ਬੈਂਕ ਅਤੇ ਪੋਰਟਲ ਤੇ ਇਹ ਸਭ ਚਾਹੀਦਾ ਹੋਵੇਗਾ।',
    ),
  },
  {
    id: 'keepEvidence',
    for: ['any'],
    urgency: 'now',
    title: L('Keep every piece of evidence', 'हर सबूत संभालकर रखें', 'ਹਰ ਸਬੂਤ ਸੰਭਾਲ ਕੇ ਰੱਖੋ'),
    body: L(
      "Do not delete chats, call logs, SMS or e-mails. Screenshot the caller's number, profile photo, messages, links and payment confirmations. Note app names and UPI IDs. Do not call or message the scammer again.",
      'चैट, कॉल लॉग, SMS या ईमेल न मिटाएं। कॉल करने वाले का नंबर, प्रोफ़ाइल फोटो, संदेश, लिंक और भुगतान की पुष्टि के स्क्रीनशॉट लें। ऐप के नाम और UPI ID नोट करें। ठग को दोबारा कॉल या मैसेज न करें।',
      'ਚੈਟ, ਕਾਲ ਲੌਗ, SMS ਜਾਂ ਈਮੇਲ ਨਾ ਮਿਟਾਓ। ਕਾਲ ਕਰਨ ਵਾਲੇ ਦਾ ਨੰਬਰ, ਪ੍ਰੋਫ਼ਾਈਲ ਫ਼ੋਟੋ, ਸੁਨੇਹੇ, ਲਿੰਕ ਅਤੇ ਭੁਗਤਾਨ ਦੀ ਪੁਸ਼ਟੀ ਦੇ ਸਕ੍ਰੀਨਸ਼ਾਟ ਲਓ। ਐਪਾਂ ਦੇ ਨਾਮ ਅਤੇ UPI ID ਨੋਟ ਕਰੋ। ਠੱਗ ਨੂੰ ਦੁਬਾਰਾ ਕਾਲ ਜਾਂ ਮੈਸੇਜ ਨਾ ਕਰੋ।',
    ),
  },
  {
    id: 'tellSomeone',
    for: ['money', 'blackmail'],
    urgency: 'hour',
    title: L('Tell someone you trust', 'किसी भरोसेमंद को बताएं', 'ਕਿਸੇ ਭਰੋਸੇਮੰਦ ਨੂੰ ਦੱਸੋ'),
    body: L(
      'Scammers rely on shame and secrecy. Tell a family member or a friend now. You are not at fault, and they can help you make the calls.',
      'ठग शर्म और गोपनीयता का फ़ायदा उठाते हैं। अभी परिवार के किसी सदस्य या दोस्त को बताएं। इसमें आपकी गलती नहीं है, और वे कॉल करने में आपकी मदद कर सकते हैं।',
      'ਠੱਗ ਸ਼ਰਮ ਅਤੇ ਗੁਪਤਤਾ ਦਾ ਫ਼ਾਇਦਾ ਚੁੱਕਦੇ ਹਨ। ਹੁਣੇ ਪਰਿਵਾਰ ਦੇ ਕਿਸੇ ਮੈਂਬਰ ਜਾਂ ਦੋਸਤ ਨੂੰ ਦੱਸੋ। ਇਸ ਵਿੱਚ ਤੁਹਾਡੀ ਗ਼ਲਤੀ ਨਹੀਂ ਹੈ, ਅਤੇ ਉਹ ਕਾਲਾਂ ਕਰਨ ਵਿੱਚ ਤੁਹਾਡੀ ਮਦਦ ਕਰ ਸਕਦੇ ਹਨ।',
    ),
  },
  {
    id: 'blockPayApps',
    for: ['money', 'otp', 'credentials'],
    urgency: 'hour',
    title: L('Lock your payment apps', 'अपने पेमेंट ऐप लॉक करें', 'ਆਪਣੀਆਂ ਪੇਮੈਂਟ ਐਪਾਂ ਲਾਕ ਕਰੋ'),
    body: L(
      'Change your UPI PIN, remove saved cards from payment and shopping apps, and turn off auto-pay or mandates you do not recognise. If you are unsure how, ask the bank to do it on the call.',
      'अपना UPI PIN बदलें, पेमेंट और शॉपिंग ऐप से सेव किए कार्ड हटाएं, और जो ऑटो-पे या मैंडेट आप नहीं पहचानते उन्हें बंद करें। तरीका न पता हो तो कॉल पर बैंक से करवा लें।',
      'ਆਪਣਾ UPI PIN ਬਦਲੋ, ਪੇਮੈਂਟ ਅਤੇ ਸ਼ਾਪਿੰਗ ਐਪਾਂ ਤੋਂ ਸੇਵ ਕੀਤੇ ਕਾਰਡ ਹਟਾਓ, ਅਤੇ ਜੋ ਆਟੋ-ਪੇ ਜਾਂ ਮੈਂਡੇਟ ਤੁਸੀਂ ਨਹੀਂ ਪਛਾਣਦੇ ਉਨ੍ਹਾਂ ਨੂੰ ਬੰਦ ਕਰੋ। ਤਰੀਕਾ ਨਾ ਪਤਾ ਹੋਵੇ ਤਾਂ ਕਾਲ ਤੇ ਬੈਂਕ ਤੋਂ ਕਰਵਾ ਲਓ।',
    ),
  },
  {
    id: 'changePasswords',
    for: ['otp', 'credentials', 'app', 'link'],
    urgency: 'hour',
    title: L('Change passwords from a clean device', 'साफ़ डिवाइस से पासवर्ड बदलें', 'ਸਾਫ਼ ਡਿਵਾਈਸ ਤੋਂ ਪਾਸਵਰਡ ਬਦਲੋ'),
    body: L(
      'Change your net-banking and banking-app passwords, then the passwords of the email and phone-linked accounts that can reset them. Use a different phone or computer if you installed an unknown app. Turn on two-step verification everywhere.',
      'नेट बैंकिंग और बैंकिंग ऐप के पासवर्ड बदलें, फिर उन ईमेल और फोन से जुड़े खातों के भी जो इन्हें रीसेट कर सकते हैं। कोई अनजान ऐप इंस्टॉल किया हो तो किसी दूसरे फोन या कंप्यूटर से बदलें। हर जगह टू-स्टेप वेरिफ़िकेशन चालू करें।',
      'ਨੈੱਟ ਬੈਂਕਿੰਗ ਅਤੇ ਬੈਂਕਿੰਗ ਐਪ ਦੇ ਪਾਸਵਰਡ ਬਦਲੋ, ਫਿਰ ਉਨ੍ਹਾਂ ਈਮੇਲ ਅਤੇ ਫ਼ੋਨ ਨਾਲ ਜੁੜੇ ਖਾਤਿਆਂ ਦੇ ਵੀ ਜੋ ਇਨ੍ਹਾਂ ਨੂੰ ਰੀਸੈੱਟ ਕਰ ਸਕਦੇ ਹਨ। ਕੋਈ ਅਣਜਾਣ ਐਪ ਇੰਸਟਾਲ ਕੀਤੀ ਹੋਵੇ ਤਾਂ ਕਿਸੇ ਹੋਰ ਫ਼ੋਨ ਜਾਂ ਕੰਪਿਊਟਰ ਤੋਂ ਬਦਲੋ। ਹਰ ਥਾਂ ਟੂ-ਸਟੈੱਪ ਵੈਰੀਫ਼ਿਕੇਸ਼ਨ ਚਾਲੂ ਕਰੋ।',
    ),
  },
  {
    id: 'changeSitePassword',
    for: ['link'],
    urgency: 'hour',
    title: L('Change the password you typed', 'जो पासवर्ड डाला उसे बदलें', 'ਜੋ ਪਾਸਵਰਡ ਪਾਇਆ ਉਸਨੂੰ ਬਦਲੋ'),
    body: L(
      'Change the password of that site or app, and of every other account where you use the same one. If you entered bank or card details, follow the card-and-PIN steps too and call your bank.',
      'उस साइट या ऐप का पासवर्ड बदलें, और हर उस खाते का भी जहाँ वही पासवर्ड है। बैंक या कार्ड की जानकारी भरी हो तो कार्ड और PIN वाले कदम भी अपनाएं और बैंक को कॉल करें।',
      'ਉਸ ਸਾਈਟ ਜਾਂ ਐਪ ਦਾ ਪਾਸਵਰਡ ਬਦਲੋ, ਅਤੇ ਹਰ ਉਸ ਖਾਤੇ ਦਾ ਵੀ ਜਿੱਥੇ ਉਹੀ ਪਾਸਵਰਡ ਹੈ। ਬੈਂਕ ਜਾਂ ਕਾਰਡ ਦੀ ਜਾਣਕਾਰੀ ਭਰੀ ਹੋਵੇ ਤਾਂ ਕਾਰਡ ਅਤੇ PIN ਵਾਲੇ ਕਦਮ ਵੀ ਅਪਣਾਓ ਅਤੇ ਬੈਂਕ ਨੂੰ ਕਾਲ ਕਰੋ।',
    ),
  },
  {
    id: 'reportPortal',
    for: ['any'],
    urgency: (s) => (s.has('money') ? 'hour' : 'today'),
    title: L('File the complaint at cybercrime.gov.in', 'cybercrime.gov.in पर शिकायत दर्ज करें', 'cybercrime.gov.in ਤੇ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰੋ'),
    body: L(
      'Choose Report Financial Fraud for money losses, or Other Cyber Crime. If you called 1930, use the complaint number from its SMS, and file the full complaint ideally within 24 hours. Upload your screenshots and the details from this incident, and save the acknowledgement number.',
      'पैसे का नुकसान हुआ हो तो Report Financial Fraud चुनें, वरना Other Cyber Crime। 1930 पर कॉल किया हो तो उसके SMS का शिकायत नंबर इस्तेमाल करें, और पूरी शिकायत 24 घंटे के भीतर दर्ज करने की कोशिश करें। स्क्रीनशॉट और इस घटना का ब्योरा अपलोड करें, और पावती संख्या सुरक्षित रखें।',
      'ਪੈਸਿਆਂ ਦਾ ਨੁਕਸਾਨ ਹੋਇਆ ਹੋਵੇ ਤਾਂ Report Financial Fraud ਚੁਣੋ, ਨਹੀਂ ਤਾਂ Other Cyber Crime। 1930 ਤੇ ਕਾਲ ਕੀਤੀ ਹੋਵੇ ਤਾਂ ਉਸਦੇ SMS ਦਾ ਸ਼ਿਕਾਇਤ ਨੰਬਰ ਵਰਤੋ, ਅਤੇ ਪੂਰੀ ਸ਼ਿਕਾਇਤ 24 ਘੰਟਿਆਂ ਵਿੱਚ ਦਰਜ ਕਰਨ ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰੋ। ਸਕ੍ਰੀਨਸ਼ਾਟ ਅਤੇ ਇਸ ਘਟਨਾ ਦਾ ਵੇਰਵਾ ਅੱਪਲੋਡ ਕਰੋ, ਅਤੇ ਰਸੀਦ ਨੰਬਰ ਸੰਭਾਲ ਕੇ ਰੱਖੋ।',
    ),
    actions: [PORTAL],
  },
  {
    id: 'lockAadhaar',
    for: ['ids'],
    urgency: 'today',
    title: L('Lock your Aadhaar biometrics', 'अपना आधार बायोमेट्रिक लॉक करें', 'ਆਪਣਾ ਆਧਾਰ ਬਾਇਓਮੈਟ੍ਰਿਕ ਲਾਕ ਕਰੋ'),
    body: L(
      'On the myAadhaar website or the mAadhaar app, lock your biometrics and check your authentication history for entries you do not recognise.',
      'myAadhaar वेबसाइट या mAadhaar ऐप पर अपना बायोमेट्रिक लॉक करें और ऑथेंटिकेशन हिस्ट्री में ऐसी एंट्री देखें जिन्हें आप नहीं पहचानते।',
      'myAadhaar ਵੈੱਬਸਾਈਟ ਜਾਂ mAadhaar ਐਪ ਤੇ ਆਪਣਾ ਬਾਇਓਮੈਟ੍ਰਿਕ ਲਾਕ ਕਰੋ ਅਤੇ ਔਥੈਂਟੀਕੇਸ਼ਨ ਹਿਸਟਰੀ ਵਿੱਚ ਅਜਿਹੀਆਂ ਐਂਟਰੀਆਂ ਵੇਖੋ ਜੋ ਤੁਸੀਂ ਨਹੀਂ ਪਛਾਣਦੇ।',
    ),
    actions: [{ kind: 'url', url: 'https://myaadhaar.uidai.gov.in', label: L('Open myAadhaar', 'myAadhaar खोलें', 'myAadhaar ਖੋਲ੍ਹੋ') }],
  },
  {
    id: 'checkSims',
    for: ['ids'],
    urgency: 'today',
    title: L('See which mobile numbers are in your name', 'देखें आपके नाम पर कौन-से मोबाइल नंबर हैं', 'ਵੇਖੋ ਤੁਹਾਡੇ ਨਾਮ ਤੇ ਕਿਹੜੇ ਮੋਬਾਈਲ ਨੰਬਰ ਹਨ'),
    body: L(
      "The government's TAFCOP service on Sanchar Saathi lists the mobile connections issued on your ID. Report any number that is not yours.",
      'संचार साथी पर सरकार की TAFCOP सेवा आपके ID पर जारी मोबाइल कनेक्शन दिखाती है। जो नंबर आपका नहीं है उसकी रिपोर्ट करें।',
      'ਸੰਚਾਰ ਸਾਥੀ ਤੇ ਸਰਕਾਰ ਦੀ TAFCOP ਸੇਵਾ ਤੁਹਾਡੀ ID ਤੇ ਜਾਰੀ ਮੋਬਾਈਲ ਕਨੈਕਸ਼ਨ ਦਿਖਾਉਂਦੀ ਹੈ। ਜੋ ਨੰਬਰ ਤੁਹਾਡਾ ਨਹੀਂ ਹੈ ਉਸਦੀ ਰਿਪੋਰਟ ਕਰੋ।',
    ),
    actions: [{ kind: 'url', url: 'https://sancharsaathi.gov.in', label: L('Open Sanchar Saathi', 'संचार साथी खोलें', 'ਸੰਚਾਰ ਸਾਥੀ ਖੋਲ੍ਹੋ') }],
  },
  {
    id: 'whatsappSecure',
    for: ['otp'],
    urgency: 'today',
    title: L('Secure WhatsApp, Telegram and other accounts', 'WhatsApp, Telegram और दूसरे खाते सुरक्षित करें', 'WhatsApp, Telegram ਅਤੇ ਹੋਰ ਖਾਤੇ ਸੁਰੱਖਿਅਤ ਕਰੋ'),
    body: L(
      'If the OTP was for a messaging or social app, register your number again, turn on two-step verification and log out unknown linked devices. Warn your contacts not to send money if someone messages from your account.',
      'OTP किसी मैसेजिंग या सोशल ऐप का था तो अपना नंबर दोबारा रजिस्टर करें, टू-स्टेप वेरिफ़िकेशन चालू करें और अनजान लिंक्ड डिवाइस लॉग-आउट करें। अपने संपर्कों को चेताएं कि आपके खाते से कोई पैसे मांगे तो न भेजें।',
      'OTP ਕਿਸੇ ਮੈਸੇਜਿੰਗ ਜਾਂ ਸੋਸ਼ਲ ਐਪ ਦਾ ਸੀ ਤਾਂ ਆਪਣਾ ਨੰਬਰ ਦੁਬਾਰਾ ਰਜਿਸਟਰ ਕਰੋ, ਟੂ-ਸਟੈੱਪ ਵੈਰੀਫ਼ਿਕੇਸ਼ਨ ਚਾਲੂ ਕਰੋ ਅਤੇ ਅਣਜਾਣ ਲਿੰਕਡ ਡਿਵਾਈਸ ਲੌਗ-ਆਊਟ ਕਰੋ। ਆਪਣੇ ਸੰਪਰਕਾਂ ਨੂੰ ਚੇਤਾਵਨੀ ਦਿਓ ਕਿ ਤੁਹਾਡੇ ਖਾਤੇ ਤੋਂ ਕੋਈ ਪੈਸੇ ਮੰਗੇ ਤਾਂ ਨਾ ਭੇਜਣ।',
    ),
  },
  {
    id: 'bankWritten',
    for: ['money', 'otp', 'credentials', 'app'],
    urgency: 'today',
    title: L('Send your bank a written complaint', 'बैंक को लिखित शिकायत भेजें', 'ਬੈਂਕ ਨੂੰ ਲਿਖਤੀ ਸ਼ਿਕਾਇਤ ਭੇਜੋ'),
    body: L(
      "Raise it in the bank's app, by e-mail or at the branch, and keep the acknowledgement. RBI's customer-protection rules favour quick reporting: loss after you report is the bank's, and reporting within 3 working days can mean zero liability when you were not at fault. If you shared a PIN, OTP or password yourself, the loss before you reported may stay with you, so say exactly what happened.",
      'बैंक के ऐप, ईमेल या शाखा में शिकायत दें और पावती रखें। RBI के ग्राहक-सुरक्षा नियम जल्दी रिपोर्ट करने के पक्ष में हैं: रिपोर्ट के बाद का नुकसान बैंक का होता है, और आपकी गलती न होने पर 3 कार्य-दिवस में रिपोर्ट करने से ज़ीरो लायबिलिटी हो सकती है। PIN, OTP या पासवर्ड आपने खुद बताया हो तो रिपोर्ट से पहले का नुकसान आप पर रह सकता है, इसलिए ठीक-ठीक बताएं क्या हुआ।',
      'ਬੈਂਕ ਦੀ ਐਪ, ਈਮੇਲ ਜਾਂ ਸ਼ਾਖਾ ਵਿੱਚ ਸ਼ਿਕਾਇਤ ਦਿਓ ਅਤੇ ਰਸੀਦ ਰੱਖੋ। RBI ਦੇ ਗਾਹਕ-ਸੁਰੱਖਿਆ ਨਿਯਮ ਜਲਦੀ ਰਿਪੋਰਟ ਕਰਨ ਦੇ ਹੱਕ ਵਿੱਚ ਹਨ: ਰਿਪੋਰਟ ਤੋਂ ਬਾਅਦ ਦਾ ਨੁਕਸਾਨ ਬੈਂਕ ਦਾ ਹੁੰਦਾ ਹੈ, ਅਤੇ ਤੁਹਾਡੀ ਗ਼ਲਤੀ ਨਾ ਹੋਣ ਤੇ 3 ਕੰਮਕਾਜੀ ਦਿਨਾਂ ਵਿੱਚ ਰਿਪੋਰਟ ਕਰਨ ਨਾਲ ਜ਼ੀਰੋ ਲਾਇਬਿਲਿਟੀ ਹੋ ਸਕਦੀ ਹੈ। PIN, OTP ਜਾਂ ਪਾਸਵਰਡ ਤੁਸੀਂ ਖ਼ੁਦ ਦੱਸਿਆ ਹੋਵੇ ਤਾਂ ਰਿਪੋਰਟ ਤੋਂ ਪਹਿਲਾਂ ਦਾ ਨੁਕਸਾਨ ਤੁਹਾਡੇ ਉੱਤੇ ਰਹਿ ਸਕਦਾ ਹੈ, ਇਸ ਲਈ ਠੀਕ-ਠੀਕ ਦੱਸੋ ਕੀ ਹੋਇਆ।',
    ),
  },
  {
    id: 'recoveryScam',
    for: ['money'],
    urgency: 'today',
    title: L('Beware of “recovery agents”', '“रिकवरी एजेंट” से सावधान रहें', '“ਰਿਕਵਰੀ ਏਜੰਟਾਂ” ਤੋਂ ਸਾਵਧਾਨ ਰਹੋ'),
    body: L(
      "Anyone who calls or messages offering to get your money back for a fee is another scammer. Search results and social media often show fake helpline numbers. Trust only 1930, cybercrime.gov.in and your bank's own app or card number.",
      'जो भी फीस लेकर आपके पैसे वापस दिलाने का ऑफ़र करे वह एक और ठग है। सर्च रिज़ल्ट और सोशल मीडिया पर अक्सर नकली हेल्पलाइन नंबर दिखते हैं। सिर्फ़ 1930, cybercrime.gov.in और बैंक के अपने ऐप या कार्ड पर छपे नंबर पर भरोसा करें।',
      'ਜੋ ਵੀ ਫ਼ੀਸ ਲੈ ਕੇ ਤੁਹਾਡੇ ਪੈਸੇ ਵਾਪਸ ਦਿਵਾਉਣ ਦੀ ਪੇਸ਼ਕਸ਼ ਕਰੇ ਉਹ ਇੱਕ ਹੋਰ ਠੱਗ ਹੈ। ਸਰਚ ਨਤੀਜਿਆਂ ਅਤੇ ਸੋਸ਼ਲ ਮੀਡੀਆ ਤੇ ਅਕਸਰ ਨਕਲੀ ਹੈਲਪਲਾਈਨ ਨੰਬਰ ਦਿਸਦੇ ਹਨ। ਸਿਰਫ਼ 1930, cybercrime.gov.in ਅਤੇ ਬੈਂਕ ਦੀ ਆਪਣੀ ਐਪ ਜਾਂ ਕਾਰਡ ਤੇ ਛਪੇ ਨੰਬਰ ਤੇ ਭਰੋਸਾ ਕਰੋ।',
    ),
  },
  {
    id: 'factoryReset',
    for: ['app'],
    urgency: 'today',
    title: L('If anything still looks wrong, reset the phone', 'कुछ भी गड़बड़ लगे तो फोन रीसेट करें', 'ਕੁਝ ਵੀ ਗੜਬੜ ਲੱਗੇ ਤਾਂ ਫ਼ੋਨ ਰੀਸੈੱਟ ਕਰੋ'),
    body: L(
      'Back up photos and contacts only (not apps), then factory reset. Reinstall banking apps only after the reset, from the official app store.',
      'सिर्फ़ फोटो और संपर्क का बैकअप लें (ऐप का नहीं), फिर फ़ैक्टरी रीसेट करें। बैंकिंग ऐप रीसेट के बाद ही, आधिकारिक ऐप स्टोर से इंस्टॉल करें।',
      'ਸਿਰਫ਼ ਫ਼ੋਟੋ ਅਤੇ ਸੰਪਰਕਾਂ ਦਾ ਬੈਕਅੱਪ ਲਓ (ਐਪਾਂ ਦਾ ਨਹੀਂ), ਫਿਰ ਫ਼ੈਕਟਰੀ ਰੀਸੈੱਟ ਕਰੋ। ਬੈਂਕਿੰਗ ਐਪਾਂ ਰੀਸੈੱਟ ਤੋਂ ਬਾਅਦ ਹੀ, ਅਧਿਕਾਰਤ ਐਪ ਸਟੋਰ ਤੋਂ ਇੰਸਟਾਲ ਕਰੋ।',
    ),
  },
  {
    id: 'reportNumber',
    for: ['any'],
    urgency: 'week',
    title: L('Report the number to Sanchar Saathi', 'नंबर की रिपोर्ट संचार साथी पर करें', 'ਨੰਬਰ ਦੀ ਰਿਪੋਰਟ ਸੰਚਾਰ ਸਾਥੀ ਤੇ ਕਰੋ'),
    body: L(
      'Use Chakshu on sancharsaathi.gov.in to report the calls, SMS or WhatsApp messages. This helps the telecom department act against the number.',
      'sancharsaathi.gov.in पर Chakshu से कॉल, SMS या WhatsApp संदेशों की रिपोर्ट करें। इससे दूरसंचार विभाग को उस नंबर पर कार्रवाई में मदद मिलती है।',
      'sancharsaathi.gov.in ਤੇ Chakshu ਰਾਹੀਂ ਕਾਲਾਂ, SMS ਜਾਂ WhatsApp ਸੁਨੇਹਿਆਂ ਦੀ ਰਿਪੋਰਟ ਕਰੋ। ਇਸ ਨਾਲ ਦੂਰਸੰਚਾਰ ਵਿਭਾਗ ਨੂੰ ਉਸ ਨੰਬਰ ਤੇ ਕਾਰਵਾਈ ਵਿੱਚ ਮਦਦ ਮਿਲਦੀ ਹੈ।',
    ),
    actions: [{ kind: 'url', url: 'https://sancharsaathi.gov.in/sfc/', label: L('Open Chakshu', 'Chakshu खोलें', 'Chakshu ਖੋਲ੍ਹੋ') }],
  },
  {
    id: 'policeStation',
    for: ['money'],
    urgency: 'week',
    title: L('Consider an FIR at the cyber police station', 'साइबर थाने में FIR पर विचार करें', 'ਸਾਈਬਰ ਥਾਣੇ ਵਿੱਚ FIR ਬਾਰੇ ਸੋਚੋ'),
    body: L(
      'The portal complaint starts the process. For a large loss, also visit the nearest cyber police station with printouts of your evidence and ask about an FIR. Keep a copy of everything you hand over.',
      'पोर्टल की शिकायत से प्रक्रिया शुरू होती है। बड़ा नुकसान हुआ हो तो अपने सबूतों के प्रिंटआउट लेकर नज़दीकी साइबर थाने भी जाएं और FIR के बारे में पूछें। जो भी जमा करें उसकी कॉपी रखें।',
      'ਪੋਰਟਲ ਦੀ ਸ਼ਿਕਾਇਤ ਨਾਲ ਪ੍ਰਕਿਰਿਆ ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ। ਵੱਡਾ ਨੁਕਸਾਨ ਹੋਇਆ ਹੋਵੇ ਤਾਂ ਆਪਣੇ ਸਬੂਤਾਂ ਦੇ ਪ੍ਰਿੰਟਆਊਟ ਲੈ ਕੇ ਨੇੜਲੇ ਸਾਈਬਰ ਥਾਣੇ ਵੀ ਜਾਓ ਅਤੇ FIR ਬਾਰੇ ਪੁੱਛੋ। ਜੋ ਵੀ ਜਮ੍ਹਾਂ ਕਰੋ ਉਸਦੀ ਕਾਪੀ ਰੱਖੋ।',
    ),
  },
  {
    id: 'creditCheck',
    for: ['ids'],
    urgency: 'week',
    title: L('Check your credit report', 'अपनी क्रेडिट रिपोर्ट जांचें', 'ਆਪਣੀ ਕ੍ਰੈਡਿਟ ਰਿਪੋਰਟ ਜਾਂਚੋ'),
    body: L(
      'Look for loans or cards you did not apply for. Each credit bureau gives a free full report once a year. Dispute anything that is not yours.',
      'ऐसे लोन या कार्ड देखें जिनके लिए आपने आवेदन नहीं किया। हर क्रेडिट ब्यूरो साल में एक बार मुफ़्त पूरी रिपोर्ट देता है। जो आपका नहीं है उस पर आपत्ति दर्ज करें।',
      'ਅਜਿਹੇ ਲੋਨ ਜਾਂ ਕਾਰਡ ਵੇਖੋ ਜਿਨ੍ਹਾਂ ਲਈ ਤੁਸੀਂ ਅਰਜ਼ੀ ਨਹੀਂ ਦਿੱਤੀ। ਹਰ ਕ੍ਰੈਡਿਟ ਬਿਊਰੋ ਸਾਲ ਵਿੱਚ ਇੱਕ ਵਾਰ ਮੁਫ਼ਤ ਪੂਰੀ ਰਿਪੋਰਟ ਦਿੰਦਾ ਹੈ। ਜੋ ਤੁਹਾਡਾ ਨਹੀਂ ਹੈ ਉਸ ਤੇ ਇਤਰਾਜ਼ ਦਰਜ ਕਰੋ।',
    ),
  },
  {
    id: 'watchStatements',
    for: ['money', 'otp', 'credentials', 'app'],
    urgency: 'week',
    title: L('Watch your accounts for 30 days', '30 दिन तक अपने खातों पर नज़र रखें', '30 ਦਿਨ ਆਪਣੇ ਖਾਤਿਆਂ ਤੇ ਨਜ਼ਰ ਰੱਖੋ'),
    body: L(
      'Turn on SMS and e-mail alerts, set low UPI and card limits, and check your statements every day for a month.',
      'SMS और ईमेल अलर्ट चालू करें, UPI और कार्ड की सीमा कम रखें, और एक महीने तक रोज़ स्टेटमेंट देखें।',
      'SMS ਅਤੇ ਈਮੇਲ ਅਲਰਟ ਚਾਲੂ ਕਰੋ, UPI ਅਤੇ ਕਾਰਡ ਦੀ ਸੀਮਾ ਘੱਟ ਰੱਖੋ, ਅਤੇ ਇੱਕ ਮਹੀਨਾ ਰੋਜ਼ ਸਟੇਟਮੈਂਟ ਵੇਖੋ।',
    ),
  },
];

const RANK: Record<Urgency, number> = { now: 0, hour: 1, today: 2, week: 3 };

export function buildPlan(opts: { situations: SituationId[]; when: When }): PlanStep[] {
  const sit = new Set<SituationId>(opts.situations);
  const out: Array<PlanStep & { order: number }> = [];
  STEPS.forEach((d, order) => {
    if (!d.for.includes('any') && !d.for.some((f) => sit.has(f as SituationId))) return;
    const urgency = typeof d.urgency === 'function' ? d.urgency(sit) : d.urgency;
    out.push({
      id: d.id,
      urgency,
      text: {
        en: { title: d.title.en, body: d.body.en },
        hi: { title: d.title.hi, body: d.body.hi },
        pa: { title: d.title.pa, body: d.body.pa },
      },
      actions: d.actions ?? [],
      order,
    });
  });
  // The 1930 call is the single most time-sensitive action, so it always leads when money was sent.
  out.sort((a, b) => RANK[a.urgency] - RANK[b.urgency] || a.order - b.order);
  return out.map(({ order: _o, ...s }) => s);
}

export const URGENCY_LABEL: Record<Urgency, L3> = {
  now: L('Do now', 'अभी करें', 'ਹੁਣੇ ਕਰੋ'),
  hour: L('Within the hour', 'एक घंटे में', 'ਇੱਕ ਘੰਟੇ ਵਿੱਚ'),
  today: L('Today', 'आज', 'ਅੱਜ'),
  week: L('This week', 'इस हफ़्ते', 'ਇਸ ਹਫ਼ਤੇ'),
};

export const WHEN_OPTIONS: Array<{ id: When; label: L3 }> = [
  { id: 'hour', label: L('Within the last hour', 'पिछले एक घंटे में', 'ਪਿਛਲੇ ਇੱਕ ਘੰਟੇ ਵਿੱਚ') },
  { id: 'today', label: L('Earlier today', 'आज ही, कुछ देर पहले', 'ਅੱਜ ਹੀ, ਕੁਝ ਦੇਰ ਪਹਿਲਾਂ') },
  { id: 'earlier', label: L('Yesterday or earlier', 'कल या उससे पहले', 'ਕੱਲ੍ਹ ਜਾਂ ਉਸ ਤੋਂ ਪਹਿਲਾਂ') },
];

export function bannerFor(when: When, situations: SituationId[]): L3 {
  const money = situations.includes('money');
  if (when === 'earlier')
    return L(
      'Even if this was a while ago, report it. It protects your rights and helps stop the scammer. Getting money back is harder after the first hours, but it is not impossible.',
      'चाहे यह कुछ समय पहले हुआ हो, रिपोर्ट ज़रूर करें। इससे आपके अधिकार सुरक्षित रहते हैं और ठग को रोकने में मदद मिलती है। शुरुआती घंटों के बाद पैसे वापस पाना मुश्किल होता है, पर नामुमकिन नहीं।',
      'ਭਾਵੇਂ ਇਹ ਕੁਝ ਸਮਾਂ ਪਹਿਲਾਂ ਹੋਇਆ ਹੋਵੇ, ਰਿਪੋਰਟ ਜ਼ਰੂਰ ਕਰੋ। ਇਸ ਨਾਲ ਤੁਹਾਡੇ ਹੱਕ ਸੁਰੱਖਿਅਤ ਰਹਿੰਦੇ ਹਨ ਅਤੇ ਠੱਗ ਨੂੰ ਰੋਕਣ ਵਿੱਚ ਮਦਦ ਮਿਲਦੀ ਹੈ। ਸ਼ੁਰੂਆਤੀ ਘੰਟਿਆਂ ਤੋਂ ਬਾਅਦ ਪੈਸੇ ਵਾਪਸ ਪਾਉਣਾ ਔਖਾ ਹੈ, ਪਰ ਨਾਮੁਮਕਿਨ ਨਹੀਂ।',
    );
  if (money && when === 'hour')
    return L(
      'You are inside the first hour, the best window to stop the money. Do the first steps now, in this order.',
      'आप पहले घंटे के भीतर हैं, पैसे रोकने का सबसे अच्छा समय। पहले कदम अभी इसी क्रम में करें।',
      'ਤੁਸੀਂ ਪਹਿਲੇ ਘੰਟੇ ਦੇ ਅੰਦਰ ਹੋ, ਪੈਸੇ ਰੋਕਣ ਦਾ ਸਭ ਤੋਂ ਵਧੀਆ ਸਮਾਂ। ਪਹਿਲੇ ਕਦਮ ਹੁਣੇ ਇਸੇ ਕ੍ਰਮ ਵਿੱਚ ਕਰੋ।',
    );
  return L(
    'Act now, in this order. The sooner you report, the better.',
    'अभी इसी क्रम में कदम उठाएं। जितनी जल्दी रिपोर्ट करेंगे उतना बेहतर।',
    'ਹੁਣੇ ਇਸੇ ਕ੍ਰਮ ਵਿੱਚ ਕਦਮ ਚੁੱਕੋ। ਜਿੰਨੀ ਜਲਦੀ ਰਿਪੋਰਟ ਕਰੋਗੇ ਓਨਾ ਚੰਗਾ।',
  );
}

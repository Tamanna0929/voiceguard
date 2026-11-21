import type { TacticId } from './types';

/**
 * Multilingual scam-tactic lexicon: English, Hindi (Devanagari + Roman/Hinglish),
 * Punjabi (Gurmukhi + Roman). Rules run fully on-device, so the risk meter reacts
 * instantly and works offline. The optional cloud LLM only adds to this.
 *
 * `base` is the probability-style weight of a single clear occurrence of that tactic.
 * Weights are combined with a noisy-OR in engine.ts, so independent red flags
 * stack up and an OTP request moves the needle far more than mild urgency.
 */

const LB = '(?<![a-z0-9_])';
const LA = '(?![a-z0-9_])';
const latin = (p: string) => `${LB}(?:${p})${LA}`;

// ---- request verbs (someone ASKING you to hand something over) ----
const V_EN = '(?:share|tell|give|send|read|provide|dictate|confirm|disclose|forward|say|submit|verify)(?![a-z])';
const V_HI =
  'bata\\w*|bol\\w*|bhej\\w*|dijiye\\w*|dedo|de\\s?do|dena|dein|de\\s?dijiye|likh\\w*|share\\s?kar\\w*|send\\s?kar\\w*|read\\s?kar\\w*|confirm\\s?kar\\w*|enter\\s?kar\\w*|verify\\s?kar\\w*|update\\s?kar\\w*|batao|bataiye|batana';
const V_PA = 'dass\\w*|dasso|dasna|bhejo|bhejna|deo|dio|dedo|das\\s?do';
const V_DEV =
  'बता\\S*|बोल\\S*|भेज\\S*|दीजिए|दीजिये|दे\\s?दो|दे\\s?दीजिए|देना|दें|लिख\\S*|शेयर\\s?कर\\S*|सेंड\\s?कर\\S*|वेरीफाई\\s?कर\\S*';
const V_GUR = 'ਦੱਸ\\S*|ਭੇਜ\\S*|ਦੇ\\s?ਦਿਓ|ਦਿਓ|ਦੇਣਾ|ਦੇਵੋ|ਲਿਖ\\S*|ਸ਼ੇਅਰ\\s?ਕਰ\\S*';
const VERBS = `${V_EN}|${V_HI}|${V_PA}|${V_DEV}|${V_GUR}`;
const GAP = '[^.!?।\\n]{0,40}?';

/** "tell me the <obj>" or "<obj> batao" */
const requests = (obj: string, extraVerbs = '') => {
  const o = `${LB}(?:${obj})${LA}`;
  const v = extraVerbs ? `${VERBS}|${extraVerbs}` : VERBS;
  return [`${LB}(?:${v})${GAP}${o}`, `${o}${GAP}(?:${v})`];
};
/** Typing secrets into a page or app on a caller's say-so is just as bad as reading them out. */
const V_ENTER = '(?:enter|type|key in|put in|punch in|log ?in|sign in)(?![a-z])';

const OBJ_OTP =
  'otp|o\\.?\\s?t\\.?\\s?p|one[- ]time[- ]password|verification code|security code|(?:6|six)[- ]digit code|sms code|ओ\\s?टी\\s?पी|वन टाइम पासवर्ड|वेरिफिकेशन कोड|ਓ\\s?ਟੀ\\s?ਪੀ|ਵੈਰੀਫਿਕੇਸ਼ਨ ਕੋਡ';
const OBJ_CRED =
  'cvv|cvc|(?:upi|atm|debit|credit|net\\s?banking|mpin|m-pin)\\s?pin|\\bpin\\b|card number|card details|card no\\.?|expiry date|password|passcode|net\\s?banking|login details|account number|सीवीवी|पिन|कार्ड नंबर|कार्ड की डिटेल|पासवर्ड|ਸੀਵੀਵੀ|ਪਿੰਨ|ਕਾਰਡ ਨੰਬਰ|ਪਾਸਵਰਡ';
const OBJ_ID =
  '(?:aadhaar|aadhar|adhar|pan)\\s?(?:card)?\\s?(?:number|no\\.?|details|copy|photo|card)|passport|selfie|आधार\\s?(?:नंबर|कार्ड|की फोटो)|पैन\\s?(?:नंबर|कार्ड)|ਆਧਾਰ\\s?ਨੰਬਰ|ਪੈਨ\\s?ਨੰਬਰ';

export interface PatternDef {
  re: string;
  /** Multiplier on the tactic's strength gain for this pattern (default 1). */
  w?: number;
  /** Whole sentence must also match this (case-insensitive) for the hit to count. */
  requires?: string;
}

export interface TacticDef {
  id: TacticId;
  base: number;
  /** Skip the hit when it sits inside a safety warning ("never share your OTP"). */
  adviceGuard?: boolean;
  patterns: PatternDef[];
}

const p = (re: string, w?: number, requires?: string): PatternDef => ({ re, w, requires });

export const TACTICS: TacticDef[] = [
  {
    id: 'OTP',
    base: 0.55,
    adviceGuard: true,
    patterns: requests(OBJ_OTP).map((r) => p(r)),
  },
  {
    id: 'CREDENTIALS',
    base: 0.6,
    adviceGuard: true,
    patterns: requests(OBJ_CRED, V_ENTER).map((r) => p(r)),
  },
  {
    id: 'PERSONAL_ID',
    base: 0.2,
    adviceGuard: true,
    patterns: requests(OBJ_ID).map((r) => p(r)),
  },
  {
    id: 'REMOTE_ACCESS',
    base: 0.6,
    patterns: [
      p(latin('any\\s?desk|team\\s?viewer|quick\\s?support|rust\\s?desk|ultra\\s?viewer|aweray')),
      p('एनी\\s?डेस्क|टीम\\s?व्यूअर|ਐਨੀਡੈਸਕ'),
      p(latin('share (?:your |the )?screen|screen[- ]shar\\w*|remote (?:access|support|control)')),
      p('स्क्रीन\\s?शेयर|ਸਕਰੀਨ\\s?ਸ਼ੇਅਰ'),
      p(latin('(?:install|download)\\s+(?:this|the|an?)?\\s*(?:\\w+\\s+)?(?:app|apk|application|software)|apk file|app (?:install|download) kar\\w*')),
      p('ऐप\\s?(?:डाउनलोड|इंस्टॉल)|ਐਪ\\s?ਡਾਊਨਲੋਡ'),
      p(latin('(?:click|tap|open)\\s+(?:on\\s+)?(?:the |this )?link|link (?:par|pe) click|link (?:par|pe) tap'), 0.6),
      p('लिंक\\s?(?:पर|पे)\\s?क्लिक', 0.6),
    ],
  },
  {
    id: 'ISOLATION',
    base: 0.55,
    patterns: [
      p(latin('digital arrest|online arrest|house arrest|virtual arrest')),
      p('डिजिटल\\s?अरेस्ट|ਡਿਜੀਟਲ\\s?ਅਰੈਸਟ'),
      p(latin("(?:stay|remain|keep) on (?:the )?(?:video )?(?:call|line|camera)|(?:do not|don't|dont|never) (?:disconnect|cut|hang up|end) (?:the )?(?:call|phone|line)|keep (?:the )?(?:video|camera) on|do not leave (?:the )?(?:room|house|camera)")),
      p(latin('call\\s+(?:mat|na)\\s+(?:kaat|kato|katna|kat)\\w*|phone\\s+mat\\s+(?:kaat|rakh)\\w*|line\\s+(?:pe|par)\\s+bane\\s+rah\\w*|video\\s+call\\s+(?:pe|par)\\s+rah\\w*|call\\s+(?:cut|disconnect)\\s+mat')),
      p('कॉल\\s?(?:मत|ना|न)\\s?काट|फोन\\s?(?:मत|न)\\s?काट|कॉल\\s?पर\\s?बने\\s?रह|वीडियो\\s?कॉल\\s?पर|ਕਾਲ\\s?ਨਾ\\s?ਕੱਟ|ਫ਼ੋਨ\\s?ਨਾ\\s?ਕੱਟ'),
      p(latin('skype|whatsapp video call'), 0.5),
    ],
  },
  {
    id: 'SECRECY',
    base: 0.4,
    patterns: [
      p(latin("(?:do not|don't|dont|never|not to|must not)\\s+(?:tell|inform|share|disclose|discuss|speak|talk)\\s+(?:this |it |about this |with |to )?(?:anyone|anybody|any one|your family|family|others|the bank|bank staff|no one)")),
      p(latin("keep (?:this|it|the matter|everything) (?:confidential|secret|private|between us|to yourself)|confidential matter|top secret|between us")),
      p(latin('kisi\\s?(?:ko|se|ko bhi)\\s+(?:mat|na|nahi|nahin)\\s+(?:bata|baat|bol)\\w*|ghar\\s?(?:walon|wale|walo)\\s?(?:ko)?\\s+(?:mat|na|nahi)\\s+bata\\w*|family\\s+ko\\s+(?:mat|na)\\s+bata\\w*|confidential\\s+rakh\\w*|gupt\\s+rakh\\w*|raaz\\s+rakh\\w*')),
      p('किसी\\s?(?:को|से)\\s?(?:भी\\s?)?(?:मत|न|ना|नहीं)\\s?(?:बता|बोल|बात)\\S*|घर\\s?(?:वालों|वाले)\\s?(?:को)?\\s?(?:मत|न|नहीं)\\s?बता\\S*|गोपनीय|गुप्त\\s?रख\\S*|राज़\\s?रख\\S*|सीक्रेट'),
      p(latin('kisse?\\s+nu\\s+(?:na|nahi|nahin)\\s+dass\\w*|kise\\s+nu\\s+(?:na|nahi)\\s+das\\w*|kisi\\s+nu\\s+(?:na|nahi)\\s+das\\w*')),
      p('ਕਿਸੇ\\s?ਨੂੰ\\s?(?:ਵੀ\\s?)?(?:ਨਾ|ਨਹੀਂ)\\s?ਦੱਸ\\S*|ਗੁਪਤ|ਘਰ\\s?ਵਾਲਿਆਂ\\s?ਨੂੰ\\s?(?:ਨਾ|ਨਹੀਂ)\\s?ਦੱਸ\\S*'),
    ],
  },
  {
    id: 'PAYMENT',
    base: 0.4,
    patterns: [
      p(latin('safe account|rbi account|secure account|verification account|neutral account|escrow account|government account|processing fee|registration fee|security deposit|refundable (?:deposit|amount|fee)|advance fee|clearance (?:fee|charge)s?|customs (?:fee|duty|charge)s?|gift cards?|google play card|bitcoin|crypto wallet|usdt|scan (?:this|the) qr|qr code|collect request|approve (?:the|this) request|pay (?:the )?(?:fine|penalty|challan)')),
      p(latin("(?:pay|paying|payment)\\b[^.!?।\\n]{0,35}?(?:fee|fees|charge|charges|amount|fine|penalty|bill|dues|deposit|(?:₹|rs\\.?|inr)\\s?\\d+|\\d{3,})")),
      p(latin('(?:cancellation|reconnection|re-?activation|processing|handling|service|release|clearance|late|priority|insurance|delivery|redelivery) (?:fee|fees|charge|charges)|(?:secure|payment|short) link|pay (?:through|via|by|using) (?:upi|link|net\\s?banking|card)|(?:lend|loan|borrow) (?:me )?(?:some |a (?:small )?)?(?:money|amount)|need (?:a |some )?(?:small )?(?:amount of )?(?:money|cash|help with money)|tide me over')),
      p('सेफ\\s?अकाउंट|आरबीआई\\s?अकाउंट|प्रोसेसिंग\\s?फीस|रजिस्ट्रेशन\\s?फीस|सिक्योरिटी\\s?डिपॉजिट|गिफ्ट\\s?कार्ड|क्यूआर\\s?कोड|जुर्माना\\s?भर'),
      p(latin('(?:transfer|send|deposit|pay|remit|bhej\\w*|jama\\s?kar\\w*|transfer\\s?kar\\w*|bhejo|bhejna|payment\\s?kar\\w*|pay\\s?kar\\w*)' + '[^.!?।\\n]{0,40}?' + '(?:money|amount|rs\\.?|inr|rupees?|lakh|crore|paise|paisa|upi|gpay|google\\s?pay|phone\\s?pe|phonepe|paytm|account|funds|\\d{3,})')),
      p('(?:ट्रांसफर|भेज\\S*|जमा|पेमेंट)[^.!?।\\n]{0,40}?(?:पैसे|रुपये|रुपए|राशि|रकम|अकाउंट|खाते|यूपीआई|\\d{3,})|(?:पैसे|रुपये|रुपए|राशि|रकम)[^.!?।\\n]{0,30}?(?:ट्रांसफर|भेज\\S*|जमा)'),
      p('(?:ਭੇਜ\\S*|ਜਮ੍ਹਾ|ਟ੍ਰਾਂਸਫਰ)[^.!?।\\n]{0,40}?(?:ਪੈਸੇ|ਰੁਪਏ|ਰਕਮ|ਖਾਤੇ|ਖਾਤਾ|\\d{3,})|(?:ਪੈਸੇ|ਰੁਪਏ|ਰਕਮ)[^.!?।\\n]{0,30}?(?:ਭੇਜ\\S*|ਜਮ੍ਹਾ|ਟ੍ਰਾਂਸਫਰ)'),
    ],
  },
  {
    id: 'THREAT',
    base: 0.35,
    patterns: [
      p(latin('arrest(?:ed)?|warrant|money laundering|narcotics|drugs? (?:case|found|racket)|jail(?:ed)?|prison|blacklist(?:ed|ing)?|legal (?:notice|trouble|action)|criminal case|fir (?:will be|has been|is) \\w+|summons|case (?:has been|will be|is) (?:registered|filed)|court (?:case|order|notice)|seize[ds]?|freez(?:e|ing) your|frozen')),
      p(latin("(?:will|going to|gonna|shall|would)\\s+(?:be\\s+)?(?:blocked|suspended|disconnected|deactivated|closed|cancelled|frozen|seized|terminated|disabled|cut off)|(?:disconnected|blocked|suspended|deactivated) (?:today|tonight|within|in \\d+|immediately)")),
      p(latin('giraft\\w+|gireft\\w+|girft\\w+|warrant|jail\\s+(?:jana|ho)\\w*|(?:band|block|suspend|disconnect)\\s+ho\\s+(?:jayega|jayegi|jaega|jaegi|jayenge)|(?:kat|katt|kaat)\\s+(?:jayega|jayegi|jaega|jaegi|diya jayega)|case\\s+darj|fir\\s+darj|kanooni\\s+karrawai|legal\\s+action|bijli\\s+(?:kat|band)\\w*')),
      p('गिरफ़्?तार|गिरफ्तारी|वारंट|केस\\s?दर्ज|जेल|अदालत|मनी\\s?लॉन्ड्रिंग|नारकोटिक्स|(?:बंद|ब्लॉक|सस्पेंड)\\s?हो\\s?जाएगा|(?:बंद|ब्लॉक|सस्पेंड)\\s?कर\\s?दिया\\s?जाएगा|कनेक्शन\\s?कट|बिजली\\s?(?:कट|काट)|कानूनी\\s?कार्रवाई'),
      p('ਗ੍ਰਿਫ਼?ਤਾਰ|ਵਾਰੰਟ|ਜੇਲ੍ਹ|ਕੇਸ\\s?ਦਰਜ|ਮਨੀ\\s?ਲਾਂਡਰਿੰਗ|(?:ਬੰਦ|ਬਲੌਕ)\\s?ਹੋ\\s?ਜਾਵੇਗਾ|ਕੱਟ\\s?ਦਿੱਤਾ\\s?ਜਾਵੇਗਾ|ਕੁਨੈਕਸ਼ਨ\\s?ਕੱਟ|ਕਾਨੂੰਨੀ\\s?ਕਾਰਵਾਈ'),
    ],
  },
  {
    id: 'AUTHORITY',
    base: 0.18,
    patterns: [
      // Strong: officer / agency titles
      p(latin("(?:cbi|ed|ncb|rbi|trai|customs|crime branch|cyber\\s?crime|narcotics|income tax|enforcement directorate|supreme court|mumbai police|delhi police|police|telecom|dot)\\s+(?:officer|inspector|department|branch|cell|official|team|headquarters)|(?:inspector|sub[- ]?inspector|dcp|acp|ips officer|senior officer|judge)\\b")),
      p(latin('(?:calling|speaking|call(?:ing)? you|this is|i am|i\'m|my name is [a-z]+(?: [a-z]+)?|main|mai|mein)[^.!?।\\n]{0,30}?(?:from|se|ka|ki|of|at)?[^.!?।\\n]{0,6}?(?:cbi|rbi|police|customs|income tax|fedex|dhl|blue\\s?dart|bank manager|head office|customer care|kyc department|uidai|trai|telecom|electricity (?:board|department)|bijli vibhag|broadband|wi-?fi provider|internet provider|jio|airtel|bsnl|vodafone|gtpl|act fibernet|travel agency|insurance company|lic|crime branch|cyber cell|narcotics|ed office|supreme court|high court|sbi|hdfc|icici|axis bank|paytm|amazon|flipkart)')),
      p(latin('badge number|employee id|case number|fir number|file number|complaint number|reference number is')),
      p('(?:सीबीआई|पुलिस|कस्टम|साइबर\\s?क्राइम|नारकोटिक्स|आरबीआई|ट्राई|बिजली\\s?विभाग|इनकम\\s?टैक्स|क्राइम\\s?ब्रांच)[^.!?।\\n]{0,20}?(?:अधिकारी|विभाग|से बोल|से बात|ऑफिस|इंस्पेक्टर|टीम)|इंस्पेक्टर|मैं[^.!?।\\n]{0,25}?से\\s?बोल'),
      p('ਮੈਂ[^.!?।\\n]{0,25}?(?:ਤੋਂ|ਵਿਭਾਗ)[^.!?।\\n]{0,10}?ਬੋਲ|(?:ਪੁਲਿਸ|ਸੀਬੀਆਈ|ਕਸਟਮ|ਸਾਈਬਰ\\s?ਕ੍ਰਾਈਮ|ਬਿਜਲੀ\\s?ਵਿਭਾਗ|ਇਨਕਮ\\s?ਟੈਕਸ)[^.!?।\\n]{0,20}?(?:ਅਧਿਕਾਰੀ|ਵਿਭਾਗ|ਤੋਂ|ਦਫ਼ਤਰ|ਇੰਸਪੈਕਟਰ)|ਇੰਸਪੈਕਟਰ'),
    ],
  },
  {
    id: 'URGENCY',
    base: 0.2,
    patterns: [
      p(latin("immediately|right now|right away|urgent(?:ly)?|asap|this very (?:minute|moment)|last chance|final (?:warning|notice)|expires? (?:today|tonight|soon|in)|within (?:the next )?(?:\\d+|one|two|five|ten|fifteen|thirty) (?:minutes?|mins?|hours?)|in the next (?:\\d+) (?:minutes?|mins?|hours?)|before (?:the )?(?:call|line) (?:ends|disconnects)|hurry|no time")),
      p(latin('abhi\\s+(?:ke\\s+abhi|turant|karo|kijiye|bhej\\w*|bata\\w*|transfer|payment)|turant|turat|fauran|foran|jaldi\\s+(?:karo|kijiye|se|bhej\\w*|bata\\w*)|aaj\\s+hi|aaj\\s+raat|der\\s+mat\\s+kar\\w*|hune\\s+hi|hune\\b|jaldi\\s+kar\\w*|ek\\s+ghante\\s+mein|(?:\\d+|das|bees|tees)\\s+minute\\s+(?:mein|me|ke andar)')),
      p('तुरंत|फौरन|फ़ौरन|अभी\\s?के\\s?अभी|अभी\\s?(?:करो|कीजिए|भेज\\S*|बता\\S*|ट्रांसफर)|जल्दी\\s?(?:करो|कीजिए|से)|आज\\s?(?:ही|रात)|देर\\s?मत|(?:\\d+|दस|बीस)\\s?मिनट\\s?(?:में|के अंदर)'),
      p('ਹੁਣੇ|ਫੌਰਨ|ਤੁਰੰਤ|ਜਲਦੀ\\s?(?:ਕਰੋ|ਕਰ)|ਅੱਜ\\s?(?:ਹੀ|ਰਾਤ)|ਦੇਰ\\s?ਨਾ\\s?ਕਰ|(?:\\d+|ਦਸ|ਵੀਹ)\\s?ਮਿੰਟ\\s?(?:ਵਿੱਚ|ਅੰਦਰ)'),
    ],
  },
  {
    id: 'ACCOUNT_PRETEXT',
    base: 0.25,
    patterns: [
      p(latin('kyc|k\\.y\\.c|know your customer|aadhaar (?:link|update|verification|is not linked)|pan (?:link|update|card (?:is )?(?:block|suspend))|(?:your |ur )?(?:account|sim|card|connection|number|wallet|upi)\\s+(?:is |will be |has been |got )?(?:block|suspend|frozen|deactivat|expire|disconnect|close)\\w*|(?:bill|payment|challan|dues?) (?:is |are )?(?:pending|overdue|unpaid|outstanding)|pending (?:bill|dues?|challan|payment)|(?:parcel|package|consignment|shipment|courier)[^.!?।\\n]{0,40}?(?:seized|stuck|held|detained|illegal|contains|customs|undelivered)|(?:suspicious|illegal|unauthori[sz]ed) (?:transaction|activity|parcel|package|use)|(?:hacked|compromised|infected|virus(?:es)?|malware|security breach|data breach|unauthori[sz]ed access|unusual activity)|(?:power|electricity|supply|connection|meter) (?:was |has been |is |got )?(?:cut|disconnected|stopped)|billing error')),
      p(latin('kyc\\s+(?:update|expire|pending)\\s*(?:karo|kijiye|nahi)?|khata\\s+(?:band|block)|account\\s+(?:band|block)|parcel\\s+(?:pakda|ruka|seized)|bill\\s+(?:baki|pending|bakaya)|bakaya')),
      p('केवाईसी|खाता\\s?(?:बंद|ब्लॉक)|आधार\\s?(?:लिंक|अपडेट)|पैन\\s?(?:लिंक|अपडेट)|सिम\\s?(?:बंद|ब्लॉक)|बिल\\s?(?:बकाया|पेंडिंग)|बकाया|पार्सल[^.!?।\\n]{0,40}?(?:पकड़|जब्त|कस्टम|अवैध|ड्रग)|संदिग्ध\\s?(?:लेनदेन|गतिविधि)'),
      p('ਕੇਵਾਈਸੀ|ਖਾਤਾ\\s?(?:ਬੰਦ|ਬਲੌਕ)|ਆਧਾਰ\\s?(?:ਲਿੰਕ|ਅਪਡੇਟ)|ਬਿੱਲ\\s?(?:ਬਕਾਇਆ|ਪੈਂਡਿੰਗ)|ਬਕਾਇਆ|ਪਾਰਸਲ[^.!?।\\n]{0,40}?(?:ਫੜ|ਜ਼ਬਤ|ਕਸਟਮ|ਗੈਰਕਾਨੂੰਨੀ)'),
    ],
  },
  {
    id: 'LURE',
    base: 0.3,
    patterns: [
      p(latin("lottery|jackpot|lucky draw|kbc|kaun banega|you(?:'ve| have)? won|you are (?:the )?(?:winner|selected|chosen)|congratulations[^.!?।\\n]{0,40}?(?:won|selected|winner|prize)|claim (?:your )?(?:prize|reward|gift|refund|cashback)|(?:prize|reward|cashback|gift|bonus)\\s+(?:money|amount|points|worth|of)|tax refund|refund (?:is |has been )?(?:pending|approved|initiated|ready)|free (?:gift|trip|ticket|iphone|laptop)")),
      p(latin("work from home|part[- ]?time job|earn (?:rs\\.?|₹|inr|up to|upto)?\\s?\\d+|(?:₹|rs\\.?|inr)\\s?\\d[\\d,]*\\s*(?:per|a|every)\\s*(?:day|week|hour)|guaranteed (?:returns?|profit|income)|double your money|investment (?:scheme|opportunity|plan)|trading (?:group|tips|platform)|stock tips|high returns?|task (?:based|job)|like and earn|youtube like|loan (?:approved|offer|pre-?approved)|pre-?approved loan|low interest loan|no (?:documents?|cibil|collateral)")),
      p(latin('lottery\\s+lag\\w*|inaam|jeet\\s+gaye|jeeta\\s+hai|aapne\\s+jeet\\w*|badhai|refund\\s+(?:aaya|mil)\\w*|loan\\s+(?:pass|approve|mil)\\w*|ghar\\s+baithe\\s+kamai|paise\\s+double|nivesh')),
      p('इनाम|लॉटरी|जीत\\s?(?:गए|ली|लिया|ा है)|बधाई|रिफंड|लकी\\s?ड्रा|केबीसी|घर\\s?बैठे\\s?कमाई|पार्ट\\s?टाइम\\s?जॉब|लोन\\s?(?:पास|मंज़ूर|मंजूर)|निवेश\\s?(?:योजना|मौका)|पैसे\\s?दुगुने'),
      p('ਇਨਾਮ|ਲਾਟਰੀ|ਜਿੱਤ\\S*|ਵਧਾਈ|ਰਿਫੰਡ|ਲੱਕੀ\\s?ਡਰਾਅ|ਘਰ\\s?ਬੈਠੇ\\s?ਕਮਾਈ|ਲੋਨ\\s?(?:ਪਾਸ|ਮਨਜ਼ੂਰ)|ਨਿਵੇਸ਼'),
    ],
  },
  {
    id: 'EMERGENCY',
    base: 0.3,
    patterns: [
      p(latin("(?:son|daughter|nephew|grandson|granddaughter|husband|wife|brother|sister|beta|beti|bhai|papa|mummy|mama|nana|dadu|pota|poti|bhanja|bhatija)[^.!?।\\n]{0,45}?(?:accident|arrest\\w*|hospital|jail|police|bail|kidnap\\w*|custody|emergency|critical|operation|surgery)|(?:new|naya|changed my|number badal)\\s+(?:phone\\s+)?number|guess who|can you guess|pehchan\\w*|save this number|bail (?:money|amount)|medical (?:emergency|expenses|bills?)")),
      p('(?:बेटा|बेटी|बेटे|बहू|पति|भाई|पापा|मम्मी|पोता|पोती|भांजा|भतीजा)[^.!?।\\n]{0,45}?(?:एक्सीडेंट|गिरफ्तार|अस्पताल|जेल|पुलिस|ज़मानत|जमानत|किडनैप|हिरासत|इमरजेंसी|ऑपरेशन)|नया\\s?नंबर|नंबर\\s?बदल|पहचाना|ज़मानत\\s?के\\s?पैसे'),
      p('(?:ਪੁੱਤ|ਪੁੱਤਰ|ਧੀ|ਭਰਾ|ਪਤੀ|ਪੋਤਾ|ਭਤੀਜਾ|ਭਾਣਜਾ)[^.!?।\\n]{0,45}?(?:ਹਾਦਸਾ|ਗ੍ਰਿਫ਼?ਤਾਰ|ਹਸਪਤਾਲ|ਜੇਲ੍ਹ|ਪੁਲਿਸ|ਜ਼ਮਾਨਤ|ਇਮਰਜੈਂਸੀ|ਅਪਰੇਸ਼ਨ)|ਨਵਾਂ\\s?ਨੰਬਰ|ਪਛਾਣਿਆ'),
    ],
  },
];

/** Safety-advice phrases that mean "never do X" — a bank warning, not a request. */
export const ADVICE_RE = new RegExp(
  [
    "(?:never|do not|don't|dont|should not|must not|not to|no one will ask|will never ask|won't ask|never ask)\\s+(?:(?:this|it|your|the|an?|any|otp|pin|cvv|code|with|to|anyone|anybody|else|ever|please|be|asked|ask|for)\\s+){0,4}(?:share|tell|give|send|disclose|reveal|provide|forward|ask)",
    '(?:kabhi|kisi ko|kisi se)\\s+(?:bhi\\s+)?(?:share|bata|batana|dena|dein)\\w*\\s+(?:nahi|nahin|mat)',
    '(?:mat|nahi|nahin|na)\\s+(?:share|bata|batana|dena|dein|dijiye|bhejna)\\w*',
    'किसी\\s?को\\s?(?:भी\\s?)?(?:ना|न|नहीं|मत)\\s?(?:बताएं|बताए|बताना|दें|दे|शेयर)',
    '(?:कभी\\s?(?:भी\\s?)?)?(?:शेयर|साझा)\\s?(?:ना|न|नहीं|मत)\\s?(?:करें|करे|करना)',
    'ਕਿਸੇ\\s?ਨਾਲ\\s?(?:ਵੀ\\s?)?(?:ਸਾਂਝਾ|ਸ਼ੇਅਰ)\\s?(?:ਨਾ|ਨਹੀਂ)\\s?ਕਰ',
    '(?:ਕਦੇ\\s?(?:ਵੀ\\s?)?)?(?:ਸ਼ੇਅਰ|ਸਾਂਝਾ)\\s?(?:ਨਾ|ਨਹੀਂ)\\s?ਕਰ',
  ].join('|'),
  'iu',
);

export const PAIR_COMBOS: Array<{ a: TacticId[]; b: TacticId[]; p: number }> = [
  { a: ['AUTHORITY'], b: ['THREAT'], p: 0.3 },
  { a: ['AUTHORITY'], b: ['PAYMENT'], p: 0.35 },
  { a: ['THREAT'], b: ['PAYMENT'], p: 0.4 },
  { a: ['ISOLATION'], b: ['AUTHORITY', 'THREAT', 'PAYMENT'], p: 0.45 },
  { a: ['SECRECY'], b: ['PAYMENT', 'OTP', 'CREDENTIALS'], p: 0.45 },
  { a: ['OTP'], b: ['URGENCY'], p: 0.4 },
  { a: ['OTP', 'CREDENTIALS'], b: ['THREAT', 'ACCOUNT_PRETEXT', 'LURE', 'AUTHORITY'], p: 0.35 },
  { a: ['URGENCY'], b: ['PAYMENT'], p: 0.3 },
  { a: ['LURE'], b: ['PAYMENT', 'PERSONAL_ID', 'OTP', 'CREDENTIALS'], p: 0.4 },
  { a: ['EMERGENCY'], b: ['PAYMENT', 'SECRECY', 'URGENCY'], p: 0.45 },
  { a: ['REMOTE_ACCESS'], b: ['ACCOUNT_PRETEXT', 'AUTHORITY', 'PAYMENT', 'OTP'], p: 0.4 },
  { a: ['ACCOUNT_PRETEXT'], b: ['THREAT', 'PAYMENT'], p: 0.25 },
];

export const TACTIC_BASE: Record<TacticId, number> = Object.fromEntries(
  TACTICS.map((t) => [t.id, t.base]),
) as Record<TacticId, number>;

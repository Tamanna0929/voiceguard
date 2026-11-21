/**
 * Original, hand-written call scripts modelled on the scam patterns that Indian
 * authorities (I4C / 1930) and the public datasets describe. They power
 * (a) the reliable Demo mode, (b) Awareness mode, and (c) the engine regression tests.
 * Names, numbers and organisations are fictional or generic.
 */
export type Speaker = 'caller' | 'you';
export interface Turn {
  who: Speaker;
  text: string;
}
export interface CallScript {
  id: string;
  title: { en: string; hi: string; pa: string };
  /** Speech-synthesis locale used when playing the script out loud for the mic demo. */
  lang: 'en-IN' | 'hi-IN' | 'pa-IN';
  scam: boolean;
  /** What to teach after the replay. */
  lesson: { en: string; hi: string; pa: string };
  turns: Turn[];
}

export const SCRIPTS: CallScript[] = [
  {
    id: 'digital-arrest',
    title: { en: 'Digital arrest (fake CBI)', hi: 'डिजिटल अरेस्ट (नकली CBI)', pa: 'ਡਿਜੀਟਲ ਅਰੈਸਟ (ਨਕਲੀ CBI)' },
    lang: 'en-IN',
    scam: true,
    lesson: {
      en: 'No agency in India arrests anyone over a phone or video call, and none asks you to move money to a "safe account".',
      hi: 'भारत में कोई भी एजेंसी फोन या वीडियो कॉल पर गिरफ्तारी नहीं करती और "सेफ अकाउंट" में पैसे नहीं मंगाती।',
      pa: 'ਭਾਰਤ ਵਿੱਚ ਕੋਈ ਏਜੰਸੀ ਫ਼ੋਨ ਜਾਂ ਵੀਡੀਓ ਕਾਲ ਤੇ ਗ੍ਰਿਫ਼ਤਾਰੀ ਨਹੀਂ ਕਰਦੀ ਅਤੇ "ਸੇਫ਼ ਅਕਾਊਂਟ" ਵਿੱਚ ਪੈਸੇ ਨਹੀਂ ਮੰਗਦੀ।',
    },
    turns: [
      { who: 'caller', text: 'Hello, I am Inspector Rathore calling from the CBI cyber crime branch.' },
      { who: 'you', text: 'CBI? What is this about?' },
      { who: 'caller', text: 'A parcel booked on your Aadhaar was found with drugs. There is a money laundering case against you.' },
      { who: 'you', text: 'But I never sent any parcel.' },
      { who: 'caller', text: 'You will be arrested today. A warrant has been issued. Do not disconnect this video call.' },
      { who: 'caller', text: 'This is a confidential matter, do not tell anyone, not even your family.' },
      { who: 'you', text: 'Please, what should I do?' },
      { who: 'caller', text: 'To prove your innocence, transfer your savings of five lakh rupees to the RBI safe account immediately.' },
      { who: 'caller', text: 'Tell me the OTP that you receive right now or we will arrest you.' },
    ],
  },
  {
    id: 'kyc-expiry',
    title: { en: 'Bank KYC expiry', hi: 'बैंक KYC एक्सपायरी', pa: 'ਬੈਂਕ KYC ਮਿਆਦ ਪੁੱਗਣੀ' },
    lang: 'en-IN',
    scam: true,
    lesson: {
      en: 'Banks never ask for OTP, PIN or CVV on a call. KYC is updated at a branch or in the official app.',
      hi: 'बैंक कभी कॉल पर OTP, PIN या CVV नहीं मांगता। KYC शाखा या आधिकारिक ऐप में अपडेट होता है।',
      pa: 'ਬੈਂਕ ਕਦੇ ਕਾਲ ਤੇ OTP, PIN ਜਾਂ CVV ਨਹੀਂ ਮੰਗਦਾ। KYC ਸ਼ਾਖਾ ਜਾਂ ਅਧਿਕਾਰਤ ਐਪ ਵਿੱਚ ਅਪਡੇਟ ਹੁੰਦੀ ਹੈ।',
    },
    turns: [
      { who: 'caller', text: 'Namaste sir, main SBI head office se bol raha hoon.' },
      { who: 'caller', text: 'Aapka KYC expire ho gaya hai, aaj raat tak update nahi kiya to account band ho jayega.' },
      { who: 'you', text: 'Achha, ab kya karna hoga?' },
      { who: 'caller', text: 'Bas ek minute lagega. Aapke phone par OTP aaya hoga, wo mujhe abhi batao.' },
      { who: 'caller', text: 'Aur apna card number aur CVV bhi bata dijiye, turant update ho jayega.' },
      { who: 'caller', text: 'Kisi ko mat batana, ye confidential process hai.' },
    ],
  },
  {
    id: 'parcel-customs',
    title: { en: 'Courier / customs parcel', hi: 'कूरियर / कस्टम पार्सल', pa: 'ਕੋਰੀਅਰ / ਕਸਟਮ ਪਾਰਸਲ' },
    lang: 'hi-IN',
    scam: true,
    lesson: {
      en: 'Customs and couriers do not demand fees by UPI or gift cards over a call.',
      hi: 'कस्टम या कूरियर वाले कॉल पर UPI या गिफ्ट कार्ड से फीस नहीं मांगते।',
      pa: 'ਕਸਟਮ ਜਾਂ ਕੋਰੀਅਰ ਵਾਲੇ ਕਾਲ ਤੇ UPI ਜਾਂ ਗਿਫ਼ਟ ਕਾਰਡ ਨਾਲ ਫ਼ੀਸ ਨਹੀਂ ਮੰਗਦੇ।',
    },
    turns: [
      { who: 'caller', text: 'नमस्ते, मैं कस्टम विभाग से बोल रहा हूँ।' },
      { who: 'caller', text: 'आपके नाम का एक पार्सल कस्टम में पकड़ा गया है, उसमें अवैध सामान मिला है।' },
      { who: 'you', text: 'लेकिन मैंने तो कोई पार्सल मंगाया ही नहीं।' },
      { who: 'caller', text: 'आपके खिलाफ केस दर्ज हो जाएगा और आपको गिरफ्तार किया जा सकता है।' },
      { who: 'caller', text: 'अभी के अभी प्रोसेसिंग फीस के पचास हजार रुपये ट्रांसफर कीजिए।' },
      { who: 'caller', text: 'यह बात किसी को मत बताना और कॉल मत काटना।' },
    ],
  },
  {
    id: 'electricity-pa',
    title: { en: 'Electricity bill cut-off', hi: 'बिजली कनेक्शन कटना', pa: 'ਬਿਜਲੀ ਕੁਨੈਕਸ਼ਨ ਕੱਟਣਾ' },
    lang: 'pa-IN',
    scam: true,
    lesson: {
      en: 'Power boards send official notices; they never ask you to pay a personal number or share an OTP.',
      hi: 'बिजली विभाग लिखित नोटिस भेजता है; वह निजी नंबर पर भुगतान या OTP नहीं मांगता।',
      pa: 'ਬਿਜਲੀ ਵਿਭਾਗ ਲਿਖਤੀ ਨੋਟਿਸ ਭੇਜਦਾ ਹੈ; ਉਹ ਨਿੱਜੀ ਨੰਬਰ ਤੇ ਭੁਗਤਾਨ ਜਾਂ OTP ਨਹੀਂ ਮੰਗਦਾ।',
    },
    turns: [
      { who: 'caller', text: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਮੈਂ ਬਿਜਲੀ ਵਿਭਾਗ ਤੋਂ ਬੋਲ ਰਿਹਾ ਹਾਂ।' },
      { who: 'caller', text: 'ਤੁਹਾਡਾ ਪਿਛਲੇ ਮਹੀਨੇ ਦਾ ਬਿੱਲ ਬਕਾਇਆ ਹੈ, ਅੱਜ ਰਾਤ ਕੁਨੈਕਸ਼ਨ ਕੱਟ ਦਿੱਤਾ ਜਾਵੇਗਾ।' },
      { who: 'you', text: 'ਪਰ ਮੈਂ ਤਾਂ ਬਿੱਲ ਭਰ ਦਿੱਤਾ ਸੀ।' },
      { who: 'caller', text: 'ਹੁਣੇ ਇਸ ਨੰਬਰ ਤੇ ਦੋ ਹਜ਼ਾਰ ਰੁਪਏ ਭੇਜੋ।' },
      { who: 'caller', text: 'ਤੁਹਾਡੇ ਫ਼ੋਨ ਤੇ ਇੱਕ ਓਟੀਪੀ ਆਵੇਗਾ, ਉਹ ਮੈਨੂੰ ਦੱਸੋ।' },
      { who: 'caller', text: 'ਕਿਸੇ ਨੂੰ ਨਾ ਦੱਸਣਾ।' },
    ],
  },
  {
    id: 'lottery-kbc',
    title: { en: 'Lottery / prize', hi: 'लॉटरी / इनाम', pa: 'ਲਾਟਰੀ / ਇਨਾਮ' },
    lang: 'en-IN',
    scam: true,
    lesson: {
      en: 'You cannot win a lottery you never entered, and real prizes never need an advance fee.',
      hi: 'जिस लॉटरी में आपने हिस्सा ही नहीं लिया, उसमें इनाम नहीं मिलता; असली इनाम के लिए पहले फीस नहीं लगती।',
      pa: 'ਜਿਸ ਲਾਟਰੀ ਵਿੱਚ ਤੁਸੀਂ ਹਿੱਸਾ ਨਹੀਂ ਲਿਆ, ਉਸ ਵਿੱਚ ਇਨਾਮ ਨਹੀਂ ਮਿਲਦਾ; ਅਸਲੀ ਇਨਾਮ ਲਈ ਪਹਿਲਾਂ ਫ਼ੀਸ ਨਹੀਂ ਲੱਗਦੀ।',
    },
    turns: [
      { who: 'caller', text: 'Congratulations! You have won twenty five lakh rupees in the KBC lucky draw.' },
      { who: 'you', text: 'Really? I did not enter anything.' },
      { who: 'caller', text: 'Your mobile number was selected. To claim your prize you must pay a registration fee of eight thousand rupees.' },
      { who: 'caller', text: 'Please send the money by UPI right now, the offer expires today.' },
      { who: 'caller', text: 'Also share your Aadhaar number and bank account number for verification.' },
    ],
  },
  {
    id: 'remote-support',
    title: { en: 'Remote-access “support”', hi: 'रिमोट एक्सेस “सपोर्ट”', pa: 'ਰਿਮੋਟ ਐਕਸੈਸ “ਸਪੋਰਟ”' },
    lang: 'en-IN',
    scam: true,
    lesson: {
      en: 'Never install AnyDesk/TeamViewer-type apps for a caller. They can see your screen and your OTPs.',
      hi: 'किसी कॉलर के कहने पर AnyDesk/TeamViewer जैसे ऐप कभी इंस्टॉल न करें। वे आपकी स्क्रीन और OTP देख सकते हैं।',
      pa: 'ਕਿਸੇ ਕਾਲਰ ਦੇ ਕਹਿਣ ਤੇ AnyDesk/TeamViewer ਵਰਗੀਆਂ ਐਪਾਂ ਕਦੇ ਇੰਸਟਾਲ ਨਾ ਕਰੋ। ਉਹ ਤੁਹਾਡੀ ਸਕਰੀਨ ਅਤੇ OTP ਵੇਖ ਸਕਦੇ ਹਨ।',
    },
    turns: [
      { who: 'caller', text: 'This is customer care. We detected suspicious activity on your account.' },
      { who: 'you', text: 'What suspicious activity?' },
      { who: 'caller', text: 'To block the fraud, please install AnyDesk from the Play Store and share your screen.' },
      { who: 'caller', text: 'Now read out the six digit code that just came on your phone, it is urgent.' },
    ],
  },
  {
    id: 'family-emergency',
    title: { en: 'Family emergency', hi: 'परिवार में इमरजेंसी', pa: 'ਪਰਿਵਾਰ ਵਿੱਚ ਐਮਰਜੈਂਸੀ' },
    lang: 'en-IN',
    scam: true,
    lesson: {
      en: 'Hang up and call the relative on their saved number. Scammers rely on panic and on you not checking.',
      hi: 'कॉल काटकर रिश्तेदार को उसके पुराने नंबर पर फोन करें। ठग घबराहट पर भरोसा करते हैं।',
      pa: 'ਕਾਲ ਕੱਟ ਕੇ ਰਿਸ਼ਤੇਦਾਰ ਨੂੰ ਉਸਦੇ ਪੁਰਾਣੇ ਨੰਬਰ ਤੇ ਫ਼ੋਨ ਕਰੋ। ਠੱਗ ਘਬਰਾਹਟ ਤੇ ਭਰੋਸਾ ਕਰਦੇ ਹਨ।',
    },
    turns: [
      { who: 'caller', text: 'Dadu, pehchana? Main bol raha hoon, ye mera naya number hai.' },
      { who: 'you', text: 'Arre beta, kya hua?' },
      { who: 'caller', text: 'Dadu, mera accident ho gaya hai, main hospital mein hoon, police case ban gaya hai.' },
      { who: 'caller', text: 'Abhi bail ke paise bhejo, ye is account mein transfer kar do, papa ko mat batana.' },
    ],
  },
  {
    id: 'genuine-bank',
    title: { en: 'Genuine bank call (safe)', hi: 'असली बैंक कॉल (सुरक्षित)', pa: 'ਅਸਲੀ ਬੈਂਕ ਕਾਲ (ਸੁਰੱਖਿਅਤ)' },
    lang: 'en-IN',
    scam: false,
    lesson: {
      en: 'A real call explains itself, lets you hang up and call the number on your card, and never rushes you.',
      hi: 'असली कॉल खुद को समझाती है, आपको कार्ड पर छपे नंबर पर फोन करने देती है और जल्दबाज़ी नहीं करती।',
      pa: 'ਅਸਲੀ ਕਾਲ ਆਪਣੀ ਗੱਲ ਸਮਝਾਉਂਦੀ ਹੈ, ਤੁਹਾਨੂੰ ਕਾਰਡ ਤੇ ਛਪੇ ਨੰਬਰ ਤੇ ਫ਼ੋਨ ਕਰਨ ਦਿੰਦੀ ਹੈ ਅਤੇ ਜਲਦਬਾਜ਼ੀ ਨਹੀਂ ਕਰਦੀ।',
    },
    turns: [
      { who: 'caller', text: 'Good morning, this is a courtesy call from your bank about the new savings account you opened last week.' },
      { who: 'you', text: 'Okay, yes I did open it.' },
      { who: 'caller', text: 'Your passbook is ready at the branch. You can collect it any day this month with a photo ID.' },
      { who: 'caller', text: 'Please remember we will never ask for your OTP, PIN or password on a call.' },
      { who: 'you', text: 'Thank you, I will visit on Saturday.' },
    ],
  },
  {
    id: 'genuine-family',
    title: { en: 'Normal family chat (safe)', hi: 'सामान्य पारिवारिक बातचीत (सुरक्षित)', pa: 'ਆਮ ਪਰਿਵਾਰਕ ਗੱਲਬਾਤ (ਸੁਰੱਖਿਅਤ)' },
    lang: 'en-IN',
    scam: false,
    lesson: {
      en: 'Everyday calls should stay in the green zone.',
      hi: 'रोज़मर्रा की कॉल हरे ज़ोन में ही रहनी चाहिए।',
      pa: 'ਰੋਜ਼ਾਨਾ ਦੀਆਂ ਕਾਲਾਂ ਹਰੇ ਜ਼ੋਨ ਵਿੱਚ ਹੀ ਰਹਿਣੀਆਂ ਚਾਹੀਦੀਆਂ ਹਨ।',
    },
    turns: [
      { who: 'caller', text: 'Hello beta, ghar aa gaya hoon, darwaza khol do.' },
      { who: 'you', text: 'Haan papa, abhi kholta hoon.' },
      { who: 'caller', text: 'Kal subah doctor appointment hai nau baje, fasting rehna.' },
      { who: 'you', text: 'Theek hai, main mummy ko bhi bata dunga.' },
    ],
  },
];

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Plan, Settings } from '../services/storage';
import { BackBar, Section, TOP, k } from '../ui/kit';
import { C } from '../ui/theme';
import { tr } from '../ui/i18n';

type L3 = [string, string, string];
const pick = (lang: Settings['lang'], t: L3) => (lang === 'hi' ? t[1] : lang === 'pa' ? t[2] : t[0]);

/** live = works in this build, soon = planned. We label this honestly so nobody is misled. */
type Feat = { t: L3; on: boolean; soon?: boolean };

const SOON: L3 = ['coming soon', 'जल्द आ रहा है', 'ਜਲਦੀ ਆ ਰਿਹਾ ਹੈ'];
const LIVE: L3 = ['works now', 'अभी चालू', 'ਹੁਣ ਚਾਲੂ'];

const PLANS: { id: Plan; icon: string; name: L3; price: L3; who: L3; feats: Feat[] }[] = [
  {
    id: 'free',
    icon: '🆓',
    name: ['Free', 'फ्री', 'ਫ੍ਰੀ'],
    price: ['₹0 forever', '₹0 हमेशा', '₹0 ਹਮੇਸ਼ਾ'],
    who: ['Everyone. Safety is never locked.', 'सभी के लिए। सुरक्षा कभी लॉक नहीं होती।', 'ਸਭ ਲਈ। ਸੁਰੱਖਿਆ ਕਦੇ ਲਾਕ ਨਹੀਂ ਹੁੰਦੀ।'],
    feats: [
      { t: ['Live scam warnings, risk meter, HANG UP alert', 'लाइव स्कैम चेतावनी, रिस्क मीटर, HANG UP अलर्ट', 'ਲਾਈਵ ਸਕੈਮ ਚੇਤਾਵਨੀ, ਰਿਸਕ ਮੀਟਰ, HANG UP ਅਲਰਟ'], on: true },
      { t: ['On-device model, nothing leaves the phone', 'ऑन-डिवाइस मॉडल, कुछ भी फोन से बाहर नहीं', 'ਆਨ-ਡਿਵਾਈਸ ਮਾਡਲ, ਕੁਝ ਵੀ ਫ਼ੋਨ ਤੋਂ ਬਾਹਰ ਨਹੀਂ'], on: true },
      { t: ['Message checker and recovery steps', 'मैसेज चेकर और रिकवरी स्टेप', 'ਮੈਸੇਜ ਚੈਕਰ ਅਤੇ ਰਿਕਵਰੀ ਕਦਮ'], on: true },
      { t: ['Hindi, Punjabi and English', 'हिंदी, पंजाबी और अंग्रेज़ी', 'ਹਿੰਦੀ, ਪੰਜਾਬੀ ਅਤੇ ਅੰਗਰੇਜ਼ੀ'], on: true },
      { t: ['Family alert to 1 person', '1 व्यक्ति को फैमिली अलर्ट', '1 ਵਿਅਕਤੀ ਨੂੰ ਫੈਮਿਲੀ ਅਲਰਟ'], on: true },
      { t: ['AI second opinion (masked text only)', 'AI दूसरी राय (सिर्फ़ मास्क किया टेक्स्ट)', 'AI ਦੂਜੀ ਰਾਏ (ਸਿਰਫ਼ ਮਾਸਕ ਕੀਤਾ ਟੈਕਸਟ)'], on: false },
      { t: ['Family alert to up to 5 people', '5 लोगों तक फैमिली अलर्ट', '5 ਲੋਕਾਂ ਤੱਕ ਫੈਮਿਲੀ ਅਲਰਟ'], on: false, soon: true },
      { t: ['Extra protection mode for parents', 'माता-पिता के लिए अतिरिक्त सुरक्षा मोड', 'ਮਾਪਿਆਂ ਲਈ ਵਾਧੂ ਸੁਰੱਖਿਆ ਮੋਡ'], on: false, soon: true },
    ],
  },
  {
    id: 'family',
    icon: '👨‍👩‍👧',
    name: ['Family Shield', 'फैमिली शील्ड', 'ਫੈਮਿਲੀ ਸ਼ੀਲਡ'],
    price: ['₹99/month or ₹799/year (our guess)', '₹99/माह या ₹799/वर्ष (हमारा अनुमान)', '₹99/ਮਹੀਨਾ ਜਾਂ ₹799/ਸਾਲ (ਸਾਡਾ ਅੰਦਾਜ਼ਾ)'],
    who: ['Families who want to protect parents.', 'जो परिवार माता-पिता को बचाना चाहते हैं।', 'ਜੋ ਪਰਿਵਾਰ ਮਾਪਿਆਂ ਨੂੰ ਬਚਾਉਣਾ ਚਾਹੁੰਦੇ ਹਨ।'],
    feats: [
      { t: ['Everything in Free', 'फ्री का सब कुछ', 'ਫ੍ਰੀ ਦਾ ਸਭ ਕੁਝ'], on: true },
      { t: ['AI second opinion (masked text only)', 'AI दूसरी राय (सिर्फ़ मास्क किया टेक्स्ट)', 'AI ਦੂਜੀ ਰਾਏ (ਸਿਰਫ਼ ਮਾਸਕ ਕੀਤਾ ਟੈਕਸਟ)'], on: true },
      { t: ['Family alert to up to 5 people', '5 लोगों तक फैमिली अलर्ट', '5 ਲੋਕਾਂ ਤੱਕ ਫੈਮਿਲੀ ਅਲਰਟ'], on: true, soon: true },
      { t: ['Extra protection mode for parents', 'माता-पिता के लिए अतिरिक्त सुरक्षा मोड', 'ਮਾਪਿਆਂ ਲਈ ਵਾਧੂ ਸੁਰੱਖਿਆ ਮੋਡ'], on: true, soon: true },
    ],
  },
  {
    id: 'bank',
    icon: '🏦',
    name: ['Bank partner', 'बैंक पार्टनर', 'ਬੈਂਕ ਪਾਰਟਨਰ'],
    price: ['Free for you. Your bank pays.', 'आपके लिए फ्री। बैंक पैसे देता है।', 'ਤੁਹਾਡੇ ਲਈ ਫ੍ਰੀ। ਬੈਂਕ ਪੈਸੇ ਦਿੰਦਾ ਹੈ।'],
    who: ['Customers of a bank that licenses VoiceGuard.', 'उस बैंक के ग्राहक जिसने VoiceGuard का लाइसेंस लिया है।', 'ਉਸ ਬੈਂਕ ਦੇ ਗਾਹਕ ਜਿਸ ਨੇ VoiceGuard ਦਾ ਲਾਇਸੈਂਸ ਲਿਆ ਹੈ।'],
    feats: [
      { t: ['Everything in Family Shield', 'फैमिली शील्ड का सब कुछ', 'ਫੈਮਿਲੀ ਸ਼ੀਲਡ ਦਾ ਸਭ ਕੁਝ'], on: true },
      { t: ['One-tap link to your bank\'s fraud helpline', 'बैंक की फ्रॉड हेल्पलाइन का वन-टैप लिंक', 'ਬੈਂਕ ਦੀ ਫਰਾਡ ਹੈਲਪਲਾਈਨ ਦਾ ਵਨ-ਟੈਪ ਲਿੰਕ'], on: true, soon: true },
      { t: ['Bank sees only counts, never calls or text', 'बैंक को सिर्फ़ गिनती दिखती है, कॉल या टेक्स्ट नहीं', 'ਬੈਂਕ ਨੂੰ ਸਿਰਫ਼ ਗਿਣਤੀ ਦਿੱਸਦੀ ਹੈ, ਕਾਲ ਜਾਂ ਟੈਕਸਟ ਨਹੀਂ'], on: true, soon: true },
    ],
  },
];

/** Plans screen: switch between Free, Family Shield and Bank partner. Demo switch only, no real payment. */
export function PlansScreen({ settings, onChange, onBack }: { settings: Settings; onChange: (s: Settings) => void; onBack: () => void }) {
  const lang = settings.lang;
  const [view, setView] = useState<Plan>(settings.plan);
  const p = PLANS.find((x) => x.id === view)!;
  const active = settings.plan === view;

  return (
    <View style={s.root}>
      <BackBar label={tr(lang, 'back')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <Text style={k.h}>⭐ {tr(lang, 'plansTitle')}</Text>
        <Text style={[k.text, { marginTop: 6, fontWeight: '700' }]}>
          {pick(lang, ['Warnings that keep you safe are always free. Paid plans add family and AI extras.', 'सुरक्षा की चेतावनी हमेशा फ्री है। पेड प्लान में फैमिली और AI एक्स्ट्रा मिलते हैं।', 'ਸੁਰੱਖਿਆ ਦੀ ਚੇਤਾਵਨੀ ਹਮੇਸ਼ਾ ਫ੍ਰੀ ਹੈ। ਪੇਡ ਪਲਾਨ ਵਿੱਚ ਫੈਮਿਲੀ ਅਤੇ AI ਐਕਸਟਰਾ ਮਿਲਦੇ ਹਨ।'])}
        </Text>

        <View style={s.switchRow}>
          {PLANS.map((x) => (
            <Pressable key={x.id} onPress={() => setView(x.id)} style={[s.seg, view === x.id && s.segOn]} accessibilityRole="button" accessibilityState={{ selected: view === x.id }}>
              <Text style={s.segIcon}>{x.icon}</Text>
              <Text style={[s.segT, view === x.id && { color: '#fff' }]}>{pick(lang, x.name)}</Text>
              {settings.plan === x.id && <Text style={s.cur}>{pick(lang, ['your plan', 'आपका प्लान', 'ਤੁਹਾਡਾ ਪਲਾਨ'])}</Text>}
            </Pressable>
          ))}
        </View>

        <View style={[k.card, { marginTop: 14 }]}>
          <Text style={s.name}>{p.icon}  {pick(lang, p.name)}</Text>
          <Text style={s.price}>{pick(lang, p.price)}</Text>
          <Text style={[k.dim, { marginTop: 4 }]}>{pick(lang, p.who)}</Text>
        </View>

        <Section>{pick(lang, ['What you get', 'क्या मिलता है', 'ਕੀ ਮਿਲਦਾ ਹੈ'])}</Section>
        <View style={k.card}>
          {p.feats.map((f, i) => (
            <View key={i} style={[s.feat, i > 0 && { marginTop: 10 }]}>
              <Text style={[s.tick, { color: f.on ? C.green : C.dim }]}>{f.on ? '✓' : '🔒'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[k.text, !f.on && { color: C.dim }]}>{pick(lang, f.t)}</Text>
                {f.on || f.soon ? (
                  <Text style={[s.badge, { color: f.soon ? C.amber : C.green }]}>{pick(lang, f.soon ? SOON : LIVE)}</Text>
                ) : (
                  <Text style={[s.badge, { color: C.dim }]}>{pick(lang, ['not in this plan', 'इस प्लान में नहीं', 'ਇਸ ਪਲਾਨ ਵਿੱਚ ਨਹੀਂ'])}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <Pressable
          style={[s.btn, active && s.btnOff]}
          disabled={active}
          onPress={() => onChange({ ...settings, plan: view })}
          accessibilityRole="button"
        >
          <Text style={s.btnT}>
            {active ? '✓ ' + pick(lang, ['This is your plan', 'यही आपका प्लान है', 'ਇਹੀ ਤੁਹਾਡਾ ਪਲਾਨ ਹੈ']) : pick(lang, ['Switch to this plan', 'इस प्लान पर जाएं', 'ਇਸ ਪਲਾਨ ਤੇ ਜਾਓ'])}
          </Text>
        </Pressable>

        <Text style={[k.dim, { marginTop: 14 }]}>
          {pick(lang, [
            'Demo switch: no money is taken. A real launch would use Google Play Billing for Family Shield and a bank sign-in code for Bank partner. Try it: on Free, Settings shows the AI second opinion locked; switch to Family Shield and it unlocks.',
            'डेमो स्विच: कोई पैसा नहीं कटता। असली लॉन्च में फैमिली शील्ड के लिए Google Play Billing और बैंक पार्टनर के लिए बैंक का साइन-इन कोड इस्तेमाल होगा। आज़माएं: फ्री पर सेटिंग्स में AI दूसरी राय लॉक दिखती है; फैमिली शील्ड पर जाएं तो खुल जाती है।',
            'ਡੈਮੋ ਸਵਿੱਚ: ਕੋਈ ਪੈਸਾ ਨਹੀਂ ਕੱਟਦਾ। ਅਸਲ ਲਾਂਚ ਵਿੱਚ ਫੈਮਿਲੀ ਸ਼ੀਲਡ ਲਈ Google Play Billing ਅਤੇ ਬੈਂਕ ਪਾਰਟਨਰ ਲਈ ਬੈਂਕ ਦਾ ਸਾਈਨ-ਇਨ ਕੋਡ ਵਰਤਿਆ ਜਾਵੇਗਾ। ਅਜ਼ਮਾਓ: ਫ੍ਰੀ ਤੇ ਸੈਟਿੰਗਜ਼ ਵਿੱਚ AI ਦੂਜੀ ਰਾਏ ਲਾਕ ਦਿੱਸਦੀ ਹੈ; ਫੈਮਿਲੀ ਸ਼ੀਲਡ ਤੇ ਜਾਓ ਤਾਂ ਖੁੱਲ੍ਹ ਜਾਂਦੀ ਹੈ।',
          ])}
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, padding: 18, paddingTop: TOP },
  switchRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  seg: { flex: 1, backgroundColor: C.card, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: C.line },
  segOn: { backgroundColor: C.blue, borderColor: C.blue },
  segIcon: { fontSize: 22 },
  segT: { color: C.dim, fontWeight: '800', fontSize: 12, marginTop: 4, textAlign: 'center' },
  cur: { color: C.green, fontSize: 10, fontWeight: '800', marginTop: 4 },
  name: { color: C.text, fontSize: 20, fontWeight: '900' },
  price: { color: C.green, fontWeight: '800', marginTop: 6, fontSize: 14 },
  feat: { flexDirection: 'row', gap: 10 },
  tick: { fontSize: 16, fontWeight: '900', width: 22 },
  badge: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  btn: { backgroundColor: C.blue, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  btnOff: { backgroundColor: C.cardHi },
  btnT: { color: '#fff', fontWeight: '900', fontSize: 16 },
});

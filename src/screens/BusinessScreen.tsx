import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Settings } from '../services/storage';
import { BackBar, Section, TOP, k } from '../ui/kit';
import { C } from '../ui/theme';
import { tr } from '../ui/i18n';

type L3 = [string, string, string];
const pick = (lang: Settings['lang'], t: L3) => (lang === 'hi' ? t[1] : lang === 'pa' ? t[2] : t[0]);

/** Indian digit grouping without relying on Intl (older Hermes builds lack it). */
const fmtIN = (n: number) => {
  const s = String(Math.round(n));
  if (s.length <= 3) return s;
  return s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3);
};
const money = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} crore` : `₹${(n / 1e5).toFixed(1)} lakh`);

const STREAMS: { icon: string; name: L3; what: L3; price: L3 }[] = [
  { icon: '🆓', name: ['Everyone', 'सभी के लिए', 'ਸਭ ਲਈ'], what: ['Live scam warnings, message checker, recovery steps', 'लाइव स्कैम चेतावनी, मैसेज चेकर, रिकवरी स्टेप', 'ਲਾਈਵ ਸਕੈਮ ਚੇਤਾਵਨੀ, ਮੈਸੇਜ ਚੈਕਰ, ਰਿਕਵਰੀ ਕਦਮ'], price: ['Free', 'मुफ़्त', 'ਮੁਫ਼ਤ'] },
  { icon: '👨‍👩‍👧', name: ['Families: Family Shield', 'परिवार: फैमिली शील्ड', 'ਪਰਿਵਾਰ: ਫੈਮਿਲੀ ਸ਼ੀਲਡ'], what: ['Family alert for up to 5 people, extra protection for parents', '5 लोगों तक फैमिली अलर्ट, माता-पिता के लिए अतिरिक्त सुरक्षा', '5 ਲੋਕਾਂ ਤੱਕ ਫੈਮਿਲੀ ਅਲਰਟ, ਮਾਪਿਆਂ ਲਈ ਵਾਧੂ ਸੁਰੱਖਿਆ'], price: ['₹99/month or ₹799/year (our guess)', '₹99/माह या ₹799/वर्ष (हमारा अनुमान)', '₹99/ਮਹੀਨਾ ਜਾਂ ₹799/ਸਾਲ (ਸਾਡਾ ਅੰਦਾਜ਼ਾ)'] },
  { icon: '🏦', name: ['Banks and UPI apps', 'बैंक और UPI ऐप', 'ਬੈਂਕ ਅਤੇ UPI ਐਪ'], what: ['VoiceGuard inside their app for their customers', 'उनके ऐप में ग्राहकों के लिए VoiceGuard', 'ਉਨ੍ਹਾਂ ਦੇ ਐਪ ਵਿੱਚ ਗਾਹਕਾਂ ਲਈ VoiceGuard'], price: ['₹5 to 25 lakh per pilot per year (guess)', '₹5 से 25 लाख प्रति पायलट/वर्ष (अनुमान)', '₹5 ਤੋਂ 25 ਲੱਖ ਪ੍ਰਤੀ ਪਾਇਲਟ/ਸਾਲ (ਅੰਦਾਜ਼ਾ)'] },
  { icon: '📡', name: ['Telecom operators', 'टेलीकॉम कंपनियाँ', 'ਟੈਲੀਕਾਮ ਕੰਪਨੀਆਂ'], what: ['Value-added service for their subscribers', 'ग्राहकों के लिए अतिरिक्त सेवा', 'ਗਾਹਕਾਂ ਲਈ ਵਾਧੂ ਸੇਵਾ'], price: ['Revenue share per sign-up (to negotiate)', 'हर साइन-अप पर हिस्सा (बातचीत से)', 'ਹਰ ਸਾਈਨ-ਅੱਪ ਤੇ ਹਿੱਸਾ (ਗੱਲਬਾਤ ਨਾਲ)'] },
  { icon: '🛡', name: ['Insurers', 'बीमा कंपनियाँ', 'ਬੀਮਾ ਕੰਪਨੀਆਂ'], what: ['Cheaper cyber-fraud cover for protected users', 'सुरक्षित यूज़र्स के लिए सस्ता साइबर-फ्रॉड बीमा', 'ਸੁਰੱਖਿਅਤ ਯੂਜ਼ਰਾਂ ਲਈ ਸਸਤਾ ਸਾਈਬਰ-ਫਰਾਡ ਬੀਮਾ'], price: ['Referral fee (to negotiate)', 'रेफरल फीस (बातचीत से)', 'ਰੈਫਰਲ ਫੀਸ (ਗੱਲਬਾਤ ਨਾਲ)'] },
  { icon: '🎓', name: ['Schools, colleges, senior groups', 'स्कूल, कॉलेज, वरिष्ठ समूह', 'ਸਕੂਲ, ਕਾਲਜ, ਸੀਨੀਅਰ ਗਰੁੱਪ'], what: ['Awareness mode for training sessions', 'ट्रेनिंग के लिए अवेयरनेस मोड', 'ਟ੍ਰੇਨਿੰਗ ਲਈ ਅਵੇਅਰਨੈਸ ਮੋਡ'], price: ['About ₹25,000 a year each (guess)', 'लगभग ₹25,000 प्रति वर्ष (अनुमान)', 'ਲਗਭਗ ₹25,000 ਪ੍ਰਤੀ ਸਾਲ (ਅੰਦਾਜ਼ਾ)'] },
];

type Key = 'users' | 'pct' | 'price' | 'banks' | 'lakh' | 'edu';
const KNOBS: { key: Key; label: L3; step: number; min: number; max: number; fmt: (v: number) => string }[] = [
  { key: 'users', label: ['Free installs', 'मुफ़्त इंस्टॉल', 'ਮੁਫ਼ਤ ਇੰਸਟਾਲ'], step: 10000, min: 10000, max: 1000000, fmt: fmtIN },
  { key: 'pct', label: ['Share who pay for Family Shield', 'फैमिली शील्ड के लिए भुगतान करने वाले', 'ਫੈਮਿਲੀ ਸ਼ੀਲਡ ਲਈ ਭੁਗਤਾਨ ਕਰਨ ਵਾਲੇ'], step: 1, min: 1, max: 10, fmt: (v) => v + '%' },
  { key: 'price', label: ['Family Shield price per year', 'फैमिली शील्ड की सालाना कीमत', 'ਫੈਮਿਲੀ ਸ਼ੀਲਡ ਦੀ ਸਾਲਾਨਾ ਕੀਮਤ'], step: 50, min: 399, max: 1499, fmt: (v) => '₹' + v },
  { key: 'banks', label: ['Bank pilots', 'बैंक पायलट', 'ਬੈਂਕ ਪਾਇਲਟ'], step: 1, min: 0, max: 10, fmt: (v) => String(v) },
  { key: 'lakh', label: ['Per bank pilot per year', 'प्रति बैंक पायलट/वर्ष', 'ਪ੍ਰਤੀ ਬੈਂਕ ਪਾਇਲਟ/ਸਾਲ'], step: 5, min: 5, max: 50, fmt: (v) => '₹' + v + ' lakh' },
  { key: 'edu', label: ['Schools and groups (₹25,000 each)', 'स्कूल और समूह (₹25,000 प्रत्येक)', 'ਸਕੂਲ ਅਤੇ ਗਰੁੱਪ (₹25,000 ਹਰੇਕ)'], step: 5, min: 0, max: 200, fmt: (v) => String(v) },
];

/** Business model: who pays, why it can earn, and a small calculator. Prices are our own guesses, not a forecast. */
export function BusinessScreen({ settings, onBack }: { settings: Settings; onBack: () => void }) {
  const lang = settings.lang;
  const [v, setV] = useState<Record<Key, number>>({ users: 100000, pct: 4, price: 799, banks: 1, lakh: 10, edu: 20 });
  const bump = (key: Key, dir: 1 | -1) => {
    const kn = KNOBS.find((x) => x.key === key)!;
    setV({ ...v, [key]: Math.max(kn.min, Math.min(kn.max, v[key] + dir * kn.step)) });
  };
  const fam = (v.users * v.pct) / 100;
  const rows = [
    { name: pick(lang, ['Families', 'परिवार', 'ਪਰਿਵਾਰ']), n: fam * v.price, color: C.blue },
    { name: pick(lang, ['Banks', 'बैंक', 'ਬੈਂਕ']), n: v.banks * v.lakh * 1e5, color: C.green },
    { name: pick(lang, ['Schools and groups', 'स्कूल और समूह', 'ਸਕੂਲ ਅਤੇ ਗਰੁੱਪ']), n: v.edu * 25000, color: C.amber },
  ];
  const total = rows.reduce((a, r) => a + r.n, 0);

  return (
    <View style={s.root}>
      <BackBar label={tr(lang, 'back')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <Text style={k.h}>💼 {tr(lang, 'bizTitle')}</Text>
        <Text style={[k.text, { marginTop: 6, fontWeight: '700' }]}>
          {pick(lang, ['Free for everyone to stay safe. Paid for families. Licensed to banks and telecoms, who lose money when customers get scammed.', 'सुरक्षा सबके लिए मुफ़्त। परिवारों के लिए पेड। बैंक और टेलीकॉम को लाइसेंस, क्योंकि ठगी से उन्हें भी नुकसान होता है।', 'ਸੁਰੱਖਿਆ ਸਭ ਲਈ ਮੁਫ਼ਤ। ਪਰਿਵਾਰਾਂ ਲਈ ਪੇਡ। ਬੈਂਕ ਅਤੇ ਟੈਲੀਕਾਮ ਨੂੰ ਲਾਇਸੈਂਸ, ਕਿਉਂਕਿ ਠੱਗੀ ਨਾਲ ਉਨ੍ਹਾਂ ਨੂੰ ਵੀ ਨੁਕਸਾਨ ਹੁੰਦਾ ਹੈ।'])}
        </Text>

        <Section>{pick(lang, ['The problem is big', 'समस्या बड़ी है', 'ਸਮੱਸਿਆ ਵੱਡੀ ਹੈ'])}</Section>
        <View style={k.card}>
          <Text style={s.big}>~₹20,000 crore</Text>
          <Text style={k.dim}>{pick(lang, ['Lost to cyber fraud in India in 2025 (₹19,813 to ₹22,495 crore, depending on the report).', '2025 में भारत में साइबर ठगी से नुकसान (रिपोर्ट के अनुसार ₹19,813 से ₹22,495 करोड़)।', '2025 ਵਿੱਚ ਭਾਰਤ ਵਿੱਚ ਸਾਈਬਰ ਠੱਗੀ ਨਾਲ ਨੁਕਸਾਨ (ਰਿਪੋਰਟ ਅਨੁਸਾਰ ₹19,813 ਤੋਂ ₹22,495 ਕਰੋੜ)।'])}</Text>
        </View>
        <View style={k.card}>
          <Text style={s.big}>₹1,935 crore</Text>
          <Text style={k.dim}>{pick(lang, ['Lost to "digital arrest" phone scams in 2024, up from ₹91 crore in 2022.', '2024 में "डिजिटल अरेस्ट" फोन ठगी से नुकसान, 2022 में ₹91 करोड़ था।', '2024 ਵਿੱਚ "ਡਿਜੀਟਲ ਅਰੈਸਟ" ਫ਼ੋਨ ਠੱਗੀ ਨਾਲ ਨੁਕਸਾਨ, 2022 ਵਿੱਚ ₹91 ਕਰੋੜ ਸੀ।'])}</Text>
        </View>

        <Section>{pick(lang, ['Who pays us', 'हमें कौन पैसे देगा', 'ਸਾਨੂੰ ਕੌਣ ਪੈਸੇ ਦੇਵੇਗਾ'])}</Section>
        {STREAMS.map((x, i) => (
          <View key={i} style={k.card}>
            <Text style={s.name}>{x.icon}  {pick(lang, x.name)}</Text>
            <Text style={k.dim}>{pick(lang, x.what)}</Text>
            <Text style={s.price}>{pick(lang, x.price)}</Text>
          </View>
        ))}
        <Text style={[k.dim, { marginTop: 8 }]}>
          {pick(lang, ['Price anchor: Truecaller Premium is ₹529 per year and its Family plan ₹925 per year in India.', 'कीमत का आधार: भारत में ट्रूकॉलर प्रीमियम ₹529 प्रति वर्ष और फैमिली प्लान ₹925 प्रति वर्ष है।', 'ਕੀਮਤ ਦਾ ਆਧਾਰ: ਭਾਰਤ ਵਿੱਚ ਟਰੂਕਾਲਰ ਪ੍ਰੀਮੀਅਮ ₹529 ਪ੍ਰਤੀ ਸਾਲ ਅਤੇ ਫੈਮਿਲੀ ਪਲਾਨ ₹925 ਪ੍ਰਤੀ ਸਾਲ ਹੈ।'])}
        </Text>

        <Section>{pick(lang, ['Try the numbers', 'आंकड़े आज़माएं', 'ਅੰਕੜੇ ਅਜ਼ਮਾਓ'])}</Section>
        <View style={k.card}>
          {KNOBS.map((kn) => (
            <View key={kn.key} style={s.knob}>
              <Text style={[k.text, { flex: 1 }]}>{pick(lang, kn.label)}</Text>
              <Pressable style={s.step} onPress={() => bump(kn.key, -1)} accessibilityRole="button" accessibilityLabel="minus"><Text style={s.stepT}>−</Text></Pressable>
              <Text style={s.val}>{kn.fmt(v[kn.key])}</Text>
              <Pressable style={s.step} onPress={() => bump(kn.key, 1)} accessibilityRole="button" accessibilityLabel="plus"><Text style={s.stepT}>+</Text></Pressable>
            </View>
          ))}
        </View>
        <View style={k.card}>
          <Text style={k.dim}>{pick(lang, ['Yearly revenue (illustration)', 'सालाना आय (उदाहरण)', 'ਸਾਲਾਨਾ ਆਮਦਨ (ਉਦਾਹਰਣ)'])}</Text>
          <Text style={s.total}>{money(total)}</Text>
          {rows.map((r) => (
            <View key={r.name} style={{ marginTop: 8 }}>
              <Text style={k.dim}>{r.name}: {money(r.n)}</Text>
              <View style={s.track}><View style={[s.bar, { width: `${Math.max(2, (r.n / Math.max(total, 1)) * 100)}%`, backgroundColor: r.color }]} /></View>
            </View>
          ))}
          <Text style={[k.dim, { marginTop: 10 }]}>
            {pick(lang, ['Paying families: ', 'पेड परिवार: ', 'ਪੇਡ ਪਰਿਵਾਰ: '])}{fmtIN(fam)}. {pick(lang, ['Cloud cost per call: ₹0, because the model runs on the phone. Before store fees, support and marketing costs.', 'हर कॉल पर क्लाउड खर्च: ₹0, क्योंकि मॉडल फोन पर चलता है। स्टोर फीस, सपोर्ट और मार्केटिंग खर्च से पहले।', 'ਹਰ ਕਾਲ ਤੇ ਕਲਾਊਡ ਖਰਚ: ₹0, ਕਿਉਂਕਿ ਮਾਡਲ ਫ਼ੋਨ ਤੇ ਚੱਲਦਾ ਹੈ। ਸਟੋਰ ਫੀਸ, ਸਪੋਰਟ ਅਤੇ ਮਾਰਕੀਟਿੰਗ ਖਰਚ ਤੋਂ ਪਹਿਲਾਂ।'])}
          </Text>
        </View>

        <Section>{pick(lang, ['Why it can make money', 'यह कमाई कैसे कर सकता है', 'ਇਹ ਕਮਾਈ ਕਿਵੇਂ ਕਰ ਸਕਦਾ ਹੈ'])}</Section>
        <View style={k.card}>
          {([
            ['1. No cloud cost per call, because our own small model runs on the phone.', '1. हर कॉल पर क्लाउड खर्च नहीं, क्योंकि हमारा अपना छोटा मॉडल फोन पर चलता है।', '1. ਹਰ ਕਾਲ ਤੇ ਕਲਾਊਡ ਖਰਚ ਨਹੀਂ, ਕਿਉਂਕਿ ਸਾਡਾ ਆਪਣਾ ਛੋਟਾ ਮਾਡਲ ਫ਼ੋਨ ਤੇ ਚੱਲਦਾ ਹੈ।'],
            ['2. Privacy by default builds trust, which an app that listens to calls needs.', '2. डिफ़ॉल्ट प्राइवेसी से भरोसा बनता है, जो कॉल सुनने वाले ऐप को चाहिए।', '2. ਡਿਫ਼ਾਲਟ ਪ੍ਰਾਈਵੇਸੀ ਨਾਲ ਭਰੋਸਾ ਬਣਦਾ ਹੈ, ਜੋ ਕਾਲ ਸੁਣਨ ਵਾਲੇ ਐਪ ਨੂੰ ਚਾਹੀਦਾ ਹੈ।'],
            ['3. One engine serves families, banks, telecoms and schools.', '3. एक ही इंजन परिवार, बैंक, टेलीकॉम और स्कूल सबके काम आता है।', '3. ਇੱਕੋ ਇੰਜਣ ਪਰਿਵਾਰ, ਬੈਂਕ, ਟੈਲੀਕਾਮ ਅਤੇ ਸਕੂਲ ਸਭ ਦੇ ਕੰਮ ਆਉਂਦਾ ਹੈ।'],
          ] as L3[]).map((t, i) => <Text key={i} style={[k.text, { marginTop: i ? 8 : 0 }]}>{pick(lang, t)}</Text>)}
        </View>

        <Section>{pick(lang, ['How we start', 'शुरुआत कैसे', 'ਸ਼ੁਰੂਆਤ ਕਿਵੇਂ'])}</Section>
        <View style={k.card}>
          {([
            ['1. Pilot with families in Punjab and North India, in Hindi, Punjabi and English.', '1. पंजाब और उत्तर भारत के परिवारों के साथ पायलट, हिंदी, पंजाबी और अंग्रेज़ी में।', '1. ਪੰਜਾਬ ਅਤੇ ਉੱਤਰੀ ਭਾਰਤ ਦੇ ਪਰਿਵਾਰਾਂ ਨਾਲ ਪਾਇਲਟ, ਹਿੰਦੀ, ਪੰਜਾਬੀ ਅਤੇ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ।'],
            ['2. Pilot with one bank or UPI app, using the family alert and recovery steps.', '2. एक बैंक या UPI ऐप के साथ पायलट, फैमिली अलर्ट और रिकवरी स्टेप के साथ।', '2. ਇੱਕ ਬੈਂਕ ਜਾਂ UPI ਐਪ ਨਾਲ ਪਾਇਲਟ, ਫੈਮਿਲੀ ਅਲਰਟ ਅਤੇ ਰਿਕਵਰੀ ਕਦਮਾਂ ਨਾਲ।'],
            ['3. Awareness sessions in colleges and senior citizen groups.', '3. कॉलेजों और वरिष्ठ नागरिक समूहों में अवेयरनेस सेशन।', '3. ਕਾਲਜਾਂ ਅਤੇ ਸੀਨੀਅਰ ਸਿਟੀਜ਼ਨ ਗਰੁੱਪਾਂ ਵਿੱਚ ਅਵੇਅਰਨੈਸ ਸੈਸ਼ਨ।'],
            ['4. Add telecom and insurance partners once we have real usage numbers.', '4. असली इस्तेमाल के आंकड़े मिलने पर टेलीकॉम और बीमा पार्टनर जोड़ें।', '4. ਅਸਲ ਵਰਤੋਂ ਦੇ ਅੰਕੜੇ ਮਿਲਣ ਤੇ ਟੈਲੀਕਾਮ ਅਤੇ ਬੀਮਾ ਪਾਰਟਨਰ ਜੋੜੋ।'],
          ] as L3[]).map((t, i) => <Text key={i} style={[k.text, { marginTop: i ? 8 : 0 }]}>{pick(lang, t)}</Text>)}
        </View>

        <Text style={[k.dim, { marginTop: 16 }]}>
          {pick(lang, ['Honest limits: iPhones are stricter about listening to calls; bigger companies can add similar features; our accuracy is about 80% on unseen calls and untested in real life; all prices are our own guesses and need testing with real users.', 'ईमानदार सीमाएं: iPhone कॉल सुनने पर ज़्यादा सख़्त है; बड़ी कंपनियां ऐसे फीचर जोड़ सकती हैं; अनदेखी कॉल पर हमारी सटीकता लगभग 80% है और असली दुनिया में परखी नहीं गई; सभी कीमतें हमारे अनुमान हैं।', 'ਇਮਾਨਦਾਰ ਹੱਦਾਂ: iPhone ਕਾਲ ਸੁਣਨ ਤੇ ਵੱਧ ਸਖ਼ਤ ਹੈ; ਵੱਡੀਆਂ ਕੰਪਨੀਆਂ ਅਜਿਹੇ ਫੀਚਰ ਜੋੜ ਸਕਦੀਆਂ ਹਨ; ਅਣਦੇਖੀਆਂ ਕਾਲਾਂ ਤੇ ਸਾਡੀ ਸਟੀਕਤਾ ਲਗਭਗ 80% ਹੈ ਅਤੇ ਅਸਲ ਦੁਨੀਆਂ ਵਿੱਚ ਪਰਖੀ ਨਹੀਂ ਗਈ; ਸਾਰੀਆਂ ਕੀਮਤਾਂ ਸਾਡੇ ਅੰਦਾਜ਼ੇ ਹਨ।'])}
        </Text>
        <Pressable onPress={() => Linking.openURL('https://theprint.in/india/cybercrime-saw-24-spike-in-2025-indians-lost-rs-22495-crore-mainly-in-investment-scams/2859930')} accessibilityRole="link">
          <Text style={[k.dim, { color: C.blue, marginTop: 8 }]}>Source: ThePrint (2025 cyber fraud losses)</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL('https://www.indiaspend.com/data-viz/dataviz-how-indias-cyber-crime-incidence-is-rising-972933')} accessibilityRole="link">
          <Text style={[k.dim, { color: C.blue, marginTop: 4 }]}>Source: IndiaSpend (digital arrest scams)</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, padding: 18, paddingTop: TOP },
  big: { color: C.text, fontSize: 26, fontWeight: '900' },
  name: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  price: { color: C.green, fontWeight: '700', marginTop: 6, fontSize: 13 },
  knob: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  step: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' },
  stepT: { color: C.text, fontSize: 20, fontWeight: '800' },
  val: { color: C.text, fontWeight: '800', minWidth: 78, textAlign: 'center', fontSize: 14 },
  total: { color: C.text, fontSize: 32, fontWeight: '900', marginTop: 2 },
  track: { height: 10, borderRadius: 5, backgroundColor: C.cardHi, marginTop: 4, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5 },
});

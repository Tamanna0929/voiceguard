import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { checkMessage, type MessageCheck } from '../engine/messageCheck';
import type { Settings } from '../services/storage';
import { addPrivacyStats } from '../services/privacy';
import { BackBar, Btn, Field, Section, TOP, k } from '../ui/kit';
import { C, levelColor } from '../ui/theme';
import { tacticLabel, tr, type StrKey } from '../ui/i18n';

/** Paste a suspicious SMS or WhatsApp message: scored on the phone, shown with sensitive numbers hidden, never stored. */
export function CheckScreen({ settings, onBack, onRecovery }: { settings: Settings; onBack: () => void; onRecovery: () => void }) {
  const lang = settings.lang;
  const [text, setText] = useState('');
  const [res, setRes] = useState<MessageCheck | null>(null);

  const run = () => {
    if (!text.trim()) return;
    const r = checkMessage(text);
    setRes(r);
    setText(''); // the original text is dropped as soon as it has been checked
    const counts: Record<string, number> = {};
    r.maskedKinds.forEach((m) => (counts[m] = (counts[m] ?? 0) + 1));
    addPrivacyStats({ masked: counts });
  };

  const col = res ? levelColor(res.level) : C.dim;
  const verdict = res ? tr(lang, res.level === 'danger' ? 'danger' : res.level === 'caution' ? 'watch' : 'safe') : '';
  return (
    <View style={s.root}>
      <BackBar label={tr(lang, 'back')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={k.h}>{tr(lang, 'checkTitle')}</Text>
        <Text style={[k.dim, { marginTop: 6 }]}>{tr(lang, 'checkSub')}</Text>
        <Field value={text} onChangeText={setText} multiline placeholder={tr(lang, 'checkHint')} style={{ minHeight: 130 }} />
        <Btn label={tr(lang, 'checkBtn')} onPress={run} disabled={!text.trim()} />

        {res && (
          <>
            <View style={[s.verdict, { borderColor: col }]}>
              <Text style={[s.score, { color: col }]}>{res.risk}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.verdictT, { color: col }]}>{verdict}</Text>
                <View style={k.row}>
                  {res.tactics.map((t) => (
                    <View key={t} style={[s.flag, { borderColor: col }]}>
                      <Text style={[s.flagT, { color: col }]}>{tacticLabel(lang, t)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <Section>{tr(lang, 'checkLinks')}</Section>
            {res.links.length === 0 ? (
              <Text style={k.dim}>{tr(lang, 'checkNoLinks')}</Text>
            ) : (
              res.links.map((l, i) => (
                <View key={i} style={k.card}>
                  <Text style={k.text} selectable>
                    {l.url}
                  </Text>
                  {l.reasons.map((r) => (
                    <Text key={r} style={[k.dim, { color: C.amber }]}>
                      ⚠ {tr(lang, ('r_' + r) as StrKey)}
                    </Text>
                  ))}
                </View>
              ))
            )}

            <Section>
              {tr(lang, 'checkMasked')}
              {res.maskedKinds.length ? `  ·  🔒 ${res.maskedKinds.length} ${tr(lang, 'checkHidden')}` : ''}
            </Section>
            <View style={k.card}>
              <Text style={k.text}>{res.masked}</Text>
            </View>

            {res.level !== 'safe' && <Text style={[k.text, { marginTop: 14 }]}>{tr(lang, 'checkAdvice')}</Text>}
            {res.level !== 'safe' && <Btn kind="ghost" label={'🚨  ' + tr(lang, 'checkActed')} onPress={onRecovery} />}
            <Btn
              kind="ghost"
              label={tr(lang, 'checkClear')}
              onPress={() => {
                setRes(null);
                setText('');
              }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: TOP, paddingHorizontal: 18 },
  verdict: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: 16, padding: 14, marginTop: 18, gap: 14 },
  score: { fontSize: 44, fontWeight: '900', minWidth: 70, textAlign: 'center' },
  verdictT: { fontSize: 20, fontWeight: '900' },
  flag: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  flagT: { fontSize: 12, fontWeight: '700' },
});

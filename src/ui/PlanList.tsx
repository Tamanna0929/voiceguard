import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { URGENCY_LABEL, type Action, type PlanStep, type Urgency } from '../recovery/guide';
import type { Lang } from '../services/storage';
import { C } from './theme';
import { tr } from './i18n';

const URG_COLOR: Record<Urgency, string> = { now: C.red, hour: '#F97316', today: C.amber, week: C.blue };

/** Opens a call, a link or the saved bank helpline. Never sends anything on the person's behalf. */
export function runAction(a: Action, lang: Lang, bankNumber: string) {
  if (a.kind === 'call') return Linking.openURL(`tel:${a.number}`);
  if (a.kind === 'url') return Linking.openURL(a.url);
  const n = bankNumber.replace(/[^\d+]/g, '');
  if (!n) return Alert.alert(tr(lang, 'recBankNum'), tr(lang, 'bankNumberMissing'));
  return Linking.openURL(`tel:${n}`);
}

export function PlanList({
  steps,
  lang,
  done,
  onToggle,
  bankNumber,
}: {
  steps: PlanStep[];
  lang: Lang;
  done: Record<string, boolean>;
  onToggle: (s: PlanStep) => void;
  bankNumber: string;
}) {
  let last: Urgency | null = null;
  return (
    <View>
      {steps.map((st) => {
        const head = st.urgency !== last;
        last = st.urgency;
        const isDone = !!done[st.id];
        return (
          <View key={st.id}>
            {head ? <Text style={[s.group, { color: URG_COLOR[st.urgency] }]}>{URGENCY_LABEL[st.urgency][lang]}</Text> : null}
            <View style={[s.card, isDone && { opacity: 0.55 }]}>
              <Pressable onPress={() => onToggle(st)} style={s.top} accessibilityRole="checkbox" accessibilityState={{ checked: isDone }} accessibilityLabel={st.text[lang].title}>
                <View style={[s.box, isDone && { backgroundColor: C.green, borderColor: C.green }]}>{isDone ? <Text style={s.tick}>✓</Text> : null}</View>
                <Text style={[s.title, isDone && { textDecorationLine: 'line-through' }]}>{st.text[lang].title}</Text>
              </Pressable>
              <Text style={s.body}>{st.text[lang].body}</Text>
              {st.actions.map((a, i) => (
                <Pressable key={i} style={[s.act, { borderColor: URG_COLOR[st.urgency] }]} onPress={() => runAction(a, lang, bankNumber)} accessibilityRole="button">
                  <Text style={s.actT}>{a.label[lang]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  group: { fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginTop: 18, marginBottom: 2 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14, marginTop: 10 },
  top: { flexDirection: 'row', alignItems: 'center' },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: C.dim, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  tick: { color: '#fff', fontWeight: '900' },
  title: { color: C.text, fontSize: 17, fontWeight: '800', flex: 1 },
  body: { color: C.dim, fontSize: 14.5, lineHeight: 21, marginTop: 8 },
  act: { marginTop: 10, borderWidth: 2, borderRadius: 12, padding: 12, alignItems: 'center' },
  actT: { color: C.text, fontWeight: '800', fontSize: 15 },
});

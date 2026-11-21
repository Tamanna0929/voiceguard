import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buildPlan, bannerFor, SITUATIONS, WHEN_OPTIONS, type PlanStep, type SituationId, type When } from '../recovery/guide';
import { newIncident, saveIncident, withLog, type Incident } from '../services/incidents';
import type { Settings } from '../services/storage';
import { PlanList } from '../ui/PlanList';
import { BackBar, Btn, Chip, Field, Section, TOP, k } from '../ui/kit';
import { C } from '../ui/theme';
import { tr } from '../ui/i18n';

/** "I think I've been scammed": pick what happened, get an ordered plan, and the incident is saved as you go. */
export function RecoveryScreen({ settings, onBack, onOpenIncident }: { settings: Settings; onBack: () => void; onOpenIncident: (id: string) => void }) {
  const lang = settings.lang;
  const [sel, setSel] = useState<SituationId[]>([]);
  const [when, setWhen] = useState<When>('hour');
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState('');
  const [bankNo, setBankNo] = useState('');
  const [inc, setInc] = useState<Incident | null>(null);

  const toggle = (id: SituationId) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const needsBank = sel.some((s) => s === 'money' || s === 'otp' || s === 'credentials' || s === 'app');
  const plan = useMemo(() => (inc ? buildPlan({ situations: inc.situations, when: inc.happened }) : []), [inc]);

  const build = async () => {
    const i = newIncident({ situations: sel, happened: when, amountLost: sel.includes('money') ? amount.replace(/[^\d.,]/g, '') : '', bankName: bank, bankNumber: bankNo });
    setInc(i);
    await saveIncident(i);
  };

  const toggleStep = (st: PlanStep) => {
    if (!inc) return;
    const now = !inc.done[st.id];
    const next = withLog({ ...inc, done: { ...inc.done, [st.id]: now } }, `${now ? 'Done' : 'Undone'}: ${st.text.en.title}`);
    setInc(next);
    saveIncident(next);
  };

  if (inc) {
    const total = plan.length;
    const doneN = plan.filter((p) => inc.done[p.id]).length;
    return (
      <View style={s.root}>
        <BackBar label={tr(lang, 'back')} onBack={onBack} />
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
          <Text style={k.h}>{tr(lang, 'recPlan')}</Text>
          <View style={s.banner}>
            <Text style={s.bannerT}>{bannerFor(inc.happened, inc.situations)[lang]}</Text>
          </View>
          <Text style={[k.dim, { marginTop: 10 }]}>
            {doneN}/{total} ✓
          </Text>
          <PlanList steps={plan} lang={lang} done={inc.done} onToggle={toggleStep} bankNumber={inc.bankNumber} />
          <Text style={[k.dim, { marginTop: 18 }]}>{tr(lang, 'recSaved')}</Text>
          <Btn label={tr(lang, 'recOpen')} onPress={() => onOpenIncident(inc.id)} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <BackBar label={tr(lang, 'back')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={k.h}>{tr(lang, 'recTitle')}</Text>
        <Text style={[k.dim, { marginTop: 6 }]}>{tr(lang, 'recQ1')}</Text>
        {SITUATIONS.map((st) => {
          const on = sel.includes(st.id);
          return (
            <Pressable key={st.id} onPress={() => toggle(st.id)} style={[s.opt, on && s.optOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
              <Text style={s.optIcon}>{st.icon}</Text>
              <Text style={s.optT}>{st.label[lang]}</Text>
              <Text style={[s.optTick, on && { color: C.blue }]}>{on ? '✓' : ''}</Text>
            </Pressable>
          );
        })}

        <Section>{tr(lang, 'recQ2')}</Section>
        <View style={k.row}>
          {WHEN_OPTIONS.map((w) => (
            <Chip key={w.id} label={w.label[lang]} on={when === w.id} onPress={() => setWhen(w.id)} />
          ))}
        </View>

        {sel.includes('money') && <Field label={tr(lang, 'recAmount')} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" />}
        {needsBank && (
          <>
            <Field label={tr(lang, 'recBank')} value={bank} onChangeText={setBank} />
            <Field label={tr(lang, 'recBankNum')} value={bankNo} onChangeText={setBankNo} keyboardType="phone-pad" />
            <Text style={[k.dim, { marginTop: 4 }]}>{tr(lang, 'recBankHint')}</Text>
          </>
        )}

        {sel.length === 0 && <Text style={[k.dim, { marginTop: 14 }]}>{tr(lang, 'recNone')}</Text>}
        <Btn label={tr(lang, 'recBuild')} onPress={build} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: TOP, paddingHorizontal: 18 },
  opt: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 14, marginTop: 10, borderWidth: 2, borderColor: 'transparent' },
  optOn: { borderColor: C.blue, backgroundColor: C.cardHi },
  optIcon: { fontSize: 24, marginRight: 12 },
  optT: { color: C.text, flex: 1, fontSize: 16, lineHeight: 22 },
  optTick: { color: C.dim, fontSize: 22, fontWeight: '900', width: 26, textAlign: 'right' },
  banner: { backgroundColor: 'rgba(239,68,68,0.16)', borderColor: C.red, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 12 },
  bannerT: { color: C.text, fontSize: 15.5, lineHeight: 22, fontWeight: '600' },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { buildPlan, SITUATIONS, type PlanStep } from '../recovery/guide';
import {
  deleteIncident,
  EVIDENCE_ITEMS,
  loadIncidents,
  saveIncident,
  summarizeIncident,
  uid,
  withLog,
  type Incident,
  type SuspectKind,
} from '../services/incidents';
import type { Settings } from '../services/storage';
import { PlanList } from '../ui/PlanList';
import { BackBar, Btn, Chip, Field, Section, TOP, k } from '../ui/kit';
import { C } from '../ui/theme';
import { tr } from '../ui/i18n';

const STATUS_COLOR = { open: C.amber, reported: C.blue, closed: C.green } as const;
const SUSPECT_KINDS: SuspectKind[] = ['phone', 'upi', 'account', 'link', 'app', 'other'];

export function IncidentsScreen({ settings, openId, onBack, onNew }: { settings: Settings; openId?: string; onBack: () => void; onNew: () => void }) {
  const lang = settings.lang;
  const [list, setList] = useState<Incident[]>([]);
  const [sel, setSel] = useState<string | undefined>(openId);

  const reload = useCallback(() => loadIncidents().then(setList), []);
  useEffect(() => {
    reload();
  }, [reload]);

  const current = list.find((i) => i.id === sel);
  if (sel && current) {
    return (
      <Detail
        key={current.id}
        initial={current}
        settings={settings}
        onClose={() => {
          setSel(undefined);
          reload();
        }}
        onDeleted={() => {
          setSel(undefined);
          reload();
        }}
      />
    );
  }

  const statusLabel = (s: Incident['status']) => tr(lang, s === 'open' ? 'statusOpen' : s === 'reported' ? 'statusReported' : 'statusClosed');
  return (
    <View style={s.root}>
      <BackBar label={tr(lang, 'back')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <Text style={k.h}>{tr(lang, 'incidents')}</Text>
        <Btn label={'+  ' + tr(lang, 'incNew')} onPress={onNew} />
        {list.length === 0 && <Text style={[k.dim, { marginTop: 18 }]}>{tr(lang, 'incNone')}</Text>}
        {list.map((i) => {
          const total = buildPlan({ situations: i.situations, when: i.happened }).length;
          const doneN = Object.values(i.done).filter(Boolean).length;
          return (
            <Pressable key={i.id} style={k.card} onPress={() => setSel(i.id)} accessibilityRole="button">
              <View style={s.rowBetween}>
                <Text style={s.cardT} numberOfLines={1}>
                  {i.title || SITUATIONS.find((x) => x.id === i.situations[0])?.label[lang] || tr(lang, 'incidents')}
                </Text>
                <Text style={[s.status, { color: STATUS_COLOR[i.status] }]}>{statusLabel(i.status)}</Text>
              </View>
              <Text style={k.dim}>
                {new Date(i.createdAt).toLocaleString()} · {doneN}/{total} ✓{i.amountLost ? ' · ₹' + i.amountLost : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Detail({ initial, settings, onClose, onDeleted }: { initial: Incident; settings: Settings; onClose: () => void; onDeleted: () => void }) {
  const lang = settings.lang;
  const [inc, setInc] = useState<Incident>(initial);
  const first = useRef(true);
  const [sKind, setSKind] = useState<SuspectKind>('phone');
  const [sVal, setSVal] = useState('');

  // autosave shortly after every change
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => saveIncident(inc), 400);
    return () => clearTimeout(t);
  }, [inc]);

  const plan = useMemo(() => buildPlan({ situations: inc.situations, when: inc.happened }), [inc.situations, inc.happened]);
  const patch = (p: Partial<Incident>) => setInc((v) => ({ ...v, ...p }));
  const close = async () => {
    await saveIncident(inc);
    onClose();
  };

  const toggleStep = (st: PlanStep) => {
    const now = !inc.done[st.id];
    setInc((v) => withLog({ ...v, done: { ...v.done, [st.id]: now } }, `${now ? 'Done' : 'Undone'}: ${st.text.en.title}`));
  };
  const setStatus = (status: Incident['status']) => setInc((v) => withLog({ ...v, status }, `Status: ${status}`));
  const setRef = (key: keyof Incident['refs'], value: string) => setInc((v) => ({ ...v, refs: { ...v.refs, [key]: value } }));
  const noteRefLogged = (key: keyof Incident['refs']) => {
    if (inc.refs[key]) setInc((v) => withLog(v, `Reference saved (${key}): ${v.refs[key]}`));
  };

  const addTxn = () => patch({ txns: [...inc.txns, { id: uid(), amount: '', at: '', ref: '', receiver: '' }] });
  const setTxn = (id: string, p: Partial<Incident['txns'][number]>) => patch({ txns: inc.txns.map((t) => (t.id === id ? { ...t, ...p } : t)) });
  const addSuspect = () => {
    if (!sVal.trim()) return;
    patch({ suspects: [...inc.suspects, { id: uid(), kind: sKind, value: sVal.trim() }] });
    setSVal('');
  };

  const share = () => {
    const labels = inc.situations.map((id) => SITUATIONS.find((x) => x.id === id)?.label.en ?? id);
    Share.share({ message: summarizeIncident(inc, labels) }).catch(() => {});
  };
  const remove = () =>
    Alert.alert(tr(lang, 'incDelete'), tr(lang, 'incDeleteConfirm'), [
      { text: tr(lang, 'cancel'), style: 'cancel' },
      {
        text: tr(lang, 'delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteIncident(inc.id);
          onDeleted();
        },
      },
    ]);

  return (
    <View style={s.root}>
      <BackBar label={tr(lang, 'back')} onBack={close} />
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
        <Field label={tr(lang, 'incidents')} value={inc.title} onChangeText={(v) => patch({ title: v })} placeholder={tr(lang, 'incTitleHint')} />
        <View style={k.row}>
          {(['open', 'reported', 'closed'] as const).map((st) => (
            <Chip key={st} label={tr(lang, st === 'open' ? 'statusOpen' : st === 'reported' ? 'statusReported' : 'statusClosed')} on={inc.status === st} color={STATUS_COLOR[st]} onPress={() => setStatus(st)} />
          ))}
        </View>

        <Section>{tr(lang, 'incPlan')}</Section>
        <PlanList steps={plan} lang={lang} done={inc.done} onToggle={toggleStep} bankNumber={inc.bankNumber} />

        <Section>{tr(lang, 'recBank')}</Section>
        <Field value={inc.bankName} onChangeText={(v) => patch({ bankName: v })} placeholder={tr(lang, 'recBank')} />
        <Field value={inc.bankNumber} onChangeText={(v) => patch({ bankNumber: v })} placeholder={tr(lang, 'recBankNum')} keyboardType="phone-pad" />
        {!!inc.bankNumber && <Btn kind="ghost" label={'📞  ' + inc.bankName} onPress={() => Linking.openURL('tel:' + inc.bankNumber.replace(/[^\d+]/g, ''))} />}

        <Section>{tr(lang, 'incTxns')}</Section>
        {inc.txns.map((t, n) => (
          <View key={t.id} style={k.card}>
            <Text style={k.dim}>#{n + 1}</Text>
            <Field label={tr(lang, 'incAmount')} value={t.amount} onChangeText={(v) => setTxn(t.id, { amount: v })} keyboardType="numeric" />
            <Field label={tr(lang, 'incWhen')} value={t.at} onChangeText={(v) => setTxn(t.id, { at: v })} placeholder="21-11-2026 14:30" />
            <Field label={tr(lang, 'incRef')} value={t.ref} onChangeText={(v) => setTxn(t.id, { ref: v })} autoCapitalize="characters" />
            <Field label={tr(lang, 'incReceiver')} value={t.receiver} onChangeText={(v) => setTxn(t.id, { receiver: v })} autoCapitalize="none" />
            <Pressable onPress={() => patch({ txns: inc.txns.filter((x) => x.id !== t.id) })} hitSlop={10}>
              <Text style={s.remove}>{tr(lang, 'delete')}</Text>
            </Pressable>
          </View>
        ))}
        <Btn kind="ghost" label={'+  ' + tr(lang, 'incAddTxn')} onPress={addTxn} />

        <Section>{tr(lang, 'incSuspects')}</Section>
        {inc.suspects.map((x) => (
          <View key={x.id} style={[k.card, s.rowBetween]}>
            <Text style={[k.text, { flex: 1 }]}>
              {x.kind}: {x.value}
            </Text>
            <Pressable onPress={() => patch({ suspects: inc.suspects.filter((y) => y.id !== x.id) })} hitSlop={10}>
              <Text style={s.remove}>✕</Text>
            </Pressable>
          </View>
        ))}
        <View style={k.row}>
          {SUSPECT_KINDS.map((kd) => (
            <Chip key={kd} label={kd} on={sKind === kd} onPress={() => setSKind(kd)} />
          ))}
        </View>
        <Field value={sVal} onChangeText={setSVal} placeholder={tr(lang, 'incSuspectHint')} autoCapitalize="none" autoCorrect={false} onSubmitEditing={addSuspect} />
        <Btn kind="ghost" label={'+  ' + tr(lang, 'incAddSuspect')} onPress={addSuspect} />

        <Section>{tr(lang, 'incEvidence')}</Section>
        <Text style={k.dim}>{tr(lang, 'incEvidenceHelp')}</Text>
        {EVIDENCE_ITEMS.map((e) => {
          const on = !!inc.evidence[e.id];
          return (
            <Pressable key={e.id} style={[k.card, s.ev]} onPress={() => patch({ evidence: { ...inc.evidence, [e.id]: !on } })} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
              <View style={[s.box, on && { backgroundColor: C.green, borderColor: C.green }]}>{on ? <Text style={s.tick}>✓</Text> : null}</View>
              <Text style={[k.text, { flex: 1 }]}>{e.label[lang]}</Text>
            </Pressable>
          );
        })}

        <Section>{tr(lang, 'incRefs')}</Section>
        <Field label={tr(lang, 'ref1930')} value={inc.refs.call1930} onChangeText={(v) => setRef('call1930', v)} onEndEditing={() => noteRefLogged('call1930')} autoCapitalize="characters" />
        <Field label={tr(lang, 'refPortal')} value={inc.refs.portal} onChangeText={(v) => setRef('portal', v)} onEndEditing={() => noteRefLogged('portal')} autoCapitalize="characters" />
        <Field label={tr(lang, 'refBank')} value={inc.refs.bank} onChangeText={(v) => setRef('bank', v)} onEndEditing={() => noteRefLogged('bank')} autoCapitalize="characters" />
        <Field label={tr(lang, 'refFir')} value={inc.refs.fir} onChangeText={(v) => setRef('fir', v)} onEndEditing={() => noteRefLogged('fir')} autoCapitalize="characters" />

        <Section>{tr(lang, 'incNotes')}</Section>
        <Field value={inc.notes} onChangeText={(v) => patch({ notes: v })} multiline />

        <Section>{tr(lang, 'incTimeline')}</Section>
        {inc.log.slice(0, 10).map((l, i) => (
          <Text key={i} style={[k.dim, { marginBottom: 4 }]}>
            {new Date(l.at).toLocaleString()}  ·  {l.text}
          </Text>
        ))}

        <Btn label={'↗  ' + tr(lang, 'incShare')} onPress={share} />
        <Btn kind="ghost" label={tr(lang, 'incDelete')} onPress={remove} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: TOP, paddingHorizontal: 18 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardT: { color: C.text, fontSize: 17, fontWeight: '800', flex: 1, marginRight: 8 },
  status: { fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  remove: { color: C.red, fontWeight: '700', marginTop: 10 },
  ev: { flexDirection: 'row', alignItems: 'center' },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: C.dim, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  tick: { color: '#fff', fontWeight: '900' },
});

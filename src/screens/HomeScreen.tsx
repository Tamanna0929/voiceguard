import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { loadHistory, type Lang, type SessionRecord, type Settings } from '../services/storage';
import { loadIncidents } from '../services/incidents';
import { C, levelColor } from '../ui/theme';
import { tr } from '../ui/i18n';
import { ALERT_THRESHOLD, CAUTION_THRESHOLD } from '../engine/engine';

const LANGS: Array<{ id: Lang; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'pa', label: 'ਪੰਜਾਬੀ' },
];

export function HomeScreen({ settings, onLang, go }: { settings: Settings; onLang: (l: Lang) => void; go: (s: 'live' | 'awareness' | 'settings' | 'demo' | 'recovery' | 'incidents' | 'privacy' | 'check') => void }) {
  const lang = settings.lang;
  const [hist, setHist] = useState<SessionRecord[]>([]);
  const [incCount, setIncCount] = useState(0);
  useEffect(() => {
    loadHistory(settings.historyDays).then(setHist);
    loadIncidents().then((l) => setIncCount(l.filter((i) => i.status !== 'closed').length));
  }, []);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.body}>
      <View style={s.top}>
        <Text style={s.logo}>🛡️ VoiceGuard</Text>
        <Pressable onPress={() => go('settings')} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr(lang, 'settings')}>
          <Text style={s.gear}>⚙︎</Text>
        </Pressable>
      </View>
      <Text style={s.tag}>{tr(lang, 'tagline')}</Text>

      <View style={s.langRow}>
        {LANGS.map((l) => (
          <Pressable key={l.id} onPress={() => onLang(l.id)} style={[s.lang, lang === l.id && s.langOn]} accessibilityRole="button">
            <Text style={[s.langTxt, lang === l.id && { color: '#fff' }]}>{l.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={s.primary} onPress={() => go('live')} accessibilityRole="button">
        <Text style={s.primaryT}>🎙  {tr(lang, 'start')}</Text>
        <Text style={s.primaryS}>{tr(lang, 'startSub')}</Text>
      </Pressable>

      <Pressable style={s.sos} onPress={() => go('recovery')} accessibilityRole="button">
        <Text style={s.sosT}>🚨  {tr(lang, 'scammedTitle')}</Text>
        <Text style={s.sosS}>{tr(lang, 'scammedSub')}</Text>
      </Pressable>

      <Pressable style={s.card} onPress={() => go('check')} accessibilityRole="button">
        <Text style={s.cardT}>✉️  {tr(lang, 'checkTitle')}</Text>
        <Text style={s.cardS}>{tr(lang, 'checkSub')}</Text>
      </Pressable>

      <View style={s.pair}>
        <Pressable style={[s.card, s.half]} onPress={() => go('incidents')} accessibilityRole="button">
          <Text style={s.cardT}>🗂  {tr(lang, 'incidents')}{incCount ? ` (${incCount})` : ''}</Text>
          <Text style={s.cardS}>{tr(lang, 'incidentsSub')}</Text>
        </Pressable>
        <Pressable style={[s.card, s.half]} onPress={() => go('privacy')} accessibilityRole="button">
          <Text style={s.cardT}>🔒  {tr(lang, 'privacyTitle')}</Text>
          <Text style={s.cardS}>{tr(lang, 'privacySub')}</Text>
        </Pressable>
      </View>

      <Pressable style={s.card} onPress={() => go('demo')} accessibilityRole="button">
        <Text style={s.cardT}>▶  {tr(lang, 'demo')}</Text>
        <Text style={s.cardS}>{tr(lang, 'demoSub')}</Text>
      </Pressable>
      <Pressable style={s.card} onPress={() => go('awareness')} accessibilityRole="button">
        <Text style={s.cardT}>📚  {tr(lang, 'awareness')}</Text>
        <Text style={s.cardS}>{tr(lang, 'awarenessSub')}</Text>
      </Pressable>

      <View style={s.helpRow}>
        <Pressable style={s.help} onPress={() => Linking.openURL('tel:1930')} accessibilityRole="button">
          <Text style={s.helpT}>📞 1930</Text>
        </Pressable>
        <Pressable style={s.help} onPress={() => Linking.openURL('https://cybercrime.gov.in')} accessibilityRole="button">
          <Text style={s.helpT}>cybercrime.gov.in</Text>
        </Pressable>
      </View>

      <Text style={s.section}>{tr(lang, 'history')}</Text>
      {hist.length === 0 ? (
        <Text style={s.dim}>{tr(lang, 'noHistory')}</Text>
      ) : (
        hist.slice(0, 6).map((h) => {
          const lvl = h.peak >= ALERT_THRESHOLD ? 'danger' : h.peak >= CAUTION_THRESHOLD ? 'caution' : 'safe';
          return (
            <View key={h.id} style={s.hist}>
              <View style={[s.dot, { backgroundColor: levelColor(lvl) }]} />
              <Text style={s.histT}>
                {new Date(h.startedAt).toLocaleString()} · {tr(lang, 'peak')} {h.peak}
                {h.demo ? ' · ' + tr(lang, 'demoBadge') : ''}
              </Text>
            </View>
          );
        })
      )}
      <Text style={s.foot}>{tr(lang, 'privacy')}</Text>
    </ScrollView>
  );
}

const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 10 : 60;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: { padding: 18, paddingTop: TOP, paddingBottom: 40 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { color: C.text, fontSize: 28, fontWeight: '900' },
  gear: { color: C.dim, fontSize: 26 },
  tag: { color: C.dim, marginTop: 4, fontSize: 15 },
  langRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  lang: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: C.card },
  langOn: { backgroundColor: C.blue },
  langTxt: { color: C.dim, fontWeight: '700' },
  primary: { backgroundColor: C.blue, borderRadius: 20, padding: 22, marginTop: 20 },
  primaryT: { color: '#fff', fontSize: 22, fontWeight: '900' },
  primaryS: { color: '#DCE8FF', marginTop: 6, fontSize: 15, lineHeight: 21 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 18, marginTop: 12 },
  sos: { backgroundColor: 'rgba(239,68,68,0.16)', borderColor: C.red, borderWidth: 2, borderRadius: 16, padding: 18, marginTop: 12 },
  sosT: { color: C.text, fontSize: 18, fontWeight: '900' },
  sosS: { color: C.dim, marginTop: 4, fontSize: 14, lineHeight: 20 },
  pair: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  cardT: { color: C.text, fontSize: 18, fontWeight: '800' },
  cardS: { color: C.dim, marginTop: 4, fontSize: 14, lineHeight: 20 },
  helpRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  help: { flex: 1, backgroundColor: C.cardHi, borderRadius: 12, padding: 12, alignItems: 'center' },
  helpT: { color: C.text, fontWeight: '700' },
  section: { color: C.dim, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: 24, marginBottom: 8 },
  dim: { color: C.dim },
  hist: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  histT: { color: C.text, fontSize: 14, flex: 1 },
  foot: { color: C.dim, fontSize: 12, marginTop: 24, textAlign: 'center', lineHeight: 17 },
});

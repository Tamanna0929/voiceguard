import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { MASK_KINDS } from '../privacy/mask';
import { loadIncidents } from '../services/incidents';
import { loadHistory, type Settings } from '../services/storage';
import { exportAllData, loadPrivacyStats, totalMasked, wipeAllData, type PrivacyStats } from '../services/privacy';
import { BackBar, Btn, Chip, Section, TOP, k } from '../ui/kit';
import { C } from '../ui/theme';
import { tr, type StrKey } from '../ui/i18n';

/** A plain-language account of what VoiceGuard keeps, what it sends, and the switches that control it. */
export function PrivacyScreen({ settings, onChange, onBack, onWiped }: { settings: Settings; onChange: (s: Settings) => void; onBack: () => void; onWiped: () => void }) {
  const lang = settings.lang;
  const [stats, setStats] = useState<PrivacyStats | null>(null);
  const [counts, setCounts] = useState({ history: 0, incidents: 0 });
  const set = <K extends keyof Settings>(key: K, v: Settings[K]) => onChange({ ...settings, [key]: v });

  const refresh = () => {
    loadPrivacyStats().then(setStats);
    Promise.all([loadHistory(settings.historyDays), loadIncidents()]).then(([h, i]) => setCounts({ history: h.length, incidents: i.length }));
  };
  useEffect(refresh, []);

  const exportData = async () => {
    Share.share({ message: await exportAllData() }).catch(() => {});
  };
  const wipe = () =>
    Alert.alert(tr(lang, 'pvWipe'), tr(lang, 'pvWipeConfirm'), [
      { text: tr(lang, 'cancel'), style: 'cancel' },
      {
        text: tr(lang, 'delete'),
        style: 'destructive',
        onPress: async () => {
          await wipeAllData();
          onWiped();
          refresh();
          Alert.alert(tr(lang, 'pvDeleted'));
        },
      },
    ]);

  const Row = ({ title, value, ok = true }: { title: string; value: string; ok?: boolean }) => (
    <View style={k.card}>
      <View style={s.rowHead}>
        <Text style={[s.dot, { color: ok ? C.green : C.amber }]}>●</Text>
        <Text style={s.rowT}>{title}</Text>
      </View>
      <Text style={k.dim}>{value}</Text>
    </View>
  );

  const proxyOn = settings.cloudAI && !!settings.aiEndpoint;
  return (
    <View style={s.root}>
      <BackBar label={tr(lang, 'back')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <Text style={k.h}>🔒 {tr(lang, 'pvTitle')}</Text>
        <Text style={[k.text, { marginTop: 6, fontWeight: '700' }]}>{tr(lang, 'pvPromise')}</Text>

        <Row title={tr(lang, 'pvAudio')} value={`${tr(lang, 'pvAudioV')} ${tr(lang, 'pvAudioTemp')}`} />
        <Row title={tr(lang, 'pvText')} value={tr(lang, 'pvTextV')} />
        <Row title={tr(lang, 'pvSpeech')} value={tr(lang, (settings.onDevice || settings.strictOffline) && (!settings.allowCloudSpeech || settings.strictOffline) ? 'pvSpeechOn' : 'pvSpeechOff')} ok={(settings.onDevice || settings.strictOffline) && (!settings.allowCloudSpeech || settings.strictOffline)} />
        <Row title={tr(lang, 'pvProxy')} value={`${tr(lang, proxyOn && !settings.strictOffline ? 'pvProxyOn' : 'pvProxyOff')}${stats ? `  ${stats.proxySentences} ${tr(lang, 'pvSent')}` : ''}`} ok={!proxyOn || settings.strictOffline} />

        <Section>{tr(lang, 'pvControls')}</Section>
        <View style={s.sw}>
          <Switch value={settings.strictOffline} onValueChange={(v) => set('strictOffline', v)} />
          <Text style={[s.swT, { fontWeight: '700' }]}>{tr(lang, 'strictOffline')}</Text>
        </View>
        <View style={s.sw}>
          <Switch value={settings.maskSensitive} onValueChange={(v) => set('maskSensitive', v)} />
          <Text style={s.swT}>{tr(lang, 'pvMaskSwitch')}</Text>
        </View>
        <View style={s.sw}>
          <Switch value={settings.onDevice || settings.strictOffline} disabled={settings.strictOffline} onValueChange={(v) => set('onDevice', v)} />
          <Text style={s.swT}>{tr(lang, 'onDevice')}</Text>
        </View>
        <View style={s.sw}>
          <Switch value={settings.allowCloudSpeech && !settings.strictOffline} disabled={settings.strictOffline} onValueChange={(v) => set('allowCloudSpeech', v)} />
          <Text style={s.swT}>{tr(lang, 'allowCloudSpeech')}</Text>
        </View>
        <View style={s.sw}>
          <Switch value={settings.cloudAI && !settings.strictOffline} disabled={settings.strictOffline} onValueChange={(v) => set('cloudAI', v)} />
          <Text style={s.swT}>{tr(lang, 'cloudTitle')}</Text>
        </View>
        <View style={s.sw}>
          <Switch value={settings.saveHistory} onValueChange={(v) => set('saveHistory', v)} />
          <Text style={s.swT}>{tr(lang, 'saveHistory')}</Text>
        </View>

        <Text style={[k.text, { marginTop: 18, fontWeight: '700' }]}>{tr(lang, 'pvRetention')}</Text>
        <View style={k.row}>
          {[7, 30, 90, 0].map((d) => (
            <Chip key={d} label={d === 0 ? tr(lang, 'pvNever') : `${d} ${tr(lang, 'pvDays')}`} on={settings.historyDays === d} onPress={() => set('historyDays', d)} />
          ))}
        </View>

        <Section>{tr(lang, 'pvMaskTitle')}</Section>
        <View style={k.card}>
          <Text style={s.big}>
            {stats ? totalMasked(stats) : 0} <Text style={k.dim}>{tr(lang, 'pvMaskCount')}</Text>
          </Text>
          {stats &&
            MASK_KINDS.filter((m) => stats.masked[m] > 0).map((m) => (
              <View key={m} style={s.kindRow}>
                <Text style={k.text}>{tr(lang, ('m_' + m) as StrKey)}</Text>
                <Text style={k.text}>{stats.masked[m]}</Text>
              </View>
            ))}
        </View>

        <Section>{tr(lang, 'pvStored')}</Section>
        <View style={k.card}>
          <View style={s.kindRow}>
            <Text style={k.text}>{tr(lang, 'pvStoredSettings')}</Text>
            <Text style={k.text}>✓</Text>
          </View>
          <View style={s.kindRow}>
            <Text style={[k.text, { flex: 1, marginRight: 10 }]}>{tr(lang, 'pvStoredHistory')}</Text>
            <Text style={k.text}>{settings.saveHistory ? counts.history : 0}</Text>
          </View>
          <View style={s.kindRow}>
            <Text style={[k.text, { flex: 1, marginRight: 10 }]}>{tr(lang, 'pvStoredIncidents')}</Text>
            <Text style={k.text}>{counts.incidents}</Text>
          </View>
        </View>

        <Btn kind="ghost" label={'↗  ' + tr(lang, 'pvExport')} onPress={exportData} />
        <Btn kind="danger" label={tr(lang, 'pvWipe')} onPress={wipe} />
        <Text style={[k.dim, { marginTop: 18, textAlign: 'center' }]}>{tr(lang, 'pvTruth')}</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: TOP, paddingHorizontal: 18 },
  rowHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dot: { fontSize: 14, marginRight: 8 },
  rowT: { color: C.text, fontWeight: '800', fontSize: 16 },
  sw: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  swT: { color: C.text, marginLeft: 12, flex: 1, lineHeight: 19 },
  big: { color: C.text, fontSize: 28, fontWeight: '900' },
  kindRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
});

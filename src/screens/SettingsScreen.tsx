import React from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { clearHistory, type Lang, type Settings } from '../services/storage';
import { C } from '../ui/theme';
import { tr } from '../ui/i18n';

const LANGS: Array<{ id: Lang; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'pa', label: 'ਪੰਜਾਬੀ' },
];

export function SettingsScreen({ settings, onChange, onBack }: { settings: Settings; onChange: (s: Settings) => void; onBack: () => void }) {
  const lang = settings.lang;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v });
  return (
    <View style={s.root}>
      <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button">
        <Text style={s.back}>‹ {tr(lang, 'back')}</Text>
      </Pressable>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={s.h}>{tr(lang, 'settings')}</Text>

        <Text style={s.label}>{tr(lang, 'language')}</Text>
        <View style={s.row}>
          {LANGS.map((l) => (
            <Pressable key={l.id} onPress={() => set('lang', l.id)} style={[s.chip, lang === l.id && s.chipOn]}>
              <Text style={[s.chipT, lang === l.id && { color: '#fff' }]}>{l.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>{tr(lang, 'familyTitle')}</Text>
        <Text style={s.help}>{tr(lang, 'familyHelp')}</Text>
        <TextInput style={s.input} placeholder={tr(lang, 'familyName')} placeholderTextColor={C.dim} value={settings.familyName} onChangeText={(v) => set('familyName', v)} />
        <TextInput
          style={s.input}
          placeholder={tr(lang, 'familyNumber')}
          placeholderTextColor={C.dim}
          keyboardType="phone-pad"
          value={settings.familyNumber}
          onChangeText={(v) => set('familyNumber', v)}
        />

        <Text style={s.label}>{tr(lang, 'cloudTitle')}</Text>
        <Text style={s.help}>{tr(lang, 'cloudHelp')}</Text>
        <View style={s.switchRow}>
          <Switch value={settings.cloudAI} onValueChange={(v) => set('cloudAI', v)} />
        </View>
        {settings.cloudAI && (
          <TextInput
            style={s.input}
            placeholder={tr(lang, 'endpoint') + '  https://…'}
            placeholderTextColor={C.dim}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={settings.aiEndpoint}
            onChangeText={(v) => set('aiEndpoint', v)}
          />
        )}

        <View style={s.switchRow}>
          <Switch value={settings.onDevice} onValueChange={(v) => set('onDevice', v)} />
          <Text style={s.switchT}>{tr(lang, 'onDevice')}</Text>
        </View>
        <View style={s.switchRow}>
          <Switch value={settings.saveHistory} onValueChange={(v) => set('saveHistory', v)} />
          <Text style={s.switchT}>{tr(lang, 'saveHistory')}</Text>
        </View>
        <Pressable style={s.clear} onPress={() => clearHistory()}>
          <Text style={s.clearT}>{tr(lang, 'clearHistory')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 8 : 58;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: TOP, paddingHorizontal: 18 },
  back: { color: C.blue, fontSize: 17, fontWeight: '600' },
  h: { color: C.text, fontSize: 28, fontWeight: '900', marginTop: 14 },
  label: { color: C.text, fontSize: 16, fontWeight: '800', marginTop: 22 },
  help: { color: C.dim, marginTop: 4, marginBottom: 8, lineHeight: 19, fontSize: 13 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: C.card },
  chipOn: { backgroundColor: C.blue },
  chipT: { color: C.dim, fontWeight: '700' },
  input: { backgroundColor: C.card, color: C.text, borderRadius: 12, padding: 12, marginTop: 8, fontSize: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  switchT: { color: C.text, marginLeft: 12, flex: 1, lineHeight: 19 },
  clear: { marginTop: 24, padding: 12, alignSelf: 'flex-start' },
  clearT: { color: C.red, fontWeight: '700' },
});

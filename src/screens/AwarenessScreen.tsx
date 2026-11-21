import React from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SCRIPTS, type CallScript } from '../data/scripts';
import type { Lang } from '../services/storage';
import { C } from '../ui/theme';
import { tr } from '../ui/i18n';

export function AwarenessScreen({ lang, onPick, onBack, demoOnly }: { lang: Lang; onPick: (s: CallScript) => void; onBack: () => void; demoOnly?: boolean }) {
  const list = demoOnly ? SCRIPTS.filter((s) => ['digital-arrest', 'kyc-expiry', 'genuine-bank'].includes(s.id)) : SCRIPTS;
  return (
    <View style={s.root}>
      <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button">
        <Text style={s.back}>‹ {tr(lang, 'back')}</Text>
      </Pressable>
      <Text style={s.h}>{demoOnly ? tr(lang, 'demo') : tr(lang, 'awareness')}</Text>
      <Text style={s.sub}>{demoOnly ? tr(lang, 'demoSub') : tr(lang, 'awarenessSub')}</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {list.map((sc) => (
          <Pressable key={sc.id} style={s.card} onPress={() => onPick(sc)} accessibilityRole="button">
            <View style={[s.badge, { backgroundColor: sc.scam ? C.red : C.green }]}>
              <Text style={s.badgeT}>{sc.scam ? tr(lang, 'scamLabel') : tr(lang, 'safeLabel')}</Text>
            </View>
            <Text style={s.title}>{sc.title[lang]}</Text>
            <Text style={s.play}>▶</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 8 : 58;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: TOP, paddingHorizontal: 18 },
  back: { color: C.blue, fontSize: 17, fontWeight: '600' },
  h: { color: C.text, fontSize: 28, fontWeight: '900', marginTop: 14 },
  sub: { color: C.dim, marginTop: 4, marginBottom: 14, lineHeight: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 10 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 12 },
  badgeT: { color: '#fff', fontSize: 11, fontWeight: '900' },
  title: { color: C.text, fontSize: 16, fontWeight: '700', flex: 1 },
  play: { color: C.blue, fontSize: 18 },
});

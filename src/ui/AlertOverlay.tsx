import React, { useEffect } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { TacticId } from '../engine/types';
import type { Lang } from '../services/storage';
import { C } from './theme';
import { tacticLabel, tr } from './i18n';

export function AlertOverlay({
  visible,
  lang,
  risk,
  flags,
  hasFamily,
  onFamily,
  onShared,
  onDismiss,
}: {
  visible: boolean;
  lang: Lang;
  risk: number;
  flags: TacticId[];
  hasFamily: boolean;
  onFamily: () => void;
  onShared: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!visible) {
      Vibration.cancel();
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    Vibration.vibrate([0, 600, 300, 600, 300, 600], true);
    return () => Vibration.cancel();
  }, [visible]);

  const steps = [tr(lang, 'step1'), tr(lang, 'step2'), tr(lang, 'step3'), tr(lang, 'step4'), tr(lang, 'step5')];
  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={s.root}>
        <ScrollView contentContainerStyle={s.body}>
          <Text style={s.warn}>⚠</Text>
          <Text style={s.hang} accessibilityRole="header">
            {tr(lang, 'hangUp')}
          </Text>
          <Text style={s.sub}>{tr(lang, 'hangUpSub')}</Text>
          <Text style={s.score}>
            {tr(lang, 'riskTitle')} {risk}/100
          </Text>

          <View style={s.chips}>
            {flags.slice(0, 6).map((f) => (
              <View key={f} style={s.chip}>
                <Text style={s.chipTxt}>{tacticLabel(lang, f)}</Text>
              </View>
            ))}
          </View>

          <View style={s.card}>
            {steps.map((t, i) => (
              <View key={i} style={s.step}>
                <Text style={s.stepN}>{i + 1}</Text>
                <Text style={s.stepT}>{t}</Text>
              </View>
            ))}
          </View>

          <Pressable style={[s.btn, s.btnWhite]} onPress={() => Linking.openURL('tel:1930')} accessibilityRole="button">
            <Text style={[s.btnTxt, { color: C.redDark }]}>📞  {tr(lang, 'call1930')}</Text>
          </Pressable>
          <Pressable style={[s.btn, s.btnLine]} onPress={() => Linking.openURL('https://cybercrime.gov.in')} accessibilityRole="button">
            <Text style={s.btnTxt}>{tr(lang, 'reportPortal')}</Text>
          </Pressable>
          <Pressable style={[s.btn, s.btnLine]} onPress={onFamily} accessibilityRole="button">
            <Text style={s.btnTxt}>
              👪  {tr(lang, 'alertFamily')}
              {hasFamily ? '' : '  ·  ' + tr(lang, 'familyMissing')}
            </Text>
          </Pressable>
          <Pressable style={[s.btn, s.btnLine]} onPress={onShared} accessibilityRole="button">
            <Text style={s.btnTxt}>🚨  {tr(lang, 'alertShared')}</Text>
          </Pressable>
          <Pressable style={s.dismiss} onPress={onDismiss} accessibilityRole="button">
            <Text style={s.dismissTxt}>{tr(lang, 'imSafe')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#B91C1C' },
  body: { padding: 22, paddingTop: 64, alignItems: 'center' },
  warn: { fontSize: 54, color: '#fff' },
  hang: { fontSize: 56, fontWeight: '900', color: '#fff', letterSpacing: 2, marginTop: 2 },
  sub: { color: '#FEE2E2', fontSize: 18, textAlign: 'center', marginTop: 6 },
  score: { color: '#FECACA', fontWeight: '700', marginTop: 10, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 14 },
  chip: { backgroundColor: 'rgba(0,0,0,0.28)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: 'rgba(0,0,0,0.26)', borderRadius: 16, padding: 14, marginTop: 18, alignSelf: 'stretch' },
  step: { flexDirection: 'row', marginVertical: 6 },
  stepN: { color: '#fff', fontWeight: '900', width: 24, fontSize: 18 },
  stepT: { color: '#fff', flex: 1, fontSize: 17, lineHeight: 24 },
  btn: { alignSelf: 'stretch', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  btnWhite: { backgroundColor: '#fff' },
  btnLine: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
  btnTxt: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  dismiss: { marginTop: 22, padding: 12 },
  dismissTxt: { color: '#FECACA', textDecorationLine: 'underline', fontSize: 15 },
});

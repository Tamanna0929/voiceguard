import React from 'react';
import { Platform, Pressable, StatusBar, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { C } from './theme';

export const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 8 : 58;

export function BackBar({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={k.back}>‹ {label}</Text>
    </Pressable>
  );
}

export function Section({ children }: { children: React.ReactNode }) {
  return <Text style={k.section}>{children}</Text>;
}

export function Chip({ label, on, onPress, color }: { label: string; on: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={[k.chip, on && { backgroundColor: color ?? C.blue }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Text style={[k.chipT, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...p }: { label?: string } & TextInputProps) {
  return (
    <View style={{ marginTop: 10 }}>
      {label ? <Text style={k.fieldLabel}>{label}</Text> : null}
      <TextInput placeholderTextColor={C.dim} {...p} style={[k.input, p.multiline && { minHeight: 90, textAlignVertical: 'top' }, p.style]} />
    </View>
  );
}

export function Btn({ label, onPress, kind = 'primary', disabled }: { label: string; onPress: () => void; kind?: 'primary' | 'danger' | 'ghost'; disabled?: boolean }) {
  const bg = kind === 'primary' ? C.blue : kind === 'danger' ? C.red : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[k.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }, kind === 'ghost' && { borderWidth: 1, borderColor: C.line }]}
    >
      <Text style={k.btnT}>{label}</Text>
    </Pressable>
  );
}

export const k = StyleSheet.create({
  back: { color: C.blue, fontSize: 17, fontWeight: '600' },
  h: { color: C.text, fontSize: 28, fontWeight: '900', marginTop: 14 },
  section: { color: C.dim, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: 24, marginBottom: 8 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14, marginTop: 10 },
  dim: { color: C.dim, fontSize: 13, lineHeight: 19 },
  text: { color: C.text, fontSize: 15, lineHeight: 21 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: C.card },
  chipT: { color: C.dim, fontWeight: '700' },
  fieldLabel: { color: C.dim, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  input: { backgroundColor: C.card, color: C.text, borderRadius: 12, padding: 12, fontSize: 16 },
  btn: { padding: 15, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  btnT: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
});

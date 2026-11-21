import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { C, levelColor } from './theme';
import type { RiskLevel } from '../engine/types';

const CX = 110;
const CY = 110;
const R = 88;
const rad = (d: number) => (d * Math.PI) / 180;
const pt = (v: number, r: number) => {
  const a = 180 - v * 1.8; // 0 -> far left, 100 -> far right
  return { x: CX + r * Math.cos(rad(a)), y: CY - r * Math.sin(rad(a)) };
};
const arc = (v0: number, v1: number) => {
  const s = pt(v0, R);
  const e = pt(v1, R);
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
};

/** Eases the displayed number toward the target so the needle glides instead of jumping. */
function useTween(target: number) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    const id = setInterval(() => {
      const d = target - cur.current;
      if (Math.abs(d) < 0.4) {
        cur.current = target;
        setV(target);
        clearInterval(id);
        return;
      }
      cur.current += d * 0.18;
      setV(cur.current);
    }, 16);
    return () => clearInterval(id);
  }, [target]);
  return v;
}

export function RiskGauge({ value, level, label, caution = 35, danger = 70 }: { value: number; level: RiskLevel; label: string; caution?: number; danger?: number }) {
  const v = useTween(value);
  const tip = pt(v, R - 14);
  const col = levelColor(level);
  return (
    <View style={s.wrap} accessible accessibilityLabel={`${label}: ${Math.round(value)} out of 100`}>
      <Svg width={220} height={140} viewBox="0 0 220 140">
        <Path d={arc(0, 100)} stroke={C.line} strokeWidth={18} fill="none" strokeLinecap="round" />
        <Path d={arc(0, caution)} stroke={C.green} strokeWidth={14} fill="none" strokeLinecap="round" />
        <Path d={arc(caution, danger)} stroke={C.amber} strokeWidth={14} fill="none" />
        <Path d={arc(danger, 100)} stroke={C.red} strokeWidth={14} fill="none" strokeLinecap="round" />
        <Line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke={C.text} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={CX} cy={CY} r={9} fill={col} stroke={C.bg} strokeWidth={3} />
      </Svg>
      <Text style={[s.num, { color: col }]}>{Math.round(v)}</Text>
      <Text style={[s.lbl, { color: col }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center' },
  num: { fontSize: 44, fontWeight: '800', marginTop: -20 },
  lbl: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3, marginTop: -2 },
});

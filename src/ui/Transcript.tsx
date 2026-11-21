import React, { useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { Hit, Utterance } from '../engine/types';
import type { Lang } from '../services/storage';
import { C, sevBg, sevColor, severityOf } from './theme';
import { tacticLabel } from './i18n';

export interface Line extends Utterance {
  who?: 'caller' | 'you';
}

/** Non-overlapping highlighted segments, earliest-first (rule hits only; AI hits have no span). */
function segments(text: string, hits: Hit[]) {
  const spans = hits
    .filter((h) => h.start >= 0 && h.end > h.start)
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Array<{ t: string; hit?: Hit }> = [];
  let pos = 0;
  for (const h of spans) {
    if (h.start < pos) continue;
    if (h.start > pos) out.push({ t: text.slice(pos, h.start) });
    out.push({ t: text.slice(h.start, h.end), hit: h });
    pos = h.end;
  }
  if (pos < text.length) out.push({ t: text.slice(pos) });
  return out;
}

export function Transcript({ lines, interim, lang, empty, youLabel, callerLabel }: { lines: Line[]; interim: string; lang: Lang; empty: string; youLabel: string; callerLabel: string }) {
  const ref = useRef<FlatList<Line>>(null);
  return (
    <FlatList
      ref={ref}
      data={lines}
      keyExtractor={(l) => String(l.id)}
      onContentSizeChange={() => ref.current?.scrollToEnd({ animated: true })}
      ListEmptyComponent={<Text style={s.empty}>{empty}</Text>}
      ListFooterComponent={interim ? <Text style={s.interim}>{interim}</Text> : undefined}
      renderItem={({ item }) => {
        const tactics = Array.from(new Set(item.hits.map((h) => h.tactic)));
        const aiOnly = new Set(item.hits.filter((h) => h.source === 'ai').map((h) => h.tactic));
        return (
          <View style={s.row}>
            {item.who ? <Text style={s.who}>{item.who === 'you' ? youLabel : callerLabel}</Text> : null}
            <Text style={s.text}>
              {segments(item.text, item.hits).map((g, i) =>
                g.hit ? (
                  <Text key={i} style={{ backgroundColor: sevBg(severityOf(g.hit.tactic)), color: C.text, fontWeight: '700' }}>
                    {g.t}
                  </Text>
                ) : (
                  <Text key={i}>{g.t}</Text>
                ),
              )}
            </Text>
            {tactics.length > 0 && (
              <View style={s.chips}>
                {tactics.map((t) => (
                  <View key={t} style={[s.chip, { borderColor: sevColor(severityOf(t)) }]}>
                    <Text style={[s.chipTxt, { color: sevColor(severityOf(t)) }]}>
                      {tacticLabel(lang, t)}
                      {aiOnly.has(t) ? '  · AI' : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  empty: { color: C.dim, textAlign: 'center', marginTop: 28, paddingHorizontal: 24, lineHeight: 20 },
  row: { backgroundColor: C.card, borderRadius: 12, padding: 12, marginBottom: 8 },
  who: { color: C.dim, fontSize: 11, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.6 },
  text: { color: C.text, fontSize: 16, lineHeight: 23 },
  interim: { color: C.dim, fontSize: 16, fontStyle: 'italic', padding: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  chipTxt: { fontSize: 12, fontWeight: '700' },
});

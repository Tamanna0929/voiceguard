import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StatusBar, StyleSheet, Switch, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { RiskEngine, ALERT_THRESHOLD, CAUTION_THRESHOLD } from '../engine/engine';
import { scamModel } from '../model';
import type { Snapshot } from '../engine/types';
import type { CallScript } from '../data/scripts';
import { addHistory, type Settings } from '../services/storage';
import { maskSensitive, type MaskKind } from '../privacy/mask';
import { addPrivacyStats } from '../services/privacy';
import { LOCALE, useLiveRecognition } from '../services/speech';
import { classifyWithAI } from '../services/llm';
import { familyMessage, sendFamilySMS, sendFamilyWhatsApp } from '../services/family';
import { RiskGauge } from '../ui/RiskGauge';
import { Transcript, type Line } from '../ui/Transcript';
import { AlertOverlay } from '../ui/AlertOverlay';
import { C, levelColor, severityOf, sevColor } from '../ui/theme';
import { tacticLabel, tr } from '../ui/i18n';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const speak = (text: string, language: string) =>
  new Promise<void>((resolve) => Speech.speak(text, { language, rate: 0.95, onDone: () => resolve(), onStopped: () => resolve(), onError: () => resolve() }));

export function LiveScreen({ settings, script, onBack, onRecovery }: { settings: Settings; script?: CallScript; onBack: () => void; onRecovery: () => void }) {
  useKeepAwake();
  const lang = settings.lang;
  const engine = useRef(new RiskEngine({ model: scamModel })).current;
  const startedAt = useRef(Date.now());
  const who = useRef(new Map<number, 'caller' | 'you'>());
  const lastLevel = useRef('safe');
  const maskedCounts = useRef<Partial<Record<MaskKind, number>>>({});
  const proxyCount = useRef(0);
  const [hidden, setHidden] = useState(0);

  const [lines, setLines] = useState<Line[]>([]);
  const [snap, setSnap] = useState<Snapshot>(engine.snapshot());
  const [interim, setInterim] = useState('');
  const [overlay, setOverlay] = useState(false);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [speakAloud, setSpeakAloud] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const speakRef = useRef(false);
  speakRef.current = speakAloud;
  const flagsSeen = useRef(new Set<string>());

  const refresh = useCallback(
    (s: Snapshot) => {
      setSnap(s);
      setLines(engine.getUtterances().map((u) => ({ ...u, who: who.current.get(u.id) })));
      s.active.forEach((a) => flagsSeen.current.add(a));
      if (s.newAlert) setOverlay(true);
      if (s.level !== lastLevel.current) {
        lastLevel.current = s.level;
        if (s.level === 'caution') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
    },
    [engine],
  );

  const process = useCallback(
    (raw: string, speaker?: 'caller' | 'you') => {
      // Sensitive numbers are hidden BEFORE anything else sees the sentence (transcript, risk engine, AI proxy).
      const m = settings.maskSensitive ? maskSensitive(raw) : { text: raw, found: [] as MaskKind[] };
      const text = m.text;
      if (m.found.length) {
        m.found.forEach((f) => (maskedCounts.current[f] = (maskedCounts.current[f] ?? 0) + 1));
        setHidden((h) => h + m.found.length);
      }
      const s = engine.push(text, Date.now());
      const utt = s.utterance!;
      if (speaker) who.current.set(utt.id, speaker);
      refresh(s);
      if (settings.cloudAI && settings.aiEndpoint) {
        const ctx = engine
          .getUtterances()
          .slice(-7, -1)
          .map((u) => u.text);
        proxyCount.current += 1;
        classifyWithAI(settings.aiEndpoint, text, ctx, lang).then((r) => {
          if (r && r.tactics.length) refresh(engine.applyAI(utt.id, r.tactics));
        });
      }
    },
    [engine, refresh, settings.cloudAI, settings.aiEndpoint, settings.maskSensitive, lang],
  );
  const processRef = useRef(process);
  processRef.current = process;

  // ---- live microphone mode ----
  const mic = useLiveRecognition({
    lang,
    onDevice: settings.onDevice,
    onFinal: (t) => processRef.current(t),
    onInterim: (t: string) => setInterim(settings.maskSensitive ? maskSensitive(t).text : t),
    onError: (m) => setError(m.startsWith('not-allowed') ? tr(lang, 'micDenied') : `${tr(lang, 'speechError')}: ${m}`),
  });

  // ---- scripted demo / awareness mode ----
  useEffect(() => {
    if (!script) return;
    let alive = true;
    setFinished(false);
    (async () => {
      for (const turn of script.turns) {
        if (!alive) return;
        processRef.current(turn.text, turn.who);
        if (speakRef.current) await speak(turn.text, script.lang === 'en-IN' ? 'en-IN' : script.lang);
        else await sleep(1500 + turn.text.length * 26);
      }
      if (alive) setFinished(true);
    })();
    return () => {
      alive = false;
      Speech.stop();
    };
  }, [script, runKey]);

  const replay = () => {
    engine.reset();
    who.current.clear();
    flagsSeen.current.clear();
    lastLevel.current = 'safe';
    startedAt.current = Date.now();
    setLines([]);
    setSnap(engine.snapshot());
    setOverlay(false);
    setRunKey((k) => k + 1);
  };

  const flushPrivacy = async () => {
    await addPrivacyStats({ masked: maskedCounts.current, proxySentences: proxyCount.current, sessions: script ? 0 : 1 });
    maskedCounts.current = {};
    proxyCount.current = 0;
  };

  const endSession = async () => {
    mic.stop();
    Speech.stop();
    await flushPrivacy();
    if (settings.saveHistory && lines.length) {
      await addHistory({
        id: String(startedAt.current),
        startedAt: startedAt.current,
        durationSec: Math.round((Date.now() - startedAt.current) / 1000),
        peak: snap.peak,
        tactics: Array.from(flagsSeen.current) as any,
        demo: !!script,
      });
    }
    onBack();
  };

  const dismiss = () => {
    engine.dismissAlert();
    setOverlay(false);
  };

  const [familyNote, setFamilyNote] = useState('');
  const alertFamily = async () => {
    if (!settings.familyNumber) {
      setFamilyNote(tr(lang, 'familyMissing'));
      return;
    }
    const body = familyMessage(lang, snap.risk, snap.active);
    const ok = await sendFamilySMS(settings.familyNumber, body);
    if (!ok) await sendFamilyWhatsApp(settings.familyNumber, body);
    setFamilyNote(tr(lang, 'familySent'));
  };

  const col = levelColor(snap.level);
  const levelText = snap.level === 'danger' ? tr(lang, 'danger') : snap.level === 'caution' ? tr(lang, 'watch') : tr(lang, 'safe');

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={endSession} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr(lang, 'back')}>
          <Text style={s.back}>‹ {tr(lang, 'back')}</Text>
        </Pressable>
        <View style={s.pill}>
          <View style={[s.dot, { backgroundColor: script ? C.blue : mic.listening ? C.green : C.dim }]} />
          <Text style={s.pillTxt}>{script ? tr(lang, 'demoBadge') : mic.listening ? tr(lang, 'listening') : tr(lang, 'idle')}</Text>
        </View>
      </View>

      <View style={s.gaugeCard}>
        <RiskGauge value={snap.risk} level={snap.level} label={levelText} caution={CAUTION_THRESHOLD} danger={ALERT_THRESHOLD} />
        <View style={s.flagRow}>
          {snap.active.length === 0 ? (
            <Text style={s.noFlags}>{tr(lang, 'noFlags')}</Text>
          ) : (
            snap.active.slice(0, 5).map((a) => (
              <View key={a} style={[s.flag, { borderColor: sevColor(severityOf(a)) }]}>
                <Text style={[s.flagTxt, { color: sevColor(severityOf(a)) }]}>{tacticLabel(lang, a)}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      <Text style={s.section}>
        {tr(lang, 'transcript')}
        {hidden > 0 ? `   🔒 ${hidden} ${tr(lang, 'maskedCount')}` : ''}
      </Text>
      <View style={s.listBox}>
        <Transcript lines={lines} interim={interim} lang={lang} empty={tr(lang, 'tapStart')} youLabel={tr(lang, 'you')} callerLabel={tr(lang, 'caller')} />
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}
      {familyNote ? <Text style={s.note}>{familyNote}</Text> : null}

      {script && finished ? (
        <View style={[s.lesson, { borderColor: script.scam ? C.red : C.green }]}>
          <Text style={s.lessonH}>
            {script.scam ? tr(lang, 'scamLabel') : tr(lang, 'safeLabel')} · {tr(lang, 'lesson')}
          </Text>
          <Text style={s.lessonT}>{script.lesson[lang]}</Text>
        </View>
      ) : null}

      <View style={s.footer}>
        {script ? (
          <>
            <View style={s.switchRow}>
              <Switch value={speakAloud} onValueChange={setSpeakAloud} />
              <Text style={s.switchTxt}>{tr(lang, 'speakAloud')}</Text>
            </View>
            <Pressable style={s.btn} onPress={replay} accessibilityRole="button">
              <Text style={s.btnTxt}>↻ {tr(lang, 'replay')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            {!mic.listening && <Text style={s.tip}>{tr(lang, 'speakerTip')}</Text>}
            <Pressable
              style={[s.btn, mic.listening && { backgroundColor: C.card, borderWidth: 1, borderColor: C.line }]}
              onPress={() => (mic.listening ? mic.stop() : mic.start())}
              accessibilityRole="button"
            >
              <Text style={s.btnTxt}>{mic.listening ? '■ ' + tr(lang, 'stop') : '🎙 ' + tr(lang, 'resume')}</Text>
            </Pressable>
            <Text style={s.tip}>{tr(lang, 'privacy')}</Text>
          </>
        )}
      </View>

      <AlertOverlay visible={overlay} lang={lang} risk={snap.risk} flags={snap.active} hasFamily={!!settings.familyNumber} onFamily={alertFamily}
        onShared={async () => {
          mic.stop();
          Speech.stop();
          await flushPrivacy();
          onRecovery();
        }}
        onDismiss={dismiss}
      />
    </View>
  );
}

const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 6 : 56;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: TOP, paddingHorizontal: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  back: { color: C.blue, fontSize: 17, fontWeight: '600' },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  pillTxt: { color: C.text, fontSize: 13, fontWeight: '700' },
  gaugeCard: { backgroundColor: C.card, borderRadius: 18, paddingVertical: 12, alignItems: 'center' },
  flagRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 8, paddingHorizontal: 10 },
  flag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  flagTxt: { fontSize: 12, fontWeight: '700' },
  noFlags: { color: C.dim, fontSize: 13 },
  section: { color: C.dim, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
  listBox: { flex: 1 },
  error: { color: C.red, marginTop: 6, fontSize: 13 },
  note: { color: C.green, marginTop: 6, fontSize: 13 },
  lesson: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8, backgroundColor: C.card },
  lessonH: { color: C.text, fontWeight: '800', marginBottom: 4 },
  lessonT: { color: C.text, fontSize: 15, lineHeight: 21 },
  footer: { paddingVertical: 12 },
  btn: { backgroundColor: C.blue, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 17 },
  tip: { color: C.dim, fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchTxt: { color: C.text, marginLeft: 10 },
});

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export const LOCALE: Record<'en' | 'hi' | 'pa', string> = { en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN' };

const HINTS = ['OTP', 'KYC', 'Aadhaar', 'CBI', 'digital arrest', 'AnyDesk', 'UPI', 'CVV', 'RBI', 'cyber crime', 'safe account'];

interface Opts {
  lang: 'en' | 'hi' | 'pa';
  onDevice: boolean;
  allowCloud: boolean;
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
  onError: (message: string) => void;
}

/**
 * Continuous live speech-to-text. The OS recogniser stops after silence or a time limit, so we
 * restart it automatically while the user wants protection to stay on.
 * Needs a development build (not Expo Go): see README.
 */
export function useLiveRecognition(opts: Opts) {
  const [listening, setListening] = useState(false);
  const wanted = useRef(false);
  const lastInterim = useRef('');
  const failures = useRef(0);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cb = useRef(opts);
  cb.current = opts;

  const startNative = useCallback((): boolean => {
    const o = cb.current;
    const local = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
    // Privacy first: audio must not leave the phone before it is masked. If on-device recognition is wanted but not
    // available, do NOT silently fall back to the cloud service; stop and say so unless the user explicitly allowed it.
    if (o.onDevice && !local && !o.allowCloud) {
      wanted.current = false;
      setListening(false);
      o.onError('ondevice-unavailable: no offline speech recognition for this phone or language');
      return false;
    }
    ExpoSpeechRecognitionModule.start({
      lang: LOCALE[o.lang],
      interimResults: true,
      // Android's recogniser is steadier in short sessions that we restart ourselves; iOS handles long sessions well.
      continuous: Platform.OS !== 'android',
      addsPunctuation: true,
      requiresOnDeviceRecognition: o.onDevice && local,
      contextualStrings: HINTS,
      // Audio is processed in memory only: never written to a file.
      recordingOptions: { persist: false },
    });
    return true;
  }, []);

  /** Android's recogniser needs a moment to fully stop; restarting too fast gives "client" errors. */
  const scheduleRestart = useCallback(
    (delay: number) => {
      if (restartTimer.current) clearTimeout(restartTimer.current);
      restartTimer.current = setTimeout(() => {
        restartTimer.current = null;
        if (!wanted.current) return;
        try {
          ExpoSpeechRecognitionModule.abort();
        } catch {
          /* nothing running */
        }
        setTimeout(() => wanted.current && startNative(), 150);
      }, delay);
    },
    [startNative],
  );

  useSpeechRecognitionEvent('result', (ev) => {
    const text = ev.results?.[0]?.transcript?.trim() ?? '';
    if (!text) return;
    failures.current = 0;
    if (ev.isFinal) {
      lastInterim.current = '';
      cb.current.onInterim('');
      cb.current.onFinal(text);
    } else {
      lastInterim.current = text;
      cb.current.onInterim(text);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    // flush a dangling partial sentence so nothing the caller said is lost
    if (lastInterim.current) {
      const t = lastInterim.current;
      lastInterim.current = '';
      cb.current.onInterim('');
      cb.current.onFinal(t);
    }
    if (wanted.current) scheduleRestart(600);
    else setListening(false);
  });

  useSpeechRecognitionEvent('error', (ev) => {
    if (ev.error === 'no-speech' || ev.error === 'aborted') return; // normal, 'end' restarts us
    if ((ev.error === 'client' || ev.error === 'busy') && wanted.current && failures.current < 5) {
      failures.current += 1; // transient: retry quietly with a longer pause instead of stopping
      scheduleRestart(900 + failures.current * 400);
      return;
    }
    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed' || ev.error === 'language-not-supported') {
      wanted.current = false;
      setListening(false);
    }
    cb.current.onError(`${ev.error}: ${ev.message}`);
  });

  const start = useCallback(async () => {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      cb.current.onError('not-allowed: microphone / speech permission denied');
      return false;
    }
    wanted.current = true;
    failures.current = 0;
    setListening(true);
    return startNative();
  }, [startNative]);

  const stop = useCallback(() => {
    wanted.current = false;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    setListening(false);
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  useEffect(
    () => () => {
      wanted.current = false;
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        /* ignore */
      }
    },
    [],
  );

  return { listening, start, stop };
}

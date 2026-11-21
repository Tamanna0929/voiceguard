import { useCallback, useEffect, useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export const LOCALE: Record<'en' | 'hi' | 'pa', string> = { en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN' };

const HINTS = ['OTP', 'KYC', 'Aadhaar', 'CBI', 'digital arrest', 'AnyDesk', 'UPI', 'CVV', 'RBI', 'cyber crime', 'safe account'];

interface Opts {
  lang: 'en' | 'hi' | 'pa';
  onDevice: boolean;
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
  const cb = useRef(opts);
  cb.current = opts;

  const startNative = useCallback(() => {
    const o = cb.current;
    ExpoSpeechRecognitionModule.start({
      lang: LOCALE[o.lang],
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      requiresOnDeviceRecognition: o.onDevice && ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
      contextualStrings: HINTS,
      // Audio is processed in memory only: never written to a file.
      recordingOptions: { persist: false },
    });
  }, []);

  useSpeechRecognitionEvent('result', (ev) => {
    const text = ev.results?.[0]?.transcript?.trim() ?? '';
    if (!text) return;
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
    if (wanted.current) setTimeout(() => wanted.current && startNative(), 250);
    else setListening(false);
  });

  useSpeechRecognitionEvent('error', (ev) => {
    if (ev.error === 'no-speech' || ev.error === 'aborted') return; // normal, 'end' restarts us
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
    setListening(true);
    startNative();
    return true;
  }, [startNative]);

  const stop = useCallback(() => {
    wanted.current = false;
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

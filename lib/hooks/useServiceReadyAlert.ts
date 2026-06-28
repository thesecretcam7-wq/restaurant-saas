'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type ReadyItemLike = {
  id: string;
};

type VibratingNavigator = Navigator & {
  vibrate?: (pattern: number | number[]) => boolean;
};

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const SERVICE_ALERT_VOLUME = 1;
const SERVICE_ALERTS_ENABLED_KEY = 'eccofood-service-alerts-enabled';

function hasStoredAlertConsent() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SERVICE_ALERTS_ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function useServiceReadyAlert({ autoUnlock = true }: { autoUnlock?: boolean } = {}) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const knownReadyItemIdsRef = useRef<Set<string> | null>(null);
  const audioUnlockedRef = useRef(false);
  const [alertsReady, setAlertsReady] = useState(hasStoredAlertConsent);

  const initAudio = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (!audioCtxRef.current) {
      const AudioCtor = window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
      if (AudioCtor) {
        try {
          audioCtxRef.current = new AudioCtor();
        } catch {}
      }
    }

    if (!alertAudioRef.current) {
      const audio = new Audio('/sounds/kds-alert.wav');
      audio.preload = 'auto';
      audio.volume = SERVICE_ALERT_VOLUME;
      alertAudioRef.current = audio;
    }
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator === 'undefined') return;
    try {
      (navigator as VibratingNavigator).vibrate?.(pattern);
    } catch {}
  }, []);

  const playToneSequence = useCallback(() => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'closed') return false;

    try {
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(SERVICE_ALERT_VOLUME, ctx.currentTime + 0.03);
      master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.92);
      master.connect(ctx.destination);

      let time = ctx.currentTime + 0.04;
      [880, 1175, 988].forEach((frequency) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency, time);
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.exponentialRampToValueAtTime(0.7, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        osc.connect(gain);
        gain.connect(master);
        osc.start(time);
        osc.stop(time + 0.22);
        time += 0.28;
      });

      return true;
    } catch {
      return false;
    }
  }, [initAudio]);

  const unlockAlerts = useCallback(async () => {
    initAudio();
    const ctx = audioCtxRef.current;

    try {
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }

      if (ctx && ctx.state !== 'closed') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
      }
    } catch {}

    audioUnlockedRef.current = true;
    setAlertsReady(true);
    try {
      window.localStorage.setItem(SERVICE_ALERTS_ENABLED_KEY, '1');
    } catch {}
    vibrate(20);
  }, [initAudio, vibrate]);

  const triggerServiceAlert = useCallback(() => {
    const played = playToneSequence();
    if (!played) {
      const audio = alertAudioRef.current;
      if (audio) {
        audio.volume = SERVICE_ALERT_VOLUME;
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
      }
    }

    vibrate([180, 70, 180, 70, 260]);
  }, [playToneSequence, vibrate]);

  const trackReadyItems = useCallback((readyItems: ReadyItemLike[]) => {
    const nextIds = new Set(readyItems.map((item) => item.id));
    const previousIds = knownReadyItemIdsRef.current;
    knownReadyItemIdsRef.current = nextIds;

    if (!previousIds) return;
    if (readyItems.some((item) => !previousIds.has(item.id))) {
      triggerServiceAlert();
    }
  }, [triggerServiceAlert]);

  useEffect(() => {
    if (!autoUnlock || audioUnlockedRef.current) return;

    const handleFirstInteraction = () => {
      void unlockAlerts();
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { once: true, passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true, passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [autoUnlock, unlockAlerts]);

  return {
    alertsReady,
    trackReadyItems,
    triggerServiceAlert,
    unlockAlerts,
  };
}

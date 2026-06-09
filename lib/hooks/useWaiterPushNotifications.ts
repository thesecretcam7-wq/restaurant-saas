'use client';

import { useCallback, useEffect, useState } from 'react';

type PushStatus = 'idle' | 'unsupported' | 'missing-config' | 'prompt' | 'subscribed' | 'denied' | 'error';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function getPublicKey() {
  const res = await fetch('/api/push/public-key', { cache: 'no-store' });
  if (!res.ok) return '';
  const data = await res.json().catch(() => null);
  return typeof data?.publicKey === 'string' ? data.publicKey : '';
}

export function useWaiterPushNotifications({ tenantId, autoRequest = true }: { tenantId: string; autoRequest?: boolean }) {
  const [status, setStatus] = useState<PushStatus>('idle');

  const enablePushNotifications = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('unsupported');
      return false;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      setStatus('prompt');
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      setStatus('denied');
      return false;
    }

    const publicKey = await getPublicKey();
    if (!publicKey) {
      setStatus('missing-config');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const res = await fetch('/api/push/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          subscription: subscription.toJSON(),
        }),
      });

      if (!res.ok) {
        throw new Error('No se pudo guardar la notificacion push');
      }

      setStatus('subscribed');
      return true;
    } catch (error) {
      console.warn('[push] waiter subscription failed:', error);
      setStatus('error');
      return false;
    }
  }, [tenantId]);

  useEffect(() => {
    if (!autoRequest) return;
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      void enablePushNotifications();
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    const handleFirstInteraction = () => {
      void enablePushNotifications();
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { once: true, passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [autoRequest, enablePushNotifications]);

  return {
    pushStatus: status,
    enablePushNotifications,
  };
}

'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/hooks/use-toast';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { user, tenantId } = useAdminAuth();
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (e) {
      console.error('Service Worker registration failed:', e);
    }
  };

  const subscribe = async () => {
    if (!user || !tenantId) return;
    try {
      const registration = await navigator.serviceWorker.ready;

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicKey) {
        toast({ title: 'Push not configured', description: 'VAPID key missing — add NEXT_PUBLIC_VAPID_PUBLIC_KEY to your Vercel env vars and redeploy.', variant: 'destructive' });
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          tenantId,
          userId: user.id,
        }),
      });

      setIsSubscribed(true);
      toast({ title: 'Notifications Enabled', description: 'You will receive booking reminders.' });
    } catch (err: any) {
      console.error('Failed to subscribe:', err);
      toast({ title: 'Failed to enable notifications', description: err.message || 'Please check browser permissions.', variant: 'destructive' });
    }
  };

  return { isSupported, isSubscribed, subscribe };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

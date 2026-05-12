import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    );
  }, [isSupported]);

  const subscribe = async () => {
    if (!user || !isSupported) return;
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    });

    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_id: user.id, subscription: sub.toJSON() },
      { onConflict: 'user_id' },
    );

    if (error) { console.error('push_subscriptions upsert failed:', error); return; }
    setSubscribed(true);
  };

  const unsubscribe = async () => {
    if (!user || !isSupported) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
    setSubscribed(false);
  };

  return { isSupported, permission, subscribed, subscribe, unsubscribe };
}

import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db, auth } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

export const useNotifications = () => {
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const requestPermission = async () => {
            // Safe guard for browsers without Notification support
            if (typeof Notification === 'undefined') {
                console.warn("Notifications not supported in this browser");
                return;
            }

            try {
                const status = await Notification.requestPermission();
                setPermission(status);

                if (status === 'granted') {
                    // Register SW explicitly if not found (fixes AbortError)
                    if ('serviceWorker' in navigator) {
                        try {
                            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                            console.log('Service Worker registered with scope:', registration.scope);
                        } catch (err) {
                            console.error('Service Worker registration failed:', err);
                        }
                    }

                    // Replace with your VAPID key from Firebase Console
                    const fcmToken = await getToken(messaging, {
                        vapidKey: 'BOUzsUo5hx3dtWfTBxMbzStxKtrJRcubmy4jbrDKaHow9qwj1RFzepvXyZ5HGIvvy0YOVLh4QDcX92DnhQPCi_k',
                        serviceWorkerRegistration: await navigator.serviceWorker.getRegistration()
                    });

                    if (fcmToken) {
                        setToken(fcmToken);
                        saveTokenToUser(fcmToken);
                    }
                }
            } catch (err) {
                console.error('Error requesting notification permission:', err);
            }
        };

        if (auth.currentUser && permission !== 'granted') {
            requestPermission();
        } else if (auth.currentUser && permission === 'granted') {
            // Already granted, just ensure we have the token and it's updated
            getToken(messaging, { vapidKey: 'BOUzsUo5hx3dtWfTBxMbzStxKtrJRcubmy4jbrDKaHow9qwj1RFzepvXyZ5HGIvvy0YOVLh4QDcX92DnhQPCi_k' })
                .then(t => {
                    if (t) {
                        setToken(t);
                        saveTokenToUser(t);
                    }
                });
        }

        // Handle foreground messages
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);
            // You can show a custom toast here if you want
        });

        return () => unsubscribe();
    }, [auth.currentUser, permission]);

    const saveTokenToUser = async (fcmToken: string) => {
        if (!auth.currentUser?.email) return;
        try {
            await updateDoc(doc(db, 'users', auth.currentUser.email), {
                fcmToken: fcmToken,
                lastTokenRefresh: new Date().toISOString()
            });
        } catch (err) {
            console.error('Error saving FCM token to user:', err);
        }
    };

    return { permission, token };
};

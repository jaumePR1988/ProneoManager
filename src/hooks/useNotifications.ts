import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db, auth } from '../firebase/config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

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
                    let registration;
                    if ('serviceWorker' in navigator) {
                        try {
                            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                            console.log('Service Worker registered with scope:', registration.scope);
                        } catch (err) {
                            console.error('Service Worker registration failed:', err);
                            return; // Don't proceed without SW
                        }
                    }

                    if (!registration) {
                        console.warn('No SW registration available for FCM.');
                        return;
                    }

                    console.log("🔔 Intentando obtener token FCM...");
                    // Replace with your VAPID key from Firebase Console
                    const fcmToken = await getToken(messaging, {
                        vapidKey: 'BOUzsUo5hx3dtWfTBxMbzStxKtrJRcubmy4jbrDKaHow9qwj1RFzepvXyZ5HGIvvy0YOVLh4QDcX92DnhQPCi_k',
                        serviceWorkerRegistration: registration
                    });

                    if (fcmToken) {
                        console.log("✅ Token FCM Obtenido:", fcmToken.substring(0, 10) + "...");
                        setToken(fcmToken);
                        saveTokenToUser(fcmToken);
                    } else {
                        console.warn("⚠️ No se pudo obtener token FCM (Vacio)");
                    }
                }
            } catch (err) {
                console.error('Error requesting notification permission:', err);
            }
        };

        if (auth.currentUser && permission !== 'granted') {
            requestPermission();
        } else if (auth.currentUser && permission === 'granted') {
            console.log("🔔 Permiso ya concedido. Iniciando Service Worker...");

            // Wait for SW to be ready before asking for token
            navigator.serviceWorker.ready.then((registration) => {
                console.log("✅ Service Worker Activo. Solicitando token...");

                getToken(messaging, {
                    vapidKey: 'BOUzsUo5hx3dtWfTBxMbzStxKtrJRcubmy4jbrDKaHow9qwj1RFzepvXyZ5HGIvvy0YOVLh4QDcX92DnhQPCi_k',
                    serviceWorkerRegistration: registration
                })
                    .then(t => {
                        if (t) {
                            console.log("✅ Token Refrescado:", t.substring(0, 10) + "...");
                            setToken(t);
                            saveTokenToUser(t);
                        }
                    })
                    .catch(err => {
                        console.error("❌ Error obteniendo token (SW Ready):", err);
                    });
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
        if (!auth.currentUser?.email) {
            console.warn("❌ No se puede guardar token: Usuario no identificado");
            return;
        }

        console.log(`💾 Guardando token para ${auth.currentUser.email}...`);

        try {
            const userRef = doc(db, 'users', auth.currentUser.email);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();
                const currentTokens = userData.fcmTokens || [];

                // Add if not exists
                if (!currentTokens.includes(fcmToken)) {
                    console.log("➕ Token NUEVO detectado. Actualizando lista...");
                    const newTokens = [...currentTokens, fcmToken];
                    await updateDoc(userRef, {
                        fcmToken: fcmToken, // Legacy: Keep most recent
                        fcmTokens: newTokens,
                        lastTokenRefresh: new Date().toISOString()
                    });
                    console.log("✅ Token guardado en Firestore correctamente.");
                } else {
                    console.log("👌 El token ya existe en la lista. No se requieren cambios.");
                }
            } else {
                console.error("❌ Documento de usuario no encontrado en Firestore.");
            }
        } catch (err) {
            console.error("❌ Error guardando token en Firestore:", err);
        }
    };


    return { permission, token };
};

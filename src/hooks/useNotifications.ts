import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db, auth } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

export const useNotifications = () => {
    const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const requestPermission = async () => {
            try {
                const status = await Notification.requestPermission();
                setPermission(status);

                if (status === 'granted') {
                    // Replace with your VAPID key from Firebase Console -> Project Settings -> Cloud Messaging
                    const fcmToken = await getToken(messaging, {
                        vapidKey: 'BGHQy8-x_e_j_h_i_p_i_c_a_k_e_y_v_a_p_i_d_k_e_y' // Placeholder - User should update or I find it
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
            getToken(messaging, { vapidKey: 'BGHQy8-x_e_j_h_i_p_i_c_a_k_e_y_v_a_p_i_d_k_e_y' })
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

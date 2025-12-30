import { useEffect, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

// Default timeout: 15 minutes (in milliseconds)
const DEFAULT_TIMEOUT = 15 * 60 * 1000;

export const useAutoLogout = (user: any, timeout = DEFAULT_TIMEOUT) => {
    const handleLogout = useCallback(() => {
        if (user) {
            console.log('Auto-logout due to inactivity');
            signOut(auth);
            // Optional: alert('Sesión cerrada por inactividad');
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;

        let timer: NodeJS.Timeout;

        const resetTimer = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(handleLogout, timeout);
        };

        // Events to listen for activity
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        // Initial set
        resetTimer();

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Cleanup
        return () => {
            if (timer) clearTimeout(timer);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [user, timeout, handleLogout]);
};

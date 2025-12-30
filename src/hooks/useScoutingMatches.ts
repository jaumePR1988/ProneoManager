import { useState, useEffect } from 'react';
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    orderBy,
    where
} from 'firebase/firestore';
import { db, isDemoMode } from '../firebase/config';
import { ScoutingMatch } from '../types/scoutingMatch';
import { Category } from '../types/player';

const MOCK_MATCHES: ScoutingMatch[] = [];

// Module-level state for Demo Mode persistence
let SESSION_MATCHES = [...MOCK_MATCHES];

export const useScoutingMatches = (sport?: Category, isAdmin: boolean = false) => {
    const [matches, setMatches] = useState<ScoutingMatch[]>(isDemoMode ? SESSION_MATCHES : []);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (isDemoMode) {
            let filtered = [...SESSION_MATCHES];
            if (!isAdmin && sport) {
                filtered = filtered.filter(m => m.sport === sport);
            }
            setMatches(filtered);
            setLoading(false);
            return;
        }

        const matchesRef = collection(db, 'scouting_matches');
        let q = query(matchesRef, orderBy('date', 'asc'));

        if (!isAdmin && sport) {
            q = query(matchesRef, where('sport', '==', sport), orderBy('date', 'asc'));
        }

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as ScoutingMatch[];

                // Sort by time in memory to avoid index requirements
                const sortedData = data.sort((a, b) => a.time.localeCompare(b.time));
                setMatches(sortedData);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching scouting matches:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [sport, isAdmin]);

    const addMatch = async (matchData: Partial<ScoutingMatch>) => {
        if (isDemoMode) {
            const newMatch = {
                ...matchData,
                id: Math.random().toString(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: matchData.status || 'Programado'
            } as ScoutingMatch;
            SESSION_MATCHES = [...SESSION_MATCHES, newMatch];
            setMatches(prev => [...prev, newMatch]);
            return newMatch.id;
        }
        try {
            const docRef = await addDoc(collection(db, 'scouting_matches'), {
                ...matchData,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            return docRef.id;
        } catch (err) {
            console.error("Error adding scouting match:", err);
            throw err;
        }
    };

    const updateMatch = async (id: string, updates: Partial<ScoutingMatch>) => {
        if (isDemoMode) {
            SESSION_MATCHES = SESSION_MATCHES.map(m => m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m);
            setMatches(prev => prev.map(m => m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m));
            return;
        }
        try {
            await updateDoc(doc(db, 'scouting_matches', id), {
                ...updates,
                updatedAt: Date.now(),
            });
        } catch (err) {
            console.error("Error updating scouting match:", err);
            throw err;
        }
    };

    const deleteMatch = async (id: string) => {
        if (isDemoMode) {
            SESSION_MATCHES = SESSION_MATCHES.filter(m => m.id !== id);
            setMatches(prev => prev.filter(m => m.id !== id));
            return;
        }
        try {
            await deleteDoc(doc(db, 'scouting_matches', id));
        } catch (err) {
            console.error("Error deleting scouting match:", err);
            throw err;
        }
    };

    return { matches, loading, error, addMatch, updateMatch, deleteMatch };
};

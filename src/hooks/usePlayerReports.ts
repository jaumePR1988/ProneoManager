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
import { PlayerReport, PlayerReportFormData } from '../types/playerReport';

const MOCK_REPORTS: PlayerReport[] = [];

// Module-level state for Demo Mode persistence
let SESSION_REPORTS = [...MOCK_REPORTS];

export const usePlayerReports = (playerId?: string) => {
    const [reports, setReports] = useState<PlayerReport[]>(isDemoMode ? SESSION_REPORTS : []);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (isDemoMode) {
            let filtered = [...SESSION_REPORTS];
            if (playerId) {
                filtered = filtered.filter(r => r.playerId === playerId);
            }
            // Sort by date descending
            filtered.sort((a, b) => b.createdAt - a.createdAt);
            setReports(filtered);
            setLoading(false);
            return;
        }

        const reportsRef = collection(db, 'player_reports');
        let q = playerId
            ? query(reportsRef, where('playerId', '==', playerId), orderBy('createdAt', 'desc'))
            : query(reportsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as PlayerReport[];

                setReports(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching player reports:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [playerId]);

    const addReport = async (reportData: PlayerReportFormData, scoutName: string, scoutId: string) => {
        const newReport: Omit<PlayerReport, 'id'> = {
            ...reportData,
            playerId: reportData.playerId || '',
            scoutName,
            scoutId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        if (isDemoMode) {
            const report = {
                ...newReport,
                id: Math.random().toString(),
            } as PlayerReport;
            SESSION_REPORTS = [...SESSION_REPORTS, report];
            setReports(prev => [report, ...prev]);
            return report.id;
        }

        try {
            const docRef = await addDoc(collection(db, 'player_reports'), newReport);
            return docRef.id;
        } catch (err) {
            console.error("Error adding player report:", err);
            throw err;
        }
    };

    const updateReport = async (id: string, updates: Partial<PlayerReport>) => {
        if (isDemoMode) {
            SESSION_REPORTS = SESSION_REPORTS.map(r =>
                r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r
            );
            setReports(prev => prev.map(r =>
                r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r
            ));
            return;
        }

        try {
            await updateDoc(doc(db, 'player_reports', id), {
                ...updates,
                updatedAt: Date.now(),
            });
        } catch (err) {
            console.error("Error updating player report:", err);
            throw err;
        }
    };

    const deleteReport = async (id: string) => {
        if (isDemoMode) {
            SESSION_REPORTS = SESSION_REPORTS.filter(r => r.id !== id);
            setReports(prev => prev.filter(r => r.id !== id));
            return;
        }

        try {
            await deleteDoc(doc(db, 'player_reports', id));
        } catch (err) {
            console.error("Error deleting player report:", err);
            throw err;
        }
    };

    return { reports, loading, error, addReport, updateReport, deleteReport };
};

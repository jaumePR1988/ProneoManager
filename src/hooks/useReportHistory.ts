import { useState, useEffect } from 'react';

export interface ReportLog {
    id: string;
    title: string;
    type: 'Scouting' | 'Mercado' | 'Seguimiento' | 'Legal' | 'Finanzas' | 'Vencimientos' | 'Copia Seguridad';
    date: string;
    author: string;
    status: 'Completado' | 'Pendiente';
}

export const useReportHistory = () => {
    const [history, setHistory] = useState<ReportLog[]>(() => {
        // Load from local storage on mount
        const saved = localStorage.getItem('proneo_report_history');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        // Save to local storage whenever history changes
        localStorage.setItem('proneo_report_history', JSON.stringify(history));
    }, [history]);

    const addReport = (title: string, type: ReportLog['type']) => {
        const newLog: ReportLog = {
            id: crypto.randomUUID(),
            title,
            type,
            date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
            author: 'Jaume Pedragosa', // Hardcoded for now, could be dynamic later
            status: 'Completado'
        };
        setHistory(prev => [newLog, ...prev]);
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('proneo_report_history');
    };

    return { history, addReport, clearHistory };
};

import { ScoutingMatch } from './scoutingMatch';

export type ReportType = 'seguimiento' | 'scouting' | 'nuevo';

export interface PlayerReport {
    id: string;
    playerId: string;
    playerName: string;
    reportType: ReportType;
    date: string; // YYYY-MM-DD
    scoutName: string;
    scoutId: string;
    notes: string;
    matchDetails?: Partial<ScoutingMatch>;
    createdAt: number;
    updatedAt: number;
}

export interface PlayerReportFormData {
    playerId?: string;
    playerName: string;
    reportType: ReportType;
    date: string;
    notes: string;
    matchDetails?: Partial<ScoutingMatch>;
    club?: string;
    position?: string;
    preferredFoot?: string;
    birthDate?: string;
    nationality?: string;
    category?: string;
}

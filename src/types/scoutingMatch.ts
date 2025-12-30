import { Category } from './player';

export interface ScoutingMatch {
    id: string;
    playerId: string;
    playerName: string;
    team: string; // Equipo del jugador
    rival: string;
    date: string;
    time: string;
    locationType: 'Local' | 'Visitante';
    assignedAgentId: string;
    assignedAgentName: string;
    playerOrigin: 'scouting' | 'database';
    sport: Category; // Filtro de especialidad
    status: 'Programado' | 'Realizado' | 'Cancelado';
    reportNotes?: string;
    createdAt: number;
    updatedAt: number;
}

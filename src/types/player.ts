export type Category = 'Fútbol' | 'F. Sala' | 'Femenino' | 'Entrenadores';
export type Position = 'Portero' | 'Cierre' | 'Ala' | 'Pivot' | 'Ala/Cierre' | 'Ala/Pivot' | 'Defensa' | 'Mediocentro' | 'Extremo' | 'Delantero' | 'Entrenador';
export type PreferredFoot = 'Derecha' | 'Izquierda' | 'Ambas' | 'Ambidiestro';
export type PayerType = 'Club' | 'Jugador' | 'Ambos';
export type ScoutingStatus = 'No contactado' | 'Contactado' | 'Negociando';

export interface DynamicField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select' | 'boolean';
    options?: string[]; // For 'select' type
    category?: Category | 'General';
}

export interface PlayerSeason {
    season: string;
    team: string;
    league: string;
}

export interface PlayerContract {
    endDate: string;
    clause: string;
    optional?: string; // 'Si' or 'No' or clarification
    optionalNoticeDate?: string;
    conditions?: string;
}

export interface ProneoLink {
    contractDate: string;
    agencyEndDate: string;
    commissionPct: number;
    payerType: PayerType;
}

export interface ScoutingData {
    currentAgent: string;
    agentEndDate: string;
    contractType: string;
    contractEnd: string;
    status: ScoutingStatus;
    notes: string;
    lastContactDate: string;
    contactPerson?: string;
}

export interface ContractYear {
    id: string;
    year: string; // e.g. "2024/2025"
    salary: number; // Net salary
    clubCommissionPct: number;
    playerCommissionPct: number;
}

export interface Player {
    id: string;
    firstName: string;
    lastName1: string;
    lastName2: string;
    name: string; // Display name

    nationality: string;
    birthDate: string;
    age: number;

    // Current status (usually latest season)
    club: string;
    league: string;
    position: Position;
    preferredFoot: PreferredFoot;

    category: Category;

    contract: PlayerContract;
    proneo: ProneoLink;

    sportsBrand?: string;
    sportsBrandEndDate?: string;
    selection?: string;

    monitoringAgent?: string; // Seguimiento

    seasons: PlayerSeason[];

    salaries: {
        year1: number;
        year2: number;
        year3: number;
        year4: number;
    };

    isScouting: boolean;
    scouting?: ScoutingData;

    contractYears?: ContractYear[];

    customFields: Record<string, any>;

    photoUrl?: string;
    documents: { id: string; name: string; url: string }[];

    createdAt: number;
    updatedAt: number;
}

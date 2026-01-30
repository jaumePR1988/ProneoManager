export type Category = 'Fútbol' | 'F. Sala' | 'Femenino' | 'Entrenadores';
export type Position = 'Portero' | 'Cierre' | 'Ala' | 'Pivot' | 'Ala/Cierre' | 'Ala/Pivot' | 'Defensa' | 'Mediocentro' | 'Extremo' | 'Delantero' | 'Entrenador';
export type PreferredFoot = 'Derecha' | 'Izquierda' | 'Ambas' | 'Ambidiestro';
export type PayerType = 'Club' | 'Jugador' | 'Ambos';
export type ScoutingStatus = 'No contactado' | 'Contactado' | 'Negociando' | 'Rechazado';

export interface DynamicField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select' | 'boolean';
    options?: string[]; // For 'select' type
    category?: Category | 'General';
}

export interface PlayerSeason {
    id?: string;
    season: string;
    club: string;       // Was 'team'
    team?: string;      // Compatibility for older data or sessions
    division: string;   // Was 'league'
    matches: number;
    goals: number;
    minutes: number;
    cards: number;
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
    contactPerson?: string; // Legacy
    contactHistory?: {
        date: string;
        agent: string;
        notes?: string;
    }[];
}

export type PaymentStatus = 'Pendiente' | 'Pagado' | 'Pospuesto' | 'Cancelado';

export interface PaymentInfo {
    status: PaymentStatus;
    paymentDate?: string; // Cuando se pagó
    dueDate?: string;     // Fecha prevista de pago (Texto libre: "Enero 2024")
    alertDate?: string;   // Fecha exacta para el aviso (YYYY-MM-DD or DD/MM/YYYY)
    isPaid: boolean;
    notes?: string;
}

export interface ContractYear {
    id: string;
    year: string; // e.g. "2024/2025"
    salary: number; // Net salary
    currency?: string; // 'EUR', 'USD', 'GBP'

    clubCommissionType: 'percentage' | 'fixed';
    clubCommissionPct: number;
    clubCommissionFixed?: number;

    playerCommissionType: 'percentage' | 'fixed';
    playerCommissionPct: number;
    playerCommissionFixed?: number;

    // New fields for Administration/Billing
    clubPayment: PaymentInfo;
    playerPayment: PaymentInfo;
    globalStatus: PaymentStatus; // Resumen del año
}

export interface Player {
    id: string;
    firstName: string;
    lastName1: string;
    lastName2: string;
    name: string; // Display name

    nationality: string;
    nationality2?: string;
    birthDate: string;
    age: number;

    // Current status (usually latest season)
    club: string;
    league: string;
    position: Position;
    preferredFoot: PreferredFoot;

    category: Category;

    contract: PlayerContract;
    contractHistory?: PlayerContract[];
    proneo: ProneoLink;

    sportsBrand?: string;
    sportsBrandEndDate?: string;
    sportsBrand2?: string;
    sportsBrandEndDate2?: string;
    selection?: string;
    division?: string;

    monitoringAgent?: string; // Seguimiento
    monitoringAgent2?: string; // Segundo seguimiento

    seasons: PlayerSeason[];

    salaries: {
        year1: number;
        year2: number;
        year3: number;
        year4: number;
    };

    isScouting: boolean;
    isNewPlayer?: boolean; // Label for newly detected players
    scouting?: ScoutingData;

    contractYears?: ContractYear[];

    customFields: Record<string, any>;

    photoUrl?: string;
    photoUpdateDate?: string;
    accessCode?: string; // PIN for Player Portal Access

    // Loan Information (Cesiones)
    loanData?: {
        isLoaned: boolean;
        ownerClub: string; // "Club Propietario" (e.g. FC Barcelona)
        loanEndDate?: string;
    };

    photoStatus?: '✅' | '❌';
    documents: { id: string; name: string; url: string; type: 'contract' | 'other'; date: string }[];

    createdAt: number;
    updatedAt: number;
}

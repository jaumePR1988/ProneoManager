export type ContactCategory = 'Fútbol' | 'F. Sala' | 'Femenino' | 'Entrenadores' | 'General';
export type ContactType = 'Club' | 'Comunicación';

export interface Contact {
    id: string;
    // Core Info
    name: string;
    role: string;       // e.g. "Director Deportivo", "Entrenador"
    club: string;
    category: ContactCategory;
    type: ContactType;

    // Contact Details
    phone: string;
    email: string;

    // Metadata
    photoUrl?: string;
    notes?: string;

    // System
    createdBy?: string;
    createdAt: number;
    updatedAt: number;
}

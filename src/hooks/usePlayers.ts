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
import { Player, DynamicField } from '../types/player';

const MOCK_PLAYERS_INITIAL: Player[] = [
    {
        id: '1',
        firstName: 'Pablo',
        lastName1: 'Páez',
        lastName2: 'Gavira',
        name: 'Gavi',
        nationality: 'España',
        birthDate: '2004-08-05',
        age: 20,
        club: 'FC Barcelona',
        league: 'España',
        position: 'Mediocentro',
        preferredFoot: 'Derecha',
        category: 'Fútbol',
        isScouting: false,
        contract: {
            endDate: '2026-06-30',
            clause: '1000M',
            optional: 'No',
            conditions: 'Cláusula de rescisión estándar'
        },
        proneo: {
            contractDate: '2022-01-01',
            agencyEndDate: '2025-06-30',
            commissionPct: 10,
            payerType: 'Jugador'
        },
        seasons: [
            { season: '2023/24', team: 'FC Barcelona', league: 'España' }
        ],
        salaries: { year1: 5000000, year2: 6000000, year3: 7000000, year4: 8000000 },
        customFields: {},
        documents: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: '2',
        firstName: 'Lamine',
        lastName1: 'Yamal',
        lastName2: 'Nasraoui',
        name: 'Lamine Yamal',
        nationality: 'España',
        birthDate: '2007-07-13',
        age: 17,
        club: 'FC Barcelona',
        league: 'España',
        position: 'Extremo',
        preferredFoot: 'Izquierda',
        category: 'Fútbol',
        isScouting: true,
        scouting: {
            status: 'Contactado',
            notes: 'La mayor perla de la Masía.',
            currentAgent: 'Jorge Mendes',
            agentEndDate: '2026',
            contractType: 'Profesional',
            contractEnd: '2026',
            lastContactDate: '2024-12-01'
        },
        contract: {
            endDate: '2026-06-30',
            clause: '1000M',
            optional: 'Si',
            optionalNoticeDate: '2025-12-30'
        },
        proneo: {
            contractDate: '2023-09-01',
            agencyEndDate: '2025-06-30',
            commissionPct: 10,
            payerType: 'Jugador'
        },
        seasons: [
            { season: '2023/24', team: 'FC Barcelona', league: 'España' }
        ],
        salaries: { year1: 1000000, year2: 2000000, year3: 3000000, year4: 4000000 },
        customFields: {},
        documents: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    }
];

// Module-level state for Demo Mode persistence
let SESSION_PLAYERS = [...MOCK_PLAYERS_INITIAL];
let SESSION_SCHEMA: DynamicField[] = [];
let SESSION_SYSTEM_LISTS = {
    leagues: ['España', 'Italia', 'Bélgica', 'Polonia', 'Dubai', 'Brasil'],
    clubs: ['FC Barcelona', 'ElPozo Murcia', 'Inter Movistar', 'Palma Futsal', 'Jimbee Cartagena', 'Manzanares FS', 'Jaén Paraíso', 'Industrias Santa Coloma'],
    positions: ['Portero', 'Ala', 'Cierre', 'Pivot', 'Ala/Cierre', 'Ala/Pivot', 'Entrenador', 'Defensa', 'Mediocentro', 'Extremo', 'Delantero'],
    brands: ['Joma', 'Adidas', 'Nike', 'Munich', 'Senda', 'Luanvi'],
    agents: ['Jaume', 'Joan Francesc', 'Albert Redondo', 'Sistema AI'],
    selections: ['No', 'Si', 'Sub-17', 'Sub-19', 'Sub-21', 'Absoluta'],
    feet: ['Derecha', 'Izquierda', 'Ambas', 'Ambidiestro'],
    reducedColumns: ['firstName', 'lastName1', 'club', 'league', 'position', 'endDate']
};

export const usePlayers = (isScouting: boolean = false) => {
    const [players, setPlayers] = useState<Player[]>(isDemoMode ? SESSION_PLAYERS.filter(p => p.isScouting === isScouting) : []);
    const [schema, setSchema] = useState<DynamicField[]>(isDemoMode ? SESSION_SCHEMA : []);
    const [systemLists, setSystemLists] = useState(isDemoMode ? SESSION_SYSTEM_LISTS : {
        leagues: [], clubs: [], positions: [], brands: [], agents: [], selections: [], feet: [], reducedColumns: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refresh = () => {
        setLoading(true);
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        if (isDemoMode) {
            setSchema(SESSION_SCHEMA);
            setSystemLists(SESSION_SYSTEM_LISTS);
            return;
        }

        const schemaRef = doc(db, 'settings', 'database_schema');
        const unsubSchema = onSnapshot(schemaRef, (snapshot) => {
            if (snapshot.exists()) {
                setSchema(snapshot.data().fields || []);
            }
        });

        const listsRef = doc(db, 'settings', 'system_lists');
        const unsubLists = onSnapshot(listsRef, (snapshot) => {
            if (snapshot.exists()) {
                setSystemLists(snapshot.data() as any);
            }
        });

        return () => { unsubSchema(); unsubLists(); };
    }, [refreshTrigger]);

    useEffect(() => {
        if (isDemoMode) {
            setPlayers(SESSION_PLAYERS.filter(p => p.isScouting === isScouting));
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'players'),
            where('isScouting', '==', isScouting),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const playersData = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as Player[];
                setPlayers(playersData);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching players:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [isScouting, refreshTrigger]);

    const addPlayer = async (playerData: Partial<Player>) => {
        if (isDemoMode) {
            const newPlayer = { ...playerData, id: Math.random().toString(), createdAt: Date.now(), updatedAt: Date.now(), documents: [] } as Player;
            SESSION_PLAYERS = [newPlayer, ...SESSION_PLAYERS];
            setPlayers(SESSION_PLAYERS.filter(p => p.isScouting === isScouting));
            return newPlayer.id;
        }
        try {
            const docRef = await addDoc(collection(db, 'players'), {
                ...playerData,
                customFields: playerData.customFields || {},
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            return docRef.id;
        } catch (err) {
            console.error("Error adding player:", err);
            throw err;
        }
    };

    const updatePlayer = async (id: string, updates: Partial<Player>) => {
        if (isDemoMode) {
            SESSION_PLAYERS = SESSION_PLAYERS.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p);
            setPlayers(SESSION_PLAYERS.filter(p => p.isScouting === isScouting));
            return;
        }
        try {
            const playerRef = doc(db, 'players', id);

            // Logic for automatic contract archiving
            if (updates.contract) {
                const currentPlayer = players.find(p => p.id === id);
                if (currentPlayer && currentPlayer.contract) {
                    // Only archive if there's a real change in the contract data
                    const currentContractStr = JSON.stringify(currentPlayer.contract);
                    const newContractStr = JSON.stringify(updates.contract);

                    if (currentContractStr !== newContractStr) {
                        const history = currentPlayer.contractHistory || [];
                        // Limit history to last 10 versions to keep document size reasonable
                        updates.contractHistory = [currentPlayer.contract, ...history].slice(0, 10);
                    }
                }
            }

            await updateDoc(playerRef, {
                ...updates,
                updatedAt: Date.now(),
            });
        } catch (err) {
            console.error("Error updating player:", err);
            throw err;
        }
    };

    const deletePlayer = async (id: string) => {
        if (isDemoMode) {
            SESSION_PLAYERS = SESSION_PLAYERS.filter(p => p.id !== id);
            setPlayers(SESSION_PLAYERS.filter(p => p.isScouting === isScouting));
            return;
        }
        try {
            await deleteDoc(doc(db, 'players', id));
        } catch (err) {
            console.error("Error deleting player:", err);
            throw err;
        }
    };

    const signPlayer = async (id: string) => {
        return updatePlayer(id, { isScouting: false });
    };

    const updateSchema = async (newFields: DynamicField[]) => {
        if (isDemoMode) {
            SESSION_SCHEMA = [...newFields];
            setSchema(SESSION_SCHEMA);
            return;
        }
        try {
            const schemaRef = doc(db, 'settings', 'database_schema');
            const { setDoc } = await import('firebase/firestore');
            await setDoc(schemaRef, { fields: newFields });
        } catch (err) {
            console.error("Error updating schema:", err);
        }
    };

    const updateSystemLists = async (newLists: typeof SESSION_SYSTEM_LISTS) => {
        if (isDemoMode) {
            SESSION_SYSTEM_LISTS = { ...newLists };
            setSystemLists(SESSION_SYSTEM_LISTS);
            return;
        }
        try {
            const listsRef = doc(db, 'settings', 'system_lists');
            const { setDoc } = await import('firebase/firestore');
            await setDoc(listsRef, newLists);
        } catch (err) {
            console.error("Error updating system lists:", err);
        }
    };

    return { players, schema, systemLists, loading, error, addPlayer, updatePlayer, deletePlayer, signPlayer, updateSchema, updateSystemLists, refresh };
};

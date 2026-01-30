import React, { useState } from 'react';
import { Check, X, Shield, Plus, Save, AlertCircle, Key, Link as LinkIcon, Copy, Users, UserCog, RefreshCcw } from 'lucide-react';
import { doc, updateDoc, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useUsers } from '../hooks/useUsers';
import { usePlayers } from '../hooks/usePlayers';
interface UsersModuleProps {
    userRole?: string;
    userSport?: string;
}

const UsersModule: React.FC<UsersModuleProps> = ({ userRole = 'guest', userSport = 'General' }) => {
    const { users, loading: loadingUsers } = useUsers();
    const { players, loading: loadingPlayers, updatePlayer } = usePlayers(false); // Fetch all players

    const isDirector = userRole === 'director';
    const isAdmin = userRole === 'admin' || isDirector;
    const isAgent = userRole === 'agent';

    // RBAC Rules
    const canSeePlayers = isAdmin || isAgent;
    const canSeeBackup = isAdmin; // Director AND Admin can see backup (User requested: "en el punto 2 pon tambien administradores")

    // Auth State (Staff Creation)
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        name: '',
        role: 'scout',
        sport: 'General'
    });
    const [createError, setCreateError] = useState('');

    // Tabs
    const [activeTab, setActiveTab] = useState<'staff' | 'players' | 'restore'>('staff'); // 'staff' | 'players' | 'restore'
    const [restoreStatus, setRestoreStatus] = useState('');

    // Players Access Code State (Local edit before save)
    const [editingPinId, setEditingPinId] = useState<string | null>(null);
    const [tempPin, setTempPin] = useState('');

    // --- FILTERS (Players Portal) ---
    const [filterCategory, setFilterCategory] = useState<string>(
        // Default to user's sport if it's specific, otherwise 'All'
        (userSport && userSport !== 'General') ? userSport : 'All'
    );
    const [filterAgent, setFilterAgent] = useState<string>('All');

    // Derived Lists for Filters
    const availableAgents = React.useMemo(() => {
        // Extract unique agents from players list
        const agents = new Set<string>();
        players.forEach(p => {
            // Logic to find agent? Usually customFields.agent or scouting.currentAgent or something?
            // Looking at Player type: I don't see a direct 'agent' field on the root level.
            // It might be in 'scouting?.currentAgent' but these are PLAYERS (often 'Club' payerType).
            // Let's assume 'scouting.currentAgent' OR 'proneo.contactPerson' (legacy) OR we might need to add it?
            // Inspecting typical data... let's check standard fields.
            // Assuming specific 'agent' logic might be complex. 
            // EDIT: Checking usePlayers hook - keysToSort includes 'agents'.
            // Let's try to find where agent is stored. Usually 'scouting.currentAgent'. 
            // But for registered players they might have an assigned internal agent.
            // Let's look at `MultimediaModule` or `PlayerModule` to see how they filter by agent.
            // MultimediaModule uses `p.scouting?.currentAgent`.
            if (p.scouting?.currentAgent) agents.add(p.scouting.currentAgent);
        });
        return Array.from(agents).sort();
    }, [players]);

    const filteredPlayers = React.useMemo(() => {
        return players.filter(p => {
            // 1. Category Filter
            if (filterCategory !== 'All') {
                if (filterCategory === 'Fútbol' && p.category !== 'Fútbol') return false;
                if (filterCategory === 'F. Sala' && p.category !== 'F. Sala') return false;
                if (filterCategory === 'Femenino' && p.category !== 'Femenino') return false;
                // If filter is specific but player doesn't match
                if (p.category !== filterCategory) return false;
            }

            // 2. Agent Filter
            if (filterAgent !== 'All') {
                if (p.scouting?.currentAgent !== filterAgent) return false;
            }

            return true;
        });
    }, [players, filterCategory, filterAgent]);


    if (loadingUsers || loadingPlayers) return (
        <div className="p-10 text-center text-zinc-400 font-bold animate-pulse bg-white rounded-3xl h-full flex items-center justify-center">
            Cargando usuarios y jugadores...
        </div>
    );

    // --- STAFF ACTIONS ---
    const handleApprove = async (email: string) => {
        if (confirm(`¿Aprobar acceso a ${email}?`)) {
            await updateDoc(doc(db, 'users', email), { approved: true, role: 'scout' });
        }
    };

    const handleReject = async (email: string) => {
        if (confirm(`¿Eliminar solicitud de ${email}?`)) {
            await deleteDoc(doc(db, 'users', email));
        }
    };

    const handleRoleChange = async (email: string, newRole: string) => {
        await updateDoc(doc(db, 'users', email), { role: newRole });
    };

    const handleSportChange = async (email: string, newSport: string) => {
        await updateDoc(doc(db, 'users', email), { sport: newSport });
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');

        if (!newUser.email || !newUser.name) {
            setCreateError('Todos los campos son obligatorios');
            return;
        }

        if (!newUser.email.endsWith('@proneosports.com')) {
            setCreateError('Debe ser un correo @proneosports.com');
            return;
        }

        try {
            await setDoc(doc(db, 'users', newUser.email), {
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
                sport: newUser.sport,
                approved: true,
                createdAt: new Date().toISOString()
            });
            setShowCreateModal(false);
            setNewUser({ email: '', name: '', role: 'scout', sport: 'General' });
        } catch (err: any) {
            console.error("Error creating user:", err);
            setCreateError('Error al crear usuario. Verifica que no exista.');
        }
    };

    // --- PLAYERS ACTIONS ---
    const startEditingPin = (player: any) => {
        setEditingPinId(player.id);
        setTempPin(player.accessCode || '');
    };

    const savePin = async (playerId: string) => {
        try {
            // Update pure Firestore document
            await updateDoc(doc(db, 'players', playerId), {
                accessCode: tempPin
            });
            setEditingPinId(null);
        } catch (error) {
            console.error("Error saving PIN:", error);
            alert("Error al guardar el PIN.");
        }
    };

    const copyPlayerLink = (playerId: string) => {
        const url = `${window.location.origin}/portal/${playerId}`;
        navigator.clipboard.writeText(url);
        alert(`Enlace copiado al portapapeles:\n${url}`);
    };

    // --- BACKUP RESTORE ---
    const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm("⚠️ ADVERTENCIA CRÍTICA ⚠️\n\nEstás a punto de RESTAURAR masivamente la base de datos.\nEsto SOBRESCRIBIRÁ los datos actuales con los del archivo de respaldo.\n\n¿Estás 100% seguro de que quieres continuar?")) {
            event.target.value = ''; // Reset input
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = e.target?.result as string;
                const playersToRestore = JSON.parse(json);

                if (!Array.isArray(playersToRestore)) {
                    alert("El archivo no tiene formato válido (debe ser una lista de jugadores).");
                    return;
                }

                setRestoreStatus(`Iniciando restauración de ${playersToRestore.length} registros...`);
                let successCount = 0;
                let errorCount = 0;

                for (const player of playersToRestore) {
                    try {
                        if (!player.id) continue;
                        const sanitized = JSON.parse(JSON.stringify(player));
                        await setDoc(doc(db, 'players', player.id), sanitized);
                        successCount++;
                        if (successCount % 10 === 0) setRestoreStatus(`Restaurando... (${successCount}/${playersToRestore.length})`);
                    } catch (err) {
                        console.error("Error restoring player:", player, err);
                        errorCount++;
                    }
                }

                setRestoreStatus(`✅ Restauración completada: ${successCount} restaurados, ${errorCount} errores.`);
                alert(`Proceso finalizado.\n\nRestaurados: ${successCount}\nFallidos: ${errorCount}`);
            } catch (err) {
                console.error("JSON Parse Error", err);
                alert("Error al leer el archivo JSON.");
            }
            event.target.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight uppercase italic">Panel de Control</h1>
                    <p className="text-zinc-500 font-medium">Gestión de accesos: Staff y Jugadores</p>
                </div>
                <div className="flex bg-white p-1 rounded-2xl border border-zinc-100 shadow-sm">
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('staff')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${activeTab === 'staff' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            <UserCog className="w-4 h-4" />
                            Staff Proneo
                        </button>
                    )}

                    {canSeePlayers && (
                        <button
                            onClick={() => setActiveTab('players')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${activeTab === 'players' ? 'bg-[#b4c885] text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            <Users className="w-4 h-4" />
                            Portal Jugadores
                        </button>
                    )}

                    {canSeeBackup && (
                        <button
                            onClick={() => setActiveTab('restore')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${activeTab === 'restore' ? 'bg-red-100 text-red-500' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            <Shield className="w-4 h-4" />
                            Backup
                        </button>
                    )}
                </div>
            </header>

            {/* --- TAB: STAFF --- */}
            {activeTab === 'staff' && isAdmin && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-3 rounded-2xl hover:bg-zinc-800 transition-all font-black uppercase tracking-widest text-xs shadow-lg"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Miembro Staff
                        </button>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl shadow-zinc-200/50 border border-zinc-100 overflow-hidden w-full">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-50 border-b border-zinc-100">
                                <tr>
                                    <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest">Usuario</th>
                                    <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest">Rol</th>
                                    <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest">Especialidad</th>
                                    <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest text-right">Estado</th>
                                    <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {users.map((user) => (
                                    <tr key={user.email} className="group hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-400">
                                                    {user.name?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-zinc-900">{user.name}</p>
                                                    <p className="text-xs text-zinc-400 font-mono">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.email, e.target.value)}
                                                className="bg-zinc-100 border-none rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-zinc-200"
                                            >
                                                <option value="director">Director</option>
                                                <option value="admin">Admin</option>
                                                <option value="tesorero">Tesorero/a</option>
                                                <option value="agent">Agente</option>
                                                <option value="scout">Scout</option>
                                                <option value="external_scout">Scout Externo</option>
                                                <option value="comunicacion">Comunicación</option>
                                                <option value="guest">Invitado</option>
                                            </select>
                                        </td>
                                        <td className="px-8 py-6">
                                            <select
                                                value={user.sport || 'General'}
                                                onChange={(e) => handleSportChange(user.email, e.target.value)}
                                                className="bg-zinc-50 border-none rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-zinc-200"
                                            >
                                                <option value="General">Global / General</option>
                                                <option value="Fútbol">Fútbol</option>
                                                <option value="F. Sala">F. Sala</option>
                                                <option value="Femenino">Femenino</option>
                                                <option value="Entrenadores">Entrenadores</option>
                                            </select>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {user.approved ? (
                                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-widest">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                    Pendiente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {!user.approved ? (
                                                    <>
                                                        <button onClick={() => handleApprove(user.email)} className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center"><Check className="w-4 h-4" /></button>
                                                        <button onClick={() => handleReject(user.email)} className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center"><X className="w-4 h-4" /></button>
                                                    </>
                                                ) : (
                                                    user.email !== 'jaume@proneosports.com' && (
                                                        <button onClick={() => handleReject(user.email)} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-400 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- TAB: PLAYERS (PORTAL) --- */}
            {activeTab === 'players' && canSeePlayers && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="bg-[#b4c885]/10 p-6 rounded-3xl border border-[#b4c885]/20 flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 bg-[#b4c885] rounded-full flex items-center justify-center text-white shrink-0">
                                <Key className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-[#b4c885] uppercase tracking-tight">Acceso Portal Jugadores</h3>
                                <p className="text-sm text-zinc-600 font-medium">Asigna una contraseña (PIN) a cada jugador.</p>
                            </div>
                        </div>

                        {/* FILTERS */}
                        <div className="flex items-center gap-3">
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="h-12 px-4 rounded-xl bg-white border border-zinc-200 text-xs font-bold uppercase tracking-widest outline-none focus:border-[#b4c885] focus:ring-4 focus:ring-[#b4c885]/10"
                            >
                                <option value="All">Todas las Categorías</option>
                                <option value="Fútbol">Fútbol</option>
                                <option value="F. Sala">F. Sala</option>
                                <option value="Femenino">Femenino</option>
                            </select>

                            <select
                                value={filterAgent}
                                onChange={(e) => setFilterAgent(e.target.value)}
                                className="h-12 px-4 rounded-xl bg-white border border-zinc-200 text-xs font-bold uppercase tracking-widest outline-none focus:border-[#b4c885] focus:ring-4 focus:ring-[#b4c885]/10"
                            >
                                <option value="All">Todos los Agentes</option>
                                {availableAgents.map(agent => (
                                    <option key={agent} value={agent}>{agent}</option>
                                ))}
                            </select>

                            {/* Bulk PIN Reset Button */}
                            {isAdmin && (
                                <button
                                    onClick={async () => {
                                        if (filteredPlayers.length === 0) return;
                                        if (confirm(`⚠️ ATENCIÓN ⚠️\n\nVas a REGENERAR el PIN de acceso para ${filteredPlayers.length} jugadores visibles.\n\nEsta acción:\n1. Asignará un nuevo código de 4 dígitos aleatorio a CADA UNO.\n2. Sobrescribirá los códigos existentes.\n\n¿Estás seguro de continuar?`)) {
                                            const batch = writeBatch(db);
                                            let count = 0;
                                            filteredPlayers.forEach(player => {
                                                const newPin = Math.floor(1000 + Math.random() * 9000).toString();
                                                const playerRef = doc(db, 'players', player.id);
                                                batch.update(playerRef, { accessCode: newPin });
                                                count++;
                                            });
                                            try {
                                                await batch.commit();
                                                alert(`✅ Se han actualizado ${count} códigos de acceso correctamente.`);
                                            } catch (error) {
                                                console.error("Error bulk updating PINs:", error);
                                                alert("❌ Error al actualizar los PINs.");
                                            }
                                        }
                                    }}
                                    className="h-12 px-6 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white flex items-center gap-2 transition-colors ml-auto"
                                    title="Regenerar PINs para la lista actual"
                                >
                                    <RefreshCcw className="w-4 h-4 text-[#b4c885]" />
                                    <span className="text-xs font-black uppercase tracking-widest">Regenerar PINs</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl shadow-zinc-200/50 border border-zinc-100 overflow-hidden w-full">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-50 border-b border-zinc-100">
                                <tr>
                                    <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest w-[30%]">Jugador</th>
                                    <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest w-[20%]">Club</th>
                                    <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest w-[30%]">PIN de Acceso</th>
                                    <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest text-right w-[20%]">Enlace</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {filteredPlayers.map((player) => (
                                    <tr key={player.id} className="group hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-zinc-100 overflow-hidden border border-zinc-200">
                                                    {player.photoUrl ? (
                                                        <img src={player.photoUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zinc-300 font-black text-xs">
                                                            {player.name?.[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-zinc-900">{player.name}</p>
                                                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">{player.category}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-sm font-bold text-zinc-600">{player.club}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            {editingPinId === player.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={tempPin}
                                                        onChange={(e) => setTempPin(e.target.value.toUpperCase())}
                                                        className="w-full h-9 px-3 bg-white border-2 border-[#b4c885] rounded-lg text-sm font-bold text-zinc-900 focus:outline-none uppercase"
                                                        placeholder="PIN..."
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') savePin(player.id);
                                                            if (e.key === 'Escape') setEditingPinId(null);
                                                        }}
                                                    />
                                                    <button onClick={() => savePin(player.id)} className="p-2 bg-[#b4c885] text-white rounded-lg hovered:opacity-90"><Check className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group/pin cursor-pointer" onClick={() => startEditingPin(player)}>
                                                    {player.accessCode ? (
                                                        <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-black font-mono tracking-wider border border-green-200">
                                                            {player.accessCode}
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1.5 bg-zinc-100 text-zinc-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-zinc-200 group-hover/pin:border-[#b4c885] group-hover/pin:text-[#b4c885] transition-colors">
                                                            Sin Asignar
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => copyPlayerLink(player.id)}
                                                className="px-4 py-2 bg-zinc-50 text-zinc-400 hover:bg-[#b4c885] hover:text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2 ml-auto group/btn"
                                            >
                                                <LinkIcon className="w-4 h-4" />
                                                <span className="hidden group-hover/btn:inline">Copiar</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- TAB: RESTORE (HIDDEN BACKUP) --- */}
            {activeTab === 'restore' && canSeeBackup && (
                <div className="bg-white p-10 rounded-[40px] shadow-xl border border-zinc-100 text-center space-y-8 max-w-2xl mx-auto animate-in fade-in zoom-in-95">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                        <Shield className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-zinc-900 uppercase">Restauración de Emergencia</h2>
                        <p className="text-zinc-500 max-w-md mx-auto">Carga aquí el archivo de copia de seguridad (.json) para restaurar la base de datos completa. <br /><strong className="text-red-500">Esta acción sobrescribirá los datos actuales.</strong></p>
                    </div>

                    <div className="p-8 border-2 border-dashed border-zinc-200 rounded-3xl hover:border-zinc-400 transition-colors bg-zinc-50/50">
                        <label className="cursor-pointer block">
                            <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
                            <span className="block text-zinc-400 font-bold uppercase tracking-widest hover:text-zinc-600 transition-colors">
                                Haz click para seleccionar archivo JSON
                            </span>
                        </label>
                    </div>

                    {restoreStatus && (
                        <div className="p-4 bg-zinc-900 text-white rounded-xl font-mono text-sm animate-pulse">
                            {restoreStatus}
                        </div>
                    )}
                </div>
            )}

            {/* --- MODAL: CREATE STAFF --- */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl space-y-6 relative">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-zinc-900 uppercase">Nuevo Staff</h2>
                            <p className="text-xs font-bold text-zinc-400">Pre-vincular cuenta para acceso inmediato</p>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-2">Nombre Completo</label>
                                <input
                                    type="text"
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl h-11 px-4 font-bold text-zinc-700 focus:bg-white focus:ring-4 focus:ring-zinc-900/10 focus:border-zinc-900/50 outline-none transition-all"
                                    placeholder="Ej. Pepito Pérez"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-2">Email Corporativo</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl h-11 px-4 font-bold text-zinc-700 focus:bg-white focus:ring-4 focus:ring-zinc-900/10 focus:border-zinc-900/50 outline-none transition-all"
                                    placeholder="usuario@proneosports.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-2">Rol</label>
                                    <select
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl h-11 px-4 font-bold text-zinc-700 focus:bg-white focus:ring-4 focus:ring-zinc-900/10 focus:border-zinc-900/50 outline-none transition-all appearance-none"
                                    >
                                        <option value="director">Director</option>
                                        <option value="admin">Admin</option>
                                        <option value="tesorero">Tesorero/a</option>
                                        <option value="agent">Agente</option>
                                        <option value="scout">Scout</option>
                                        <option value="external_scout">Scout Externo</option>
                                        <option value="comunicacion">Comunicación</option>
                                        <option value="guest">Invitado</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-2">Especialidad</label>
                                    <select
                                        value={newUser.sport}
                                        onChange={e => setNewUser({ ...newUser, sport: e.target.value })}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl h-11 px-4 font-bold text-zinc-700 focus:bg-white focus:ring-4 focus:ring-zinc-900/10 focus:border-zinc-900/50 outline-none transition-all appearance-none"
                                    >
                                        <option value="General">General</option>
                                        <option value="Fútbol">Fútbol</option>
                                        <option value="F. Sala">F. Sala</option>
                                        <option value="Femenino">Femenino</option>
                                        <option value="Entrenadores">Entrenadores</option>
                                    </select>
                                </div>
                            </div>

                            {createError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-500 text-xs font-bold flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {createError}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-zinc-900 text-white h-12 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Crear Miembro Staff
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersModule;

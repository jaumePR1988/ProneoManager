import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, Users, Save, Trash2, Search, Target } from 'lucide-react';
import { usePlayers } from '../hooks/usePlayers';
import { useUsers } from '../hooks/useUsers';
import { ScoutingMatch } from '../types/scoutingMatch';
import { Category } from '../types/player';

interface ScoutingMatchFormProps {
    match?: ScoutingMatch | null;
    selectedDate?: Date;
    userSport: Category;
    onClose: () => void;
    onSave: (data: Partial<ScoutingMatch>) => Promise<string | void>;
    onDelete?: (id: string) => Promise<void>;
    isAdmin?: boolean;
}

const ScoutingMatchForm: React.FC<ScoutingMatchFormProps> = ({
    match,
    selectedDate,
    userSport,
    onClose,
    onSave,
    onDelete,
    isAdmin = false
}) => {
    const { players: scoutingPlayers } = usePlayers(true);
    const { players: databasePlayers } = usePlayers(false);
    const { users } = useUsers();

    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [formData, setFormData] = useState<Partial<ScoutingMatch>>({
        playerId: '',
        playerName: '',
        team: '',
        rival: '',
        date: selectedDate ? formatDate(selectedDate) : formatDate(new Date()),
        time: '18:00',
        locationType: 'Local',
        assignedAgentId: '',
        assignedAgentName: '',
        playerOrigin: 'scouting',
        sport: userSport,
        status: 'Programado'
    });

    const combinedPlayers = useMemo(() => {
        const sport = (userSport || '').trim().toLowerCase();
        const isGeneral = sport === 'general' || sport === 'global';
        const list = [
            ...scoutingPlayers.map(p => ({ ...p, origin: 'scouting' as const })),
            ...databasePlayers.map(p => ({ ...p, origin: 'database' as const }))
        ];

        if (isGeneral) return list;
        return list.filter(p => (p.category || '').trim().toLowerCase() === sport);
    }, [scoutingPlayers, databasePlayers, userSport]);

    const filteredResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return combinedPlayers.filter(p =>
            p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            `${p.firstName} ${p.lastName1}`.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 8);
    }, [combinedPlayers, searchQuery]);

    useEffect(() => {
        if (match) {
            setFormData(match);
            setSearchQuery(match.playerName || '');
        }
    }, [match]);

    const handleSelectPlayer = (player: any) => {
        setFormData(prev => ({
            ...prev,
            playerId: player.id,
            playerName: player.name || `${player.firstName} ${player.lastName1}`,
            team: player.club || '',
            playerOrigin: player.origin,
            // Keep current sport if already set, or default to player category
            sport: prev.sport || player.category
        }));
        setSearchQuery(player.name || `${player.firstName} ${player.lastName1}`);
        setShowResults(false);
    };

    const filteredAgents = useMemo(() => {
        const sport = (userSport || '').trim().toLowerCase();
        const isGeneral = sport === 'general' || sport === 'global';

        return users.filter(u =>
            isGeneral ||
            (u.sport || '').trim().toLowerCase() === sport ||
            u.role?.toLowerCase() === 'admin' ||
            u.role?.toLowerCase() === 'director' ||
            u.role?.toLowerCase() === 'gerente'
        );
    }, [users, userSport]);

    const handleAgentChange = (agentId: string) => {
        const agent = filteredAgents.find(u => u.id === agentId);
        if (agent) {
            setFormData(prev => ({
                ...prev,
                assignedAgentId: agent.id,
                assignedAgentName: agent.name
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (err) {
            console.error(err);
            alert('Error al guardar el partido');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-8 border-b border-zinc-100 bg-zinc-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-proneo-green/10 flex items-center justify-center text-proneo-green">
                            <Target className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight italic">
                                {match ? 'Editar Partido' : 'Nuevo Seguimiento'}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Planificación de Scouting</p>
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[8px] font-black rounded uppercase animate-pulse">v1.0.6 | {userSport}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-zinc-200 rounded-2xl transition-all">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Jugador/a */}
                        <div className="space-y-2 relative">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Jugador/a a Visualizar</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                    required
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => {
                                        setSearchQuery(e.target.value);
                                        setShowResults(true);
                                    }}
                                    onFocus={() => setShowResults(true)}
                                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-6 h-14 font-bold text-zinc-900 focus:bg-white focus:ring-4 focus:ring-proneo-green/10 transition-all outline-none"
                                    placeholder="Buscar por nombre..."
                                />

                                {showResults && filteredResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        {filteredResults.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => handleSelectPlayer(p)}
                                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0"
                                            >
                                                <div className="flex flex-col items-start gap-0.5">
                                                    <span className="text-sm font-bold text-zinc-900">{p.name || `${p.firstName} ${p.lastName1}`}</span>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{p.club || 'Sin club'}</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${p.origin === 'scouting' ? 'bg-blue-50 text-blue-500 border border-blue-100' : 'bg-proneo-green/5 text-proneo-green border border-proneo-green/10'}`}>
                                                    {p.origin === 'scouting' ? 'Scouting' : 'Cantera'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Agente */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Agente Asignado</label>
                            <div className="relative">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <select
                                    required
                                    value={formData.assignedAgentId}
                                    onChange={e => handleAgentChange(e.target.value)}
                                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-6 h-14 font-bold text-zinc-900 focus:bg-white focus:ring-4 focus:ring-proneo-green/10 transition-all outline-none appearance-none"
                                >
                                    <option value="">Seleccionar Agente...</option>
                                    {filteredAgents.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Equipo */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Equipo</label>
                            <input
                                required
                                type="text"
                                value={formData.team}
                                onChange={e => setFormData({ ...formData, team: e.target.value })}
                                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 h-14 font-bold text-zinc-900 focus:bg-white focus:ring-4 focus:ring-proneo-green/10 transition-all outline-none"
                                placeholder="Nombre del club"
                            />
                        </div>

                        {/* Rival */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Rival</label>
                            <input
                                required
                                type="text"
                                value={formData.rival}
                                onChange={e => setFormData({ ...formData, rival: e.target.value })}
                                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 h-14 font-bold text-zinc-900 focus:bg-white focus:ring-4 focus:ring-proneo-green/10 transition-all outline-none"
                                placeholder="Nombre del rival"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Fecha */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Fecha</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                    required
                                    type="date"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-6 h-14 font-bold text-zinc-900 focus:bg-white focus:ring-4 focus:ring-proneo-green/10 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Admin Sport Selection Override */}
                        {isAdmin && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Visible en Agenda de</label>
                                <div className="relative">
                                    <select
                                        value={formData.sport || userSport}
                                        onChange={(e) => setFormData({ ...formData, sport: e.target.value as Category })}
                                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 h-14 font-bold text-zinc-900 focus:bg-white focus:ring-4 focus:ring-proneo-green/10 transition-all outline-none appearance-none"
                                    >
                                        <option value="General">Global / General</option>
                                        <option value="Fútbol">Fútbol</option>
                                        <option value="F. Sala">Fútbol Sala</option>
                                        <option value="Femenino">Femenino</option>
                                        <option value="Entrenadores">Entrenadores</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Hora */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Hora</label>
                            <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                    required
                                    type="time"
                                    value={formData.time}
                                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-6 h-14 font-bold text-zinc-900 focus:bg-white focus:ring-4 focus:ring-proneo-green/10 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Campo (Local/Visitante) */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Campo</label>
                            <div className="flex bg-zinc-50 p-1 rounded-2xl border border-zinc-100 h-14">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, locationType: 'Local' })}
                                    className={`flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.locationType === 'Local' ? 'bg-white text-proneo-green shadow-sm border border-zinc-100' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    Local
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, locationType: 'Visitante' })}
                                    className={`flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.locationType === 'Visitante' ? 'bg-white text-blue-500 shadow-sm border border-zinc-100' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    Visitante
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-6">
                        {match?.id && onDelete && (
                            <button
                                type="button"
                                onClick={() => onDelete(match.id!)}
                                className="h-16 px-8 rounded-3xl bg-red-50 text-red-600 font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-3"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Eliminar</span>
                            </button>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 h-16 rounded-3xl bg-zinc-900 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>{match ? 'Actualizar Partido' : 'Guardar en Agenda'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScoutingMatchForm;

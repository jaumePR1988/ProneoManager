import React, { useState, useMemo } from 'react';
import {
    CheckCircle2,
    Search,
    Filter,
    Clock,
    ExternalLink,
    Copy,
    Image as ImageIcon,
    CheckSquare,
    Square,
    Zap,
    Users
} from 'lucide-react';
import { usePlayers } from '../hooks/usePlayers';

interface MultimediaModuleProps {
    userSport: string;
}

const MultimediaModule: React.FC<MultimediaModuleProps> = ({ userSport }) => {
    const { players: allPlayers } = usePlayers(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'Todos' | 'Completado' | 'Pendiente'>('Todos');
    const [selectedCategory, setSelectedCategory] = useState<string>(userSport === 'General' ? 'Todos' : userSport);
    const [selectedAgent, setSelectedAgent] = useState<string>('Todos');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [showCopiedToast, setShowCopiedToast] = useState(false);

    const allAgents = useMemo(() => {
        const agents = new Set<string>();
        allPlayers.forEach(p => {
            if (p.monitoringAgent) agents.add(p.monitoringAgent);
        });
        return Array.from(agents).sort();
    }, [allPlayers]);

    const filteredPlayers = useMemo(() => {
        return allPlayers.filter(player => {
            const playerName = player.name || '';
            const playerClub = player.club || '';

            const matchesSearch = playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                playerClub.toLowerCase().includes(searchTerm.toLowerCase());

            const hasPhoto = player.photoStatus === '✅' || (player.photoUrl && !player.photoUrl.includes('placeholder'));
            const matchesStatus = selectedStatus === 'Todos' ||
                (selectedStatus === 'Completado' && hasPhoto) ||
                (selectedStatus === 'Pendiente' && !hasPhoto);

            const matchesCategory = selectedCategory === 'Todos' || player.category === selectedCategory;

            const matchesAgent = selectedAgent === 'Todos' || player.monitoringAgent === selectedAgent;

            return matchesSearch && matchesStatus && matchesCategory && matchesAgent;
        });
    }, [allPlayers, searchTerm, selectedStatus, selectedCategory, selectedAgent]);

    const stats = useMemo(() => {
        const total = filteredPlayers.length;
        const completed = filteredPlayers.filter(p => p.photoStatus === '✅' || (p.photoUrl && !p.photoUrl.includes('placeholder'))).length;
        return {
            total,
            completed,
            pending: total - completed,
            percent: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }, [filteredPlayers]);

    const copyUpdateLink = (playerId: string) => {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/update/${playerId}`;
        navigator.clipboard.writeText(link);
        setShowCopiedToast(true);
        setTimeout(() => setShowCopiedToast(false), 2000);
    };

    const copyBulkLinks = () => {
        const baseUrl = window.location.origin;
        const links = filteredPlayers
            .filter(p => selectedPlayerIds.includes(p.id))
            .map(p => `${p.name}: ${baseUrl}/update/${p.id}`)
            .join('\n');

        navigator.clipboard.writeText(links);
        setShowCopiedToast(true);
        setTimeout(() => setShowCopiedToast(false), 2000);
    };

    const togglePlayerSelection = (id: string) => {
        setSelectedPlayerIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const selectAllPending = () => {
        const pendingIds = filteredPlayers
            .filter(p => !(p.photoStatus === '✅' || (p.photoUrl && !p.photoUrl.includes('placeholder'))))
            .map(p => p.id);
        setSelectedPlayerIds(pendingIds);
    };

    const toggleAllVisible = () => {
        if (selectedPlayerIds.length === filteredPlayers.length) {
            setSelectedPlayerIds([]);
        } else {
            setSelectedPlayerIds(filteredPlayers.map(p => p.id));
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight italic uppercase">Gestión Multimedia</h1>
                    <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-1">
                        Seguimiento de fotos de temporada {new Date().getFullYear()}/{new Date().getFullYear() + 1}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white px-6 py-3 rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Progreso Global</p>
                            <p className="text-xl font-black text-proneo-green italic">{stats.percent}%</p>
                        </div>
                        <div className="w-12 h-12 rounded-full border-4 border-zinc-50 border-t-proneo-green flex items-center justify-center font-black text-[10px] text-zinc-900">
                            {stats.completed}/{stats.total}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm">
                <div className="flex-1 min-w-[300px] relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-proneo-green transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar jugador o club..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-14 bg-zinc-50 border-2 border-transparent rounded-2xl pl-14 pr-6 text-sm font-bold outline-none focus:bg-white focus:border-proneo-green transition-all"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="h-14 bg-zinc-50 border-2 border-transparent rounded-2xl px-6 text-xs font-black uppercase tracking-widest outline-none focus:bg-white focus:border-proneo-green transition-all appearance-none cursor-pointer pr-12"
                        >
                            <option value="Todos">Todos los Deportes</option>
                            {['Fútbol', 'F. Sala', 'Femenino', 'Entrenadores'].map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value as any)}
                            className="h-14 bg-zinc-50 border-2 border-transparent rounded-2xl px-6 text-xs font-black uppercase tracking-widest outline-none focus:bg-white focus:border-proneo-green transition-all appearance-none cursor-pointer pr-12"
                        >
                            <option value="Todos">Todos los Estados</option>
                            <option value="Completado">Subido ✅</option>
                            <option value="Pendiente">Pendiente ❌</option>
                        </select>
                        <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <select
                            value={selectedAgent}
                            onChange={(e) => setSelectedAgent(e.target.value)}
                            className="h-14 bg-zinc-50 border-2 border-transparent rounded-2xl px-6 text-xs font-black uppercase tracking-widest outline-none focus:bg-white focus:border-proneo-green transition-all appearance-none cursor-pointer pr-12"
                        >
                            <option value="Todos">Todos los Agentes</option>
                            {allAgents.map(agent => (
                                <option key={agent} value={agent}>{agent}</option>
                            ))}
                        </select>
                        <Users className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50">
                                <th className="px-8 py-5 w-10">
                                    <button
                                        onClick={toggleAllVisible}
                                        className="text-zinc-400 hover:text-proneo-green transition-colors"
                                    >
                                        {selectedPlayerIds.length === filteredPlayers.length && filteredPlayers.length > 0 ? (
                                            <CheckSquare className="w-5 h-5 text-proneo-green" />
                                        ) : (
                                            <Square className="w-5 h-5" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-4 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Jugador</th>
                                <th className="px-4 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Agente</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Especialidad</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Última Actualización</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {filteredPlayers.map((player) => {
                                const hasPhoto = player.photoStatus === '✅' || (player.photoUrl && !player.photoUrl.includes('placeholder'));
                                return (
                                    <tr key={player.id} className={`group transition-all ${selectedPlayerIds.includes(player.id) ? 'bg-proneo-green/5' : 'hover:bg-zinc-50/50'}`}>
                                        <td className="px-8 py-6">
                                            <button
                                                onClick={() => togglePlayerSelection(player.id)}
                                                className="text-zinc-300 hover:text-proneo-green transition-colors"
                                            >
                                                {selectedPlayerIds.includes(player.id) ? (
                                                    <CheckSquare className="w-5 h-5 text-proneo-green" />
                                                ) : (
                                                    <Square className="w-5 h-5" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-zinc-100 overflow-hidden shrink-0 border border-zinc-100">
                                                    {player.photoUrl ? (
                                                        <img src={player.photoUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                                            <ImageIcon className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-black text-zinc-900 uppercase italic tracking-tight">{player.name}</p>
                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{player.club}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-zinc-700 uppercase">{player.monitoringAgent || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-3 py-1 bg-zinc-100 text-[9px] font-black uppercase tracking-widest text-zinc-500 rounded-lg">
                                                {player.category}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            {hasPhoto ? (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-proneo-green/10 text-proneo-green rounded-full">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Actualizado</span>
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-full">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Pendiente</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-zinc-600">
                                                    {player.photoUpdateDate ? new Date(player.photoUpdateDate).toLocaleDateString('es-ES') : '---'}
                                                </span>
                                                <span className="text-[10px] font-medium text-zinc-400">
                                                    {player.photoUpdateDate ? new Date(player.photoUpdateDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => copyUpdateLink(player.id)}
                                                    className="p-3 bg-zinc-50 text-zinc-400 hover:bg-proneo-green/10 hover:text-proneo-green rounded-xl transition-all group/btn"
                                                    title="Copiar enlace de actualización"
                                                >
                                                    <Copy className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                                <button
                                                    onClick={() => window.open(`/update/${player.id}`, '_blank')}
                                                    className="p-3 bg-zinc-50 text-zinc-400 hover:bg-blue-500/10 hover:text-blue-500 rounded-xl transition-all group/btn"
                                                    title="Abrir vista previa"
                                                >
                                                    <ExternalLink className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredPlayers.length === 0 && (
                    <div className="p-20 text-center">
                        <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ImageIcon className="w-10 h-10 text-zinc-200" />
                        </div>
                        <h3 className="text-lg font-black text-zinc-900 uppercase italic">No se encontraron jugadores</h3>
                        <p className="text-zinc-400 text-sm mt-2">Ajusta los filtros o la búsqueda para ver otros resultados.</p>
                    </div>
                )}
                {/* Floating Bulk Actions Bar */}
                {selectedPlayerIds.length > 0 && (
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-500">
                        <div className="bg-zinc-900 text-white px-8 py-4 rounded-[32px] shadow-2xl border border-white/10 flex items-center gap-8 backdrop-blur-xl">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-0.5">Seleccionados</span>
                                <span className="text-xl font-black italic text-proneo-green leading-none">{selectedPlayerIds.length} <span className="text-[10px] not-italic text-white opacity-50">JUGADORES</span></span>
                            </div>

                            <div className="w-px h-10 bg-white/10" />

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={copyBulkLinks}
                                    className="flex items-center gap-3 bg-white text-zinc-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95"
                                >
                                    <Copy className="w-4 h-4" />
                                    Copiar Enlaces
                                </button>
                                <button
                                    onClick={() => setSelectedPlayerIds([])}
                                    className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Action: Select All Pending */}
                {stats.pending > 0 && selectedPlayerIds.length === 0 && (
                    <div className="flex justify-center mt-8">
                        <button
                            onClick={selectAllPending}
                            className="flex items-center gap-3 bg-zinc-900 text-white px-8 py-4 rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl group"
                        >
                            <Zap className="w-4 h-4 text-proneo-green group-hover:rotate-12 transition-transform" />
                            Seleccionar todos los PENDIENTES ({stats.pending})
                        </button>
                    </div>
                )}

                {/* Global Toast */}
                {showCopiedToast && (
                    <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900 text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
                        <div className="w-6 h-6 bg-proneo-green/20 rounded-full flex items-center justify-center">
                            <Copy className="w-3 h-3 text-proneo-green" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest">Enlaces copiados</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MultimediaModule;

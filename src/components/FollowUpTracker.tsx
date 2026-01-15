import React, { useState, useMemo } from 'react';
import { Search, Calendar, TrendingUp, FileText, Eye, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { usePlayers } from '../hooks/usePlayers';
import { usePlayerReports } from '../hooks/usePlayerReports';
import { Player } from '../types/player';
import { PlayerReport } from '../types/playerReport';

interface FollowUpTrackerProps {
    userSport: string;
    isAdmin: boolean;
}

const FollowUpTracker: React.FC<FollowUpTrackerProps> = ({ userSport, isAdmin }) => {
    const { players: databasePlayers } = usePlayers(false);
    const { players: scoutingPlayers } = usePlayers(true);
    const { reports, loading, deleteReport } = usePlayerReports();

    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'cantera' | 'scouting'>('all');

    const allPlayers = useMemo(() => {
        const db = databasePlayers.map(p => ({ ...p, origin: 'cantera' as const }));
        const sc = scoutingPlayers.map(p => ({ ...p, origin: 'scouting' as const }));
        return [...db, ...sc];
    }, [databasePlayers, scoutingPlayers]);

    const filteredReports = useMemo(() => {
        if (isAdmin || userSport === 'General') return reports;

        return reports.filter(r => {
            // Find the player in our loaded lists to check their category
            const player = allPlayers.find(p => p.id === r.playerId);
            if (!player) return false;

            const pCat = player.category as any;
            const uSport = userSport as any;
            if (uSport === 'Fútbol' || uSport === 'Masculino') {
                return pCat === 'Fútbol' || pCat === 'Masculino';
            }
            if (uSport === 'F. Sala' || uSport === 'Futbol Sala') {
                return pCat === 'F. Sala' || pCat === 'Futbol Sala';
            }
            return pCat === uSport;
        });
    }, [reports, allPlayers, isAdmin, userSport]);

    const playerReportCounts = useMemo(() => {
        const counts: Record<string, { count: number; lastDate: number; player: Player & { origin: 'cantera' | 'scouting' } }> = {};

        allPlayers.forEach(p => {
            // Use filteredReports instead of all reports to stay consistent with stats
            const playerReports = filteredReports.filter(r => r.playerId === p.id);
            if (playerReports.length > 0) {
                counts[p.id] = {
                    count: playerReports.length,
                    lastDate: Math.max(...playerReports.map(r => r.createdAt)),
                    player: p,
                };
            }
        });

        return counts;
    }, [allPlayers, filteredReports]);

    const filteredPlayers = useMemo(() => {
        // Now filteredPlayers only contains players from playerReportCounts, 
        // which is already filtered by sport logic in its own hook.
        let filtered = Object.values(playerReportCounts);

        // Filter by origin
        if (filterType !== 'all') {
            filtered = filtered.filter(p => p.player.origin === filterType);
        }

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.player.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sort by last contact date (most recent first)
        return filtered.sort((a, b) => b.lastDate - a.lastDate);
    }, [playerReportCounts, filterType, searchTerm]);

    const getPlayerReports = (playerId: string): PlayerReport[] => {
        return reports
            .filter(r => r.playerId === playerId)
            .sort((a, b) => b.createdAt - a.createdAt);
    };

    const getDaysSinceLastContact = (timestamp: number): number => {
        return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    };

    const handleDeleteReport = async (reportId: string) => {
        const confirmed = window.confirm('¿Eliminar este informe permanentemente? Esta acción no se puede deshacer.');
        if (confirmed) {
            try {
                await deleteReport(reportId);
            } catch (err) {
                console.error('Error deleting report:', err);
                alert('No se pudo eliminar el informe. Revisa tu conexión.');
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-proneo-green/20 border-t-proneo-green rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-proneo-green transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar jugador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl pl-12 pr-6 h-14 text-sm font-bold focus:bg-white focus:border-proneo-green transition-all outline-none"
                    />
                </div>

                <div className="flex gap-2">
                    {['all', 'cantera', 'scouting'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type as any)}
                            className={`px-6 h-14 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${filterType === type
                                ? 'bg-zinc-900 text-white'
                                : 'bg-white border-2 border-zinc-100 text-zinc-400 hover:border-zinc-200'
                                }`}
                        >
                            {type === 'all' ? 'Todos' : type === 'cantera' ? 'Cantera' : 'Scouting'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-proneo-green/10 rounded-2xl flex items-center justify-center">
                            <Eye className="w-5 h-5 text-proneo-green" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Jugadores Seguidos</p>
                            <p className="text-2xl font-black text-zinc-900 italic">{filteredPlayers.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Informes</p>
                            <p className="text-2xl font-black text-zinc-900 italic">{filteredReports.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Promedio/Jugador</p>
                            <p className="text-2xl font-black text-zinc-900 italic">
                                {filteredPlayers.length > 0
                                    ? (filteredReports.length / filteredPlayers.length).toFixed(1)
                                    : '0'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Players List */}
            <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-zinc-50">
                    <h3 className="font-black text-sm uppercase tracking-widest text-zinc-900">Historial de Seguimiento</h3>
                </div>

                {filteredPlayers.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                        <p className="text-sm font-bold text-zinc-400">No hay informes registrados</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-50">
                        {filteredPlayers.map(({ player, count, lastDate }) => {
                            const isExpanded = expandedPlayerId === player.id;
                            const playerReports = getPlayerReports(player.id);
                            const daysSince = getDaysSinceLastContact(lastDate);

                            return (
                                <div key={player.id}>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                setExpandedPlayerId(isExpanded ? null : player.id);
                                            }
                                        }}
                                        className="w-full p-6 hover:bg-zinc-50/50 transition-all text-left flex items-center justify-between gap-4 cursor-pointer outline-none focus:bg-zinc-50"
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center font-black text-zinc-600 text-sm">
                                                {count}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-sm text-zinc-900 truncate">{player.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${(player as any).isNewPlayer || (player.origin === 'scouting' && (player as any).scouting?.status === 'Seguimiento')
                                                        ? 'bg-orange-500/10 text-orange-500'
                                                        : player.origin === 'cantera'
                                                            ? 'bg-proneo-green/10 text-proneo-green'
                                                            : 'bg-blue-500/10 text-blue-500'
                                                        }`}>
                                                        {(player as any).isNewPlayer || (player.origin === 'scouting' && (player as any).scouting?.status === 'Seguimiento') ? 'NEW' : player.origin === 'cantera' ? 'Cantera' : 'Scouting'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-zinc-400">
                                                        {player.category}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Último contacto</p>
                                                <p className={`text-xs font-bold mt-0.5 ${daysSince > 30 ? 'text-red-500' : daysSince > 14 ? 'text-orange-500' : 'text-proneo-green'
                                                    }`}>
                                                    Hace {daysSince} días
                                                </p>
                                            </div>
                                            {isExpanded ? (
                                                <ChevronUp className="w-5 h-5 text-zinc-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-zinc-400" />
                                            )}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="px-6 pb-6 space-y-3">
                                            {playerReports.map((report) => (
                                                <div
                                                    key={report.id}
                                                    className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100"
                                                >
                                                    <div className="flex items-start justify-between gap-4 mb-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Calendar className="w-3.5 h-3.5 text-proneo-green" />
                                                            <span className="text-xs font-black text-zinc-900">{report.date}</span>
                                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${report.reportType === 'seguimiento'
                                                                ? 'bg-proneo-green/10 text-proneo-green'
                                                                : report.reportType === 'scouting'
                                                                    ? 'bg-blue-500/10 text-blue-500'
                                                                    : 'bg-emerald-500/10 text-emerald-500'
                                                                }`}>
                                                                {report.reportType === 'nuevo' ? 'VISTO' : report.reportType}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-zinc-400">• {report.scoutName}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                console.log('Click en borrar reporte:', report.id);
                                                                handleDeleteReport(report.id);
                                                            }}
                                                            className="p-2 -mr-1 hover:bg-red-50 rounded-lg group transition-all cursor-pointer relative z-50"
                                                            title="Eliminar informe"
                                                        >
                                                            <Trash2 className="w-5 h-5 text-zinc-300 group-hover:text-red-500 transition-colors" />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-zinc-600 leading-relaxed">{report.notes}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FollowUpTracker;

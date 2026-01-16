import React, { useState, useMemo } from 'react';
import { Search, Calendar, TrendingUp, FileText, Eye, ChevronDown, ChevronUp, Trash2, Edit2, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePlayers } from '../hooks/usePlayers';
import { usePlayerReports } from '../hooks/usePlayerReports';
import PlayerReportForm from './PlayerReportForm';
import { Player } from '../types/player';
import { PlayerReport } from '../types/playerReport';

interface FollowUpTrackerProps {
    userSport: string;
    isAdmin: boolean;
}

const FollowUpTracker: React.FC<FollowUpTrackerProps> = ({ userSport, isAdmin }) => {
    const { players: databasePlayers } = usePlayers(false);
    const { players: scoutingPlayers, addPlayer: addScoutingPlayer } = usePlayers(true);
    const { reports, loading, deleteReport, updateReport } = usePlayerReports();

    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'cantera' | 'scouting'>('all');
    const [editingReport, setEditingReport] = useState<PlayerReport | null>(null);
    const [isConverting, setIsConverting] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const allPlayers = useMemo(() => {
        const db = databasePlayers.map(p => ({ ...p, origin: 'cantera' as const }));
        const sc = scoutingPlayers.map(p => ({ ...p, origin: 'scouting' as const }));
        return [...db, ...sc];
    }, [databasePlayers, scoutingPlayers]);

    const filteredReports = useMemo(() => {
        if (isAdmin || userSport === 'General') return reports;

        return reports.filter(r => {
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
        const counts: Record<string, { count: number; lastDate: number; player: Player & { origin: 'cantera' | 'scouting' | 'virtual' } }> = {};

        // 1. Process reports with playerId (Real players)
        allPlayers.forEach(p => {
            const playerReports = filteredReports.filter(r => r.playerId === p.id);
            if (playerReports.length > 0) {
                counts[p.id] = {
                    count: playerReports.length,
                    lastDate: Math.max(...playerReports.map(r => r.createdAt)),
                    player: p,
                };
            }
        });

        // 2. Process reports WITHOUT playerId (type 'nuevo')
        filteredReports.forEach(r => {
            if (!r.playerId && r.playerName) {
                const virtualId = `virtual-${r.playerName}`;
                if (counts[virtualId]) {
                    counts[virtualId].count++;
                    counts[virtualId].lastDate = Math.max(counts[virtualId].lastDate, r.createdAt);
                } else {
                    counts[virtualId] = {
                        count: 1,
                        lastDate: r.createdAt,
                        player: {
                            id: virtualId,
                            name: r.playerName,
                            firstName: r.playerName,
                            lastName1: '',
                            lastName2: '',
                            category: r.category || 'Fútbol',
                            origin: 'virtual' as any,
                            club: r.club || '',
                        } as any
                    };
                }
            }
        });

        return counts;
    }, [allPlayers, filteredReports]);

    const filteredPlayers = useMemo(() => {
        let filtered = Object.values(playerReportCounts);

        if (filterType !== 'all') {
            filtered = filtered.filter(p => p.player.origin === filterType || (filterType === 'cantera' && p.player.origin === 'virtual'));
        }

        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.player.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered.sort((a, b) => b.lastDate - a.lastDate);
    }, [playerReportCounts, filterType, searchTerm]);

    const getPlayerReports = (playerId: string, playerName?: string): PlayerReport[] => {
        return reports
            .filter(r => {
                if (playerId.startsWith('virtual-')) {
                    return r.playerName === playerName && !r.playerId;
                }
                return r.playerId === playerId;
            })
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
                setToast({ message: 'Error al eliminar el informe', type: 'error' });
                setTimeout(() => setToast(null), 3000);
            }
        }
    };

    const handleConvertToScouting = async (report: PlayerReport) => {
        setIsConverting(report.id);
        try {
            const firstName = report.playerName.split(' ')[0] || '';
            const lastName1 = report.playerName.split(' ')[1] || '';
            const lastName2 = report.playerName.split(' ').slice(2).join(' ') || '';

            const newPlayerData = {
                firstName,
                lastName1,
                lastName2,
                name: report.playerName,
                category: (report.category || (userSport === 'General' ? 'Fútbol' : userSport)) as any,
                club: report.club || '',
                position: (report.position || 'Sin definir') as any,
                preferredFoot: (report.preferredFoot || 'Derecha') as any,
                birthDate: report.birthDate || '',
                nationality: report.nationality || '',
                isScouting: true,
                isNewPlayer: true,
                scouting: {
                    status: 'Seguimiento',
                    interest: 'Medio',
                    lastContactDate: report.date,
                    notes: report.notes
                } as any
            };

            const newPlayerId = await addScoutingPlayer(newPlayerData);

            if (newPlayerId) {
                await updateReport(report.id, {
                    playerId: newPlayerId,
                    reportType: 'scouting'
                } as any);

                setToast({ message: '¡Jugador pasado a Scouting!', type: 'success' });
            }
        } catch (err) {
            console.error('Error converting to scouting:', err);
            setToast({ message: 'Error al convertir jugador', type: 'error' });
        } finally {
            setIsConverting(null);
            setTimeout(() => setToast(null), 3000);
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
                            const playerReports = getPlayerReports(player.id, player.name);
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
                                                        <div className="flex items-center gap-1">
                                                            {report.reportType === 'nuevo' && !report.playerId && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleConvertToScouting(report);
                                                                    }}
                                                                    disabled={isConverting === report.id}
                                                                    className="flex items-center gap-2 px-3 py-1.5 bg-proneo-green/10 hover:bg-proneo-green text-proneo-green hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                                                >
                                                                    {isConverting === report.id ? (
                                                                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                                    ) : (
                                                                        <UserPlus className="w-3.5 h-3.5" />
                                                                    )}
                                                                    <span>Pasar a Scouting</span>
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingReport(report);
                                                                }}
                                                                className="p-2 hover:bg-zinc-200 rounded-lg group transition-all"
                                                                title="Editar informe"
                                                            >
                                                                <Edit2 className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteReport(report.id);
                                                                }}
                                                                className="p-2 hover:bg-red-50 rounded-lg group transition-all"
                                                                title="Eliminar informe"
                                                            >
                                                                <Trash2 className="w-4 h-4 text-zinc-300 group-hover:text-red-500 transition-colors" />
                                                            </button>
                                                        </div>
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

            {/* Modals & Overlays */}
            {editingReport && (
                <PlayerReportForm
                    initialReport={editingReport}
                    userRole={isAdmin ? 'admin' : 'scout'}
                    userSport={userSport}
                    onClose={() => setEditingReport(null)}
                    onSave={async (data) => {
                        const { id, ...rest } = data as any;
                        await updateReport(id, rest);
                        setEditingReport(null);
                        setToast({ message: 'Informe actualizado correctamente', type: 'success' });
                        setTimeout(() => setToast(null), 3000);
                    }}
                />
            )}

            {toast && (
                <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-bottom-4 duration-300">
                    <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${toast.type === 'error'
                        ? 'bg-red-500/90 text-white border-red-400'
                        : 'bg-proneo-green/90 text-zinc-900 border-proneo-green/20'
                        }`}>
                        {toast.type === 'error' ? (
                            <AlertCircle className="w-5 h-5" />
                        ) : (
                            <CheckCircle2 className="w-5 h-5" />
                        )}
                        <span className="text-sm font-black uppercase tracking-widest">{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FollowUpTracker;

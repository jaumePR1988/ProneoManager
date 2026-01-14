import React, { useState, useMemo } from 'react';
import {
    MessageSquare,
    Calendar,
    UserPlus,
    Target,
    Search,
    Plus,
    Trash2,
    X,
    StickyNote,
    ChevronDown
} from 'lucide-react';
import { TableVirtuoso } from 'react-virtuoso';
import { usePlayers } from '../hooks/usePlayers';
import ScoutingForm from './ScoutingForm';
import PlayerForm from './PlayerForm';
import { Player } from '../types/player';
import ScoutingPreview from './ScoutingPreview';
import ContactsView from './ContactsView';

interface ScoutingModuleProps {
    userSport?: string;
    userRole?: string;
    userName?: string;
}

const ScoutingModule: React.FC<ScoutingModuleProps> = ({ userSport = 'General', userRole = 'scout', userName }) => {
    const { players: allScoutingPlayers, loading, addPlayer, updatePlayer, deletePlayer } = usePlayers(true);

    const isAdmin = userRole === 'admin' || userRole === 'director';
    const [selectedSport, setSelectedSport] = useState<string>(userSport);

    // Sync selectedSport if userSport prop changes (initial load or role switch)
    // but only if not already changed by admin
    React.useEffect(() => {
        if (!isAdmin) {
            setSelectedSport(userSport);
        }
    }, [userSport, isAdmin]);

    const [isScoutingFormOpen, setIsScoutingFormOpen] = useState(false);
    const [isScoutingPreviewOpen, setIsScoutingPreviewOpen] = useState(false);
    const [editingScouting, setEditingScouting] = useState<Player | null>(null);
    const [signingPlayer, setSigningPlayer] = useState<Player | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [viewingNote, setViewingNote] = useState<{ content: string; date: string; author: string; player: string } | null>(null);
    const [activeView, setActiveView] = useState<'players' | 'contacts'>('players');
    const [searchTerm, setSearchTerm] = useState('');

    const scoutingPlayers = useMemo(() => {
        let filtered = allScoutingPlayers || [];

        // 1. Sport Filter
        // Use selectedSport (which defaults to userSport)
        const filterSport = selectedSport === 'Global' ? 'General' : selectedSport;

        if (filterSport !== 'General') {
            filtered = filtered.filter(p => p.category === filterSport);
        }

        // 2. External Scout Filter
        if (userRole === 'external_scout' && userName) {
            filtered = filtered.filter(p =>
                p.monitoringAgent?.toLowerCase() === userName.toLowerCase()
            );
        }

        // 3. Search Filter
        if (searchTerm) {
            const lowTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                (p.name || `${p.firstName} ${p.lastName1}`).toLowerCase().includes(lowTerm) ||
                (p.club || '').toLowerCase().includes(lowTerm) ||
                (p.position || '').toLowerCase().includes(lowTerm)
            );
        }

        return filtered;
    }, [allScoutingPlayers, selectedSport, userRole, userName, searchTerm]);


    const handleSaveScouting = async (data: Partial<Player>) => {
        if (editingScouting) {
            await updatePlayer(editingScouting.id, data);
            setEditingScouting(null);
        } else {
            await addPlayer({
                ...data,
                isScouting: true,
                category: data.category || (selectedSport !== 'General' && selectedSport !== 'Global' ? selectedSport : 'Fútbol') as any
            });
        }
        setIsScoutingFormOpen(false);
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleAll = () => {
        if (selectedIds.size === scoutingPlayers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(scoutingPlayers.map(p => p.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (window.confirm(`¿Estás seguro de eliminar ${selectedIds.size} jugadores?`)) {
            for (const id of selectedIds) {
                await deletePlayer(id);
            }
            setSelectedIds(new Set());
        }
    };

    const handleSignPlayer = (player: Player) => {
        setSigningPlayer(player);
    };

    const handleViewNote = (player: Player) => {
        // 1. Try to find from Contact History
        let noteContent = player.scouting?.notes;
        let noteDate = player.scouting?.lastContactDate;
        let noteAuthor = player.scouting?.contactPerson;

        if (player.scouting?.contactHistory && player.scouting.contactHistory.length > 0) {
            // Sort by date desc
            const sorted = [...player.scouting.contactHistory]
                .filter(h => h.notes) // Only those with notes
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            if (sorted.length > 0) {
                noteContent = sorted[0].notes;
                noteDate = sorted[0].date;
                noteAuthor = sorted[0].agent;
            }
        }

        if (noteContent) {
            setViewingNote({
                content: noteContent,
                date: noteDate || 'Fecha desconocida',
                author: noteAuthor || 'Sistema',
                player: player.name || `${player.firstName} ${player.lastName1}`
            });
        }
    };

    const handleConfirmSign = async (data: Partial<Player>) => {
        // ... (existing code)
        if (signingPlayer) {
            // We update the existing record to remove isScouting flag and save full data
            const promotedData = { ...data, isScouting: false };
            await updatePlayer(signingPlayer.id, promotedData);
            setSigningPlayer(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-12 h-12 border-4 border-proneo-green/20 border-t-proneo-green rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ... (Modals) ... */}
            {isScoutingPreviewOpen && (
                <ScoutingPreview
                    players={scoutingPlayers}
                    onClose={() => setIsScoutingPreviewOpen(false)}
                />
            )}

            {(isScoutingFormOpen || editingScouting) && (
                <ScoutingForm
                    initialData={editingScouting || undefined}
                    onClose={() => { setIsScoutingFormOpen(false); setEditingScouting(null); }}
                    onSave={handleSaveScouting}
                />
            )}

            {signingPlayer && (
                <PlayerForm
                    initialData={signingPlayer}
                    onClose={() => setSigningPlayer(null)}
                    onSave={handleConfirmSign}
                />
            )}

            {/* Marketplace Overview Bar */}
            <div className="relative flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                    <div className="bg-white p-2 rounded-[32px] border border-zinc-100 shadow-xl shadow-zinc-200/20 flex flex-col md:flex-row items-stretch md:items-center gap-2">
                        {/* Premium Summary Card */}
                        <div className="bg-zinc-900 rounded-[28px] p-4 flex items-center gap-5 min-w-[280px] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20 group-hover:rotate-6 transition-transform relative z-10">
                                <Target className="w-7 h-7" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex flex-col">
                                    {isAdmin ? (
                                        <div className="relative inline-flex items-center mb-1">
                                            <select
                                                value={selectedSport}
                                                onChange={(e) => setSelectedSport(e.target.value)}
                                                className="appearance-none bg-zinc-800 border border-zinc-700 text-zinc-300 pl-3 pr-8 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer hover:bg-zinc-700 transition-colors outline-none"
                                            >
                                                <option value="General">Global (Todos)</option>
                                                <option value="Fútbol">Fútbol</option>
                                                <option value="F. Sala">Fútbol Sala</option>
                                                <option value="Femenino">Femenino</option>
                                                <option value="Entrenadores">Entrenadores</option>
                                            </select>
                                            <ChevronDown className="absolute right-2 pointer-events-none text-zinc-500 w-3 h-3" />
                                        </div>
                                    ) : (
                                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Marketplace</span>
                                    )}
                                    <h4 className="text-2xl font-black text-white tracking-tighter italic">
                                        {scoutingPlayers.length} <span className="text-zinc-500 not-italic font-medium text-lg ml-1 uppercase">Objetivos</span>
                                    </h4>
                                </div>
                            </div>
                        </div>

                        {/* Integrated Search Bar */}
                        <div className="flex-1 relative group md:ml-2">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar objetivo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-[60px] bg-zinc-50 border border-zinc-100 rounded-[28px] pl-16 pr-32 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-zinc-100 outline-none transition-all placeholder:text-zinc-400"
                            />

                            {/* View Toggle - Integrated into Search Bar */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex">
                                <div className="bg-white border border-zinc-200 p-0.5 rounded-full flex shadow-sm scale-90">
                                    <button
                                        onClick={() => setActiveView('players')}
                                        className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeView === 'players'
                                            ? 'bg-zinc-900 text-white shadow-md'
                                            : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
                                            }`}
                                    >
                                        Jugadores
                                    </button>
                                    <button
                                        onClick={() => setActiveView('contacts')}
                                        className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeView === 'contacts'
                                            ? 'bg-zinc-900 text-white shadow-md'
                                            : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
                                            }`}
                                    >
                                        Agenda
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex justify-end shrink-0 self-center">
                    {activeView === 'players' ? (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsScoutingPreviewOpen(true)}
                                className="h-10 px-4 bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all shadow-md"
                            >
                                <Target className="w-4 h-4" />
                                Dosier
                            </button>
                            <button
                                onClick={() => setIsScoutingFormOpen(true)}
                                className="h-10 px-6 bg-zinc-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-md"
                            >
                                <Plus className="w-4 h-4" />
                                Nuevo
                            </button>
                        </div>
                    ) : (
                        // Spacer
                        <div className="h-10"></div>
                    )}
                </div>
            </div>

            {activeView === 'players' && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0 text-left">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="px-4 h-10 rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest mr-2 transition-all animate-in fade-in zoom-in-50"
                        >
                            <Trash2 className="w-4 h-4" />
                            Eliminar ({selectedIds.size})
                        </button>
                    )}
                </div>
            )}

            {/* Content Rendering */}
            {activeView === 'contacts' ? (
                <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm p-8 min-h-[600px]">
                    <ContactsView userSport={selectedSport} />
                </div>
            ) : (
                /* High-Density Scouting Table */
                <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden flex flex-col w-full">
                    <div className="flex-1 min-h-[400px]">
                        <TableVirtuoso
                            style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}
                            data={scoutingPlayers}
                            fixedHeaderContent={() => (
                                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left">
                                    <th className="px-6 py-4 bg-white sticky top-0 z-20 w-[50px]">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded-md border-zinc-300 text-blue-600 focus:ring-blue-500"
                                                checked={scoutingPlayers.length > 0 && selectedIds.size === scoutingPlayers.length}
                                                onChange={toggleAll}
                                            />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-white sticky top-0 z-20 w-[30%]">Objetivo</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-white sticky top-0 z-20">Pierna</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-white sticky top-0 z-20">Agente / Fin Contrato</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-white sticky top-0 z-20">Agente Proneo</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-white sticky top-0 z-20">Estado</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right bg-white sticky top-0 z-20">Acciones</th>
                                </tr>
                            )}
                            itemContent={(_, target) => (
                                <>
                                    <td className="px-4 py-2 border-b border-zinc-50 last:border-0 group-hover:bg-zinc-50 transition-colors" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded-md border-zinc-300 text-blue-600 focus:ring-blue-500"
                                                checked={selectedIds.has(target.id)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelection(target.id);
                                                }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 border-b border-zinc-50 last:border-0 group-hover:bg-zinc-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden shadow-sm">
                                                <img src={target.photoUrl || 'https://i.pravatar.cc/150'} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="font-black text-zinc-900 uppercase italic tracking-tight text-[11px] group-hover:text-blue-600 transition-colors">{target.name || `${target.firstName} ${target.lastName1}`}</p>
                                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{target.club} • {target.position}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 border-b border-zinc-50 last:border-0 group-hover:bg-zinc-50 transition-colors">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${target.preferredFoot === 'Izquierda' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {target.preferredFoot || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 border-b border-zinc-50 last:border-0 group-hover:bg-zinc-50 transition-colors">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-black text-zinc-700 uppercase tracking-tighter">{target.scouting?.currentAgent || 'Sin Agente'}</p>
                                            <div className="flex items-center gap-1.5 text-[8px] font-bold text-zinc-400">
                                                <Calendar className="w-2.5 h-2.5" />
                                                <span>EXP: {target.scouting?.agentEndDate || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 border-b border-zinc-50 last:border-0 group-hover:bg-zinc-50 transition-colors">
                                        <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md">
                                            {target.scouting?.contactPerson || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 border-b border-zinc-50 last:border-0 group-hover:bg-zinc-50 transition-colors">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${target.scouting?.status === 'Negociando'
                                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                                            : target.scouting?.status === 'Contactado'
                                                ? 'bg-zinc-50 text-zinc-600 border-zinc-200'
                                                : 'bg-red-50 text-red-600 border-red-200'
                                            }`}>
                                            {target.scouting?.status || 'No contactado'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 border-b border-zinc-50 last:border-0 group-hover:bg-zinc-50 transition-colors">
                                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewNote(target);
                                                }}
                                                className="w-7 h-7 rounded-lg bg-white border border-zinc-200 text-zinc-400 flex items-center justify-center hover:border-blue-500 hover:text-blue-500 transition-all scale-90"
                                                title="Ver última nota"
                                            >
                                                <StickyNote className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSignPlayer(target);
                                                }}
                                                className="flex items-center gap-1.5 bg-blue-600 text-white px-3 h-7 rounded-lg text-[9px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-blue-600/20 transition-all shadow-md group-hover:scale-105"
                                            >
                                                <UserPlus className="w-3 h-3" />
                                                Fichar
                                            </button>
                                        </div>
                                    </td>
                                </>
                            )}
                            components={{
                                TableRow: (props) => {
                                    const index = props['data-index'];
                                    const target = scoutingPlayers[index];
                                    return (
                                        <tr
                                            {...props}
                                            onClick={() => setEditingScouting(target)}
                                            className="group cursor-pointer hover:bg-zinc-50/30 transition-colors"
                                        />
                                    );
                                },
                                Table: (props) => (
                                    <table {...props} className="w-full border-collapse" style={{ tableLayout: 'fixed' }} />
                                )
                            }}
                        />
                    </div>

                    {scoutingPlayers.length === 0 && (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto text-zinc-300">
                                <Search className="w-10 h-10" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-zinc-900 uppercase tracking-tight italic">No hay objetivos en scouting</p>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Empieza añadiendo uno nuevo</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Note Viewer Modal */}
            {viewingNote && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-proneo-green">
                                    <StickyNote className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-0.5">Última Nota</p>
                                    <p className="text-sm font-bold text-white tracking-tight">{viewingNote.player}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingNote(null)}
                                className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 bg-zinc-50">
                            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                                <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap font-medium">
                                    {viewingNote.content}
                                </p>
                            </div>
                            <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <span className="text-[10px] font-black">{viewingNote.author.charAt(0)}</span>
                                    </div>
                                    <span className="text-xs font-bold text-zinc-700">{viewingNote.author}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{viewingNote.date}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScoutingModule;

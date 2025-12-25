import React, { useState } from 'react';
import {
    MessageSquare,
    Calendar,
    UserPlus,
    Target,
    Search,
    Plus
} from 'lucide-react';
import { TableVirtuoso } from 'react-virtuoso';
import { usePlayers } from '../hooks/usePlayers';
import ScoutingForm from './ScoutingForm';
import PlayerForm from './PlayerForm';
import { Player } from '../types/player';
import ScoutingPreview from './ScoutingPreview';

const ScoutingModule: React.FC = () => {
    const { players: scoutingPlayers, loading, addPlayer, updatePlayer } = usePlayers(true);

    const [isScoutingFormOpen, setIsScoutingFormOpen] = useState(false);
    const [isScoutingPreviewOpen, setIsScoutingPreviewOpen] = useState(false);
    const [editingScouting, setEditingScouting] = useState<Player | null>(null);
    const [signingPlayer, setSigningPlayer] = useState<Player | null>(null);

    const handleSaveScouting = async (data: Partial<Player>) => {
        if (editingScouting) {
            await updatePlayer(editingScouting.id, data);
        } else {
            // New scouting target
            // Ensure ID is handled by hook/firebase, but here we pass data
            await addPlayer(data as any);
        }
        setIsScoutingFormOpen(false);
        setEditingScouting(null);
    };

    const handleSignPlayer = async (player: Player) => {
        // Open PlayerForm with this player's data to complete the signing
        setSigningPlayer(player);
    };

    const handleConfirmSign = async (data: Partial<Player>) => {
        // When signing, we are effectively updating this player to be NOT scouting anymore
        // or creating a new entry if we want to keep history? 
        // Usually, we just 'promote' the record.
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
            {isScoutingPreviewOpen && (
                <ScoutingPreview
                    players={scoutingPlayers}
                    onClose={() => setIsScoutingPreviewOpen(false)}
                />
            )}

            {/* Forms */}
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
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-orange-50 p-6 rounded-[32px] border border-orange-100 flex items-center gap-5 group hover:shadow-xl hover:shadow-orange-200/20 transition-all">
                        <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:rotate-6 transition-transform">
                            <Target className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-0.5">En Seguimiento</p>
                            <h4 className="text-2xl font-black text-zinc-900 tracking-tighter italic">{scoutingPlayers.length} Objetivos</h4>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsScoutingPreviewOpen(true)}
                        className="h-14 px-6 bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl"
                    >
                        <Target className="w-5 h-5" />
                        Ver Dosier Scouting
                    </button>
                    <button
                        onClick={() => setIsScoutingFormOpen(true)}
                        className="h-14 px-8 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Objetivo
                    </button>
                </div>
            </div>

            {/* High-Density Scouting Table */}
            <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden flex flex-col w-full">
                <div className="flex-1 min-h-[400px]">
                    <TableVirtuoso
                        style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}
                        data={scoutingPlayers}
                        fixedHeaderContent={() => (
                            <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left">
                                <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-white sticky top-0 z-20 w-[30%]">Objetivo</th>
                                <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-white sticky top-0 z-20">Agente / Fin Contrato</th>
                                <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-white sticky top-0 z-20">Agente Proneo</th>
                                <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-white sticky top-0 z-20">Estado</th>
                                <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right bg-white sticky top-0 z-20">Acciones</th>
                            </tr>
                        )}
                        itemContent={(_, target) => (
                            <>
                                <td className="px-4 py-2 border-b border-zinc-50 last:border-0 group-hover:bg-zinc-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden shadow-sm">
                                            <img src={target.photoUrl || 'https://i.pravatar.cc/150'} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="font-black text-zinc-900 uppercase italic tracking-tight text-[11px] group-hover:text-proneo-green transition-colors">{target.name || `${target.firstName} ${target.lastName1}`}</p>
                                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{target.club} • {target.position}</p>
                                        </div>
                                    </div>
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
                                        ? 'bg-proneo-green/10 text-proneo-green border-proneo-green/20'
                                        : target.scouting?.status === 'Contactado'
                                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                                            : 'bg-red-50 text-red-600 border-red-200'
                                        }`}>
                                        {target.scouting?.status || 'No contactado'}
                                    </span>
                                </td>
                                <td className="px-4 py-2 border-b border-zinc-50 last:border-0 group-hover:bg-zinc-50 transition-colors">
                                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button className="w-7 h-7 rounded-lg bg-white border border-zinc-200 text-zinc-400 flex items-center justify-center hover:border-proneo-green hover:text-proneo-green transition-all scale-90">
                                            <MessageSquare className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSignPlayer(target);
                                            }}
                                            className="flex items-center gap-1.5 bg-proneo-green text-white px-3 h-7 rounded-lg text-[9px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-proneo-green/20 transition-all shadow-md group-hover:scale-105"
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
        </div>
    );
};

export default ScoutingModule;

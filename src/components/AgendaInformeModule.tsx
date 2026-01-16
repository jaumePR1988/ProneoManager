import React, { useState } from 'react';
import { Calendar, FileText, TrendingUp, Check, XCircle, Loader2 } from 'lucide-react';
import CalendarModule from './CalendarModule';
import PlayerReportForm from './PlayerReportForm';
import FollowUpTracker from './FollowUpTracker';
import { usePlayerReports } from '../hooks/usePlayerReports';
import { usePlayers } from '../hooks/usePlayers';
import { PlayerReportFormData } from '../types/playerReport';
import { updateDoc, doc } from 'firebase/firestore';
import { db, isDemoMode } from '../firebase/config';

type TabType = 'agenda' | 'informes' | 'seguimiento';

interface AgendaInformeModuleProps {
    userRole: string;
    userSport: string;
    userName: string;
    userId: string;
}

const AgendaInformeModule: React.FC<AgendaInformeModuleProps> = ({
    userRole,
    userSport,
    userName,
    userId,
}) => {
    const isAdmin = userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'director';
    const [activeTab, setActiveTab] = useState<TabType>('agenda');
    const [isReportFormOpen, setIsReportFormOpen] = useState(false);
    const [preselectedReportType, setPreselectedReportType] = useState<PlayerReportFormData['reportType'] | undefined>(undefined);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { addReport } = usePlayerReports();
    const { addPlayer: addScoutingPlayer } = usePlayers(true);

    const handleSaveReport = async (data: PlayerReportFormData) => {
        setIsSaving(true);
        try {
            // If it's a new player report, add to scouting database first
            if (data.reportType === 'nuevo') {
                const category = data.category || (userSport === 'General' ? 'Fútbol' : userSport);

                const newPlayer = {
                    firstName: data.playerName.split(' ')[0] || '',
                    lastName1: data.playerName.split(' ')[1] || '',
                    lastName2: data.playerName.split(' ')[2] || '',
                    name: data.playerName,
                    category: category as any,
                    birthDate: data.birthDate || '',
                    nationality: data.nationality || '',
                    position: data.position as any,
                    club: data.club || '',
                    preferredFoot: data.preferredFoot as any,
                    monitoringAgent: userName,
                    isScouting: true,
                    isNewPlayer: true,
                    scouting: {
                        status: 'Seguimiento',
                        interest: 'Medio',
                        lastContactDate: data.date,
                        notes: data.notes,
                    } as any,
                };

                // Add player and get the new player ID
                const newPlayerId = await addScoutingPlayer(newPlayer);

                // Update the data to include the player ID
                data.playerId = newPlayerId || '';
            }

            // Save the report with the correct playerId
            await addReport(data, userName, userId);

            // Update lastContactDate for players (SAFE UPDATE)
            if (data.playerId && data.reportType !== 'nuevo') {
                try {
                    if (!isDemoMode) {
                        const playerDoc = doc(db, 'players', data.playerId);

                        // We use a safe update: wrap in try/catch to avoid blocking the whole process
                        // if the player doc doesn't have the scouting object initialized or other issues
                        await updateDoc(playerDoc, {
                            'scouting.lastContactDate': data.date,
                            updatedAt: Date.now()
                        });
                    }
                } catch (playerUpdateErr) {
                    console.warn('Could not update player lastContactDate, but report was saved:', playerUpdateErr);
                }
            }

            // Success feedback
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (err) {
            console.error('Error saving report:', err);
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
            throw err;
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'agenda' as TabType, label: 'Agenda', icon: Calendar },
        { id: 'informes' as TabType, label: 'Informes', icon: FileText },
        { id: 'seguimiento' as TabType, label: 'Seguimiento', icon: TrendingUp },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            {/* Header placeholder removed */}

            {/* Tab Navigation */}
            <div className="flex gap-2 bg-white rounded-[32px] p-2 border border-zinc-100 shadow-sm">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 h-14 rounded-[24px] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === tab.id
                                ? 'bg-zinc-900 text-white shadow-lg'
                                : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'agenda' && (
                    <CalendarModule
                        userRole={userRole}
                        userSport={userSport as any}
                        userName={userName}
                    />
                )}

                {activeTab === 'informes' && (
                    <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm p-12">
                        <div className="max-w-2xl mx-auto text-center space-y-6">
                            <div className="w-20 h-20 bg-proneo-green/10 rounded-[28px] flex items-center justify-center mx-auto">
                                <FileText className="w-10 h-10 text-proneo-green" />
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight italic">
                                Sistema de Informes
                            </h3>
                            <p className="text-sm text-zinc-500 leading-relaxed max-w-lg mx-auto">
                                Crea informes de seguimiento para jugadores en cantera, informes de scouting para
                                jugadores en captación, o registra nuevos jugadores detectados en partidos.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                                {[
                                    {
                                        type: 'seguimiento',
                                        title: 'Seguimiento',
                                        desc: 'Jugadores en cantera',
                                        color: 'bg-proneo-green',
                                    },
                                    {
                                        type: 'scouting',
                                        title: 'Scouting',
                                        desc: 'Jugadores en captación',
                                        color: 'bg-blue-500',
                                    },
                                    {
                                        type: 'nuevo',
                                        title: 'Nuevo Jugador',
                                        desc: 'Detectado en campo',
                                        color: 'bg-purple-500',
                                    },
                                ].map((item) => (
                                    <button
                                        key={item.type}
                                        onClick={() => {
                                            setPreselectedReportType(item.type as any);
                                            setIsReportFormOpen(true);
                                        }}
                                        className="p-6 rounded-[28px] border-2 border-zinc-100 hover:border-zinc-200 transition-all text-center group hover:shadow-lg"
                                    >
                                        <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center text-white mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <p className="font-black text-sm text-zinc-900">{item.title}</p>
                                        <p className="text-xs text-zinc-400 mt-1">{item.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'seguimiento' && (
                    <FollowUpTracker userSport={userSport} isAdmin={isAdmin} />
                )}
            </div>

            {/* Premium Overlays */}
            {(showSuccess || showError || isSaving) && (
                <div className="fixed inset-0 z-[100] bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-zinc-100 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300 min-w-[320px]">
                        {isSaving ? (
                            <>
                                <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900">
                                    <Loader2 className="w-10 h-10 animate-spin" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="text-xl font-black text-zinc-800 uppercase tracking-widest italic">GUARDANDO...</h3>
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Procesando informe</p>
                                </div>
                            </>
                        ) : showSuccess ? (
                            <>
                                <div className="w-20 h-20 rounded-full bg-proneo-green flex items-center justify-center text-white shadow-xl shadow-proneo-green/30 animate-in zoom-in duration-300">
                                    <Check className="w-10 h-10" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="text-2xl font-black text-zinc-800 uppercase tracking-widest italic">¡GUARDADO!</h3>
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Informe registrado correctamente</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white shadow-xl shadow-red-500/30 animate-in zoom-in duration-300">
                                    <XCircle className="w-10 h-10" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="text-2xl font-black text-zinc-800 uppercase tracking-widest italic">ERROR</h3>
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">No se pudo guardar el informe</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Report Form Modal */}
            {isReportFormOpen && (
                <PlayerReportForm
                    preselectedType={preselectedReportType}
                    userRole={userRole}
                    userSport={userSport}
                    onClose={() => {
                        setIsReportFormOpen(false);
                        setPreselectedReportType(undefined);
                    }}
                    onSave={handleSaveReport}
                />
            )}
        </div>
    );
};

export default AgendaInformeModule;

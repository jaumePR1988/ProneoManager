import React, { useState, useMemo } from 'react';
import { X, Save, FileText, User, Calendar, ClipboardList, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { usePlayers } from '../hooks/usePlayers';
import { ReportType, PlayerReportFormData } from '../types/playerReport';

interface PlayerReportFormProps {
    onClose: () => void;
    onSave: (data: PlayerReportFormData) => Promise<void>;
    userRole: string;
    userSport: string;
    initialReport?: PlayerReport;
    preselectedType?: ReportType;
}

const PlayerReportForm: React.FC<PlayerReportFormProps> = ({
    onClose,
    onSave,
    userSport,
    userRole,
    initialReport,
    preselectedType
}) => {
    const { players: databasePlayers } = usePlayers(false);
    const { players: scoutingPlayers, updatePlayer } = usePlayers(true);

    const isAdmin = (userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'director' || userSport === 'General');
    const [reportType, setReportType] = useState<ReportType>(initialReport?.reportType || preselectedType || 'seguimiento');
    const [selectedPlayerId, setSelectedPlayerId] = useState(initialReport?.playerId || '');
    const [searchTerm, setSearchTerm] = useState(initialReport?.playerName || '');
    const [newPlayerName, setNewPlayerName] = useState(initialReport?.reportType === 'nuevo' ? initialReport.playerName : '');
    const [newPlayerClub, setNewPlayerClub] = useState(initialReport?.club || '');
    const [newPlayerPosition, setNewPlayerPosition] = useState(initialReport?.position || '');
    const [newPlayerFoot, setNewPlayerFoot] = useState(initialReport?.preferredFoot || '');
    const [newPlayerBirthDate, setNewPlayerBirthDate] = useState(initialReport?.birthDate || '');
    const [newPlayerNationality, setNewPlayerNationality] = useState(initialReport?.nationality || '');
    const [newPlayerCategory, setNewPlayerCategory] = useState(initialReport?.category || (userSport === 'General' ? 'Fútbol' : userSport));
    const [date, setDate] = useState(initialReport?.date || new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState(initialReport?.notes || '');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Filtered players discovery
    const filteredPlayers = useMemo(() => {
        // STRICT POOL SEPARATION:
        // 'seguimiento' -> databasePlayers
        // 'scouting' -> scoutingPlayers
        const pool = reportType === 'seguimiento' ? databasePlayers : scoutingPlayers;

        return pool.filter(p => {
            // 1. Specialty filter (if not admin/general)
            if (!isAdmin) {
                const s = (userSport === 'F. Sala' || userSport === 'Futbol Sala')
                    ? ['Futbol Sala', 'F. Sala']
                    : (userSport === 'Fútbol' || userSport === 'Masculino')
                        ? ['Fútbol', 'Masculino']
                        : [userSport];
                if (!s.includes(p.category)) return false;
            }

            // 2. Search filter
            if (searchTerm.trim()) {
                const search = searchTerm.toLowerCase().trim();
                const fullName = (p.name || `${p.firstName} ${p.lastName1} ${p.lastName2}`).toLowerCase();
                return fullName.includes(search);
            }

            // 3. For scouting reports, show all if no search (because they are few)
            if (reportType === 'scouting') return true;

            // For other types, show only if searching (to avoid huge lists)
            return false;
        });
    }, [reportType, databasePlayers, scoutingPlayers, isAdmin, userSport, searchTerm]);

    const selectedPlayer = useMemo(() => {
        // Use the SAME pool as the search
        const pool = reportType === 'seguimiento' ? databasePlayers : scoutingPlayers;
        return pool.find(p => p.id === selectedPlayerId);
    }, [reportType, databasePlayers, scoutingPlayers, selectedPlayerId]);

    const showToast = (message: string, type: 'success' | 'error' = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSave = async () => {
        let playerName = '';
        let playerId = '';

        if (reportType === 'nuevo') {
            if (!newPlayerName.trim()) {
                showToast('Por favor, introduce el nombre del jugador');
                return;
            }
            playerName = newPlayerName.trim();
        } else {
            if (!selectedPlayerId) {
                showToast('Por favor, selecciona un jugador');
                return;
            }
            playerName = selectedPlayer?.name || `${selectedPlayer?.firstName} ${selectedPlayer?.lastName1}` || '';
            playerId = selectedPlayerId;
        }

        if (!notes.trim()) {
            showToast('Por favor, añade observaciones al informe');
            return;
        }

        setSaving(true);
        try {
            await onSave({
                id: initialReport?.id,
                playerId,
                playerName,
                reportType,
                date,
                notes: notes.trim(),
                club: reportType === 'nuevo' ? newPlayerClub : '',
                position: reportType === 'nuevo' ? newPlayerPosition : '',
                preferredFoot: reportType === 'nuevo' ? newPlayerFoot : '',
                birthDate: reportType === 'nuevo' ? newPlayerBirthDate : '',
                nationality: reportType === 'nuevo' ? newPlayerNationality : '',
                category: reportType === 'nuevo' ? newPlayerCategory : undefined,
            } as any);
            onClose();
        } catch (err) {
            console.error(err);
            showToast('Error al guardar el informe');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-lg">
                            <FileText className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight italic">
                                {initialReport ? 'Editar Informe' : 'Nuevo Informe'}
                            </h3>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                                Registro de seguimiento
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-zinc-200 rounded-2xl transition-all">
                        <X className="w-6 h-6 text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* Report Type Selection */}
                    {!preselectedType && (
                        <div>
                            <label className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-3 block flex items-center gap-2">
                                <ClipboardList className="w-4 h-4 text-proneo-green" />
                                Tipo de Informe
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: 'seguimiento', label: 'Seguimiento', desc: 'Jugador en cantera' },
                                    { value: 'scouting', label: 'Scouting', desc: 'Jugador en captación' },
                                    { value: 'nuevo', label: 'Nuevo Jugador', desc: 'Detectado en campo' },
                                ].map((type) => (
                                    <button
                                        key={type.value}
                                        onClick={() => {
                                            setReportType(type.value as ReportType);
                                            setSelectedPlayerId('');
                                            setNewPlayerName('');
                                        }}
                                        className={`p-4 rounded-2xl border-2 transition-all text-left ${reportType === type.value
                                            ? 'border-proneo-green bg-proneo-green/5'
                                            : 'border-zinc-100 hover:border-zinc-200'
                                            }`}
                                    >
                                        <p className="font-black text-sm text-zinc-900">{type.label}</p>
                                        <p className="text-[10px] font-bold text-zinc-400 mt-1">{type.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Player Selection or New Player Input */}
                    {reportType !== 'nuevo' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-3 block flex items-center gap-2">
                                    <User className="w-4 h-4 text-proneo-green" />
                                    Seleccionar Jugador
                                </label>

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                        <Search className="w-4 h-4 text-zinc-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Escribe el nombre del jugador..."
                                        className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl pl-12 pr-6 h-14 font-bold text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-proneo-green transition-all outline-none"
                                    />

                                    {((searchTerm.trim() && filteredPlayers.length > 0) || (reportType === 'scouting' && filteredPlayers.length > 0)) && !selectedPlayerId && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            {filteredPlayers.slice(0, 5).map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedPlayerId(p.id);
                                                        setSearchTerm(p.name || `${p.firstName} ${p.lastName1}`);
                                                    }}
                                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0"
                                                >
                                                    <div className="flex flex-col items-start gap-0.5">
                                                        <span className="text-sm font-bold text-zinc-900">{p.name || `${p.firstName} ${p.lastName1}`}</span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{p.club || 'Sin club'}</span>
                                                    </div>
                                                    <span className="px-2 py-0.5 bg-proneo-green/5 text-proneo-green border border-proneo-green/10 rounded text-[8px] font-black uppercase tracking-widest">
                                                        {p.category}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {selectedPlayerId && (
                                        <button
                                            onClick={() => {
                                                setSelectedPlayerId('');
                                                setSearchTerm('');
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-zinc-100 rounded-xl transition-all"
                                        >
                                            <X className="w-4 h-4 text-zinc-400" />
                                        </button>
                                    )}
                                </div>

                                {selectedPlayerId && selectedPlayer && (
                                    <div className="mt-3 p-4 rounded-2xl bg-proneo-green/5 border border-proneo-green/10 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-proneo-green/20 flex items-center justify-center text-proneo-green">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-zinc-900">{selectedPlayer.name || `${selectedPlayer.firstName} ${selectedPlayer.lastName1}`}</p>
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{selectedPlayer.club} • {selectedPlayer.category}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-3 block flex items-center gap-2">
                                    <User className="w-4 h-4 text-proneo-green" />
                                    Nombre Completo
                                </label>
                                <input
                                    type="text"
                                    value={newPlayerName}
                                    onChange={(e) => setNewPlayerName(e.target.value)}
                                    placeholder="Ej: Juan García López"
                                    className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-6 h-14 font-bold text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-proneo-green transition-all outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Club Actual</label>
                                    <input
                                        type="text"
                                        value={newPlayerClub}
                                        onChange={(e) => setNewPlayerClub(e.target.value)}
                                        placeholder="Nombre del club"
                                        className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 h-12 text-sm font-bold text-zinc-900 focus:bg-white focus:border-proneo-green transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Posición</label>
                                    <input
                                        type="text"
                                        value={newPlayerPosition}
                                        onChange={(e) => setNewPlayerPosition(e.target.value)}
                                        placeholder="Ej: Mediocentro"
                                        className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 h-12 text-sm font-bold text-zinc-900 focus:bg-white focus:border-proneo-green transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Pierna Hábil</label>
                                    <select
                                        value={newPlayerFoot}
                                        onChange={(e) => setNewPlayerFoot(e.target.value)}
                                        className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 h-12 text-sm font-bold text-zinc-900 focus:bg-white focus:border-proneo-green transition-all outline-none appearance-none"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Derecha">Derecha</option>
                                        <option value="Izquierda">Izquierda</option>
                                        <option value="Ambas">Ambas</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Nacionalidad</label>
                                    <input
                                        type="text"
                                        value={newPlayerNationality}
                                        onChange={(e) => setNewPlayerNationality(e.target.value)}
                                        placeholder="Ej: España"
                                        className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 h-12 text-sm font-bold text-zinc-900 focus:bg-white focus:border-proneo-green transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Fecha Nacimiento</label>
                                    <input
                                        type="date"
                                        value={newPlayerBirthDate}
                                        onChange={(e) => setNewPlayerBirthDate(e.target.value)}
                                        className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 h-12 text-sm font-bold text-zinc-900 focus:bg-white focus:border-proneo-green transition-all outline-none"
                                    />
                                </div>
                            </div>

                            {/* Specialty Selector for Admins */}
                            {isAdmin && (
                                <div className="mt-4 pt-4 border-t border-zinc-100">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 block">Especialidad / Deporte del Jugador</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {['Fútbol', 'F. Sala', 'Femenino', 'Entrenadores'].map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setNewPlayerCategory(cat)}
                                                className={`h-11 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${newPlayerCategory === cat
                                                    ? 'border-proneo-green bg-proneo-green/10 text-proneo-green'
                                                    : 'border-zinc-50 bg-zinc-50 text-zinc-400 hover:border-zinc-100'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-zinc-400 mt-4 font-medium flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-proneo-green" />
                                Podrás pasar este jugador a Scouting manualmente desde el historial
                            </p>
                        </div>
                    )}

                    {/* Date */}
                    <div>
                        <label className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-3 block flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-proneo-green" />
                            Fecha del Informe
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-6 h-14 font-bold text-zinc-900 focus:bg-white focus:border-proneo-green transition-all outline-none"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-3 block flex items-center gap-2">
                            <FileText className="w-4 h-4 text-proneo-green" />
                            Observaciones Técnicas
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Describe el rendimiento, aspectos tácticos, físicos, técnicos..."
                            rows={8}
                            className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[32px] p-6 font-medium text-zinc-700 leading-relaxed placeholder:text-zinc-400 focus:bg-white focus:border-proneo-green transition-all outline-none resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-8 h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-10 h-14 rounded-2xl bg-zinc-900 text-white font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        <span>Guardar Informe</span>
                    </button>
                </div>

                {/* Toast Notification */}
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
        </div>
    );
};

export default PlayerReportForm;

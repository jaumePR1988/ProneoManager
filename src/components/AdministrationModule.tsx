import React, { useState } from 'react';
import {
    Briefcase,
    TrendingUp,
    Search,
    CheckCircle2,
    Clock,
    Calendar,
    ArrowRight,
    FileText
} from 'lucide-react';
import { usePlayers } from '../hooks/usePlayers';
import { PaymentStatus, PaymentInfo } from '../types/player';
import EconomicReportPreview from './EconomicReportPreview';
import CommissionsReportModal from './CommissionsReportModal';

const AdministrationModule: React.FC = () => {
    const { players, updatePlayer } = usePlayers(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Set Current Season to 2025/2026
    const CURRENT_SEASON = "2025/2026";

    const [isEconomicReportOpen, setIsEconomicReportOpen] = useState(false);
    const [isCommissionsReportOpen, setIsCommissionsReportOpen] = useState(false);

    // Flatten data
    const billingRows = players.flatMap(player => {
        if (!player.contractYears || player.contractYears.length === 0) return [];

        return player.contractYears.map(year => ({
            ...year,
            playerId: player.id,
            playerName: player.name,
            playerClub: player.club,
            category: player.category,
            payerType: player.proneo?.payerType || 'Club'
        }));
    });

    // Filter Logic
    const filteredRows = billingRows.filter(row => {
        const matchesSearch = row.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.playerClub.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    // Split into Current vs Future
    const currentSeasonRows = filteredRows.filter(r => r.year === CURRENT_SEASON);
    const futureRows = filteredRows.filter(r => r.year !== CURRENT_SEASON);

    // Update Handler - ROBUST VERSION
    const handleUpdatePayment = async (
        playerId: string,
        yearId: string,
        field: 'clubPayment' | 'playerPayment' | 'globalStatus',
        value: any
    ) => {
        const player = players.find(p => p.id === playerId);
        if (!player || !player.contractYears) return;

        const updatedYears = player.contractYears.map(y => {
            if (y.id === yearId) {
                if (field === 'globalStatus') {
                    return { ...y, globalStatus: value as PaymentStatus };
                } else {
                    // Deep copy previous data to avoid reference issues
                    const prevData = (y as any)[field] ? { ...(y as any)[field] } : { status: 'Pendiente', isPaid: false };

                    // Merge new value
                    return {
                        ...y,
                        [field]: { ...prevData, ...value }
                    };
                }
            }
            return y;
        });

        // Save entire player object with new reference
        // We use updatePlayer which expects partial update.
        await updatePlayer(playerId, { contractYears: updatedYears });
    };

    const getStatusColor = (status: PaymentStatus) => {
        switch (status) {
            case 'Pagado': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Pendiente': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'Pospuesto': return 'bg-zinc-100 text-zinc-500 border-zinc-200 decoration-wavy';
            case 'Cancelado': return 'bg-red-50 text-red-700 border-red-200 line-through';
            default: return 'bg-white text-zinc-900 border-zinc-100';
        }
    };

    const getRowStyle = (status: PaymentStatus) => {
        switch (status) {
            case 'Pagado': return 'bg-emerald-50/30 hover:bg-emerald-50/50';
            case 'Pospuesto': return 'bg-zinc-50 opacity-75 grayscale';
            case 'Cancelado': return 'opacity-50 grayscale bg-red-50/10';
            default: return 'bg-white hover:bg-zinc-50';
        }
    };

    const renderTable = (rows: typeof billingRows, title: string, isCurrent: boolean) => (
        <div className="bg-white rounded-[32px] border border-zinc-200 shadow-sm overflow-hidden mb-12 animate-fade-in">
            <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-8 rounded-full ${isCurrent ? 'bg-proneo-green' : 'bg-zinc-300'}`} />
                    <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">{title}</h3>
                    <span className="bg-zinc-100 text-zinc-400 text-[10px] font-black px-2 py-1 rounded-full">
                        {rows.length}
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100">
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest w-64">Jugador / Temporada</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Gestión Cobro Club</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Gestión Cobro Jugador</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Estado Global</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {rows.map((row) => (
                            <tr key={`${row.playerId}-${row.id}`} className={`group transition-all ${getRowStyle(row.globalStatus || 'Pendiente')}`}>
                                {/* Player Info */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-black text-xs">
                                            {row.playerName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-zinc-900">{row.playerName}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-zinc-500">{row.playerClub}</span>
                                                <span className="text-[10px] bg-zinc-100 text-zinc-400 px-1.5 rounded font-mono">{row.year}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 pl-12 text-[10px] text-zinc-400 font-bold">
                                        Comisión: {((row.salary * (row.clubCommissionPct + row.playerCommissionPct)) / 100).toLocaleString('es-ES')} €
                                    </div>
                                </td>

                                {/* Club Payment Control */}
                                <td className="px-6 py-4 align-top">
                                    {row.clubCommissionPct > 0 ? (
                                        <div className="flex flex-col items-center gap-2 bg-zinc-50/50 p-2 rounded-xl border border-zinc-100/50">
                                            <div className="text-[10px] text-zinc-400 font-bold mb-1">{row.clubCommissionPct}% Club</div>
                                            <div className="flex items-center gap-2 mb-1 w-full">
                                                <span className="text-[9px] font-black text-zinc-400 uppercase w-12 text-right">Estado</span>
                                                <select
                                                    value={row.clubPayment?.status || 'Pendiente'}
                                                    onChange={(e) => handleUpdatePayment(row.playerId, row.id, 'clubPayment', { status: e.target.value })}
                                                    className={`flex-1 h-6 px-2 rounded text-[10px] font-black uppercase tracking-widest border outline-none cursor-pointer
                                                        ${getStatusColor(row.clubPayment?.status || 'Pendiente')}
                                                    `}
                                                >
                                                    <option value="Pendiente">Pendiente</option>
                                                    <option value="Pagado">Pagado</option>
                                                    <option value="Pospuesto">Pospuesto</option>
                                                </select>
                                            </div>

                                            {/* Previsión / Plazos (Text Input) */}
                                            <div className="flex items-center gap-2 w-full">
                                                <span className="text-[9px] font-black text-zinc-400 uppercase w-12 text-right">Previsión / Plazos</span>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: 50% Ene, 50% Mar..."
                                                    defaultValue={row.clubPayment?.dueDate || ''}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== (row.clubPayment?.dueDate || '')) {
                                                            handleUpdatePayment(row.playerId, row.id, 'clubPayment', { dueDate: e.target.value });
                                                        }
                                                    }}
                                                    className="flex-1 h-6 text-[10px] font-mono text-zinc-600 bg-white border border-zinc-200 rounded px-2 outline-none focus:border-proneo-green shadow-sm placeholder:text-zinc-300"
                                                />
                                            </div>

                                            {/* Payment Date (Only if Paid) */}
                                            {row.clubPayment?.status === 'Pagado' && (
                                                <div className="flex items-center gap-2 w-full animate-fade-in">
                                                    <span className="text-[9px] font-black text-emerald-600 uppercase w-12 text-right">Pagado</span>
                                                    <input
                                                        type="date"
                                                        value={row.clubPayment?.paymentDate || ''}
                                                        onChange={(e) => handleUpdatePayment(row.playerId, row.id, 'clubPayment', { paymentDate: e.target.value })}
                                                        className="flex-1 h-6 text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-2 outline-none focus:border-emerald-500 shadow-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                                            <span className="text-zinc-400 text-xs italic font-bold">0% Club</span>
                                            <span className="text-[10px] text-zinc-300">Sin gestión</span>
                                        </div>
                                    )}
                                </td>

                                {/* Player Payment Control */}
                                <td className="px-6 py-4 align-top">
                                    {row.playerCommissionPct > 0 ? (
                                        <div className="flex flex-col items-center gap-2 bg-zinc-50/50 p-2 rounded-xl border border-zinc-100/50">
                                            <div className="text-[10px] text-zinc-400 font-bold mb-1">{row.playerCommissionPct}% Jugador</div>
                                            <div className="flex items-center gap-2 mb-1 w-full">
                                                <span className="text-[9px] font-black text-zinc-400 uppercase w-12 text-right">Estado</span>
                                                <select
                                                    value={row.playerPayment?.status || 'Pendiente'}
                                                    onChange={(e) => handleUpdatePayment(row.playerId, row.id, 'playerPayment', { status: e.target.value })}
                                                    className={`flex-1 h-6 px-2 rounded text-[10px] font-black uppercase tracking-widest border outline-none cursor-pointer
                                                        ${getStatusColor(row.playerPayment?.status || 'Pendiente')}
                                                    `}
                                                >
                                                    <option value="Pendiente">Pendiente</option>
                                                    <option value="Pagado">Pagado</option>
                                                    <option value="Pospuesto">Pospuesto</option>
                                                </select>
                                            </div>

                                            {/* Previsión / Plazos (Text Input) */}
                                            <div className="flex items-center gap-2 w-full">
                                                <span className="text-[9px] font-black text-zinc-400 uppercase w-12 text-right">Previsión / Plazos</span>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: 50% Ene, 50% Mar..."
                                                    defaultValue={row.playerPayment?.dueDate || ''}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== (row.playerPayment?.dueDate || '')) {
                                                            handleUpdatePayment(row.playerId, row.id, 'playerPayment', { dueDate: e.target.value });
                                                        }
                                                    }}
                                                    className="flex-1 h-6 text-[10px] font-mono text-zinc-600 bg-white border border-zinc-200 rounded px-2 outline-none focus:border-proneo-green shadow-sm placeholder:text-zinc-300"
                                                />
                                            </div>

                                            {/* Payment Date (Only if Paid) */}
                                            {row.playerPayment?.status === 'Pagado' && (
                                                <div className="flex items-center gap-2 w-full animate-fade-in">
                                                    <span className="text-[9px] font-black text-emerald-600 uppercase w-12 text-right">Pagado</span>
                                                    <input
                                                        type="date"
                                                        value={row.playerPayment?.paymentDate || ''}
                                                        onChange={(e) => handleUpdatePayment(row.playerId, row.id, 'playerPayment', { paymentDate: e.target.value })}
                                                        className="flex-1 h-6 text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-2 outline-none focus:border-emerald-500 shadow-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                                            <span className="text-zinc-400 text-xs italic font-bold">0% Jugador</span>
                                            <span className="text-[10px] text-zinc-300">Sin gestión</span>
                                        </div>
                                    )}
                                </td>

                                {/* Global Status */}
                                <td className="px-6 py-4 text-right align-top">
                                    <select
                                        value={row.globalStatus || 'Pendiente'}
                                        onChange={(e) => handleUpdatePayment(row.playerId, row.id, 'globalStatus', e.target.value)}
                                        className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-widest border outline-none cursor-pointer shadow-sm
                                            ${getStatusColor(row.globalStatus || 'Pendiente')}
                                        `}
                                    >
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="Pagado">TOT. PAGADO</option>
                                        <option value="Pospuesto">Pospuesto</option>
                                        <option value="Cancelado">Cancelado</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            {isEconomicReportOpen && (
                <EconomicReportPreview
                    players={players}
                    onClose={() => setIsEconomicReportOpen(false)}
                />
            )}

            {isCommissionsReportOpen && (
                <CommissionsReportModal
                    players={players}
                    onClose={() => setIsCommissionsReportOpen(false)}
                />
            )}

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight italic uppercase flex items-center gap-3">
                        <Briefcase className="w-8 h-8 text-zinc-900" />
                        Administración
                    </h1>
                    <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-1">
                        Control de Cobros y Finanzas
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsCommissionsReportOpen(true)}
                        className="h-12 px-6 rounded-xl bg-white border-2 border-zinc-100 text-zinc-600 flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-600 transition-all"
                    >
                        <FileText className="w-4 h-4" />
                        Listado Comisiones
                    </button>

                    <button
                        onClick={() => setIsEconomicReportOpen(true)}
                        className="h-12 px-6 rounded-xl bg-emerald-500 text-white flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg hover:shadow-xl hover:shadow-emerald-500/20"
                    >
                        <TrendingUp className="w-4 h-4" />
                        Informe Económico
                    </button>

                    <div className="h-12 w-[1px] bg-zinc-200 mx-2" />

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-proneo-green transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar cobro..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white border border-zinc-200 rounded-xl pl-12 pr-6 h-12 text-sm font-bold w-64 focus:ring-4 focus:ring-zinc-100 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cobrado Total</p>
                        <p className="text-xl font-black text-emerald-600">
                            {billingRows.filter(r => r.globalStatus === 'Pagado').length} <span className="text-xs text-zinc-400 font-bold">Operaciones</span>
                        </p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pendientes</p>
                        <p className="text-xl font-black text-amber-600">
                            {billingRows.filter(r => r.globalStatus === 'Pendiente').length} <span className="text-xs text-zinc-400 font-bold">Operaciones</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Tables */}
            {filteredRows.length > 0 ? (
                <>
                    {renderTable(currentSeasonRows, `Temporada Actual (${CURRENT_SEASON})`, true)}
                    {futureRows.length > 0 && renderTable(futureRows, 'Pagos Futuros / Otros', false)}
                </>
            ) : (
                <div className="text-center py-20 bg-white rounded-[32px] border border-zinc-100 shadow-sm">
                    <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-300">
                        <Briefcase className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 uppercase italic">Sin datos financieros</h3>
                    <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest mt-2">No se encontraron cobros pendientes</p>
                </div>
            )}
        </div>
    );
};

export default AdministrationModule;

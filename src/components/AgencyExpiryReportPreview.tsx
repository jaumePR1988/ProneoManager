import React from 'react';
import { X, Calendar, AlertTriangle, AlertCircle, Printer, Eye } from 'lucide-react';
import { Player } from '../types/player';

interface AgencyExpiryReportPreviewProps {
    onClose: () => void;
    players: Player[];
}

const AgencyExpiryReportPreview: React.FC<AgencyExpiryReportPreviewProps> = ({ onClose, players }) => {

    // 1. Data Processing
    // Filter: Only Agency Players (not Scouting)
    // Field: player.proneo.agencyEndDate
    // Status Logic:
    // - RED: < 6 months or expired
    // - YELLOW: 6-12 months
    // - GREEN: > 12 months (HIDDEN)

    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(now.getMonth() + 3);

    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(now.getMonth() + 6);

    const getStatus = (dateStr?: string) => {
        if (!dateStr) return 'unknown';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'unknown';

        if (date <= threeMonthsFromNow) return 'urgent';
        if (date <= sixMonthsFromNow) return 'warning';
        return 'safe';
    };

    const filteredPlayers = players
        .filter(p => !p.isScouting && p.proneo?.agencyEndDate)
        .map(p => ({
            ...p,
            expiryStatus: getStatus(p.proneo.agencyEndDate)
        }))
        .filter(p => p.expiryStatus === 'urgent' || p.expiryStatus === 'warning') // Filter out 'safe' (green)
        .sort((a, b) => {
            const dateA = new Date(a.proneo.agencyEndDate).getTime();
            const dateB = new Date(b.proneo.agencyEndDate).getTime();
            return dateA - dateB; // Soonest matches first
        });

    const urgentCount = filteredPlayers.filter(p => p.expiryStatus === 'urgent').length;
    const warningCount = filteredPlayers.filter(p => p.expiryStatus === 'warning').length;

    return (
        <div className="fixed inset-0 bg-zinc-900/90 backdrop-blur-md z-[100] overflow-y-auto">
            {/* Control Bar */}
            <div className="sticky top-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/10 px-8 py-4 flex justify-between items-center no-print">
                <div className="flex items-center gap-6">
                    <span className="text-white font-black uppercase tracking-widest text-sm">
                        Informe de Vencimientos • {now.getFullYear()}
                    </span>
                    <span className="bg-red-500 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        Acción Requerida
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.print()}
                        className="bg-white text-zinc-900 px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500 hover:text-white transition-all"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir
                    </button>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Report Page */}
            <div className="py-10 flex justify-center min-h-screen print:p-0 print:m-0">
                <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl relative flex flex-col p-12 print:shadow-none print:w-full">

                    {/* Header */}
                    <div className="border-b-4 border-red-500 pb-8 mb-12 flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-black text-zinc-900 uppercase tracking-tighter mb-2">
                                Vencimientos <span className="text-red-500">Agencia</span>
                            </h1>
                            <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">
                                Alerta de Renovaciones & Finalización de Contrato
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-red-50 px-4 py-2 rounded-xl text-center">
                                <span className="block text-2xl font-black text-red-600">{urgentCount}</span>
                                <span className="block text-[9px] font-bold text-red-400 uppercase tracking-widest">Urgentes</span>
                            </div>
                            <div className="bg-yellow-50 px-4 py-2 rounded-xl text-center">
                                <span className="block text-2xl font-black text-yellow-600">{warningCount}</span>
                                <span className="block text-[9px] font-bold text-yellow-400 uppercase tracking-widest">Atención</span>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-zinc-100">
                                <th className="py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-2">Estatus</th>
                                <th className="py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Jugador</th>
                                <th className="py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Agente (Seguimiento)</th>
                                <th className="py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right pr-2">Fecha Fin Contrato</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {filteredPlayers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-zinc-400 font-bold uppercase tracking-widest">
                                        Todo en orden. No hay vencimientos próximos.
                                    </td>
                                </tr>
                            ) : (
                                filteredPlayers.map(p => {
                                    const isUrgent = p.expiryStatus === 'urgent';
                                    const dateObj = new Date(p.proneo.agencyEndDate);
                                    const dateFormatted = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

                                    // Calculate days remaing
                                    const daysRemaining = Math.ceil((dateObj.getTime() - new Date().getTime()) / (1000 * 3600 * 24));

                                    return (
                                        <tr key={p.id} className="group hover:bg-zinc-50 transition-colors">
                                            <td className="py-4 pl-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                    {isUrgent ? <AlertCircle className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="font-black text-sm text-zinc-900">{p.name}</div>
                                                <div className="text-[10px] font-bold text-zinc-400 uppercase">{p.club} • {p.category}</div>
                                            </td>
                                            <td className="py-4">
                                                <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-1 rounded-md font-bold uppercase tracking-wider">
                                                    {p.monitoringAgent || 'Sin Asignar'}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right pr-2">
                                                <div className={`font-black text-sm ${isUrgent ? 'text-red-600' : 'text-yellow-600'}`}>
                                                    {dateFormatted}
                                                </div>
                                                <div className={`text-[9px] font-bold uppercase tracking-wider ${isUrgent ? 'text-red-400' : 'text-yellow-400'}`}>
                                                    {daysRemaining} días restantes
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div className="mt-auto pt-8 border-t border-zinc-100 flex justify-between items-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                        <span>Generado por Proneo Manager</span>
                        <span>{now.toLocaleDateString()}</span>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AgencyExpiryReportPreview;

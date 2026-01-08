import React from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { PaymentStatus } from '../../types/player';

interface BillingTableProps {
    rows: any[];
    title: string;
    isCurrent: boolean;
    onUpdatePayment: (playerId: string, yearId: string, field: 'clubPayment' | 'playerPayment' | 'globalStatus', value: any) => Promise<void>;
}

const BillingTable: React.FC<BillingTableProps> = ({ rows, title, isCurrent, onUpdatePayment }) => {

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

    return (
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

            <div className="h-[600px]">
                <TableVirtuoso
                    data={rows}
                    fixedHeaderContent={() => (
                        <tr className="bg-zinc-50 border-b border-zinc-100 text-left">
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest w-[400px] bg-zinc-50 sticky top-0 z-20">Jugador / Temporada</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center bg-zinc-50 sticky top-0 z-20">Gestión Cobro Club</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center bg-zinc-50 sticky top-0 z-20">Gestión Cobro Jugador</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right bg-zinc-50 sticky top-0 z-20">Estado Global</th>
                        </tr>
                    )}
                    itemContent={(_, row) => (
                        <>
                            {/* Player Info */}
                            <td className="px-6 py-4 border-b border-zinc-100 bg-inherit">
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
                            <td className="px-6 py-4 align-top border-b border-zinc-100 bg-inherit">
                                {row.clubCommissionPct > 0 ? (
                                    <div className="flex flex-col items-center gap-2 bg-zinc-50/50 p-2 rounded-xl border border-zinc-100/50">
                                        <div className="text-[10px] text-zinc-400 font-bold mb-1">{row.clubCommissionPct}% Club</div>
                                        <div className="flex items-center gap-2 mb-1 w-full">
                                            <span className="text-[9px] font-black text-zinc-400 uppercase w-12 text-right">Estado</span>
                                            <select
                                                value={row.clubPayment?.status || 'Pendiente'}
                                                onChange={(e) => onUpdatePayment(row.playerId, row.id, 'clubPayment', { status: e.target.value })}
                                                className={`flex-1 h-6 px-2 rounded text-[10px] font-black uppercase tracking-widest border outline-none cursor-pointer
                                                    ${getStatusColor(row.clubPayment?.status || 'Pendiente')}
                                                `}
                                            >
                                                <option value="Pendiente">Pendiente</option>
                                                <option value="Pagado">Pagado</option>
                                                <option value="Pospuesto">Pospuesto</option>
                                            </select>
                                        </div>

                                        {/* Previsión (Texto) + Alerta (Fecha) */}
                                        <div className="flex items-center gap-2 w-full">
                                            <span className="text-[9px] font-black text-zinc-400 uppercase w-12 text-right">Previsión</span>
                                            <input
                                                type="text"
                                                placeholder="Ej: 50% Ene..."
                                                defaultValue={row.clubPayment?.dueDate || ''}
                                                onBlur={(e) => {
                                                    if (e.target.value !== (row.clubPayment?.dueDate || '')) {
                                                        onUpdatePayment(row.playerId, row.id, 'clubPayment', { dueDate: e.target.value });
                                                    }
                                                }}
                                                className="flex-1 h-6 text-[10px] font-mono text-zinc-600 bg-white border border-zinc-200 rounded px-2 outline-none focus:border-proneo-green shadow-sm placeholder:text-zinc-300 min-w-0"
                                            />
                                            {/* Alert Date Picker */}
                                            <div className="relative group/alert" title="Programar Aviso">
                                                <input
                                                    type="date"
                                                    value={row.clubPayment?.alertDate || ''}
                                                    onChange={(e) => onUpdatePayment(row.playerId, row.id, 'clubPayment', { alertDate: e.target.value })}
                                                    className={`w-6 h-6 p-0 border-none outline-none bg-transparent text-transparent cursor-pointer z-10 absolute inset-0 ${!row.clubPayment?.alertDate ? 'opacity-0 hover:opacity-100' : 'opacity-0'}`}
                                                />
                                                <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${row.clubPayment?.alertDate ? 'bg-amber-100 border-amber-300 text-amber-600' : 'bg-zinc-50 border-zinc-200 text-zinc-300 group-hover/alert:border-amber-300 group-hover/alert:text-amber-400'}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                                                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                                                    </svg>
                                                </div>
                                                {/* Tooltip for selected date */}
                                                {row.clubPayment?.alertDate && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-[10px] font-mono rounded whitespace-nowrap opacity-0 group-hover/alert:opacity-100 pointer-events-none z-50">
                                                        Aviso: {row.clubPayment.alertDate}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Payment Date (Only if Paid) */}
                                        {row.clubPayment?.status === 'Pagado' && (
                                            <div className="flex items-center gap-2 w-full animate-fade-in">
                                                <span className="text-[9px] font-black text-emerald-600 uppercase w-12 text-right">Pagado</span>
                                                <input
                                                    type="date"
                                                    value={row.clubPayment?.paymentDate || ''}
                                                    onChange={(e) => onUpdatePayment(row.playerId, row.id, 'clubPayment', { paymentDate: e.target.value })}
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
                            <td className="px-6 py-4 align-top border-b border-zinc-100 bg-inherit">
                                {row.playerCommissionPct > 0 ? (
                                    <div className="flex flex-col items-center gap-2 bg-zinc-50/50 p-2 rounded-xl border border-zinc-100/50">
                                        <div className="text-[10px] text-zinc-400 font-bold mb-1">{row.playerCommissionPct}% Jugador</div>
                                        <div className="flex items-center gap-2 mb-1 w-full">
                                            <span className="text-[9px] font-black text-zinc-400 uppercase w-12 text-right">Estado</span>
                                            <select
                                                value={row.playerPayment?.status || 'Pendiente'}
                                                onChange={(e) => onUpdatePayment(row.playerId, row.id, 'playerPayment', { status: e.target.value })}
                                                className={`flex-1 h-6 px-2 rounded text-[10px] font-black uppercase tracking-widest border outline-none cursor-pointer
                                                    ${getStatusColor(row.playerPayment?.status || 'Pendiente')}
                                                `}
                                            >
                                                <option value="Pendiente">Pendiente</option>
                                                <option value="Pagado">Pagado</option>
                                                <option value="Pospuesto">Pospuesto</option>
                                            </select>
                                        </div>

                                        {/* Previsión (Texto) + Alerta (Fecha) */}
                                        <div className="flex items-center gap-2 w-full">
                                            <span className="text-[9px] font-black text-zinc-400 uppercase w-12 text-right">Previsión</span>
                                            <input
                                                type="text"
                                                placeholder="Ej: 50% Ene..."
                                                defaultValue={row.playerPayment?.dueDate || ''}
                                                onBlur={(e) => {
                                                    if (e.target.value !== (row.playerPayment?.dueDate || '')) {
                                                        onUpdatePayment(row.playerId, row.id, 'playerPayment', { dueDate: e.target.value });
                                                    }
                                                }}
                                                className="flex-1 h-6 text-[10px] font-mono text-zinc-600 bg-white border border-zinc-200 rounded px-2 outline-none focus:border-proneo-green shadow-sm placeholder:text-zinc-300 min-w-0"
                                            />
                                            {/* Alert Date Picker */}
                                            <div className="relative group/alert" title="Programar Aviso">
                                                <input
                                                    type="date"
                                                    value={row.playerPayment?.alertDate || ''}
                                                    onChange={(e) => onUpdatePayment(row.playerId, row.id, 'playerPayment', { alertDate: e.target.value })}
                                                    className={`w-6 h-6 p-0 border-none outline-none bg-transparent text-transparent cursor-pointer z-10 absolute inset-0 ${!row.playerPayment?.alertDate ? 'opacity-0 hover:opacity-100' : 'opacity-0'}`}
                                                />
                                                <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${row.playerPayment?.alertDate ? 'bg-amber-100 border-amber-300 text-amber-600' : 'bg-zinc-50 border-zinc-200 text-zinc-300 group-hover/alert:border-amber-300 group-hover/alert:text-amber-400'}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                                                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                                                    </svg>
                                                </div>
                                                {/* Tooltip for selected date */}
                                                {row.playerPayment?.alertDate && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-[10px] font-mono rounded whitespace-nowrap opacity-0 group-hover/alert:opacity-100 pointer-events-none z-50">
                                                        Aviso: {row.playerPayment.alertDate}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Payment Date (Only if Paid) */}
                                        {row.playerPayment?.status === 'Pagado' && (
                                            <div className="flex items-center gap-2 w-full animate-fade-in">
                                                <span className="text-[9px] font-black text-emerald-600 uppercase w-12 text-right">Pagado</span>
                                                <input
                                                    type="date"
                                                    value={row.playerPayment?.paymentDate || ''}
                                                    onChange={(e) => onUpdatePayment(row.playerId, row.id, 'playerPayment', { paymentDate: e.target.value })}
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
                            <td className="px-6 py-4 text-right align-top border-b border-zinc-100 bg-inherit">
                                <select
                                    value={row.globalStatus || 'Pendiente'}
                                    onChange={(e) => onUpdatePayment(row.playerId, row.id, 'globalStatus', e.target.value)}
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
                        </>
                    )}
                    components={{
                        TableRow: (props) => {
                            const index = props['data-index'];
                            const row = rows[index];
                            return (
                                <tr
                                    {...props}
                                    className={`group transition-all ${getRowStyle(row.globalStatus || 'Pendiente')}`}
                                />
                            );
                        }
                    }}
                />
            </div>
        </div>
    );
};

export default BillingTable;

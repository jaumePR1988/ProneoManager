import React, { useState } from 'react';
import {
    Briefcase,
    TrendingUp,
    Search,
    FileText
} from 'lucide-react';
import { usePlayers } from '../hooks/usePlayers';
import { PaymentStatus } from '../types/player';
import EconomicReportPreview from './EconomicReportPreview';
import CommissionsReportModal from './CommissionsReportModal';
import StatsSummary from './administration/StatsSummary';
import BillingTable from './administration/BillingTable';

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

    // Split into Current vs Future/Past Debts
    const currentSeasonRows = filteredRows.filter(r => r.year === CURRENT_SEASON);

    // Future rows OR Past Debts (anything not current)
    // The previous logic was just `year !== CURRENT_SEASON`, which is correct for showing EVERYTHING else.
    // However, we want to ensure "Past Debts" are highlighted or at least verified to be here.
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
            <StatsSummary billingRows={billingRows} />

            {/* Tables */}
            {filteredRows.length > 0 ? (
                <>
                    <BillingTable
                        rows={currentSeasonRows}
                        title={`Temporada Actual (${CURRENT_SEASON})`}
                        isCurrent={true}
                        onUpdatePayment={handleUpdatePayment}
                    />
                    {futureRows.length > 0 && (
                        <BillingTable
                            rows={futureRows}
                            title="Pagos Futuros / Otros"
                            isCurrent={false}
                            onUpdatePayment={handleUpdatePayment}
                        />
                    )}
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

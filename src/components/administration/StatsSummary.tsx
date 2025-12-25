import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';

interface StatsSummaryProps {
    billingRows: any[];
}

const StatsSummary: React.FC<StatsSummaryProps> = ({ billingRows }) => {
    return (
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
    );
};

export default StatsSummary;

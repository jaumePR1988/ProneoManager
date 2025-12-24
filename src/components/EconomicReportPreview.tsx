import React from 'react';
import { X, TrendingUp, DollarSign, PieChart, Printer } from 'lucide-react';
import { Player, Category } from '../types/player';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface EconomicReportPreviewProps {
    onClose: () => void;
    players: Player[];
}

const EconomicReportPreview: React.FC<EconomicReportPreviewProps> = ({ onClose, players }) => {
    // Helper to find the relevant contract year based on today's date (Duplicated/Adapted logic)
    const getValuesForCurrentSeason = (years: any[] | undefined) => {
        if (!years || years.length === 0) return null;
        let selected = years[0];
        try {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;
            const targetStartYear = currentMonth >= 7 ? currentYear : currentYear - 1;
            const match = years.find(y => {
                if (!y.year) return false;
                const clean = y.year.replace(/[\/\-\s]/g, '');
                return clean.includes(String(targetStartYear));
            });
            if (match) selected = match;
        } catch (e) { }
        return selected;
    };

    // 1. Data Aggregation
    const categories: Category[] = ['Fútbol', 'F. Sala', 'Femenino', 'Entrenadores'];

    // Calculate totals by category
    const statsByCategory = categories.map(cat => {
        const catPlayers = players.filter(p => p.category === cat && !p.isScouting);

        const totalValue = catPlayers.reduce((sum, p) => {
            const y = getValuesForCurrentSeason(p.contractYears);
            return sum + (y ? Number(y.salary || 0) : 0);
        }, 0);

        const totalCommission = catPlayers.reduce((sum, p) => {
            const y = getValuesForCurrentSeason(p.contractYears);
            // Commission calculation: If we have a calculated commission amount use it, otherwise estimate based on %?
            // The ContractYear has `clubCommissionPct` and `playerCommissionPct`.
            // Usually Commission = Salary * (ClubPct + PlayerPct) / 100 ? Or just ClubPct?
            // Let's assume for this report we sum up the TOTAL commission revenue (Club + Player Pct of Salary)
            // simplified: Commission Revenue = Salary * (clubPct + playerPct) / 100
            if (!y) return sum;
            const salary = Number(y.salary || 0);
            const pct = Number(y.clubCommissionPct || 0) + Number(y.playerCommissionPct || 0);
            return sum + (salary * pct / 100);
        }, 0);

        return {
            name: cat,
            count: catPlayers.length,
            items: catPlayers, // Expose items for detailed view
            value: totalValue,
            commission: totalCommission
        };
    }).filter(stat => stat.count > 0);

    const totalPortfolioValue = statsByCategory.reduce((sum, stat) => sum + stat.value, 0);
    const totalCommissionValue = statsByCategory.reduce((sum, stat) => sum + stat.commission, 0);

    // Chart Colors
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    // Format Currency
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="fixed inset-0 bg-zinc-900/90 backdrop-blur-md z-[100] overflow-y-auto">
            {/* Control Bar */}
            <div className="sticky top-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/10 px-8 py-4 flex justify-between items-center no-print">
                <div className="flex items-center gap-6">
                    <span className="text-white font-black uppercase tracking-widest text-sm">
                        Informe Económico • {new Date().getFullYear()}
                    </span>
                    <span className="bg-emerald-500 text-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full">
                        Finanzas
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.print()}
                        className="bg-white text-zinc-900 px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500 hover:text-white transition-all"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir Informe
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
                    <div className="border-b-4 border-emerald-500 pb-8 mb-12 flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-black text-zinc-900 uppercase tracking-tighter mb-2">
                                Balance <span className="text-emerald-500">Económico</span>
                            </h1>
                            <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">
                                Desglose por Departamento Deportivo
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-black text-zinc-900">{formatCurrency(totalCommissionValue)}</p>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Facturación Total (YTD)</p>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-6 mb-12">
                        <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Valor de Cartera</span>
                            </div>
                            <p className="text-2xl font-black text-zinc-900">{formatCurrency(totalPortfolioValue)}</p>
                        </div>
                        <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                    <PieChart className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Deporte Principal</span>
                            </div>
                            <p className="text-2xl font-black text-zinc-900">
                                {statsByCategory.sort((a, b) => b.commission - a.commission)[0]?.name || 'N/A'}
                            </p>
                        </div>
                        <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                    <DollarSign className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Margen Medio</span>
                            </div>
                            <p className="text-2xl font-black text-zinc-900">
                                {totalPortfolioValue > 0 ? ((totalCommissionValue / totalPortfolioValue) * 100).toFixed(1) : 0}%
                            </p>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-2 gap-12 mb-12 h-64">
                        {/* Bar Chart: Revenue by Category */}
                        <div className="flex flex-col">
                            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-6 border-l-4 border-emerald-500 pl-3">
                                Distribución de Ingresos
                            </h3>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={statsByCategory}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#a1a1aa' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#a1a1aa' }} tickFormatter={(value) => `${value / 1000}k€`} />
                                        <Tooltip
                                            cursor={{ fill: '#f4f4f5' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <Bar dataKey="commission" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Pie Chart: Portfolio Composition */}
                        <div className="flex flex-col">
                            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-6 border-l-4 border-blue-500 pl-3">
                                Composición de Cartera
                            </h3>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPie width={400} height={400}>
                                        <Pie
                                            data={statsByCategory}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {statsByCategory.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend
                                            verticalAlign="middle"
                                            align="right"
                                            layout="vertical"
                                            iconType="circle"
                                            formatter={(value) => <span className="text-xs font-bold text-zinc-600 uppercase ml-2">{value}</span>}
                                        />
                                    </RechartsPie>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Table */}
                    <div className="flex-1">
                        <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-6 border-l-4 border-orange-500 pl-3">
                            Detalle por Departamento
                        </h3>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-zinc-100">
                                    <th className="py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Departamento</th>
                                    <th className="py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Nº Jugadores</th>
                                    <th className="py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Valor Cartera</th>
                                    <th className="py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Comisión</th>
                                    <th className="py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">% Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {statsByCategory.map(stat => (
                                    <tr key={stat.name} className="group hover:bg-zinc-50 transition-colors">
                                        <td className="py-4 font-black text-zinc-900 uppercase italic">{stat.name}</td>
                                        <td className="py-4 text-center font-bold text-zinc-600">{stat.count}</td>
                                        <td className="py-4 text-center font-bold text-zinc-600">{formatCurrency(stat.value)}</td>
                                        <td className="py-4 text-right font-black text-emerald-600">
                                            {formatCurrency(stat.commission)}
                                        </td>
                                        <td className="py-4 text-right font-bold text-zinc-400">
                                            {totalCommissionValue > 0 ? ((stat.commission / totalCommissionValue) * 100).toFixed(1) : 0}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-zinc-900">
                                    <td className="py-6 font-black text-zinc-900 uppercase text-lg">Total</td>
                                    <td className="py-6 text-center font-black text-zinc-900 text-lg">{statsByCategory.reduce((a, b) => a + b.count, 0)}</td>
                                    <td className="py-6 text-right font-black text-zinc-900 text-lg">{formatCurrency(totalPortfolioValue)}</td>
                                    <td className="py-6 text-right font-black text-zinc-900 text-lg">{formatCurrency(totalCommissionValue)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Detailed List per Category */}
                    <div className="mt-12">
                        <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-6 border-l-4 border-zinc-900 pl-3">
                            Desglose de Activos
                        </h3>

                        <div className="space-y-8">
                            {statsByCategory.map(stat => (
                                <div key={stat.name} className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 break-inside-avoid">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-black text-zinc-900 uppercase tracking-tight">{stat.name}</h4>
                                        <span className="text-[10px] bg-white border border-zinc-200 px-2 py-1 rounded-md font-bold text-zinc-400 uppercase">
                                            {stat.count} JUGADORES
                                        </span>
                                    </div>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-zinc-200">
                                                <th className="py-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-2">Jugador</th>
                                                <th className="py-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center">Equipo</th>
                                                <th className="py-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center">Agente</th>
                                                <th className="py-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">Salario</th>
                                                <th className="py-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">% Com.</th>
                                                <th className="py-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right pr-2">Total Com.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-200/50">
                                            {stat.items.map(p => {
                                                const y = getValuesForCurrentSeason(p.contractYears);
                                                const salary = Number(y?.salary || 0);
                                                const pct = Number(y?.clubCommissionPct || 0) + Number(y?.playerCommissionPct || 0);
                                                const comm = salary * pct / 100;

                                                return (
                                                    <tr key={p.id}>
                                                        <td className="py-2 pl-2">
                                                            <div className="font-bold text-xs text-zinc-900">{p.name}</div>
                                                            <div className="text-[9px] text-zinc-400 uppercase">{p.contract?.endDate || '-'}</div>
                                                        </td>
                                                        <td className="py-2 text-center text-[10px] font-bold text-zinc-600">{p.club}</td>
                                                        <td className="py-2 text-center">
                                                            <span className="text-[9px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                                                {p.monitoringAgent || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 text-right text-[10px] font-mono text-zinc-500">{formatCurrency(salary)}</td>
                                                        <td className="py-2 text-right text-[10px] font-mono text-zinc-500">{pct}%</td>
                                                        <td className="py-2 text-right pr-2 text-[10px] font-black text-emerald-600">{formatCurrency(comm)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-zinc-100/50">
                                                <td colSpan={2} className="py-2 pl-2 text-[9px] font-black uppercase text-zinc-400">Total {stat.name}</td>
                                                <td className="py-2 text-right text-[9px] font-black text-zinc-900">{formatCurrency(stat.value)}</td>
                                                <td className="py-2"></td>
                                                <td className="py-2 text-right pr-2 text-[9px] font-black text-emerald-600">{formatCurrency(stat.commission)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-8 border-t border-zinc-100 flex justify-between items-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                        <span>Generado automágicamente por Proneo Manager</span>
                        <span>{new Date().toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EconomicReportPreview;

import React, { useMemo } from 'react';
import {
    Users,
    TrendingUp,
    Calendar,
    AlertCircle,
    ArrowRight,
    Target
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    Legend
} from 'recharts';
import { usePlayers } from '../hooks/usePlayers';

interface DashboardProps {
    setActiveTab: (tab: string) => void;
    userRole?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveTab, userRole }) => {
    const { players: allPlayers, loading } = usePlayers(false);
    const { players: scoutingPlayers } = usePlayers(true);

    const activeCount = allPlayers.length;
    const scoutingCount = scoutingPlayers.length;

    // --- Statistics Calculations ---

    const totalCommission = useMemo(() => {
        return allPlayers.reduce((total, player) => {
            const playerTotal = (player.contractYears || []).reduce((yearTotal, year) => {
                const clubComm = Number(year.salary) * (Number(year.clubCommissionPct) / 100);
                const playerComm = Number(year.salary) * (Number(year.playerCommissionPct) / 100);
                return yearTotal + clubComm + playerComm;
            }, 0);
            return total + playerTotal;
        }, 0);
    }, [allPlayers]);

    const formattedCommission = totalCommission >= 1000000
        ? `${(totalCommission / 1000000).toFixed(1)}M€`
        : totalCommission >= 1000
            ? `${(totalCommission / 1000).toFixed(1)}k€`
            : `${totalCommission.toFixed(0)}€`;

    // Expiring Contracts Logic (Next 6 months)
    const expiringCount = useMemo(() => {
        if (!allPlayers.length) return 0;
        const now = new Date();
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(now.getMonth() + 6);

        return allPlayers.filter(p => {
            if (!p.contract?.endDate) return false;
            const end = new Date(p.contract.endDate);
            return end > now && end <= sixMonthsFromNow;
        }).length;
    }, [allPlayers]);

    // Pending Renovations (Active players with AGENCY contract ending this year)
    const renovationCount = useMemo(() => {
        if (!allPlayers.length) return 0;
        const currentYear = new Date().getFullYear();
        return allPlayers.filter(p => {
            if (!p.proneo?.agencyEndDate) return false;
            const end = new Date(p.proneo.agencyEndDate);
            return end.getFullYear() === currentYear;
        }).length;
    }, [allPlayers]);

    // League Distribution for Pie Chart
    const leagueData = useMemo(() => {
        const counts: Record<string, number> = {};
        allPlayers.forEach(p => {
            const league = p.league || 'Sin Liga';
            counts[league] = (counts[league] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value); // Sort max to min
    }, [allPlayers]);

    const PIE_COLORS = ['#3bb34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

    const stats = [
        {
            label: 'Jugadores Activos',
            value: activeCount.toString(),
            trend: 'Cartera actual', // Static text as we don't have historical data yet
            icon: Users,
            color: 'bg-blue-500',
            bg: 'bg-blue-50'
        },
        {
            label: 'Objetivos Scouting',
            value: scoutingCount.toString(),
            trend: 'En seguimiento',
            icon: Target,
            color: 'bg-proneo-green',
            bg: 'bg-emerald-50'
        },
        {
            label: 'Comisiones Totales',
            value: (userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'director') ? formattedCommission : '***',
            trend: 'Valor estimado',
            icon: TrendingUp,
            color: 'bg-orange-500',
            bg: 'bg-orange-50'
        },
        {
            label: 'Contratos por Vencer', // Replaced "Alertas Críticas" with something real
            value: expiringCount.toString(),
            trend: 'Próx. 6 meses',
            icon: AlertCircle,
            color: expiringCount > 0 ? 'bg-red-500' : 'bg-green-500',
            bg: expiringCount > 0 ? 'bg-red-50' : 'bg-green-50'
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-12 h-12 border-4 border-proneo-green/20 border-t-proneo-green rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* KPI Row: High Level Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 transition-all group overflow-hidden relative border-t-4 border-t-transparent hover:border-t-proneo-green">
                        <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform`} />

                        <div className="relative z-10 flex flex-col h-full">
                            <div className={`${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 group-hover:rotate-6 transition-transform`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-black text-zinc-900 tracking-tighter italic">{stat.value}</h3>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase">{stat.trend}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Analytic Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Distribution Chart (Now Pie) */}
                <div className="lg:col-span-2 bg-white p-10 rounded-[48px] border border-zinc-100 shadow-sm">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-xl font-black text-zinc-900 tracking-tight italic uppercase">Distribución por Ligas</h3>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Presencia de la agencia global (Datos Reales)</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 rounded-full border border-zinc-100">
                            <div className="w-2 h-2 rounded-full bg-proneo-green animate-pulse" />
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Live</span>
                        </div>
                    </div>

                    <div className="h-[350px] w-full flex items-center justify-center">
                        {leagueData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={leagueData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={120}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {leagueData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            borderRadius: '20px',
                                            border: '1px solid #f4f4f5',
                                            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
                                            fontWeight: 900,
                                            fontSize: '12px'
                                        }}
                                        formatter={(value: number) => [`${value} Jugadores`, 'Cantidad']}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        formatter={(value) => <span className="text-[10px] font-black text-zinc-600 uppercase ml-2 mr-4">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-zinc-300">
                                <p className="text-sm font-black uppercase">No hay datos de ligas disponibles</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Stats / Alerts */}
                <div className="bg-white p-10 rounded-[48px] border border-zinc-100 shadow-sm flex flex-col space-y-8">
                    <div>
                        <h3 className="text-xl font-black text-zinc-900 tracking-tight italic uppercase">Estado Cartera</h3>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Resumen año actual</p>
                    </div>

                    <div className="space-y-4">
                        {[
                            { label: 'Fin Contrato Proneo (Año)', value: renovationCount.toString(), color: renovationCount > 0 ? 'text-red-500' : 'text-zinc-600' },
                            { label: 'Ligas Activas', value: leagueData.length.toString(), color: 'text-blue-500' },
                            { label: 'Scouting Activo', value: scoutingCount.toString(), color: 'text-proneo-green' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-5 rounded-3xl bg-zinc-50 border border-zinc-100 group hover:border-proneo-green/20 transition-all">
                                <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">{item.label}</span>
                                <span className={`text-lg font-black ${item.color} italic tracking-tighter`}>{item.value}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 flex items-end">
                        <button
                            onClick={() => setActiveTab('players')}
                            className="w-full bg-zinc-900 text-white h-16 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-zinc-900/20 transition-all shadow-lg group"
                        >
                            Ver Base de Datos
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

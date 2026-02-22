import React, { useMemo } from 'react';
import {
    Users,
    TrendingUp,
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
    userSport?: string;
    onSetQuickFilter?: (filter: string | null) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveTab, userRole, userSport = 'General', onSetQuickFilter }) => {
    const { players: allDbPlayers, loading } = usePlayers(false);
    const { players: allScoutingPlayers } = usePlayers(true);

    const [selectedCategory, setSelectedCategory] = React.useState<string>(userSport !== 'General' ? userSport : 'Todos');

    // Effect to sync prop change (e.g. on login/logout or profile load)
    React.useEffect(() => {
        if (userSport && userSport !== 'General') {
            setSelectedCategory(userSport);
        }
    }, [userSport]);

    // FILTER LOGIC
    const filteredPlayers = useMemo(() => {
        if (selectedCategory === 'Todos') return allDbPlayers;
        return allDbPlayers.filter(p => p.category === selectedCategory);
    }, [allDbPlayers, selectedCategory]);

    const filteredScouting = useMemo(() => {
        if (selectedCategory === 'Todos') return allScoutingPlayers;
        return allScoutingPlayers.filter(p => p.category === selectedCategory);
    }, [allScoutingPlayers, selectedCategory]);

    const activeCount = filteredPlayers.length;
    const scoutingCount = filteredScouting.length;

    // --- Statistics Calculations ---

    const totalCommission = useMemo(() => {
        return filteredPlayers.reduce((total, player) => {
            const playerTotal = (player.contractYears || []).reduce((yearTotal, year) => {
                const clubComm = year.clubCommissionType === 'fixed'
                    ? (Number(year.clubCommissionFixed) || 0)
                    : (Number(year.salary) * (Number(year.clubCommissionPct) || 0) / 100);

                const playerComm = year.playerCommissionType === 'fixed'
                    ? (Number(year.playerCommissionFixed) || 0)
                    : (Number(year.salary) * (Number(year.playerCommissionPct) || 0) / 100);

                return yearTotal + clubComm + playerComm;
            }, 0);
            return total + playerTotal;
        }, 0);
    }, [filteredPlayers]);

    const formattedCommission = totalCommission >= 1000000
        ? `${(totalCommission / 1000000).toFixed(1)}M€`
        : totalCommission >= 1000
            ? `${(totalCommission / 1000).toFixed(1)}k€`
            : `${totalCommission.toFixed(0)}€`;

    // Expiring Contracts Logic (Next 6 months)
    const expiringCount = useMemo(() => {
        if (!filteredPlayers.length) return 0;
        const now = new Date();
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(now.getMonth() + 6);

        return filteredPlayers.filter(p => {
            if (!p.contract?.endDate) return false;
            const end = new Date(p.contract.endDate);
            return end > now && end <= sixMonthsFromNow;
        }).length;
    }, [filteredPlayers]);

    // Pending Renovations (Active players with AGENCY contract ending this year)
    const renovationCount = useMemo(() => {
        if (!filteredPlayers.length) return 0;
        const currentYear = new Date().getFullYear();
        return filteredPlayers.filter(p => {
            if (!p.proneo?.agencyEndDate) return false;
            const end = new Date(p.proneo.agencyEndDate);
            return end.getFullYear() === currentYear;
        }).length;
    }, [filteredPlayers]);

    // League Distribution for Pie Chart
    const leagueData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredPlayers.forEach(p => {
            const league = p.league || 'Sin Liga';
            counts[league] = (counts[league] || 0) + 1;
        });

        // Convert to array and sort
        const sorted = Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Group into "Others" if too many
        if (sorted.length > 5) {
            const top = sorted.slice(0, 5);
            const othersList = sorted.slice(5);
            const othersCount = othersList.reduce((sum, item) => sum + item.value, 0);
            const breakdown = othersList.map(item => `${item.name} (${item.value})`).join(', ');

            return [...top, { name: 'Otros', value: othersCount, breakdown }];
        }

        return sorted;
    }, [filteredPlayers]);

    const PIE_COLORS = ['#3bb34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

    // Custom Tooltip Component
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-xl">
                    <p className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-1">
                        {data.name}
                    </p>
                    <p className="text-sm font-bold text-zinc-600">
                        {data.value} Jugadores
                    </p>
                    {data.breakdown && (
                        <div className="mt-2 pt-2 border-t border-zinc-100">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Incluye:</p>
                            <p className="text-[10px] font-medium text-zinc-500 max-w-[200px] leading-relaxed">
                                {data.breakdown}
                            </p>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    const stats = [
        {
            label: 'Jugadores Activos',
            value: activeCount.toString(),
            trend: 'Cartera actual', // Static text as we don't have historical data yet
            icon: Users,
            color: 'bg-blue-500',
            bg: 'bg-blue-50',
            actionId: 'active'
        },
        {
            label: 'Objetivos Scouting',
            value: scoutingCount.toString(),
            trend: 'En seguimiento',
            icon: Target,
            color: 'bg-proneo-green',
            bg: 'bg-emerald-50',
            actionId: 'scouting'
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
            bg: expiringCount > 0 ? 'bg-red-50' : 'bg-green-50',
            actionId: 'expiring'
        },
    ];

    const handleKpiClick = (actionId?: string) => {
        if (!actionId) return;
        if (actionId === 'scouting') {
            setActiveTab('scouting');
        } else if (actionId === 'active') {
            if (onSetQuickFilter) onSetQuickFilter(null);
            setActiveTab('players');
        } else if (actionId === 'expiring') {
            if (onSetQuickFilter) onSetQuickFilter('renovar');
            setActiveTab('players');
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
        <div className="space-y-10">
            {/* Filter Chips - Show if General OR Admin/Director */}
            {(userSport === 'General' || ['admin', 'director'].includes(userRole?.toLowerCase() || '')) && (
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    <button
                        onClick={() => setSelectedCategory('Todos')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap
                            ${selectedCategory === 'Todos'
                                ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/20'
                                : 'bg-white text-zinc-400 hover:bg-zinc-100 border border-zinc-100'}
                        `}
                    >
                        Todos
                    </button>
                    {['Fútbol', 'F. Sala', 'Femenino', 'Entrenadores'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap
                                ${selectedCategory === cat
                                    ? 'bg-proneo-green text-white shadow-lg shadow-proneo-green/20'
                                    : 'bg-white text-zinc-400 hover:bg-zinc-100 border border-zinc-100'}
                            `}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* KPI Row: High Level Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div
                        key={i}
                        onClick={() => handleKpiClick(stat.actionId)}
                        className={`bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm transition-all group overflow-hidden relative border-t-4 border-t-transparent ${stat.actionId ? 'cursor-pointer hover:shadow-xl hover:shadow-zinc-200/50 hover:border-t-proneo-green' : ''}`}
                    >
                        <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} rounded-full -mr-16 -mt-16 opacity-50 ${stat.actionId ? 'group-hover:scale-110' : ''} transition-transform`} />

                        <div className="relative z-10 flex flex-col h-full">
                            <div className={`${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 ${stat.actionId ? 'group-hover:rotate-6' : ''} transition-transform`}>
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
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Presencia de la agencia: <span className="text-proneo-green">{selectedCategory}</span></p>
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
                                        {leagueData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
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
                        <div
                            onClick={() => {
                                if (onSetQuickFilter) onSetQuickFilter('agencia');
                                setActiveTab('players');
                            }}
                            className="flex items-center justify-between p-5 rounded-3xl bg-zinc-50 border border-zinc-100 group hover:border-red-500/30 cursor-pointer transition-all"
                        >
                            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Fin Contrato Proneo (Año)</span>
                            <span className={`text-lg font-black ${renovationCount > 0 ? 'text-red-500' : 'text-zinc-600'} italic tracking-tighter group-hover:scale-110 transition-transform`}>{renovationCount}</span>
                        </div>
                        <div className="flex items-center justify-between p-5 rounded-3xl bg-zinc-50 border border-zinc-100">
                            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Ligas Activas</span>
                            <span className="text-lg font-black text-blue-500 italic tracking-tighter">{new Set(filteredPlayers.map(p => p.league).filter(Boolean)).size}</span>
                        </div>
                        <div
                            onClick={() => setActiveTab('scouting')}
                            className="flex items-center justify-between p-5 rounded-3xl bg-zinc-50 border border-zinc-100 group hover:border-proneo-green/30 cursor-pointer transition-all"
                        >
                            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Scouting Activo</span>
                            <span className="text-lg font-black text-proneo-green italic tracking-tighter group-hover:scale-110 transition-transform">{scoutingCount}</span>
                        </div>
                    </div>

                    <div className="flex-1 flex items-end">
                        <button
                            onClick={() => {
                                if (onSetQuickFilter) onSetQuickFilter(null);
                                setActiveTab('players');
                            }}
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

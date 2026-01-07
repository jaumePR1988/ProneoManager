import React, { useState, useEffect } from 'react';
import {
    Bell,
    Calendar,
    AlertTriangle,
    Clock,
    Cake,
    Target,
    MessageSquare,
    CheckCircle2,
    Trophy,
    X,
    Filter,
    Check,
    Clock4,
    UserPlus,
    UserMinus,
    Banknote
} from 'lucide-react';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { usePlayers } from '../hooks/usePlayers';
import { Player } from '../types/player';

interface AvisosModuleProps {
    userSport?: string;
    userName?: string;
    userRole?: string;
}

const AvisosModule: React.FC<AvisosModuleProps> = ({ userSport = 'General', userName, userRole = 'scout' }) => {
    // 1. Fetch ALL players (database + scouting) to generate global alerts
    const { players: dbPlayers } = usePlayers(false);
    const { players: scoutingPlayers } = usePlayers(true);

    // Filter by Assigned Agent Logic
    const isExternalScout = userRole === 'external_scout';

    const filteredDbPlayers = (isExternalScout && userName)
        ? dbPlayers.filter(p => p.monitoringAgent?.toLowerCase() === userName.toLowerCase())
        : dbPlayers;

    const filteredScoutingPlayers = (isExternalScout && userName)
        ? scoutingPlayers.filter(p => p.monitoringAgent?.toLowerCase() === userName.toLowerCase())
        : scoutingPlayers;

    const allPlayers = [...filteredDbPlayers, ...filteredScoutingPlayers];

    // State for Pending Users
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);

    // State for filtering
    const [selectedCategory, setSelectedCategory] = useState<string>(
        (userSport !== 'General' && userSport) ? userSport : 'Todos'
    );

    // Sync state with prop (for async auth loading)
    useEffect(() => {
        if (userSport !== 'General' && userSport) {
            setSelectedCategory(userSport);
        }
    }, [userSport]);

    // State for Completed (Permanent deletion)
    const [completedAlerts, setCompletedAlerts] = useState<string[]>(() => {
        const saved = localStorage.getItem('proneo_completed_alerts');
        return saved ? JSON.parse(saved) : [];
    });

    // State for Snoozed (Temporary - 24 hours)
    const [snoozedAlerts, setSnoozedAlerts] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('proneo_snoozed_alerts');
        return saved ? JSON.parse(saved) : {};
    });

    // Persist changes
    useEffect(() => {
        localStorage.setItem('proneo_completed_alerts', JSON.stringify(completedAlerts));
    }, [completedAlerts]);

    useEffect(() => {
        localStorage.setItem('proneo_snoozed_alerts', JSON.stringify(snoozedAlerts));
    }, [snoozedAlerts]);

    // Fetch Pending Users for Admin Alerts
    useEffect(() => {
        const q = query(collection(db, 'users'), where('approved', '==', false));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPendingUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    // Handlers
    const handleComplete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setCompletedAlerts(prev => [...prev, id]);
    };

    const handleSnooze = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        // Snooze for 24 hours
        const snoozeUntil = Date.now() + (24 * 60 * 60 * 1000);
        setSnoozedAlerts(prev => ({ ...prev, [id]: snoozeUntil }));
    };

    const handleQuickApprove = async (email: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`¿Aprobar acceso a ${email}?`)) {
            await updateDoc(doc(db, 'users', email), { approved: true, role: 'scout' });
        }
    };

    const handleQuickReject = async (email: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`¿Rechazar y ELIMINAR solicitud de ${email}?`)) {
            await deleteDoc(doc(db, 'users', email));
        }
    };

    // 2. Alert Generation Logic
    let alerts: any[] = [];
    const today = new Date();

    // Helper: Parse DD/MM/YYYY
    const parseDate = (dateStr?: string) => {
        if (!dateStr) return null;
        const [d, m, y] = dateStr.split('/');
        return new Date(Number(y), Number(m) - 1, Number(d));
    };

    // Helper: Days diff
    const getDaysDiff = (date?: Date) => {
        if (!date) return 9999;
        const diff = date.getTime() - today.getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };

    // --- SECURITY ALERTS (Pending Users) ---
    pendingUsers.forEach(u => {
        alerts.push({
            id: `user-req-${u.id}`,
            type: 'user_approval',
            priority: 'critical',
            title: 'Solicitud de Acceso',
            message: `${u.name} solicita acceso al sistema (${u.email}).`,
            player: { name: u.name }, // Hack for UI consistency
            category: 'Seguridad',
            date: u.createdAt?.split('T')[0],
            icon: UserPlus,
            color: 'bg-zinc-900',
            data: u
        });
    });

    // --- REAL ALERTS GENERATION ---

    // A. Birthdays (Today or Tomorrow)
    allPlayers.forEach(p => {
        if (!p.birthDate) return;
        const dob = parseDate(p.birthDate);
        if (!dob) return;

        const isToday = dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = dob.getDate() === tomorrow.getDate() && dob.getMonth() === tomorrow.getMonth();

        if (isToday || isTomorrow) {
            alerts.push({
                id: `bday-${p.id}`,
                type: 'birthday',
                priority: 'normal',
                title: isToday ? `¡Cumpleaños de ${p.name}!` : `Cumpleaños de ${p.name} (Mañana)`,
                message: isToday ? `Hoy cumple ${new Date().getFullYear() - dob.getFullYear()} años.` : `Mañana cumplirá ${new Date().getFullYear() - dob.getFullYear()} años.`,
                player: p,
                category: p.category || 'General',
                date: p.birthDate,
                icon: Cake,
                color: 'bg-purple-500'
            });
        }
    });

    // B. Agency Contract End (< 6 months)
    dbPlayers.forEach(p => {
        const endDate = parseDate(p.proneo?.agencyEndDate);
        if (!endDate) return;
        const days = getDaysDiff(endDate);

        if (days >= 0 && days < 180) { // Less than 6 months
            alerts.push({
                id: `agency-end-${p.id}`,
                type: 'agency_renewal',
                priority: 'high',
                title: 'Renovación Agencia Proneo',
                message: `El contrato de representación vence en ${Math.floor(days / 30)} meses (${p.proneo.agencyEndDate}).`,
                player: p,
                category: p.category || 'General',
                daysRemaining: days,
                icon: AlertTriangle,
                color: 'bg-red-500'
            });
        }
    });

    // C. Optional Clauses (Critical)
    dbPlayers.forEach(p => {
        const noticeDate = parseDate(p.contract?.optionalNoticeDate);
        if (!noticeDate) return;
        const days = getDaysDiff(noticeDate);

        // Alert if within 60 days
        if (days >= 0 && days < 60) {
            alerts.push({
                id: `clause-${p.id}`,
                type: 'clause',
                priority: 'critical',
                title: '🚨 CLÁUSULA OPCIONAL',
                message: `Límite para ejecutar/cancelar año opcional: ${p.contract.optionalNoticeDate} (${days} días).`,
                player: p,
                category: p.category || 'General',
                daysRemaining: days,
                icon: Bell,
                color: 'bg-red-600 animate-pulse'
            });
        }
    });

    // D. Scouting Opportunity (Agent End Date close)
    scoutingPlayers.forEach(p => {
        const agentEnd = parseDate(p.scouting?.agentEndDate);
        if (!agentEnd) return;
        const days = getDaysDiff(agentEnd);

        if (days >= 0 && days < 180) { // Less than 6 months
            alerts.push({
                id: `scout-opp-${p.id}`,
                type: 'scouting_opp',
                priority: 'medium',
                title: 'Oportunidad de Captación',
                message: `Termina contrato con su agente actual en ${Math.floor(days / 30)} meses.`,
                player: p,
                category: p.category || 'General',
                daysRemaining: days,
                icon: Target,
                color: 'bg-blue-500'
            });
        }
    });

    // E. Scouting Follow-up (> 3 months without contact)
    scoutingPlayers.forEach(p => {
        const lastContact = parseDate(p.scouting?.lastContactDate);
        if (!lastContact) return;

        const msSince = today.getTime() - lastContact.getTime();
        const daysSince = Math.floor(msSince / (1000 * 3600 * 24));

        if (daysSince > 90) { // 3 months
            alerts.push({
                id: `scout-stale-${p.id}`,
                type: 'scouting_followup',
                priority: 'low',
                title: 'Seguimiento Estancado',
                message: `Sin contacto desde hace ${daysSince} días (${p.scouting?.lastContactDate}).`,
                player: p,
                category: p.category || 'General',
                icon: MessageSquare,
                color: 'bg-orange-400'
            });
        }
    });

    // --- FINANCIAL ALERTS (Admin/Director/Tesorero ONLY) ---
    const canViewFinance = ['admin', 'director', 'tesorero'].includes(userRole?.toLowerCase() || '');

    if (canViewFinance) {
        dbPlayers.forEach(p => {
            if (!p.contractYears) return;

            p.contractYears.forEach(year => {
                // Check Club Payment
                if (year.clubPayment && !year.clubPayment.isPaid && year.clubPayment.dueDate) {
                    // Try to parse DD/MM/YYYY first, then fallback to standard Date parsing
                    let safeDueDate = parseDate(year.clubPayment.dueDate);
                    if (!safeDueDate || isNaN(safeDueDate.getTime())) {
                        safeDueDate = new Date(year.clubPayment.dueDate);
                    }

                    if (safeDueDate && !isNaN(safeDueDate.getTime())) {
                        const daysDiff = getDaysDiff(safeDueDate);

                        // 1. Overdue (Vencido)
                        if (daysDiff < 0) {
                            alerts.push({
                                id: `finance-club-overdue-${p.id}-${year.year}`,
                                type: 'finance_overdue',
                                priority: 'critical',
                                title: 'COBRO CLUB VENCIDO',
                                message: `Cobro pendiente del club (${year.clubPayment.status}) venció el ${year.clubPayment.dueDate}.`,
                                player: p,
                                category: 'Finanzas',
                                daysRemaining: daysDiff,
                                icon: Banknote,
                                color: 'bg-red-600 animate-pulse'
                            });
                        }
                        // 2. Upcoming (Próximo 15 dias)
                        else if (daysDiff >= 0 && daysDiff <= 15) {
                            alerts.push({
                                id: `finance-club-upcoming-${p.id}-${year.year}`,
                                type: 'finance_upcoming',
                                priority: 'high',
                                title: 'Cobro Club Próximo',
                                message: `Cobro previsto para el ${year.clubPayment.dueDate} (en ${daysDiff} días).`,
                                player: p,
                                category: 'Finanzas',
                                daysRemaining: daysDiff,
                                icon: Banknote,
                                color: 'bg-orange-500'
                            });
                        }
                    }
                }

                // Check Player Payment
                if (year.playerPayment && !year.playerPayment.isPaid && year.playerPayment.dueDate) {
                    let safeDueDate = parseDate(year.playerPayment.dueDate);
                    if (!safeDueDate || isNaN(safeDueDate.getTime())) {
                        safeDueDate = new Date(year.playerPayment.dueDate);
                    }

                    if (safeDueDate && !isNaN(safeDueDate.getTime())) {
                        const daysDiff = getDaysDiff(safeDueDate);

                        // 1. Overdue
                        if (daysDiff < 0) {
                            alerts.push({
                                id: `finance-player-overdue-${p.id}-${year.year}`,
                                type: 'finance_overdue',
                                priority: 'critical',
                                title: 'COBRO JUGADOR VENCIDO',
                                message: `Comisión jugador pendiente venció el ${year.playerPayment.dueDate}.`,
                                player: p,
                                category: 'Finanzas',
                                daysRemaining: daysDiff,
                                icon: Banknote,
                                color: 'bg-red-600 animate-pulse'
                            });
                        }
                        // 2. Upcoming
                        else if (daysDiff >= 0 && daysDiff <= 15) {
                            alerts.push({
                                id: `finance-player-upcoming-${p.id}-${year.year}`,
                                type: 'finance_upcoming',
                                priority: 'high',
                                title: 'Cobro Jugador Próximo',
                                message: `Comisión prevista para el ${year.playerPayment.dueDate} (en ${daysDiff} días).`,
                                player: p,
                                category: 'Finanzas',
                                daysRemaining: daysDiff,
                                icon: Banknote,
                                color: 'bg-orange-500'
                            });
                        }
                    }
                }
            });
        });


    }

    // --- SIMULATION MODE ---
    // If no alerts found (and not filtered out), inject dummy data for visualization
    // Only inject if there are NO real alerts at all (before filtering)
    const hasRealAlerts = alerts.length > 0;

    if (!hasRealAlerts) {
        alerts = [
            {
                id: 'sim-1',
                type: 'clause',
                priority: 'critical',
                title: '🚨 CLÁUSULA OPCIONAL',
                message: 'Límite para ejecutar renovación automática (30 días restantes).',
                player: { name: 'Marc Guiu', category: 'Fútbol' },
                category: 'Fútbol',
                daysRemaining: 30,
                icon: Bell,
                color: 'bg-red-600 animate-pulse'
            },
            {
                id: 'sim-2',
                type: 'agency_renewal',
                priority: 'high',
                title: 'Renovación Agencia Proneo',
                message: 'Contrato de representación vence en 3 meses.',
                player: { name: 'Adolfo Fernández', category: 'F. Sala' },
                category: 'F. Sala',
                daysRemaining: 90,
                icon: AlertTriangle,
                color: 'bg-red-500'
            },
            {
                id: 'sim-3',
                type: 'birthday',
                priority: 'normal',
                title: '¡Cumpleaños de Alexia!',
                message: 'Hoy cumple 31 años.',
                player: { name: 'Alexia Putellas', category: 'Femenino' },
                category: 'Femenino',
                date: '04/02/1994',
                icon: Cake,
                color: 'bg-purple-500'
            },
            {
                id: 'sim-4',
                type: 'scouting_opp',
                priority: 'medium',
                title: 'Oportunidad de Captación',
                message: 'Termina contrato con su agente actual en 2 meses.',
                player: { name: 'Estevao Willian', category: 'Fútbol' },
                category: 'Fútbol',
                daysRemaining: 60,
                icon: Target,
                color: 'bg-blue-500'
            },
            {
                id: 'sim-5',
                type: 'scouting_followup',
                priority: 'low',
                title: 'Seguimiento Estancado',
                message: 'Sin contacto desde hace 105 días.',
                player: { name: 'Pito', category: 'F. Sala' },
                category: 'F. Sala',
                icon: MessageSquare,
                color: 'bg-orange-400'
            }
        ];
    }

    // 3. FILTERING LOGIC

    // Filter out Completed (Deleted)
    alerts = alerts.filter(a => !completedAlerts.includes(a.id));

    // Filter out Snoozed (< Now)
    alerts = alerts.filter(a => {
        const snoozeUntil = snoozedAlerts[a.id];
        if (snoozeUntil && Date.now() < snoozeUntil) return false;
        return true;
    });

    // Filter by Selected Category
    if (selectedCategory !== 'Todos') {
        alerts = alerts.filter(a => a.category === selectedCategory);
    }

    // Sort: Critical first, then High, then date/urgency
    alerts.sort((a, b) => {
        const priorityScore: any = { critical: 4, high: 3, medium: 2, normal: 1, low: 0 };
        if (priorityScore[a.priority] !== priorityScore[b.priority]) {
            return priorityScore[b.priority] - priorityScore[a.priority];
        }
        return (a.daysRemaining || 0) - (b.daysRemaining || 0);
    });

    // Group by Category
    const alertsByCategory = alerts.reduce((acc: any, alert) => {
        const cat = alert.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(alert);
        return acc;
    }, {});

    const categories = Object.keys(alertsByCategory).sort();

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-zinc-900 uppercase tracking-tighter flex items-center gap-3">
                    Centro de <span className="text-proneo-green">Avisos</span>
                    <div className="w-8 h-8 rounded-full bg-red-500 text-white text-sm flex items-center justify-center shadow-lg shadow-red-500/30">
                        {alerts.length}
                    </div>
                </h1>
                <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs mt-2 mb-6">
                    Notificaciones inteligentes y recordatorios críticos
                </p>

                {/* Categories Filter - Hide if user has specific sport assigned */}
                {userSport === 'General' && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
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
            </div>

            <div className="space-y-12">
                {alerts.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[32px] border border-zinc-100 shadow-sm animate-fade-in">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 uppercase italic">¡Todo tranquilo!</h3>
                        <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest mt-2">
                            No hay avisos pendientes en {selectedCategory}
                        </p>
                    </div>
                ) : (
                    categories.map(category => (
                        <div key={category} className="animate-fade-in">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-8 w-1 bg-proneo-green rounded-full" />
                                <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-zinc-300" />
                                    {category}
                                </h2>
                                <span className="bg-zinc-100 text-zinc-400 text-[10px] font-black px-2 py-1 rounded-full">
                                    {alertsByCategory[category].length}
                                </span>
                            </div>

                            <div className="grid gap-4">
                                {alertsByCategory[category].map((alert: any) => (
                                    <div
                                        key={alert.id}
                                        className={`relative bg-white p-6 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-lg group pr-24
                                            ${alert.priority === 'critical' ? 'border-red-500 shadow-red-500/10' :
                                                alert.priority === 'high' ? 'border-red-100 shadow-sm' :
                                                    alert.type === 'completed' ? 'opacity-50' : 'border-zinc-100 shadow-sm'}
                                        `}
                                    >
                                        {/* Actions: Done & Snooze */}
                                        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all z-20">

                                            {/* Snooze Button */}
                                            <button
                                                onClick={(e) => handleSnooze(alert.id, e)}
                                                className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-blue-500 hover:bg-blue-50 hover:border-blue-100 transition-all"
                                                title="Posponer 1 día (Cerrar por ahora)"
                                            >
                                                <div className="relative">
                                                    <Clock4 className="w-4 h-4" />
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-white" />
                                                </div>
                                            </button>

                                            {/* Done Button */}
                                            <button
                                                onClick={(e) => handleComplete(alert.id, e)}
                                                className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 hover:border-emerald-100 transition-all"
                                                title="Marcar como HECHO (Borrar)"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {alert.priority === 'critical' && (
                                            <div className="absolute top-0 right-14 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl rounded-tr-xl">
                                                Prioridad Máxima
                                            </div>
                                        )}

                                        <div className="flex items-start gap-6">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${alert.color}`}>
                                                <alert.icon className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className={`text-lg font-black uppercase tracking-tight 
                                                        ${alert.priority === 'critical' ? 'text-red-600 italic' : 'text-zinc-900'}
                                                    `}>
                                                        {alert.title}
                                                    </h3>
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase bg-zinc-100 px-2 py-0.5 rounded-md">
                                                        {alert.player.name}
                                                    </span>
                                                </div>
                                                <p className="text-zinc-500 font-medium text-sm leading-relaxed">
                                                    {alert.message}
                                                </p>

                                                {/* Action Chips */}
                                                <div className="flex gap-2 mt-4">
                                                    {alert.type === 'birthday' && (
                                                        <button className="text-[10px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-100 transition-colors">
                                                            Enviar WhatsApp
                                                        </button>
                                                    )}
                                                    {['agency_renewal', 'clause'].includes(alert.type) && (
                                                        <button className="text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors">
                                                            Revisar Contrato
                                                        </button>
                                                    )}
                                                    {alert.type === 'scouting_followup' && (
                                                        <button className="text-[10px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 px-4 py-2 rounded-lg hover:bg-orange-100 transition-colors">
                                                            Registrar Llamada
                                                        </button>
                                                    )}
                                                    {alert.type === 'user_approval' && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={(e) => handleQuickApprove(alert.data.email, e)}
                                                                className="text-[10px] font-black uppercase tracking-widest bg-proneo-green text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-proneo-green/20 transition-all shadow-sm"
                                                            >
                                                                Aprobar Acceso
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleQuickReject(alert.data.email, e)}
                                                                className="text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
                                                            >
                                                                Rechazar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right pl-4 border-l border-zinc-100 hidden md:block">
                                                <div className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-1">Fecha Clave</div>
                                                <div className="font-mono font-bold text-zinc-600">
                                                    {alert.date || alert.player.scouting?.lastContactDate || '---'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AvisosModule;

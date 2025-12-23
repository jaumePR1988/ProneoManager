import React from 'react';
import {
    Bell,
    AlertCircle,
    Clock,
    CheckCircle2,
    ExternalLink,
    Search,
    Filter,
    MoreVertical
} from 'lucide-react';
import { usePlayers } from '../hooks/usePlayers';

const AvisosModule: React.FC = () => {
    const { players } = usePlayers(false);

    const dynamicAlerts = React.useMemo(() => {
        const now = new Date();
        return players
            .filter(p => p.proneo?.agencyEndDate && new Date(p.proneo.agencyEndDate) <= now)
            .map(p => ({
                id: `expired-${p.id}`,
                title: 'Contrato de Agencia Caducado',
                description: `El contrato de representación de ${p.firstName} ${p.lastName1} ha caducado. Es necesario revisar la renovación.`,
                type: 'priority',
                date: 'Automático',
                category: 'Agencia'
            }));
    }, [players]);

    const staticAlerts = [
        {
            id: 1,
            title: 'Renovación de Contrato Requerida',
            description: 'El contrato de Alexia P. con su club actual expira en 6 meses. Es necesario iniciar conversaciones preliminares.',
            type: 'priority',
            date: 'Hace 2 horas',
            category: 'Contratos'
        },
        {
            id: 2,
            title: 'Nueva Oferta de Patrocinio',
            description: 'Nike ha enviado una propuesta formal para el set de jugadoras de categoría Pro.',
            type: 'notif',
            date: 'Hace 5 horas',
            category: 'Marketing'
        },
        {
            id: 3,
            title: 'Seguimiento Médico',
            description: 'Revisión médica post-lesión programada para M. Garcia mañana a las 10:00.',
            type: 'info',
            date: 'Hace 1 día',
            category: 'Salud'
        },
        {
            id: 4,
            title: 'Cambio en Valor de Mercado',
            description: 'El valor estimado de 3 jugadores ha subido un >15% tras la última jornada.',
            type: 'info',
            date: 'Hace 2 días',
            category: 'Valuación'
        }
    ];

    const alerts = [...dynamicAlerts, ...staticAlerts];

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'priority': return 'border-l-red-500 bg-red-50/30';
            case 'notif': return 'border-l-proneo-green bg-emerald-50/30';
            default: return 'border-l-blue-500 bg-blue-50/30';
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'priority': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'notif': return <Bell className="w-5 h-5 text-proneo-green" />;
            default: return <Clock className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight italic uppercase">Centro de Avisos</h1>
                    <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-1">Notificaciones y alertas del sistema</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="h-12 px-6 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center gap-2 text-zinc-600 font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        Marcar todo como leído
                    </button>
                    <button className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-white transition-all">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-4">
                <div className="bg-zinc-50/50 p-2 rounded-2xl border border-zinc-100 flex items-center gap-2 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Buscar en notificaciones..."
                            className="w-full bg-white border border-zinc-100 rounded-xl pl-12 pr-6 h-12 text-sm font-bold focus:ring-4 focus:ring-proneo-green/5 focus:border-proneo-green/20 outline-none transition-all"
                        />
                    </div>
                </div>

                {alerts.map((alert) => (
                    <div
                        key={alert.id}
                        className={`group p-6 rounded-[32px] border border-zinc-100 bg-white hover:shadow-xl hover:shadow-zinc-200/50 transition-all border-l-4 ${getTypeColor(alert.type)}`}
                    >
                        <div className="flex gap-6">
                            <div className="shrink-0 w-12 h-12 rounded-2xl bg-white border border-zinc-100 shadow-sm flex items-center justify-center">
                                {getIcon(alert.type)}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-proneo-green">{alert.category}</span>
                                            <span className="w-1 h-1 rounded-full bg-zinc-200" />
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{alert.date}</span>
                                        </div>
                                        <h3 className="text-lg font-black text-zinc-900 tracking-tight italic uppercase">{alert.title}</h3>
                                    </div>
                                    <button className="text-zinc-300 hover:text-zinc-600 transition-colors">
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </div>

                                <p className="text-sm font-bold text-zinc-500 leading-relaxed mb-6">
                                    {alert.description}
                                </p>

                                <div className="flex items-center gap-4">
                                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-proneo-green hover:gap-3 transition-all">
                                        Gestionar Ahora
                                        <ExternalLink className="w-3" />
                                    </button>
                                    <button className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors">
                                        Ignorar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AvisosModule;

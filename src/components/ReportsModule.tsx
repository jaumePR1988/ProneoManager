import React, { useState } from 'react';
import {
    FileText,
    Download,
    Filter,
    Search,
    Calendar,
    User,
    ExternalLink,
    ArrowUpRight
} from 'lucide-react';
import { usePlayers } from '../hooks/usePlayers';
import PortfolioPreview from './PortfolioPreview';

const ReportsModule: React.FC = () => {
    const { players: databasePlayers, loading } = usePlayers(false); // Fetch database players for the report
    const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);

    const reports = [
        { id: 1, title: 'Informe Mensual Scouting - Diciembre 2024', type: 'Scouting', date: '21 Dic 2024', author: 'Joan Francesc', status: 'Completado' },
        { id: 2, title: 'Análisis de Mercado: Liga F 2024/25', type: 'Mercado', date: '18 Dic 2024', author: 'Sistema AI', status: 'Completado' },
        { id: 3, title: 'Seguimiento Juvenil A - División de Honor', type: 'Seguimiento', date: '15 Dic 2024', author: 'Albert Redondo', status: 'Pendiente' },
        { id: 4, title: 'Auditoría Contractual Q4', type: 'Legal', date: '10 Dic 2024', author: 'Legal Team', status: 'Completado' },
    ];

    return (
        <div className="space-y-8">
            {isPortfolioOpen && (
                <PortfolioPreview
                    players={databasePlayers}
                    onClose={() => setIsPortfolioOpen(false)}
                />
            )}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight italic uppercase">Centro de Reportes</h1>
                    <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-1">Gestión documental y análisis de datos</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsPortfolioOpen(true)}
                        className="h-12 px-6 rounded-xl bg-zinc-900 text-white flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Ver Dosier 2025
                    </button>
                    <button className="h-12 px-6 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center gap-2 text-zinc-600 font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-sm">
                        <Filter className="w-4 h-4" />
                        Filtrar
                    </button>
                    <button className="h-12 px-6 rounded-xl bg-proneo-green text-white flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:shadow-xl hover:shadow-proneo-green/20 transition-all shadow-lg">
                        <FileText className="w-4 h-4" />
                        Nuevo Informe
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Reportes', value: '128', icon: FileText, color: 'bg-blue-500' },
                    { label: 'Este Mes', value: '14', icon: Calendar, color: 'bg-proneo-green' },
                    { label: 'Pendientes', value: '3', icon: ArrowUpRight, color: 'bg-orange-500' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm flex items-center gap-6">
                        <div className={`${stat.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-zinc-900 italic">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                    <h3 className="font-black text-sm uppercase tracking-widest text-zinc-900">Últimos Documentos</h3>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-proneo-green transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar reporte..."
                            className="bg-zinc-50 border border-zinc-100 rounded-xl pl-12 pr-6 h-10 text-xs font-bold w-64 focus:bg-white transition-all outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50">
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Documento</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tipo</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Fecha</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Autor</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {reports.map((report) => (
                                <tr key={report.id} className="group hover:bg-zinc-50/50 transition-all">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-proneo-green/10 group-hover:text-proneo-green transition-all">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold text-sm text-zinc-900">{report.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 bg-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-500 rounded-lg">
                                            {report.type}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-sm font-bold text-zinc-400">
                                        {report.date}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center">
                                                <User className="w-3 h-3 text-zinc-400" />
                                            </div>
                                            <span className="text-sm font-bold text-zinc-600">{report.author}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="p-2 hover:bg-white rounded-xl text-zinc-400 hover:text-proneo-green transition-all border border-transparent hover:border-zinc-100">
                                            <Download className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReportsModule;

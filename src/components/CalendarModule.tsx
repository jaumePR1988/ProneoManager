import React, { useState, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    FileText,
    Trash2,
    Download,
    Filter,
    Calendar as CalendarIcon,
    User
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useScoutingMatches } from '../hooks/useScoutingMatches';
import { usePlayerReports } from '../hooks/usePlayerReports';
import ScoutingMatchForm from './ScoutingMatchForm';
import { Category } from '../types/player';
import { ScoutingMatch } from '../types/scoutingMatch';
import ScoutingMatchReport from './ScoutingMatchReport';
import { ReportType } from '../types/playerReport';

interface CalendarModuleProps {
    userRole: string;
    userSport: Category | 'General';
    userName: string;
}

const CalendarModule: React.FC<CalendarModuleProps> = ({ userRole, userSport, userName }) => {
    const isAdmin = userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'director';
    const { matches, addMatch, updateMatch, deleteMatch, loading } = useScoutingMatches(userSport as any, isAdmin);
    const { addReport } = usePlayerReports();

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<ScoutingMatch | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [viewingReport, setViewingReport] = useState<ScoutingMatch | null>(null);

    // Filters
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [filterSport, setFilterSport] = useState<string>(isAdmin ? 'all' : (userSport === 'General' ? 'all' : userSport));
    const [filterAgent, setFilterAgent] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Force filter for non-admins
    React.useEffect(() => {
        if (!isAdmin && userSport !== 'General') {
            setFilterSport(userSport);
        }
    }, [isAdmin, userSport]);

    // Get unique agents from matches
    const agents = useMemo(() => {
        const uniqueAgents = new Set(matches.map(m => m.assignedAgentName));
        return Array.from(uniqueAgents).filter(Boolean);
    }, [matches]);

    // Filter matches
    const filteredMatches = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        return matches.filter(m => {
            const matchDate = new Date(m.date);

            // 1. Date Range Filter (Priority)
            if (startDate && endDate) {
                const s = new Date(startDate);
                const e = new Date(endDate);
                // Set hours to 0 to compare dates only
                matchDate.setHours(0, 0, 0, 0);
                s.setHours(0, 0, 0, 0);
                e.setHours(0, 0, 0, 0);
                if (matchDate < s || matchDate > e) return false;
            } else {
                // FALLBACK: Month/Year filter
                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth();
                const matchYear = matchDate.getFullYear();
                const matchMonth = matchDate.getMonth();
                if (matchYear !== year || matchMonth !== month) return false;
            }

            // Sport filter
            if (isAdmin) {
                if (filterSport !== 'all') {
                    if (filterSport === 'F. Sala') {
                        if (m.sport !== 'Futbol Sala' && m.sport !== 'F. Sala') return false;
                    } else {
                        if (m.sport !== filterSport) return false;
                    }
                }
            } else if (userSport !== 'General') {
                // Non-admins with specific sport only see their sport or 'General'
                const s = (userSport === 'F. Sala' || userSport === 'Futbol Sala') ? ['Futbol Sala', 'F. Sala'] : [userSport];
                s.push('General');
                if (!s.includes(m.sport || '')) return false;
            }

            // Agent filter (only for admins)
            if (isAdmin && filterAgent !== 'all' && m.assignedAgentName !== filterAgent) return false;

            return true;
        }).sort((a, b) => {
            const dateComp = a.date.localeCompare(b.date);
            return dateComp === 0 ? a.time.localeCompare(b.time) : dateComp;
        });
    }, [matches, currentMonth, filterSport, filterAgent, isAdmin, startDate, endDate]);

    // Pagination
    const totalPages = Math.ceil(filteredMatches.length / itemsPerPage);
    const paginatedMatches = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredMatches.slice(start, start + itemsPerPage);
    }, [filteredMatches, currentPage]);

    const changeMonth = (offset: number) => {
        const next = new Date(currentMonth);
        next.setMonth(next.getMonth() + offset);
        setCurrentMonth(next);
        setCurrentPage(1);
    };

    const handleSave = async (data: Partial<ScoutingMatch>) => {
        if (selectedMatch?.id) {
            await updateMatch(selectedMatch.id, data);
        } else {
            await addMatch({ ...data, sport: data.sport || userSport as any });
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este seguimiento?')) {
            await deleteMatch(id);
            setIsFormOpen(false);
            setSelectedMatch(null);
        }
    };

    const downloadRangePDF = () => {
        const doc = new jsPDF();
        const logoUrl = '/logo-full.png';
        const rangeStr = startDate && endDate
            ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
            : currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

        const img = new Image();
        img.src = logoUrl;
        img.onload = () => {
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, 210, 45, 'F');

            try {
                doc.addImage(img, 'PNG', 15, 12, 50, 20);
            } catch (e) {
                console.error('Error adding logo to PDF', e);
            }

            doc.setTextColor(24, 24, 27);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('AGENDA MENSUAL', 200, 25, { align: 'right' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(15, 157, 88);
            doc.text(rangeStr, 200, 32, { align: 'right' });

            doc.setDrawColor(15, 157, 88);
            doc.setLineWidth(1.5);
            doc.line(15, 45, 200, 45);

            // Add filter badges
            let yOffset = 52;
            if (filterSport !== 'all' || filterAgent !== 'all') {
                doc.setFontSize(8);
                doc.setTextColor(113, 113, 122);
                doc.text('Filtros aplicados:', 15, yOffset);
                yOffset += 5;

                if (filterSport !== 'all') {
                    doc.text(`• Especialidad: ${filterSport}`, 20, yOffset);
                    yOffset += 4;
                }
                if (filterAgent !== 'all') {
                    doc.text(`• Agente: ${filterAgent}`, 20, yOffset);
                    yOffset += 4;
                }
                yOffset += 3;
            }

            doc.setTextColor(24, 24, 27);
            doc.setFontSize(14);
            doc.text('Resumen de Partidos Programados', 15, yOffset);

            const tableData = filteredMatches.map(m => {
                const day = new Date(m.date).getDate();
                const monthNamesShort = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
                const monthShort = monthNamesShort[new Date(m.date).getMonth()];

                return [
                    `${day} ${monthShort}`,
                    m.time,
                    m.playerName,
                    `${m.team} vs ${m.rival}`,
                    m.locationType,
                    m.assignedAgentName
                ];
            });

            autoTable(doc, {
                startY: yOffset + 7,
                head: [['FECHA', 'HORA', 'JUGADOR/A', 'PARTIDO', 'CAMPO', 'SCOUT']],
                body: tableData.length > 0 ? tableData : [['-', '-', 'No hay partidos programados', '-', '-', '-']],
                theme: 'striped',
                headStyles: {
                    fillColor: [24, 24, 27],
                    fontSize: 8,
                    fontStyle: 'bold',
                    cellPadding: 4,
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 9,
                    cellPadding: 4,
                    halign: 'center'
                },
                columnStyles: {
                    2: { halign: 'left', fontStyle: 'bold' },
                    3: { halign: 'left' }
                },
                alternateRowStyles: {
                    fillColor: [249, 250, 251]
                }
            });

            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(8);
            doc.setTextColor(161, 161, 170);
            doc.text(`Generado el ${new Date().toLocaleDateString()} - PRONEOSPORTS MANAGER`, 105, pageHeight - 10, { align: 'center' });

            doc.save(`Agenda_${rangeStr.replace(/\//g, '-')}.pdf`);
        };
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="flex bg-white rounded-2xl border border-zinc-100 shadow-sm p-1">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-zinc-50 rounded-xl transition-all">
                            <ChevronLeft className="w-5 h-5 text-zinc-400" />
                        </button>
                        <div className="px-6 flex items-center">
                            <span className="text-sm font-black text-zinc-900 uppercase tracking-widest italic">
                                {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-zinc-50 rounded-xl transition-all">
                            <ChevronRight className="w-5 h-5 text-zinc-400" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={downloadRangePDF}
                        className="h-12 px-6 rounded-2xl bg-white border-2 border-zinc-100 text-zinc-900 flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:border-proneo-green hover:text-proneo-green transition-all shadow-sm"
                        title="Exportar PDF"
                    >
                        <Download className="w-4 h-4" />
                        Exportar PDF
                    </button>

                    <button
                        onClick={() => {
                            setSelectedMatch(null);
                            setSelectedDate(undefined);
                            setIsFormOpen(true);
                        }}
                        className="h-12 px-6 rounded-2xl bg-zinc-900 text-white flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl"
                    >
                        <Plus className="w-4 h-4" />
                        Añadir Partido
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm p-6">
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2 text-zinc-400">
                        <Filter className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-widest">Filtros</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-zinc-500">Desde:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 h-10 text-xs font-bold text-zinc-900 focus:bg-white focus:border-proneo-green transition-all outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-zinc-500">Hasta:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 h-10 text-xs font-bold text-zinc-900 focus:bg-white focus:border-proneo-green transition-all outline-none"
                        />
                    </div>

                    {isAdmin && (
                        <>
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-bold text-zinc-500">Especialidad:</label>
                                <select
                                    value={filterSport}
                                    onChange={(e) => {
                                        setFilterSport(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 h-10 text-xs font-bold text-zinc-900 focus:bg-white focus:border-proneo-green transition-all outline-none"
                                >
                                    <option value="all">Todas</option>
                                    <option value="Fútbol">Fútbol</option>
                                    <option value="Femenino">Femenino</option>
                                    <option value="F. Sala">Fútbol Sala</option>
                                    <option value="Entrenadores">Entrenadores</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="text-xs font-bold text-zinc-500">Agente:</label>
                                <select
                                    value={filterAgent}
                                    onChange={(e) => {
                                        setFilterAgent(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 h-10 text-xs font-bold text-zinc-900 focus:bg-white focus:border-proneo-green transition-all outline-none"
                                >
                                    <option value="all">Todos</option>
                                    {agents.map(agent => (
                                        <option key={agent} value={agent}>{agent}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {(filterSport !== 'all' || filterAgent !== 'all' || startDate || endDate) && (
                        <button
                            onClick={() => {
                                setFilterSport('all');
                                setFilterAgent('all');
                                setStartDate('');
                                setEndDate('');
                                setCurrentPage(1);
                            }}
                            className="ml-auto text-xs font-bold text-zinc-400 hover:text-zinc-600 transition-all"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-proneo-green/10 rounded-2xl flex items-center justify-center">
                            <CalendarIcon className="w-5 h-5 text-proneo-green" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Este Mes</p>
                            <p className="text-2xl font-black text-zinc-900 italic">{filteredMatches.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Jugadores</p>
                            <p className="text-2xl font-black text-zinc-900 italic">
                                {new Set(filteredMatches.map(m => m.playerId)).size}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Scouts</p>
                            <p className="text-2xl font-black text-zinc-900 italic">
                                {new Set(filteredMatches.map(m => m.assignedAgentName)).size}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-12 h-12 border-4 border-proneo-green/20 border-t-proneo-green rounded-full animate-spin"></div>
                    </div>
                ) : paginatedMatches.length === 0 ? (
                    <div className="p-12 text-center">
                        <CalendarIcon className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                        <p className="text-sm font-bold text-zinc-400">No hay partidos programados para este mes</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-zinc-50/50 border-b border-zinc-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Fecha</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Hora</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Jugador/a</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Partido</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Campo</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Scout</th>
                                        {isAdmin && (
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Especialidad</th>
                                        )}
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50">
                                    {paginatedMatches.map((match) => (
                                        <tr
                                            key={match.id}
                                            className="group hover:bg-zinc-50/50 transition-all cursor-pointer"
                                            onClick={() => {
                                                setSelectedMatch(match);
                                                setIsFormOpen(true);
                                            }}
                                        >
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-zinc-900">
                                                    {new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-black text-zinc-900 bg-zinc-100 px-3 py-1 rounded-lg">
                                                    {match.time}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-zinc-900">{match.playerName}</span>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${match.playerOrigin === 'scouting'
                                                        ? 'bg-blue-500/10 text-blue-500'
                                                        : 'bg-proneo-green/10 text-proneo-green'
                                                        }`}>
                                                        {match.playerOrigin === 'scouting' ? 'Scouting' : 'Cantera'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium text-zinc-700">
                                                    {match.team} <span className="text-zinc-400">vs</span> {match.rival}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${match.locationType === 'Local'
                                                    ? 'bg-zinc-900 text-white'
                                                    : 'bg-zinc-100 text-zinc-500'
                                                    }`}>
                                                    {match.locationType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-zinc-600">{match.assignedAgentName}</span>
                                            </td>
                                            {isAdmin && (
                                                <td className="px-6 py-4">
                                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-proneo-green/10 text-proneo-green">
                                                        {match.sport}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setViewingReport(match);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center bg-white hover:bg-proneo-green hover:text-white rounded-lg text-zinc-400 shadow-sm border border-zinc-100 transition-all active:scale-90"
                                                        title="Ver Reporte"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(match.id);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center bg-white hover:bg-red-500 hover:text-white rounded-lg text-zinc-400 shadow-sm border border-zinc-100 transition-all active:scale-90"
                                                        title="Eliminar Partido"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-6 border-t border-zinc-100 flex items-center justify-between">
                                <p className="text-xs font-bold text-zinc-400">
                                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredMatches.length)} de {filteredMatches.length} partidos
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="w-9 h-9 flex items-center justify-center bg-white border border-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 hover:border-zinc-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs font-black text-zinc-900 px-4">
                                        Página {currentPage} de {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="w-9 h-9 flex items-center justify-center bg-white border border-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 hover:border-zinc-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            {isFormOpen && (
                <ScoutingMatchForm
                    match={selectedMatch}
                    selectedDate={selectedDate}
                    userSport={userSport as any}
                    onClose={() => {
                        setIsFormOpen(false);
                        setSelectedMatch(null);
                    }}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    isAdmin={isAdmin}
                />
            )}

            {viewingReport && (
                <ScoutingMatchReport
                    match={viewingReport}
                    onClose={() => setViewingReport(null)}
                    onSave={async (notes) => {
                        await updateMatch(viewingReport.id, { reportNotes: notes });
                        setViewingReport(prev => prev ? { ...prev, reportNotes: notes } : null);
                    }}
                    onSaveReport={async (playerId, playerName, notes, date) => {
                        const reportType = viewingReport.playerOrigin === 'scouting' ? 'scouting' : 'seguimiento';
                        await addReport(
                            {
                                playerId,
                                playerName,
                                reportType,
                                date,
                                notes,
                            },
                            userName,
                            'system' // We don't have userId in CalendarModule, using 'system' as placeholder
                        );
                    }}
                    userName={userName}
                />
            )}
        </div>
    );
};

export default CalendarModule;

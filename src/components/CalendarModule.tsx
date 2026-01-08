import React, { useState, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    FileText,
    Trash2,
    Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useScoutingMatches } from '../hooks/useScoutingMatches';
import ScoutingMatchForm from './ScoutingMatchForm';
import { Category } from '../types/player';
import { ScoutingMatch } from '../types/scoutingMatch';
import ScoutingMatchReport from './ScoutingMatchReport';

interface CalendarModuleProps {
    userRole: string;
    userSport: Category;
    userName: string;
}

const CalendarModule: React.FC<CalendarModuleProps> = ({ userRole, userSport }) => {
    const isAdmin = userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'director';
    const { matches, addMatch, updateMatch, deleteMatch, loading } = useScoutingMatches(userSport, isAdmin);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<ScoutingMatch | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [viewingReport, setViewingReport] = useState<ScoutingMatch | null>(null);

    // Calendar logic
    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days = [];
        const firstDay = firstDayOfMonth(year, month);
        const totalDays = daysInMonth(year, month);

        // Previous month padding (Monday start)
        const prevMonthLastDay = daysInMonth(year, month - 1);
        const padding = firstDay === 0 ? 6 : firstDay - 1;
        for (let i = padding - 1; i >= 0; i--) {
            days.push({ day: prevMonthLastDay - i, month: month - 1, year, isCurrentMonth: false });
        }

        // Current month
        for (let i = 1; i <= totalDays; i++) {
            days.push({ day: i, month, year, isCurrentMonth: true });
        }

        // Next month padding
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, month: month + 1, year, isCurrentMonth: false });
        }

        return days;
    }, [currentDate]);

    const changeMonth = (offset: number) => {
        const next = new Date(currentDate);
        next.setMonth(next.getMonth() + offset);
        setCurrentDate(next);
    };

    const getMatchesForDay = (day: number, month: number, year: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return matches.filter(m => m.date === dateStr);
    };

    const handleSave = async (data: Partial<ScoutingMatch>) => {
        if (selectedMatch?.id) {
            await updateMatch(selectedMatch.id, data);
        } else {
            // Respect the sport selected in the form, primarily for admins
            await addMatch({ ...data, sport: data.sport || userSport });
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este seguimiento?')) {
            await deleteMatch(id);
            setIsFormOpen(false);
            setSelectedMatch(null);
        }
    };

    const downloadMonthlyPDF = () => {
        const doc = new jsPDF();
        const logoUrl = '/logo-full.png';
        const monthYearStr = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

        // Filter matches for current month
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        const monthMatches = matches.filter(m => {
            const mDate = new Date(m.date);
            return mDate.getFullYear() === currentYear && mDate.getMonth() === currentMonth;
        }).sort((a, b) => {
            const dateComp = a.date.localeCompare(b.date);
            return dateComp === 0 ? a.time.localeCompare(b.time) : dateComp;
        });

        const img = new Image();
        img.src = logoUrl;
        img.onload = () => {
            // Header
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, 210, 45, 'F');

            // Add Logo
            try {
                doc.addImage(img, 'PNG', 15, 12, 50, 20);
            } catch (e) {
                console.error('Error adding logo to PDF', e);
            }

            doc.setTextColor(24, 24, 27); // Zinc 900
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('AGENDA MENSUAL', 200, 25, { align: 'right' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(15, 157, 88); // Proneo Green
            doc.text(monthYearStr, 200, 32, { align: 'right' });

            // Green Line
            doc.setDrawColor(15, 157, 88); // Proneo Green
            doc.setLineWidth(1.5);
            doc.line(15, 45, 200, 45);

            // Speciality Badge
            doc.setFillColor(244, 244, 245);
            doc.roundedRect(165, 52, 35, 8, 2, 2, 'F');
            doc.setTextColor(113, 113, 122);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(userSport.toUpperCase(), 182.5, 57.5, { align: 'center' });

            doc.setTextColor(24, 24, 27);
            doc.setFontSize(14);
            doc.text('Resumen de Partidos Programados', 15, 58);

            const tableData = monthMatches.map(m => {
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
                startY: 65,
                head: [['FECHA', 'HORA', 'JUGADOR/A', 'PARTIDO', 'CAMPO', 'SCOUT']],
                body: tableData.length > 0 ? tableData : [['-', '-', 'No hay partidos programados este mes', '-', '-', '-']],
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

            // Footer
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(8);
            doc.setTextColor(161, 161, 170); // Zinc 400
            doc.text(`Generado el ${new Date().toLocaleDateString()} - PRONEOSPORTS MANAGER`, 105, pageHeight - 10, { align: 'center' });

            doc.save(`Agenda_${monthYearStr}.pdf`);
        };
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight italic uppercase flex items-center gap-3">
                        Agenda de Scouting
                        <span className="px-3 py-1 bg-proneo-green/10 text-proneo-green text-[10px] font-black uppercase tracking-widest rounded-lg border border-proneo-green/20">
                            {userSport}
                        </span>
                    </h1>
                    <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-1">Planificación y seguimiento</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-white rounded-2xl border border-zinc-100 shadow-sm p-1">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-zinc-50 rounded-xl transition-all">
                            <ChevronLeft className="w-5 h-5 text-zinc-400" />
                        </button>
                        <div className="px-6 flex items-center">
                            <span className="text-sm font-black text-zinc-900 uppercase tracking-widest italic">
                                {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-zinc-50 rounded-xl transition-all">
                            <ChevronRight className="w-5 h-5 text-zinc-400" />
                        </button>
                    </div>

                    <button
                        onClick={downloadMonthlyPDF}
                        className="h-12 px-6 rounded-2xl bg-white border-2 border-zinc-100 text-zinc-900 flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:border-proneo-green hover:text-proneo-green transition-all shadow-sm"
                        title="Reporte Mensual"
                    >
                        <Download className="w-4 h-4" />
                        Reporte Mensual
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

            {/* Calendar Grid */}
            <div className="bg-white rounded-[40px] border-2 border-proneo-green/20 shadow-sm overflow-hidden min-h-[700px] flex flex-col">
                <div className="grid grid-cols-7 border-b border-zinc-100 bg-proneo-green">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                        <div key={d} className="py-4 text-center">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{d}</span>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-proneo-green/20 border-t-proneo-green rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                        {calendarDays.map((d, i) => {
                            const dayMatches = getMatchesForDay(d.day, d.month, d.year);
                            const isToday = new Date().toDateString() === new Date(d.year, d.month, d.day).toDateString();
                            const isWeekend = new Date(d.year, d.month, d.day).getDay() === 0 || new Date(d.year, d.month, d.day).getDay() === 6;

                            if (!d.isCurrentMonth) {
                                return (
                                    <div key={i} className="min-h-[120px] bg-zinc-50 border-b border-r border-proneo-green/20" />
                                );
                            }

                            return (
                                <div
                                    key={i}
                                    className={`min-h-[120px] p-4 border-b border-r border-proneo-green/20 transition-all group hover:bg-zinc-50/30 ${isWeekend ? 'bg-zinc-50/50' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-sm font-black tracking-tighter italic ${isToday ? 'w-8 h-8 rounded-full bg-proneo-green text-white flex items-center justify-center -mt-1 -ml-1 shadow-lg shadow-proneo-green/20' : 'text-proneo-green'}`}>
                                            {d.day}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setSelectedDate(new Date(d.year, d.month, d.day));
                                                setSelectedMatch(null);
                                                setIsFormOpen(true);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white rounded-lg text-zinc-400 hover:text-proneo-green"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-1.5">
                                        {dayMatches.map(m => (
                                            <div
                                                key={m.id}
                                                onClick={() => {
                                                    setSelectedMatch(m);
                                                    setIsFormOpen(true);
                                                }}
                                                className={`group relative p-3 rounded-[20px] text-left cursor-pointer transition-all hover:scale-[1.02] border border-zinc-100 shadow-sm hover:shadow-md ${m.playerOrigin === 'scouting'
                                                    ? 'bg-blue-50/30'
                                                    : 'bg-proneo-green/5'
                                                    }`}
                                            >
                                                {/* Origin Badge */}
                                                <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest border shadow-sm z-10 ${m.playerOrigin === 'scouting'
                                                    ? 'bg-blue-500 text-white border-blue-400'
                                                    : 'bg-proneo-green text-white border-proneo-green'
                                                    }`}>
                                                    {m.playerOrigin === 'scouting' ? 'Scouting' : 'Cantera'}
                                                </div>

                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-black text-zinc-900 bg-white/80 px-2 py-1 rounded-lg border border-zinc-100 shadow-sm">
                                                            {m.time}
                                                        </span>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${m.locationType === 'Local'
                                                            ? 'bg-zinc-900 text-white border-zinc-900'
                                                            : 'bg-white text-zinc-500 border-zinc-200'
                                                            }`}>
                                                            {m.locationType}
                                                        </span>
                                                    </div>
                                                </div>

                                                <p className="text-[11px] font-black text-zinc-900 leading-tight mb-2 tracking-tight">
                                                    {m.playerName}
                                                </p>

                                                <div className="flex items-center justify-between gap-2 bg-white/50 p-2 rounded-xl border border-zinc-100/50">
                                                    <div className="flex flex-col gap-0.5 min-w-0">
                                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                                            <div className="w-1 h-1 rounded-full bg-zinc-300" />
                                                            <span className="text-[9px] font-bold text-zinc-600 truncate underline decoration-proneo-green/30">{m.team}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                                            <div className="w-1 h-1 rounded-full bg-red-400" />
                                                            <span className="text-[9px] font-bold text-zinc-400 truncate italic">vs {m.rival}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setViewingReport(m);
                                                            }}
                                                            className="w-7 h-7 flex items-center justify-center bg-white hover:bg-proneo-green hover:text-white rounded-lg text-zinc-400 shadow-sm border border-zinc-100 transition-all active:scale-90"
                                                            title="Ver Reporte"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(m.id);
                                                            }}
                                                            className="w-7 h-7 flex items-center justify-center bg-white hover:bg-red-500 hover:text-white rounded-lg text-zinc-400 shadow-sm border border-zinc-100 transition-all active:scale-90"
                                                            title="Eliminar Partido"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modals */}
            {isFormOpen && (
                <ScoutingMatchForm
                    match={selectedMatch}
                    selectedDate={selectedDate}
                    userSport={userSport}
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
                />
            )}
        </div>
    );
};

export default CalendarModule;

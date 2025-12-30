import React, { useState } from 'react';
import { X, Target, Save, Download, FileText, MapPin, Clock, Calendar, User } from 'lucide-react';
import { ScoutingMatch } from '../types/scoutingMatch';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ScoutingMatchReportProps {
    match: ScoutingMatch;
    onClose: () => void;
    onSave: (notes: string) => Promise<void>;
}

const ScoutingMatchReport: React.FC<ScoutingMatchReportProps> = ({ match, onClose, onSave }) => {
    const [notes, setNotes] = useState(match.reportNotes || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(notes);
            alert('Notas guardadas correctamente');
        } catch (err) {
            console.error(err);
            alert('Error al guardar notas');
        } finally {
            setSaving(false);
        }
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        const logoUrl = '/logo-full.png';

        // Preload logo to avoid async issues in jspdf
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
            doc.text('INFORME DE PARTIDO', 200, 25, { align: 'right' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(113, 113, 122); // Zinc 500
            doc.text(`Generado el ${new Date().toLocaleDateString()}`, 200, 32, { align: 'right' });

            // Green Line
            doc.setDrawColor(15, 157, 88); // Proneo Green
            doc.setLineWidth(1.5);
            doc.line(15, 45, 200, 45);

            // Match Info Section
            doc.setTextColor(24, 24, 27);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(`${match.playerName}`, 15, 60);

            doc.setFontSize(10);
            doc.setTextColor(15, 157, 88);
            doc.text(`${match.team} vs ${match.rival}`, 15, 66);

            autoTable(doc, {
                startY: 75,
                head: [['Campo', 'Dato']],
                body: [
                    ['Fecha y Hora', `${match.date} ${match.time}`],
                    ['Tipo de Campo', match.locationType],
                    ['Estado', match.status],
                    ['Scout Responsable', match.assignedAgentName],
                    ['Especialidad', match.sport]
                ],
                theme: 'striped',
                headStyles: {
                    fillColor: [15, 157, 88],
                    fontSize: 10,
                    fontStyle: 'bold',
                    cellPadding: 4
                },
                bodyStyles: {
                    fontSize: 10,
                    cellPadding: 4
                },
                alternateRowStyles: {
                    fillColor: [249, 250, 251]
                }
            });

            // Notes Section
            const finalY = (doc as any).lastAutoTable.finalY + 20;

            doc.setFillColor(249, 250, 251);
            doc.rect(15, finalY - 5, 185, 10, 'F');

            doc.setTextColor(24, 24, 27);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('OBSERVACIONES Y ANÁLISIS TÉCNICO', 20, finalY + 2);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(63, 63, 70); // Zinc 700
            const splitNotes = doc.splitTextToSize(notes || 'No se han registrado observaciones técnicas para este partido.', 175);
            doc.text(splitNotes, 15, finalY + 15, { lineHeightFactor: 1.5 });

            // Footer
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(8);
            doc.setTextColor(161, 161, 170); // Zinc 400
            doc.text('PRONEOSPORTS MANAGER - SISTEMA DE GESTIÓN DE SCOUTING PROFESIONAL', 105, pageHeight - 10, { align: 'center' });

            doc.save(`Informe_${match.playerName}_${match.date}.pdf`);
        };
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-proneo-green flex items-center justify-center text-white shadow-lg shadow-proneo-green/20">
                            <FileText className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight italic">Informe de Partido</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{match.playerName}</span>
                                <div className="w-1 h-1 rounded-full bg-zinc-300" />
                                <span className="text-[10px] font-black text-proneo-green uppercase tracking-widest">{match.team} vs {match.rival}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-zinc-200 rounded-2xl transition-all">
                        <X className="w-6 h-6 text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 space-y-4">
                            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Detalles del Evento</h4>

                            <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-proneo-green" />
                                <div>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Fecha</p>
                                    <p className="text-sm font-black text-zinc-700">{match.date}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Clock className="w-4 h-4 text-proneo-green" />
                                <div>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Hora</p>
                                    <p className="text-sm font-black text-zinc-700">{match.time}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <MapPin className="w-4 h-4 text-proneo-green" />
                                <div>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Campo</p>
                                    <p className="text-sm font-black text-zinc-700">{match.locationType}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <User className="w-4 h-4 text-proneo-green" />
                                <div>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Scout Asignado</p>
                                    <p className="text-sm font-black text-zinc-700">{match.assignedAgentName}</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={downloadPDF}
                            className="w-full h-14 rounded-2xl bg-white border-2 border-zinc-100 text-zinc-900 font-black text-xs uppercase tracking-widest hover:border-proneo-green hover:text-proneo-green transition-all flex items-center justify-center gap-3 shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Descargar Informe PDF
                        </button>
                    </div>

                    {/* Notes Area */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                                <Target className="w-4 h-4 text-proneo-green" />
                                Observaciones Técnicas
                            </label>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Autoguardado cada 30s</span>
                        </div>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Escribe aquí el análisis del jugador, comportamiento, aspectos tácticos, físicos..."
                            className="w-full h-[400px] bg-zinc-50 border border-zinc-100 rounded-[32px] p-8 text-zinc-700 font-medium leading-relaxed focus:bg-white focus:ring-4 focus:ring-proneo-green/10 transition-all outline-none resize-none shadow-inner"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-8 h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-all"
                    >
                        Cerrar sin guardar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-10 h-14 rounded-2xl bg-zinc-900 text-white font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        <span>Guardar Cambios</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScoutingMatchReport;

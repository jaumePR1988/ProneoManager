import React from 'react';
import { X, FileText, Printer } from 'lucide-react';
import { Player } from '../types/player';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CommissionsReportModalProps {
    onClose: () => void;
    players: Player[];
}

const CommissionsReportModal: React.FC<CommissionsReportModalProps> = ({ onClose, players }) => {
    // Current Season Logic
    const CURRENT_SEASON = "2025/2026";

    // Helper to extract billing rows
    const getBillingRows = () => {
        return players.flatMap(player => {
            if (!player.contractYears || player.contractYears.length === 0) return [];

            // Filter only CURRENT SEASON for the report
            const currentYearContract = player.contractYears.find(y => y.year === CURRENT_SEASON);
            if (!currentYearContract) return [];

            // Construct surname from lastName1 and lastName2 if available
            const surname = [player.lastName1, player.lastName2].filter(Boolean).join(' ') || '';

            return [{
                ...currentYearContract,
                playerId: player.id,
                playerName: player.firstName || player.name,
                playerSurname: surname,
                playerClub: player.club,
                category: player.category || 'General', // Added Category
                agent: player.monitoringAgent || 'Proneo',
                payerType: player.proneo?.payerType || 'Club'
            }];
        });
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        const rows = getBillingRows();

        // 1. Process "COBRADAS" (Paid)
        const paidRows: (string | number)[][] = [];

        rows.forEach(r => {
            // Club Portion
            if (r.clubCommissionPct > 0 && r.clubPayment?.status === 'Pagado') {
                paidRows.push([
                    r.playerName,
                    r.playerSurname,
                    r.category, // Added Sport
                    r.playerClub,
                    r.clubPayment.paymentDate ? new Date(r.clubPayment.paymentDate).toLocaleDateString() : '-',
                    'CLUB',
                    ((r.salary * r.clubCommissionPct) / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }),
                    r.agent
                ]);
            }
            // Player Portion
            if (r.playerCommissionPct > 0 && r.playerPayment?.status === 'Pagado') {
                paidRows.push([
                    r.playerName,
                    r.playerSurname,
                    r.category, // Added Sport
                    r.playerClub,
                    r.playerPayment.paymentDate ? new Date(r.playerPayment.paymentDate).toLocaleDateString() : '-',
                    'JUGADOR',
                    ((r.salary * r.playerCommissionPct) / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }),
                    r.agent
                ]);
            }
        });

        // 2. Process "PENDIENTES" (Pending/Postponed)
        const pendingRows: (string | number)[][] = [];
        rows.forEach(r => {
            // Club Portion
            if (r.clubCommissionPct > 0 && r.clubPayment?.status !== 'Pagado' && r.clubPayment?.status !== 'Cancelado') {
                pendingRows.push([
                    r.playerName,
                    r.playerSurname,
                    r.category, // Added Sport
                    r.playerClub,
                    r.clubPayment?.dueDate ? new Date(r.clubPayment.dueDate).toLocaleDateString() : 'Sin fecha',
                    'CLUB',
                    ((r.salary * r.clubCommissionPct) / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }),
                    r.agent
                ]);
            }
            // Player Portion
            if (r.playerCommissionPct > 0 && r.playerPayment?.status !== 'Pagado' && r.playerPayment?.status !== 'Cancelado') {
                pendingRows.push([
                    r.playerName,
                    r.playerSurname,
                    r.category, // Added Sport
                    r.playerClub,
                    r.playerPayment?.dueDate ? new Date(r.playerPayment.dueDate).toLocaleDateString() : 'Sin fecha',
                    'JUGADOR',
                    ((r.salary * r.playerCommissionPct) / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }),
                    r.agent
                ]);
            }
        });

        // Common Table Styles
        // Added 'Deporte' to header
        const tableHead = [['Nombre', 'Apellidos', 'Deporte', 'Club', 'Fecha', 'Pagador', 'Importe', 'Agente']];
        const headStyles = { fillColor: [16, 185, 129] as [number, number, number], textColor: 255, fontStyle: 'bold' as 'bold' };

        // TITLE PAGE
        doc.setFontSize(22);
        doc.setTextColor(16, 185, 129);
        doc.text("INFORME ECONÓMICO PRONEO SPORTS", 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Temporada: ${CURRENT_SEASON}`, 105, 30, { align: 'center' });

        // TABLE 1: PAID
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text("1. COMISIONES COBRADAS", 14, 45);

        autoTable(doc, {
            startY: 50,
            head: tableHead,
            body: paidRows,
            theme: 'grid',
            headStyles: headStyles,
            styles: { fontSize: 8 },
        });

        // TABLE 2: PENDING
        // @ts-ignore
        const finalY = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(16);
        doc.text("2. COMISIONES PENDIENTES", 14, finalY);

        autoTable(doc, {
            startY: finalY + 5,
            head: tableHead,
            body: pendingRows,
            theme: 'grid',
            headStyles: { ...headStyles, fillColor: [245, 158, 11] as [number, number, number] }, // Amber for known pending
            styles: { fontSize: 8 },
        });

        // Footer Stats
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, pageHeight - 10);

        // Total Calculation (Index changed from 5 to 6 because of added column)
        const totalPaid = paidRows.reduce((acc, row) => {
            const val = row[6] as string;
            const num = parseFloat(val.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]+/g, ""));
            return acc + (isNaN(num) ? 0 : num);
        }, 0);

        const totalPending = pendingRows.reduce((acc, row) => {
            const val = row[6] as string;
            const num = parseFloat(val.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]+/g, ""));
            return acc + (isNaN(num) ? 0 : num);
        }, 0);

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Total Cobrado: ${totalPaid.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`, 140, pageHeight - 30);
        doc.text(`Total Pendiente: ${totalPending.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`, 140, pageHeight - 20);


        doc.save(`Informe_Comisiones_${CURRENT_SEASON.replace('/', '-')}.pdf`);
    };

    return (
        <div className="fixed inset-0 bg-zinc-900/90 backdrop-blur-md z-[100] flex items-center justify-center">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center relative shadow-2xl animate-scale-in">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center hover:bg-zinc-200 transition-colors"
                >
                    <X className="w-5 h-5 text-zinc-500" />
                </button>

                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                    <FileText className="w-10 h-10" />
                </div>

                <h2 className="text-2xl font-black text-zinc-900 uppercase italic mb-2">Listado de Comisiones</h2>
                <p className="text-zinc-400 font-bold mb-8">
                    Temporada {CURRENT_SEASON}
                </p>

                <div className="space-y-4">
                    <button
                        onClick={generatePDF}
                        className="w-full h-14 bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-600 active:scale-95 transition-all shadow-xl hover:shadow-emerald-500/20"
                    >
                        <Printer className="w-5 h-5" />
                        Descargar Listado (PDF)
                    </button>

                    <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                        Genera un PDF oficial con dos tablas:<br />
                        1. Comisiones Cobradas<br />
                        2. Comisiones Pendientes<br />
                        Incluye columna de Deporte.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CommissionsReportModal;

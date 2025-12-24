import React, { useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download } from 'lucide-react';
import { Player, Category, Position, PreferredFoot, PayerType } from '../types/player';

interface ExcelImportProps {
    onImport: (players: Partial<Player>[]) => Promise<void>;
    category?: Category;
    schema: any[]; // Add schema prop
}

const ExcelImport: React.FC<ExcelImportProps> = ({ onImport, category = 'Fútbol', schema }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownloadTemplate = () => {
        // Define standard columns
        const standardColumns = [
            { id: 'firstName', label: 'Nombre' },
            { id: 'lastName1', label: 'Apellido 1' },
            { id: 'lastName2', label: 'Apellido 2' },
            { id: 'name', label: 'Nombre Deportivo' },
            { id: 'birthDate', label: 'Fecha Nacimiento (YYYY-MM-DD)' },
            { id: 'nationality', label: 'Nacionalidad' },
            { id: 'club', label: 'Club' },
            { id: 'league', label: 'Liga' },
            { id: 'position', label: 'Posición' },
            { id: 'category', label: 'Categoría (Fútbol/F. Sala/Femenino/Entrenadores)' },
            { id: 'preferredFoot', label: 'Pierna Hábil' },
            { id: 'endDate', label: 'Fin Contrato' },
            { id: 'sportsBrand', label: 'Marca Deportiva' },
            { id: 'monitoringAgent', label: 'Agente Seguimiento' }
        ];

        // Add custom columns from schema
        const customColumns = schema.map(f => ({
            id: `custom_${f.id}`,
            label: f.label
        }));

        const allTemplateCols = [...standardColumns, ...customColumns];

        // Create CSV Header row
        const headerRow = allTemplateCols.map(c => c.label).join(';');

        const csvContent = "\uFEFF" + [headerRow].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'plantilla_importacion_proneo.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            const importedPlayers: Partial<Player>[] = data.map((row: any) => {
                // Header mapping based on specification
                const p: Partial<Player> = {
                    firstName: String(row['NOMBRE'] || '').trim(),
                    lastName1: String(row['PRIMER APELLIDO'] || '').trim(),
                    lastName2: String(row['SEGUNDO APELLIDO'] || '').trim(),
                    league: String(row['LIGA'] || 'España').trim(),
                    club: String(row['EQUIPO'] || '').trim(),
                    nationality: String(row['NACIONALIDAD'] || 'España').trim(),
                    position: (row['POSICIÓN'] || 'Ala') as Position,
                    preferredFoot: (row['PIERNA HÁBIL'] || 'Derecha') as PreferredFoot,
                    category: category,
                    birthDate: row['FECHA NAC.'] instanceof Date ? row['FECHA NAC.'].toISOString().split('T')[0] : String(row['FECHA NAC.'] || ''),
                    sportsBrand: String(row['MARCA'] || 'Joma').trim(),
                    sportsBrandEndDate: row['FIN MARCA'] instanceof Date ? row['FIN MARCA'].toISOString().split('T')[0] : String(row['FIN MARCA'] || ''),
                    monitoringAgent: String(row['SEGUIMIENTO'] || 'Jaume').trim(),
                    contract: {
                        endDate: row['FECHA FIN CONTRATO'] instanceof Date ? row['FECHA FIN CONTRATO'].toISOString().split('T')[0] : String(row['FECHA FIN CONTRATO'] || ''),
                        clause: String(row['CLAUSULA'] || '0').trim(),
                        optional: String(row['OPCIONAL'] || 'No').trim(),
                        optionalNoticeDate: row['FECHA AVISO'] instanceof Date ? row['FECHA AVISO'].toISOString().split('T')[0] : String(row['FECHA AVISO'] || ''),
                        conditions: String(row['CONDICIONES'] || '').trim(),
                    },
                    proneo: {
                        contractDate: row['FECHA CONTRATO'] instanceof Date ? row['FECHA CONTRATO'].toISOString().split('T')[0] : String(row['FECHA CONTRATO'] || ''),
                        agencyEndDate: row['FECHA FIN'] instanceof Date ? row['FECHA FIN'].toISOString().split('T')[0] : String(row['FECHA FIN'] || ''),
                        commissionPct: 10,
                        payerType: 'Club' as PayerType
                    },
                    isScouting: false,
                    seasons: [],
                    documents: []
                };

                // Add display name
                p.name = `${p.firstName} ${p.lastName1}`.trim();

                // Add age if birthDate exists
                if (p.birthDate) {
                    const birthYear = new Date(p.birthDate).getFullYear();
                    p.age = new Date().getFullYear() - birthYear;
                }

                return p;
            });

            if (importedPlayers.length > 0) {
                await onImport(importedPlayers);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleDownloadTemplate}
                className="h-11 px-4 rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 transition-all flex items-center gap-2 group"
                title="Descargar Plantilla CSV"
            >
                <Download className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                <span className="hidden xl:inline text-[10px] font-bold uppercase">Plantilla</span>
            </button>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="h-11 px-6 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 transition-all flex items-center gap-2 group shadow-sm hover:shadow"
            >
                <Upload className="w-4 h-4 text-zinc-400 group-hover:text-[#b4c885] transition-colors" />
                <span className="text-[10px] font-black uppercase">Importar Excel</span>
            </button>
        </div>
    );
};

export default ExcelImport;

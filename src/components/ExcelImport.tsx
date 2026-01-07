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
    const [isImporting, setIsImporting] = React.useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownloadTemplate = () => {
        // Define standard columns - MUST MATCH PARSER KEYS EXACTLY
        const standardColumns = [
            { id: 'firstName', label: 'NOMBRE' },
            { id: 'lastName1', label: 'PRIMER APELLIDO' },
            { id: 'lastName2', label: 'SEGUNDO APELLIDO' },
            { id: 'name', label: 'NOMBRE DEPORTIVO' },
            { id: 'birthDate', label: 'FECHA NAC.' },
            { id: 'nationality', label: 'NACIONALIDAD' },
            { id: 'club', label: 'EQUIPO' },
            { id: 'league', label: 'LIGA' },
            { id: 'position', label: 'POSICIÓN' },
            { id: 'category', label: 'CATEGORÍA' },
            { id: 'preferredFoot', label: 'PIERNA HÁBIL' },
            { id: 'sportsBrand', label: 'MARCA' },
            { id: 'sportsBrandEndDate', label: 'FIN MARCA' },
            { id: 'monitoringAgent', label: 'SEGUIMIENTO' },
            { id: 'contractEndDate', label: 'FECHA FIN CONTRATO' },
            { id: 'clause', label: 'CLAUSULA' },
            { id: 'optional', label: 'OPCIONAL' },
            { id: 'optionalNoticeDate', label: 'FECHA AVISO' },
            { id: 'conditions', label: 'CONDICIONES' },
            { id: 'contractDate', label: 'FECHA CONTRATO' },
            { id: 'agencyEndDate', label: 'FECHA FIN' }
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

        setIsImporting(true);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (!data || data.length === 0) {
                    alert("El archivo parece estar vacío o no tiene datos reconocibles.");
                    return;
                }

                const importedPlayers: Partial<Player>[] = data.map((row: any) => {
                    // Determine Category: From Prop OR From File (File takes precedence if valid)
                    let rowCategory: Category = category;
                    const fileCat = String(row['CATEGORÍA'] || '').trim();
                    if (fileCat && ['Fútbol', 'F. Sala', 'Femenino', 'Entrenadores'].includes(fileCat)) {
                        rowCategory = fileCat as Category;
                    }

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
                        category: rowCategory,
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
                    const nickname = String(row['NOMBRE DEPORTIVO'] || '').trim();
                    p.name = nickname || `${p.firstName} ${p.lastName1}`.trim();

                    // Add age if birthDate exists
                    if (p.birthDate) {
                        const birthYear = new Date(p.birthDate).getFullYear();
                        p.age = new Date().getFullYear() - birthYear;
                    }

                    return p;
                });

                if (importedPlayers.length > 0) {
                    await onImport(importedPlayers);
                    alert(`Se han importado ${importedPlayers.length} registros correctamente.`);
                } else {
                    alert("No se encontraron registros válidos para importar. Revisa las cabeceras.");
                }

            } catch (error) {
                console.error("Error importing Excel:", error);
                alert("Ocurrió un error al procesar el archivo. Asegúrate de que es un Excel válido.");
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleDownloadTemplate}
                disabled={isImporting}
                className="h-11 px-4 rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 transition-all flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={isImporting}
                className="h-11 px-6 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 transition-all flex items-center gap-2 group shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isImporting ? (
                    <div className="w-4 h-4 border-2 border-zinc-300 border-t-[#b4c885] rounded-full animate-spin" />
                ) : (
                    <Upload className="w-4 h-4 text-zinc-400 group-hover:text-[#b4c885] transition-colors" />
                )}
                <span className="text-[10px] font-black uppercase">
                    {isImporting ? 'Importando...' : 'Importar Excel'}
                </span>
            </button>
        </div>
    );
};

export default ExcelImport;

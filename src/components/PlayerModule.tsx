import React, { useState, useMemo, useEffect } from 'react';
import {
    Search,
    ArrowUpDown,
    Download,
    Filter,
    Table as TableIcon,
    LayoutGrid,
    Users,
    Check,
    GripVertical,
    FileText,
    FileSpreadsheet,
    RefreshCw,
    Trash2
} from 'lucide-react';
import { TableVirtuoso } from 'react-virtuoso';
import { usePlayers } from '../hooks/usePlayers';
import { Category, Player } from '../types/player';
import ExcelImport from './ExcelImport';
import PlayerForm from './PlayerForm';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ContactsView from './ContactsView';

const fieldToString = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'boolean') return val ? 'SÍ' : 'NO';
    if (val instanceof Date) return val.toLocaleDateString();
    return String(val);
};

// Helper to find the relevant contract year based on today's date
const getValuesForCurrentSeason = (years: any[] | undefined) => {
    if (!years || years.length === 0) return null;

    // Default to the first entry if efficient matching fails
    let selected = years[0];

    try {
        const now = new Date();
        const currentYear = now.getFullYear(); // e.g. 2025
        const currentMonth = now.getMonth() + 1; // 1-12

        // Logic: 
        // If we are in second half of year (July+), season is "2025/26"
        // If we are in first half (Jan-June), season is "2024/25"
        // We look for the starting year. 
        // If currentMonth >= 7, we look for year == currentYear. 
        // If currentMonth < 7, we look for year == currentYear - 1.

        const targetStartYear = currentMonth >= 7 ? currentYear : currentYear - 1;

        // Try to find a match in the text string
        const match = years.find(y => {
            if (!y.year) return false;
            // Normalize separators: 2024/25 -> 2024-25 -> 2024 25
            const clean = y.year.replace(/[\/\-\s]/g, '');
            // Check if it starts with our target year (e.g. "2024...")
            return clean.includes(String(targetStartYear));
        });

        if (match) selected = match;

    } catch (e) {
        // Fallback silently to first
    }

    return selected;
};

interface ColumnConfig {
    id: string;
    label: string;
    render?: (player: Player) => React.ReactNode;
    className?: string; // For the cell (td)
    headerClassName?: string; // For the header (th) - mainly for alignment
    sortable?: boolean;
}

interface PlayerModuleProps {
    userRole: string;
    userSport?: string;
    userName?: string;
    activeView: 'players' | 'contacts';
}

const PlayerModule: React.FC<PlayerModuleProps> = ({ userRole, userSport = 'General', userName, activeView }) => {
    // Determine effective role
    const role = (userRole || 'guest').toLowerCase();
    const isAdmin = role === 'admin' || role === 'director';
    const isExternalScout = role === 'external_scout';
    const isCommunication = role === 'comunicacion';

    const { players: allPlayers, loading, deletePlayer } = usePlayers();

    // Init state
    const [selectedCategory, setSelectedCategory] = useState<string>(
        userSport !== 'General' ? userSport : 'Global'
    );

    // Filtering logic
    const players = useMemo(() => {
        let filtered = allPlayers;

        // 1. Filter by Sport (Specialty)
        if (userSport !== 'General') {
            filtered = filtered.filter(p => p.category === userSport);
        }

        // 2. Filter by External Scout (Assigned only)
        if (isExternalScout && userName) {
            filtered = filtered.filter(p =>
                p.monitoringAgent?.toLowerCase() === userName.toLowerCase()
            );
        }

        return filtered;
    }, [allPlayers, userSport, isExternalScout, userName]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<string>('lastName1');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [showColumnSelector, setShowColumnSelector] = useState(false);

    const { schema, systemLists, addPlayer, updatePlayer, refresh } = usePlayers(false);
    const [isReducedView, setIsReducedView] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());



    // Define all available columns with their specific rendering logic
    const allColumns: ColumnConfig[] = useMemo(() => [
        { id: 'selection', label: 'Sel.' },
        { id: 'firstName', label: 'Nombre', className: "group-hover:text-[#b4c885] italic transition-colors font-black uppercase text-left pl-4" },
        { id: 'lastName1', label: '1er Apellido', className: "font-bold" },
        { id: 'lastName2', label: '2do Apellido', className: "text-zinc-400" },
        {
            id: 'category',
            label: 'Dep.',
            className: "bg-[#b4c885]/5 font-black text-[#b4c885]",
            render: (p: Player) => {
                if (p.category === 'Fútbol') return 'F';
                if (p.category === 'Femenino') return 'FF';
                if (p.category === 'Entrenadores') return 'E';
                if (p.category === 'F. Sala') return 'FS';
                return '-';
            }
        },
        { id: 'league', label: 'Liga' },
        { id: 'division', label: 'División' },
        { id: 'club', label: 'Equipo', className: "font-black text-zinc-900" },
        { id: 'endDate', label: 'Fin Contrato', className: "text-red-500", render: (p: Player) => p.contract?.endDate || '' },
        { id: 'optional', label: 'Opcional', sortable: false, render: (p: Player) => p.contract?.optional || '' },
        { id: 'optionalNoticeDate', label: 'Fecha Aviso', sortable: false, render: (p: Player) => p.contract?.optionalNoticeDate || '' },
        { id: 'conditions', label: 'Condiciones', sortable: false, className: "max-w-[150px] truncate", render: (p: Player) => p.contract?.conditions || '' },
        { id: 'nationality', label: 'Nacionalidad' },
        { id: 'nationality2', label: 'Nacionalidad 2' },
        { id: 'position', label: 'Posición', className: "bg-zinc-50" },
        { id: 'preferredFoot', label: 'Pierna Hábil' },
        { id: 'birthDate', label: 'Fecha Nac.' },
        {
            id: 'proneoStatus',
            label: 'Sit. Agencia',
            render: (p: Player) => {
                const now = new Date();
                const endDate = p.proneo?.agencyEndDate ? new Date(p.proneo.agencyEndDate) : null;
                const isExpired = !endDate || endDate <= now;
                return (
                    <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${isExpired
                        ? 'bg-red-100 text-red-600 border border-red-200'
                        : 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                        }`}>
                        {isExpired ? 'CADUCADO' : 'ACTIVO'}
                    </span>
                );
            }
        },
        { id: 'sportsBrand', label: 'Marca' },
        { id: 'sportsBrandEndDate', label: 'F. Fin Marca' },
        { id: 'sportsBrand2', label: 'Marca 2' },
        { id: 'sportsBrandEndDate2', label: 'F. Fin Marca 2' },
        { id: 'monitoringAgent', label: 'Seguimiento', className: "font-black text-[#b4c885]" },
        { id: 'monitoringAgent2', label: 'Seguimiento 2', className: "font-bold text-zinc-400" },
        {
            id: 'loanData.ownerClub',
            label: 'Club Prop.',
            className: "font-bold text-indigo-600 bg-indigo-50",
            render: (p: Player) => p.loanData?.ownerClub || '-'
        },
        {
            id: 'loanData.isLoaned',
            label: 'Cedido',
            className: "text-center",
            render: (p: Player) => (
                <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${p.loanData?.isLoaned
                    ? 'bg-indigo-100 text-indigo-600 border border-indigo-200'
                    : 'text-zinc-300'
                    }`}>
                    {p.loanData?.isLoaned ? 'SÍ' : '-'}
                </span>
            )
        },
        {
            id: 'salary',
            label: 'Salario',
            className: "text-right font-mono",
            render: (p: Player) => {
                const y = getValuesForCurrentSeason(p.contractYears);
                return y ? Number(y.salary).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-';
            }
        },
        {
            id: 'clubCommissionPct',
            label: '% Club',
            className: "text-center",
            render: (p: Player) => {
                const y = getValuesForCurrentSeason(p.contractYears);
                return y ? `${y.clubCommissionPct}%` : '-';
            }
        },
        {
            id: 'playerCommissionPct',
            label: '% Jug.',
            className: "text-center",
            render: (p: Player) => {
                const y = getValuesForCurrentSeason(p.contractYears);
                return y ? `${y.playerCommissionPct}%` : '-';
            }
        },
        ...schema
            .filter(f => selectedCategory === 'All' || f.category === 'General' || f.category === selectedCategory)
            .map(f => ({
                id: `custom_${f.id}`,
                label: f.label,
                render: (p: Player) => {
                    const val = (p.customFields as any)?.[f.id];
                    return fieldToString(val);
                }
            }))
    ].filter(col => {
        if (isCommunication) {
            return !['salary', 'clubCommissionPct', 'playerCommissionPct'].includes(col.id);
        }
        return true;
    }), [schema, selectedCategory, isCommunication]);

    // Initial load sync - only once to seed
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

    // Unified effect to manage visible columns
    useEffect(() => {
        setVisibleColumns(prev => {
            // 1. If empty, just use all currently available columns
            if (prev.length === 0) {
                return allColumns.map(c => c.id);
            }

            // 2. Identify new columns
            const currentSet = new Set(prev);
            const newCols = allColumns
                .filter(c => !currentSet.has(c.id))
                .map(c => c.id);

            // 3. Logic: If 'selection' is new, verify it is placed at the start
            // Or if we have new columns, append them, but keep 'selection' at 0 if it exists

            let next = [...prev];

            // If we discovered 'selection' is new (or missing from prev but in allColumns), we want it at the start
            if (newCols.includes('selection')) {
                next = ['selection', ...prev.filter(c => c !== 'selection')];
                // Remove selection from newCols so we don't double add
                const otherNew = newCols.filter(c => c !== 'selection');
                next = [...next, ...otherNew];
            } else if (newCols.length > 0) {
                next = [...prev, ...newCols];
            }

            // Safety fallback: Ensure selection is present if it exists in definitions but somehow lost
            if (!next.includes('selection') && allColumns.some(c => c.id === 'selection') && prev.length === 0) {
                next = ['selection', ...next];
            }

            return next;
        });
    }, [allColumns]);

    const toggleColumn = (id: string) => {
        setVisibleColumns(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const [draggedItem, setDraggedItem] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedItem(index);
        // dataTransfer setup is required for Firefox
        e.dataTransfer.effectAllowed = 'move';
        // HTML5 Drag needs some data to work properly
        e.dataTransfer.setData('text/html', String(index));

        // Visual trick to make the drag image look better (optional)
        const target = e.target as HTMLElement;
        target.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedItem(null);
        (e.target as HTMLElement).style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault(); // Necessary to allow dropping
        // Initial simple implementation: only visual feedback or immediate reorder?
        // Let's do nothing here to just allow drop, or we could do live swapping.
        // For simplicity and robustness, we'll swap on Drop.
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = draggedItem;
        if (dragIndex === null || dragIndex === dropIndex) return;

        setVisibleColumns(prev => {
            const newCols = [...prev];
            const [movedItem] = newCols.splice(dragIndex, 1);
            newCols.splice(dropIndex, 0, movedItem);
            return newCols;
        });
    };

    const filteredAndSortedPlayers = useMemo(() => {
        let result = players.filter(p => {
            // 1. Sport/Category Filter (Strict enforcement if userSport is active)
            if (userSport !== 'General') {
                return p.category === userSport;
            } else {
                return selectedCategory === 'Global' || selectedCategory === 'All' || p.category === selectedCategory;
            }
        }).filter(p => {
            // 2. Search Filter
            const searchStr = `${p.firstName} ${p.lastName1} ${p.lastName2} ${p.club} ${p.name}`.toLowerCase();
            return searchStr.includes(searchTerm.toLowerCase());
        });

        result.sort((a: any, b: any) => {
            let valA = a[sortField] || '';
            let valB = b[sortField] || '';

            // Handle nested/special sorts using the same logic as render if possible, or simplified
            // For simplicity, we stick to the previous specialized sorting map
            if (sortField === 'endDate') valA = a.contract?.endDate || '';
            if (sortField === 'endDate') valB = b.contract?.endDate || '';
            if (sortField === 'proneoStatus') {
                const now = new Date();
                const dateA = a.proneo?.agencyEndDate ? new Date(a.proneo.agencyEndDate) : new Date(0);
                const dateB = b.proneo?.agencyEndDate ? new Date(b.proneo.agencyEndDate) : new Date(0);
                valA = dateA > now ? 'ACTIVO' : 'CADUCADO';
                valB = dateB > now ? 'ACTIVO' : 'CADUCADO';
            }
            if (['salary', 'clubCommissionPct', 'playerCommissionPct'].includes(sortField)) {
                const ya = (a.contractYears || [])[0];
                const yb = (b.contractYears || [])[0];
                if (sortField === 'salary') { valA = ya?.salary || 0; valB = yb?.salary || 0; }
                if (sortField === 'clubCommissionPct') { valA = ya?.clubCommissionPct || 0; valB = yb?.clubCommissionPct || 0; }
                if (sortField === 'playerCommissionPct') { valA = ya?.playerCommissionPct || 0; valB = yb?.playerCommissionPct || 0; }
            }
            if (sortField.startsWith('custom_')) {
                const fieldId = sortField.replace('custom_', '');
                valA = (a.customFields as any)?.[fieldId] || '';
                valB = (b.customFields as any)?.[fieldId] || '';
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [players, selectedCategory, searchTerm, sortField, sortDirection, userSport]);

    const toggleSelectAll = () => {
        const allIds = filteredAndSortedPlayers.map(p => p.id);
        const allSelected = allIds.every(id => selectedIds.has(id));

        if (allSelected) {
            const newSet = new Set(selectedIds);
            allIds.forEach(id => newSet.delete(id));
            setSelectedIds(newSet);
        } else {
            const newSet = new Set(selectedIds);
            allIds.forEach(id => newSet.add(id));
            setSelectedIds(newSet);
        }
    };

    const toggleSelectOne = (id: string, e: React.SyntheticEvent) => {
        e.stopPropagation();
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        if (window.confirm(`¿Estás seguro de eliminar ${selectedIds.size} perfiles seleccionados? Esta acción no se puede deshacer.`)) {
            for (const id of selectedIds) {
                await deletePlayer(id);
            }
            setSelectedIds(new Set());
            if (refresh) refresh();
        }
    };


    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleExportExcel = () => {
        // Map visible columns via config, respecting Reduced View
        const columnsToExport = visibleColumns.filter(id => {
            if (!isReducedView) return true;
            return systemLists.reducedColumns?.includes(id);
        });

        const headers = columnsToExport.map(id => {
            const col = allColumns.find(c => c.id === id);
            return col ? col.label : id;
        });

        const exportData = filteredAndSortedPlayers.map(p => {
            const row: any = {};
            columnsToExport.forEach(id => {
                const col = allColumns.find(c => c.id === id);
                if (!col) return;

                // Get raw value or string representation
                // Re-use logic for complex fields
                let val: any = (p as any)[id];
                if (col.render) {
                    // Can't export ReactNode, so we need simplified logic for export
                    // Reuse render logic but return string? 
                    // Or duplication. Duplication is safer for now for complex React Nodes (like badges)
                    if (id === 'proneoStatus') {
                        const now = new Date();
                        const endDate = p.proneo?.agencyEndDate ? new Date(p.proneo.agencyEndDate) : null;
                        val = (endDate && endDate > now) ? 'ACTIVO' : 'CADUCADO';
                    } else if (id.startsWith('custom_')) {
                        val = fieldToString((p.customFields as any)?.[id.replace('custom_', '')]);
                    } else if (['salary', 'clubCommissionPct', 'playerCommissionPct'].includes(id)) {
                        const y = getValuesForCurrentSeason(p.contractYears);
                        val = y ? (id === 'salary' ? y.salary : id === 'clubCommissionPct' ? y.clubCommissionPct : y.playerCommissionPct) : '';
                    } else if (id === 'endDate') val = p.contract?.endDate || '';
                    else if (id === 'optional') val = p.contract?.optional || '';
                    else if (id === 'optionalNoticeDate') val = p.contract?.optionalNoticeDate || '';
                    else if (id === 'conditions') val = p.contract?.conditions || '';
                    else if (id === 'loanData.ownerClub') val = p.loanData?.ownerClub || '';
                    else if (id === 'loanData.isLoaned') val = p.loanData?.isLoaned ? 'SÍ' : 'NO';
                    else if (id === 'conditions') val = p.contract?.conditions || '';
                    // Default fallback
                }
                row[col.label] = val;
            });
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Jugadores");
        XLSX.writeFile(wb, `Proneo_Players_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleExportPDF = async () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        try {
            const logoUrl = '/logo-full.png';
            const img = new Image();
            img.src = logoUrl;
            await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
            doc.addImage(img, 'PNG', 14, 10, 40, 0);
        } catch (e) { console.error("Logo error", e); }

        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text("LISTADO DE JUGADORES", 280, 20, { align: 'right' });

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 280, 26, { align: 'right' });
        doc.text(`Registros: ${filteredAndSortedPlayers.length}`, 280, 31, { align: 'right' });

        // Map visible columns respecting Reduced View
        const columnsToExport = visibleColumns.filter(id => {
            if (!isReducedView) return true;
            return systemLists.reducedColumns?.includes(id);
        });

        const tableColumn = columnsToExport.map(id => {
            const col = allColumns.find(c => c.id === id);
            return col ? col.label.toUpperCase() : id;
        });

        const tableRows = filteredAndSortedPlayers.map(p => {
            return columnsToExport.map(id => {
                let val = (p as any)[id];
                // Quick manual mapping for PDF text values
                if (id === 'endDate') val = p.contract?.endDate;
                if (id === 'optional') val = p.contract?.optional;
                if (id === 'optionalNoticeDate') val = p.contract?.optionalNoticeDate;
                if (id === 'conditions') val = p.contract?.conditions;
                if (id === 'loanData.ownerClub') val = p.loanData?.ownerClub || '-';
                if (id === 'loanData.isLoaned') val = p.loanData?.isLoaned ? 'SÍ' : '-';
                if (id === 'proneoStatus') {
                    const now = new Date();
                    const endDate = p.proneo?.agencyEndDate ? new Date(p.proneo.agencyEndDate) : null;
                    val = (endDate && endDate > now) ? 'ACTIVO' : 'CADUCADO';
                }
                if (['salary', 'clubCommissionPct', 'playerCommissionPct'].includes(id)) {
                    const y = getValuesForCurrentSeason(p.contractYears);
                    if (y) {
                        if (id === 'salary') val = Number(y.salary).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
                        if (id === 'clubCommissionPct') val = `${y.clubCommissionPct}%`;
                        if (id === 'playerCommissionPct') val = `${y.playerCommissionPct}%`;
                    } else val = '-';
                }
                if (id.startsWith('custom_')) {
                    val = fieldToString((p.customFields as any)?.[id.replace('custom_', '')]);
                }
                return val || '-';
            });
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', halign: 'center', valign: 'middle', fontStyle: 'bold' },
            headStyles: { fillColor: [180, 200, 133], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
            alternateRowStyles: { fillColor: [249, 250, 246] }
        });
        doc.save(`Proneo_Players_${new Date().toISOString().split('T')[0]}.pdf`);
    };



    const [showExportMenu, setShowExportMenu] = useState(false);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-12 h-12 border-4 border-[#b4c885]/20 border-t-[#b4c885] rounded-full animate-spin"></div>
            </div>
        );
    }

    const TableHeader = ({ config, index }: { config: ColumnConfig, index: number }) => {
        if (isReducedView && systemLists.reducedColumns && !systemLists.reducedColumns.includes(config.id)) return null;

        return (
            <th
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`px-2 py-3 text-[9px] font-black text-zinc-900 uppercase tracking-tighter border border-zinc-200 bg-[#e1e9cc] whitespace-nowrap ${config.sortable !== false ? 'cursor-pointer hover:bg-[#d5dfb8] transition-colors' : ''} ${config.headerClassName || ''} ${draggedItem === index ? 'opacity-50 border-dashed border-zinc-500' : ''}`}
                onClick={() => config.sortable !== false && handleSort(config.id)}
            >
                <div className="flex items-center justify-center gap-1 cursor-grab active:cursor-grabbing">
                    {config.label}
                    {config.sortable !== false && <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />}
                </div>
            </th>
        );
    };

    const TableCell = ({ children, className = "", title = "" }: { children: React.ReactNode, className?: string, title?: string }) => (
        <td
            title={title}
            className={`px-2 py-2 text-[10px] font-bold text-zinc-700 border border-zinc-200 text-center whitespace-nowrap ${className}`}
        >
            {children}
        </td>
    );

    return (
        <div className="space-y-6">
            {editingPlayer && (
                <PlayerForm
                    initialData={editingPlayer}
                    onClose={() => setEditingPlayer(null)}
                    onSave={async (data) => {
                        await updatePlayer(editingPlayer.id, data);
                        setEditingPlayer({ ...editingPlayer, ...data } as Player);
                    }}
                    onDelete={async (id) => {
                        await deletePlayer(id);
                        if (refresh) refresh();
                    }}
                />
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm relative">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0 text-left">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="px-4 h-10 rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest mr-2 transition-all animate-in fade-in zoom-in-50"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>Eliminar ({selectedIds.size})</span>
                        </button>
                    )}
                    {userSport === 'General' && (
                        <nav className="flex space-x-1 p-1 bg-zinc-100/50 rounded-xl w-fit">
                            {(['Global', 'Fútbol', 'F. Sala', 'Femenino', 'Entrenadores'] as const).map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat as any)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat
                                        ? 'bg-white text-proneo-green shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-600'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </nav>
                    )}
                </div>

                <div className="flex items-center gap-3 flex-1 justify-end">
                    <div className="relative group min-w-[300px] max-w-md flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[#b4c885] transition-colors" />
                        <input
                            type="text"
                            placeholder={activeView === 'players' ? "Buscar por nombre, club o posición..." : "Buscar contactos..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-11 bg-zinc-50 border border-zinc-100 rounded-2xl pl-11 pr-6 text-xs font-bold focus:bg-white focus:ring-4 focus:ring-[#b4c885]/5 outline-none transition-all placeholder:text-zinc-400"
                        />
                    </div>

                    <div className="relative group/columns">
                        <button
                            onClick={() => setShowColumnSelector(!showColumnSelector)}
                            className="h-11 px-4 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition-all flex items-center gap-2"
                        >
                            <Filter className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase">Columnas</span>
                        </button>

                        {showColumnSelector && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowColumnSelector(false)} />
                                <div className="absolute right-0 mt-2 w-72 bg-white border border-zinc-100 rounded-2xl shadow-2xl z-50 p-4 max-h-96 overflow-y-auto">
                                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 px-2 text-left">Ordenar y Visualizar</h3>
                                    <div className="space-y-1 text-left">
                                        {visibleColumns.map((colId, index) => {
                                            const col = allColumns.find(c => c.id === colId);
                                            if (!col) return null;
                                            return (
                                                <div
                                                    key={colId}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, index)}
                                                    onDragEnd={handleDragEnd}
                                                    onDragOver={(e) => handleDragOver(e, index)}
                                                    onDrop={(e) => handleDrop(e, index)}
                                                    className={`flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 group cursor-grab active:cursor-grabbing transition-colors ${draggedItem === index ? 'bg-zinc-100 opacity-50 border border-dashed border-zinc-300' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-zinc-300 hover:text-zinc-500 cursor-grab">
                                                            <GripVertical className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-zinc-600 uppercase select-none">{col.label}</span>
                                                    </div>
                                                    <button onClick={() => toggleColumn(colId)} className="text-[#b4c885] hover:bg-[#b4c885]/10 p-1 rounded-full transition-colors">
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {allColumns.filter(c => !visibleColumns.includes(c.id)).length > 0 && (
                                            <>
                                                <div className="h-px bg-zinc-100 my-2" />
                                                <p className="text-[9px] font-bold text-zinc-300 uppercase px-2 mb-1">Columnas Ocultas</p>
                                                {allColumns.filter(c => !visibleColumns.includes(c.id)).map(col => (
                                                    <button
                                                        key={col.id}
                                                        onClick={() => toggleColumn(col.id)}
                                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 transition-colors opacity-50 hover:opacity-100"
                                                    >
                                                        <span className="text-[11px] font-bold text-zinc-600 uppercase">{col.label}</span>
                                                    </button>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {isAdmin && (
                        <>
                            <ExcelImport
                                onImport={async (importedPlayers) => {
                                    for (const p of importedPlayers) {
                                        await addPlayer(p);
                                    }
                                }}
                                category={selectedCategory === 'Global' || selectedCategory === 'All' ? 'Fútbol' : selectedCategory as Category}
                                schema={schema}
                            />
                            <div className="relative">
                                <button
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    className="h-11 px-6 rounded-xl bg-[#b4c885] text-white hover:shadow-lg hover:shadow-[#b4c885]/20 hover:scale-105 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Exportar</span>
                                </button>

                                {showExportMenu && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                                        <div className="absolute right-0 mt-2 w-48 bg-white border border-zinc-100 rounded-2xl shadow-2xl z-50 p-2 animate-in zoom-in-95 duration-200">
                                            <button
                                                onClick={() => { handleExportExcel(); setShowExportMenu(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-50 transition-colors group text-left"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                                    <FileSpreadsheet className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-zinc-700 uppercase">Excel</p>
                                                    <p className="text-[9px] font-medium text-zinc-400">Formato .xlsx</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => { handleExportPDF(); setShowExportMenu(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-50 transition-colors group text-left"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-zinc-700 uppercase">PDF</p>
                                                    <p className="text-[9px] font-medium text-zinc-400">Documento profesional</p>
                                                </div>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {activeView === 'players' ? (
                <div className="flex-1 bg-white rounded-[40px] border border-zinc-100 shadow-xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
                        <h2 className="text-sm font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                            <TableIcon className="w-4 h-4 text-[#b4c885]" />
                            LISTADO JUGADORES / ENTRENADORES PRONEOSPORTS
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black bg-[#b4c885]/10 text-[#b4c885] px-3 py-1 rounded-full uppercase tracking-widest">
                                {filteredAndSortedPlayers.length} REGISTROS
                            </span>
                            <button
                                onClick={() => refresh && refresh()}
                                className="bg-zinc-50 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg transition-all active:rotate-180"
                                title="Actualizar Tabla"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[400px]">
                        <TableVirtuoso
                            style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}
                            data={filteredAndSortedPlayers}
                            fixedHeaderContent={() => (
                                <tr className="text-left bg-zinc-50">
                                    <th className="px-2 py-3 text-[9px] font-black text-zinc-900 uppercase tracking-tighter border border-zinc-200 bg-[#e1e9cc] whitespace-nowrap sticky top-0 z-20">Nº</th>
                                    {visibleColumns.map((colId, index) => {
                                        if (colId === 'selection') {
                                            const allVisibleSelected = filteredAndSortedPlayers.length > 0 && filteredAndSortedPlayers.every(p => selectedIds.has(p.id));
                                            return (
                                                <th key="selection" className="px-2 py-3 border border-zinc-200 bg-[#e1e9cc] sticky top-0 z-20 w-10 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={allVisibleSelected}
                                                        onChange={toggleSelectAll}
                                                        className="w-4 h-4 rounded border-zinc-300 text-[#b4c885] focus:ring-[#b4c885]"
                                                    />
                                                </th>
                                            );
                                        }

                                        const config = allColumns.find(c => c.id === colId);
                                        if (!config) return null;

                                        if (isReducedView && systemLists.reducedColumns && !systemLists.reducedColumns.includes(config.id)) return null;

                                        return (
                                            <th
                                                key={colId}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, index)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={(e) => handleDragOver(e, index)}
                                                onDrop={(e) => handleDrop(e, index)}
                                                className={`px-2 py-3 text-[9px] font-black text-zinc-900 uppercase tracking-tighter border border-zinc-200 bg-[#e1e9cc] whitespace-nowrap sticky top-0 z-20 ${config.sortable !== false ? 'cursor-pointer hover:bg-[#d5dfb8] transition-colors' : ''} ${config.headerClassName || ''} ${draggedItem === index ? 'opacity-50 border-dashed border-zinc-500' : ''}`}
                                                onClick={() => config.sortable !== false && handleSort(config.id)}
                                            >
                                                <div className="flex items-center justify-center gap-1 cursor-grab active:cursor-grabbing">
                                                    {config.label}
                                                    {config.sortable !== false && <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            )}
                            itemContent={(index, player) => (
                                <>
                                    <TableCell className="bg-zinc-50 font-black">{index + 1}</TableCell>
                                    {visibleColumns.map(colId => {
                                        const config = allColumns.find(c => c.id === colId);
                                        if (!config) return null;

                                        if (isReducedView && systemLists.reducedColumns && !systemLists.reducedColumns.includes(colId)) return null;

                                        if (colId === 'selection') {
                                            return (
                                                <TableCell key={colId} className="">
                                                    <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(player.id)}
                                                            onChange={(e) => toggleSelectOne(player.id, e)}
                                                            className="w-4 h-4 rounded border-zinc-300 text-[#b4c885] focus:ring-[#b4c885]"
                                                        />
                                                    </div>
                                                </TableCell>
                                            );
                                        }

                                        let content: React.ReactNode = (player as any)[colId];
                                        if (config.render) {
                                            content = config.render(player);
                                        }

                                        return (
                                            <TableCell key={colId} className={config.className}>
                                                {content}
                                            </TableCell>
                                        );
                                    })}
                                </>
                            )}
                            components={{
                                TableRow: (props) => {
                                    const index = props['data-index'];
                                    const player = filteredAndSortedPlayers[index];
                                    return (
                                        <tr
                                            {...props}
                                            onClick={() => setEditingPlayer(player)}
                                            className="hover:bg-[#f9faf6] transition-colors group cursor-pointer border-b border-zinc-100 last:border-0"
                                        />
                                    );
                                }
                            }}
                        />
                    </div>

                    {filteredAndSortedPlayers.length === 0 && (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto text-zinc-300">
                                <Users className="w-10 h-10" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-zinc-900 uppercase tracking-tight italic">No se encontraron registros</p>
                            </div>
                        </div>
                    )}

                    <div className="p-6 bg-zinc-50/50 flex items-center justify-between border-t border-zinc-100">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-[#e1e9cc] rounded-sm" />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CABECERA</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-amber-50 border border-amber-200 rounded-sm" />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">DATO PENDIENTE</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsReducedView(!isReducedView)}
                                className="flex items-center gap-2 text-[10px] font-black uppercase text-[#b4c885] hover:gap-3 transition-all"
                            >
                                {isReducedView ? 'VER TABLA COMPLETA' : 'VER VISTA REDUCIDA'}
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-white rounded-[40px] border border-zinc-100 shadow-xl p-8 overflow-hidden min-h-[600px]">
                    <ContactsView userSport={selectedCategory as Category | 'Global'} />
                </div>
            )}
        </div>
    );
};

export default PlayerModule;

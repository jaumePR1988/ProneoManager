import React, { useState } from 'react';
import { X, TrendingUp, Shield, Award, Calendar, ExternalLink, Printer, Filter, User, FileText } from 'lucide-react';
import { Player, Category, Position } from '../types/player';

interface ScoutingPreviewProps {
    onClose: () => void;
    players: Player[];
}

const ScoutingPreview: React.FC<ScoutingPreviewProps> = ({ onClose, players }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
    const [selectedPosition, setSelectedPosition] = useState<string>('Todos');

    // 1. Dynamic Season Logic
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-11
    const currentYear = today.getFullYear();
    const targetYear = currentMonth >= 6 ? currentYear + 1 : currentYear;
    const prevYear = targetYear - 1;
    const seasonString = `${prevYear}/${targetYear}`;

    // 2. Strict Filtering & Grouping
    const allCategories: Category[] = ['Fútbol', 'Femenino', 'F. Sala', 'Entrenadores'];

    // Filter categories based on selection
    const activeCategories = selectedCategory === 'Todos'
        ? allCategories
        : allCategories.filter(c => c === selectedCategory);

    // Helper to get all positions available in the current dataset for filtering
    const availablePositions = Array.from(new Set(
        players
            .filter(p => p.isScouting)
            .filter(p => selectedCategory === 'Todos' || p.category === selectedCategory)
            .map(p => p.position)
    )).sort();

    // Helper to chunk array into pages
    const PLAYERS_PER_PAGE = 10;

    // Prepare pages data structure
    const pages: { category: string, items: Player[] }[] = [];

    activeCategories.forEach(cat => {
        const catPlayers = players.filter(p => {
            // Strict Scouting Players check
            const isScoutingPlayer = p.isScouting;
            // Category check
            const isCategory = p.category === cat;

            // Position Filter
            const isPositionMatch = selectedPosition === 'Todos' || p.position === selectedPosition;

            return isScoutingPlayer && isCategory && isPositionMatch;
        });

        // Split into chunks/pages
        for (let i = 0; i < catPlayers.length; i += PLAYERS_PER_PAGE) {
            pages.push({
                category: cat,
                items: catPlayers.slice(i, i + PLAYERS_PER_PAGE)
            });
        }
    });

    // Fallback for empty state
    if (pages.length === 0) {
        pages.push({ category: 'Vista Previa (Sin Datos)', items: [] });
    }

    return (
        <div className="fixed inset-0 bg-zinc-900/90 backdrop-blur-md z-[100] overflow-y-auto">
            {/* Control Bar - Hidden when printing */}
            <div className="sticky top-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/10 px-8 py-4 flex justify-between items-center no-print">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <span className="text-white font-black uppercase tracking-widest text-sm">
                            Scouting {seasonString} • {pages.length} Páginas
                        </span>
                        <span className="bg-blue-500 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full">
                            Confidencial
                        </span>
                    </div>

                    {/* Filters Container */}
                    <div className="flex items-center gap-4 border-l border-white/10 pl-6">
                        {/* Category Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-zinc-400" />
                            <select
                                value={selectedCategory}
                                onChange={(e) => {
                                    setSelectedCategory(e.target.value);
                                    setSelectedPosition('Todos');
                                }}
                                className="bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-700 outline-none focus:border-blue-500 transition-colors uppercase tracking-wide"
                            >
                                <option value="Todos">Todos los Deportes</option>
                                {allCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Position Filter */}
                        <div className="flex items-center gap-2 border-l border-zinc-700 pl-4">
                            <select
                                value={selectedPosition}
                                onChange={(e) => setSelectedPosition(e.target.value)}
                                className="bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-700 outline-none focus:border-blue-500 transition-colors uppercase tracking-wide"
                            >
                                <option value="Todos">Todas las Posiciones</option>
                                {availablePositions.map(pos => (
                                    <option key={pos} value={pos}>{pos}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.print()}
                        className="bg-white text-zinc-900 px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 hover:text-white transition-all"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir PDF
                    </button>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Pages Container */}
            <div className="py-20 flex flex-col items-center gap-10 min-h-screen print:p-0 print:m-0 print:gap-0 print:block print:h-auto print:min-h-0 print:bg-white">
                {pages.map((page, pageIndex) => (
                    <div key={pageIndex} className="bg-white w-[210mm] h-[297mm] shadow-2xl relative flex flex-col overflow-hidden shrink-0 print:shadow-none print:break-after-page print:mb-0 print:w-full">

                        {/* Header with Scouting Blue Theme */}
                        <div className="h-40 bg-zinc-900 relative overflow-hidden flex items-center px-10 shrink-0">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                            <div className="relative z-10 w-full flex justify-between items-end pb-8 border-b border-zinc-800">
                                <div>
                                    <h1 className="text-4xl font-black italic text-white tracking-tighter mb-1">
                                        INFORME <span className="text-blue-500">DE SCOUTING</span>
                                    </h1>
                                    <div className="flex items-center gap-3">
                                        <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-xs">
                                            Talento & Seguimiento {seasonString}
                                        </p>
                                        <div className="w-1 h-1 bg-zinc-600 rounded-full" />
                                        <p className="text-blue-500 font-black uppercase tracking-[0.2em] text-xs">
                                            {page.category}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-blue-500 font-bold uppercase tracking-widest translate-y-6">Sports Management</div>
                                </div>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="p-8 grid grid-cols-2 gap-x-6 gap-y-4 bg-zinc-50 flex-1 content-start">
                            {page.items.length === 0 && (
                                <div className="col-span-2 flex flex-col items-center justify-center h-full text-zinc-300 space-y-2">
                                    <Shield className="w-12 h-12 mb-2 opacity-50" />
                                    <p className="font-bold uppercase tracking-widest text-sm text-center">
                                        No se encontraron prospectos<br />para esta categoría.
                                        {selectedPosition !== 'Todos' && (
                                            <>
                                                <br />
                                                (Filtrado por: {selectedPosition})
                                            </>
                                        )}
                                    </p>
                                </div>
                            )}

                            {page.items.map((player) => (
                                <div key={player.id} className="bg-white rounded-[1.5rem] p-3 flex gap-4 shadow-sm border border-zinc-100 relative overflow-hidden group hover:shadow-md transition-all h-32 print:break-inside-avoid">
                                    {/* Vertical Strip Decoration - Blue for Scouting */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-zinc-200 to-zinc-100 group-hover:from-blue-500 group-hover:to-cyan-400 transition-colors" />

                                    <div className="w-24 h-24 rounded-xl bg-zinc-100 overflow-hidden shrink-0 shadow-inner translate-x-1 self-center flex items-center justify-center relative">
                                        {player.photoUrl ? (
                                            <img
                                                src={player.photoUrl}
                                                className="w-full h-full object-cover rounded-xl transition-all duration-500"
                                                alt={player.name}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                }}
                                            />
                                        ) : null}
                                        <div className={`absolute inset-0 flex items-center justify-center ${player.photoUrl ? 'hidden' : ''}`}>
                                            <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest text-center leading-tight">Sin<br />Foto</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 py-1 flex flex-col justify-center min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="min-w-0">
                                                <h3 className="text-lg font-black text-zinc-900 uppercase italic tracking-tight leading-none truncate pr-2">
                                                    {player.name || player.firstName}
                                                </h3>
                                                <span className="block text-zinc-400 text-[10px] font-bold uppercase tracking-wide truncate">{player.lastName1}</span>
                                            </div>
                                            <div className="bg-zinc-900 text-white px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shrink-0">
                                                {(() => {
                                                    if (player.birthDate) {
                                                        const birth = new Date(player.birthDate);
                                                        const now = new Date();
                                                        let age = now.getFullYear() - birth.getFullYear();
                                                        const m = now.getMonth() - birth.getMonth();
                                                        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
                                                            age--;
                                                        }
                                                        return `${age} AÑOS`;
                                                    }
                                                    return player.age ? `${player.age} AÑOS` : '? AÑOS';
                                                })()}
                                            </div>
                                        </div>

                                        <div className="space-y-1 mb-2">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 truncate">
                                                <Shield className="w-3 h-3 text-blue-500 shrink-0" />
                                                <span className="truncate">{player.club || 'Sin Equipo'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                                                    <Award className="w-3 h-3 shrink-0" />
                                                    <span>{player.position || 'Jugador'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md">
                                                    <span>{player.preferredFoot || 'Derecha'}</span>
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                                                {player.nationality}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-zinc-100">
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-3 h-3 text-zinc-400 shrink-0" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 truncate max-w-[80px]">
                                                    {player.scouting?.currentAgent || 'Sin Agente'}
                                                </span>
                                            </div>
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${player.scouting?.status === 'Contactado' ? 'bg-blue-100 text-blue-600' :
                                                player.scouting?.status === 'Rechazado' ? 'bg-red-100 text-red-600' :
                                                    'bg-zinc-100 text-zinc-500'
                                                }`}>
                                                {player.scouting?.status || 'Pendiente'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="h-16 bg-zinc-900 px-10 flex items-center justify-between text-zinc-500 text-[9px] font-bold uppercase tracking-widest shrink-0">
                            <div className="flex gap-6">
                                <span>www.proneosports.com</span>
                                <span>info@proneosports.com</span>
                            </div>
                            <div>
                                Página {pageIndex + 1} de {pages.length} • Informe Confidencial
                            </div>
                        </div>

                    </div>
                ))}
            </div>

            <style type="text/css">{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    .no-print { display: none !important; }
                    body { 
                        background: white; 
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default ScoutingPreview;

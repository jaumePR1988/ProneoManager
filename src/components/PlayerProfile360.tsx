import React, { useState, useEffect } from 'react';
import {
    X,
    Printer,
    Shield,
    Zap,
    Trophy,
    Briefcase,
    Save,
    Plus,
    Trash2,
    Banknote,
    Copy,
    Share2,
    Download
} from 'lucide-react';
import { Player, PlayerSeason } from '../types/player';
import { getCountryFlagUrl } from '../utils/countries';

interface PlayerProfile360Props {
    player: Player;
    onClose: () => void;
    onSave: (data: Partial<Player>) => Promise<void>;
}

const PlayerProfile360: React.FC<PlayerProfile360Props> = ({ player, onClose, onSave }) => {
    const [palmares, setPalmares] = useState(player.customFields?.palmares || '');
    const [internationalStatus, setInternationalStatus] = useState(player.selection || 'No internacional');

    // Editable Fields State
    const [clause, setClause] = useState(player.contract?.clause || '');

    // Trajectory State
    const [seasons, setSeasons] = useState<PlayerSeason[]>(player.seasons || []);

    const [isSaving, setIsSaving] = useState(false);
    const [showCopiedToast, setShowCopiedToast] = useState(false);

    // Ensure seasons is initialized if empty
    useEffect(() => {
        if (!player.seasons || player.seasons.length === 0) {
            setSeasons([
                { id: '1', season: '2023/24', club: '', division: '', matches: 0, goals: 0, minutes: 0, cards: 0 }
            ]);
        } else {
            setSeasons(player.seasons);
        }
    }, [player.seasons]);

    // Sync other fields when player updates (Fix for "Save not updating view")
    useEffect(() => {
        setPalmares(player.customFields?.palmares || '');
        setClause(player.contract?.clause || '');
        setInternationalStatus(player.selection || 'No internacional');
    }, [player]);

    const handleQuickSave = async () => {
        setIsSaving(true);
        try {
            await onSave({
                selection: internationalStatus,
                contract: {
                    ...player.contract,
                    clause: clause,
                    endDate: player.contract?.endDate || ''
                },
                customFields: {
                    ...player.customFields,
                    palmares: palmares
                },
                seasons: seasons // Save the updated seasons
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSeasonChange = (index: number, field: keyof PlayerSeason, value: string | number) => {
        const newSeasons = [...seasons];
        newSeasons[index] = { ...newSeasons[index], [field]: value };
        setSeasons(newSeasons);
    };

    const addSeason = () => {
        setSeasons([
            { id: crypto.randomUUID(), season: '2024/25', club: '', division: '', matches: 0, goals: 0, minutes: 0, cards: 0 },
            ...seasons
        ]);
    };

    const removeSeason = (index: number) => {
        const newSeasons = seasons.filter((_, i) => i !== index);
        setSeasons(newSeasons);
    };

    const handlePrint = () => {
        window.print();
    };

    const copyUpdateLink = () => {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/update/${player.id}`;
        navigator.clipboard.writeText(link);

        setShowCopiedToast(true);
        setTimeout(() => setShowCopiedToast(false), 2000);
    };

    // Calculate Age
    const age = player.birthDate ? new Date().getFullYear() - new Date(player.birthDate).getFullYear() : 'N/A';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 print:p-0 print:bg-white print:fixed print:inset-0">
            {/* Custom Toast Notification */}
            {showCopiedToast && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] bg-zinc-900 text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
                    <div className="w-6 h-6 bg-proneo-green/20 rounded-full flex items-center justify-center">
                        <Copy className="w-3 h-3 text-proneo-green" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Enlace copiado</span>
                </div>
            )}

            {/* Main Card Container */}
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[40px] overflow-hidden flex shadow-2xl relative print:w-full print:h-full print:rounded-none print:shadow-none print:max-w-none">

                {/* Close Button (Hidden on Print) */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-20 w-10 h-10 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center transition-colors print:hidden"
                >
                    <X className="w-5 h-5 text-zinc-800" />
                </button>

                {/* Print Button (Hidden on Print) */}
                <button
                    onClick={handlePrint}
                    className="absolute top-6 right-20 z-20 w-10 h-10 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center transition-colors print:hidden"
                    title="Imprimir"
                >
                    <Printer className="w-5 h-5 text-zinc-800" />
                </button>

                {/* Save Button (Hidden on Print) - ADDED FOR VISIBILITY */}
                <button
                    onClick={handleQuickSave}
                    className="absolute top-6 right-[8.5rem] z-20 w-10 h-10 bg-[#b4c885] hover:bg-[#a3b774] rounded-full flex items-center justify-center transition-colors print:hidden shadow-sm"
                    title="Guardar Cambios"
                >
                    {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save className="w-5 h-5 text-white" />
                    )}
                </button>

                {/* Copy Link Button (Hidden on Print) */}
                <button
                    onClick={copyUpdateLink}
                    className="absolute top-6 right-[12rem] z-20 w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors print:hidden shadow-sm"
                    title="Copiar Link para Jugador"
                >
                    <Share2 className="w-5 h-5 text-white" />
                </button>

                {/* Left Panel: Visual Identity (The "Card") */}
                <div
                    className="w-[35%] bg-[#b4c885] text-zinc-900 relative flex flex-col p-8 print:w-[40%] print:bg-[#b4c885] print-exact"
                    style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                >
                    {/* Background Pattern - Subtle */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-black"></div>

                    {/* Header Branding (REPLACED LOGO WITH TEXT) */}
                    <div className="relative z-10 mb-8">
                        <div className="inline-flex items-center gap-2 border-b border-zinc-900/20 pb-2">
                            <span className="text-[10px] font-black tracking-[0.2em] text-zinc-900/60 uppercase">
                                Powered by Proneo Manager
                            </span>
                        </div>
                    </div>

                    {/* Player Image (Centerpiece) */}
                    <div className="relative z-10 flex-1 flex flex-col items-center">
                        <div className="w-64 h-64 rounded-2xl border-4 border-white/30 shadow-2xl overflow-hidden bg-zinc-800 relative group">
                            <img
                                src={player.photoUrl || 'https://i.pravatar.cc/300'}
                                alt={player.lastName1}
                                className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                            />
                            {/* Download Action */}
                            <a
                                href={player.photoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-2 right-2 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all z-20"
                                title="Descargar Foto Original"
                                download={`foto_${player.lastName1}.jpg`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Download className="w-4 h-4" />
                            </a>
                        </div>

                        <div className="mt-8 text-center space-y-2">
                            <h1 className="text-5xl font-black italic tracking-tighter uppercase text-zinc-900 leading-[0.85]">
                                {player.firstName}
                                <br />
                                <span className="text-white drop-shadow-md">
                                    {player.lastName1}
                                </span>
                            </h1>
                            <div className="flex flex-col items-center gap-3 mt-4">
                                <div className="flex items-center justify-center gap-2">
                                    <span className="px-3 py-1 rounded-md bg-zinc-900/10 text-zinc-800 font-black text-xs uppercase tracking-widest border border-zinc-900/10">
                                        {player.position}
                                    </span>
                                    <span className="px-3 py-1 rounded-md bg-zinc-900/10 text-zinc-800 font-black text-xs uppercase tracking-widest border border-zinc-900/10">
                                        {age} Años
                                    </span>
                                </div>
                                {/* Flag Component(s) */}
                                <div className="flex flex-wrap justify-center gap-2">
                                    {[player.nationality, player.nationality2].filter(Boolean).map((nat, index) => {
                                        if (!nat) return null;
                                        return (
                                            <div key={index} className="flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-sm shadow-sm transition-all hover:bg-white/30">
                                                <img
                                                    src={getCountryFlagUrl(nat)}
                                                    alt={nat}
                                                    className="h-4 object-contain shadow-sm rounded-sm"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none'; // Hide if flag not found rather than showing wrong one
                                                    }}
                                                />
                                                <span className="text-xs font-black uppercase tracking-widest text-zinc-900">
                                                    {nat}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="relative z-10 grid grid-cols-2 gap-3 mt-auto">
                        <div className="bg-white/20 p-4 rounded-xl border border-white/20 backdrop-blur-sm">
                            <p className="text-[9px] uppercase tracking-widest text-zinc-700 mb-1">Pierna Hábil</p>
                            <p className="text-xl font-black text-zinc-900 uppercase flex items-center gap-2">
                                <Zap className="w-4 h-4 text-zinc-900" />
                                {player.preferredFoot === 'Izquierda' ? 'IZQ' : 'DER'}
                            </p>
                        </div>
                        <div className="bg-white/20 p-4 rounded-xl border border-white/20 backdrop-blur-sm">
                            <p className="text-[9px] uppercase tracking-widest text-zinc-700 mb-1">Internacional</p>
                            <select
                                value={internationalStatus}
                                onChange={(e) => setInternationalStatus(e.target.value)}
                                className="bg-transparent text-zinc-900 font-black text-sm uppercase outline-none w-full cursor-pointer appearance-none"
                            >
                                <option className="text-zinc-900 bg-[#b4c885]" value="No internacional">No Int.</option>
                                <option className="text-zinc-900 bg-[#b4c885]" value="Sub-15">Sub-15</option>
                                <option className="text-zinc-900 bg-[#b4c885]" value="Sub-16">Sub-16</option>
                                <option className="text-zinc-900 bg-[#b4c885]" value="Sub-17">Sub-17</option>
                                <option className="text-zinc-900 bg-[#b4c885]" value="Sub-18">Sub-18</option>
                                <option className="text-zinc-900 bg-[#b4c885]" value="Sub-19">Sub-19</option>
                                <option className="text-zinc-900 bg-[#b4c885]" value="Sub-21">Sub-21</option>
                                <option className="text-zinc-900 bg-[#b4c885]" value="Absoluta">Absoluta</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Content */}
                <div className="flex-1 bg-white p-10 overflow-y-auto flex flex-col h-full relative">

                    {/* Top Info Bar */}
                    <div className="flex items-start justify-between mb-8 pb-8 border-b border-zinc-100">
                        <div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">Club Actual</p>
                            <h2 className="text-3xl font-black text-zinc-900 uppercase italic tracking-tighter flex items-center gap-3">
                                {player.club}
                                <span className="bg-zinc-100 text-zinc-400 text-xs px-2 py-1 rounded-lg not-italic font-bold tracking-normal align-middle">
                                    {player.league || 'Liga'}
                                </span>
                            </h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">

                        {/* Column 1: Palmares & Highlights */}
                        <div className="flex flex-col gap-6">
                            <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 flex-1 flex flex-col shadow-sm">
                                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                    Palmarés y Logros
                                </h3>

                                <textarea
                                    value={palmares}
                                    onChange={(e) => setPalmares(e.target.value)}
                                    placeholder="Escribe aquí los títulos, premios individuales y logros destacados..."
                                    className="w-full flex-1 bg-transparent border-none resize-none outline-none text-zinc-600 text-sm font-medium leading-relaxed placeholder:text-zinc-300 focus:ring-0"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white border border-zinc-100 p-4 rounded-2xl shadow-sm">
                                    <p className="text-[10px] uppercase font-black text-zinc-400 tracking-widest mb-1">Fin Contrato</p>
                                    <p className="text-xl font-black text-zinc-900">{player.contract?.endDate ? new Date(player.contract.endDate).getFullYear() : '—'}</p>
                                </div>

                                {/* REPLACED 'MARCA' WITH 'CLÁUSULA' */}
                                <div className="bg-white border border-zinc-100 p-4 rounded-2xl shadow-sm group">
                                    <p className="text-[10px] uppercase font-black text-zinc-400 tracking-widest mb-1">Cláusula</p>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={clause}
                                            onChange={(e) => setClause(e.target.value)}
                                            className="text-xl font-black text-zinc-900 w-full bg-transparent border-none p-0 focus:ring-0 placeholder-zinc-300"
                                            placeholder="—"
                                        />
                                        <Banknote className="w-4 h-4 text-zinc-300" />
                                    </div>
                                </div>
                            </div>

                            {/* Monitoring Agents Section */}
                            <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 shadow-sm mt-2">
                                <p className="text-[10px] uppercase font-black text-zinc-400 tracking-widest mb-3 flex items-center gap-2">
                                    <Shield className="w-3 h-3 text-[#b4c885]" />
                                    Seguimiento
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {[player.monitoringAgent, player.monitoringAgent2].filter(Boolean).map((agent, index) => (
                                        <span key={index} className="px-3 py-1 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-700 shadow-sm italic">
                                            {agent}
                                        </span>
                                    ))}
                                    {![player.monitoringAgent, player.monitoringAgent2].filter(Boolean).length && (
                                        <span className="text-xs text-zinc-300 font-medium italic">Sin agente asignado</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Trajectory (Editable) */}
                        <div className="bg-white rounded-[32px] border border-zinc-100 p-8 shadow-sm overflow-y-auto">
                            <div className="flex items-center justify-between mb-8 sticky top-0 bg-white z-10 pb-4 border-b border-zinc-50">
                                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-blue-500" />
                                    Trayectoria
                                </h3>
                                <button
                                    onClick={addSeason}
                                    className="p-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors print:hidden"
                                    title="Añadir Temporada"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="space-y-0 relative border-l-2 border-zinc-100 ml-3">
                                {seasons.length > 0 ? (
                                    seasons.map((season, idx) => (
                                        <div key={idx} className="relative pl-8 pb-8 last:pb-0 group">
                                            <div className="absolute -left-[9px] top-3 w-4 h-4 rounded-full border-4 border-white bg-zinc-300 group-hover:bg-proneo-green transition-colors shadow-sm"></div>

                                            {/* Editable Fields Container */}
                                            <div className="flex flex-col gap-1">
                                                <input
                                                    type="text"
                                                    value={season.season}
                                                    onChange={(e) => handleSeasonChange(idx, 'season', e.target.value)}
                                                    className="text-xs font-black text-zinc-400 mb-0.5 bg-transparent border-none p-0 focus:ring-0 w-24 placeholder-zinc-300"
                                                    placeholder="2024/25"
                                                />
                                                <input
                                                    type="text"
                                                    value={season.club}
                                                    onChange={(e) => handleSeasonChange(idx, 'club', e.target.value)}
                                                    className="text-lg font-black text-zinc-900 leading-tight bg-transparent border-none p-0 focus:ring-0 w-full placeholder-zinc-300 border-b border-transparent focus:border-zinc-200"
                                                    placeholder="Nombre del Club"
                                                />
                                                <div className="flex gap-2 mt-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider items-center">
                                                    <input
                                                        type="text"
                                                        value={season.division}
                                                        onChange={(e) => handleSeasonChange(idx, 'division', e.target.value)}
                                                        className="bg-transparent border-none p-0 focus:ring-0 w-20 placeholder-zinc-300"
                                                        placeholder="División"
                                                    />
                                                    <span>•</span>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={season.matches}
                                                            onChange={(e) => handleSeasonChange(idx, 'matches', parseInt(e.target.value) || 0)}
                                                            className="bg-transparent border-none p-0 focus:ring-0 w-8 text-right placeholder-zinc-300"
                                                        />
                                                        <span>Partidos</span>
                                                    </div>

                                                    {/* Delete Button (Hover only) */}
                                                    <button
                                                        onClick={() => removeSeason(idx)}
                                                        className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-500 transition-opacity print:hidden"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-zinc-400 text-xs italic">
                                        <button onClick={addSeason} className="hover:underline">Añadir trayectoria...</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer / Watermark for Print */}
                    <div className="mt-auto pt-6 border-t border-zinc-100 flex justify-between items-center opacity-50">
                        {/* LARGE LOGO AT THE BOTTOM */}
                        <img src="/logo-full.png" alt="Proneo" className="h-10 grayscale opacity-40 mix-blend-multiply" />
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            Generated by Proneo Manager • {new Date().toLocaleDateString()}
                        </p>
                    </div>

                </div>
            </div>
        </div >
    );
};

export default PlayerProfile360;

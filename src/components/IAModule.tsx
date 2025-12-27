import React, { useState } from 'react';
import {
    Sparkles,
    FileSearch,
    History,
    FileText,
    Brain,
    Calendar,
    DollarSign,
    ShieldCheck,
    ArrowRight,
    Search,
    UserCircle,
    Download,
    Upload,
    Plus
} from 'lucide-react';
import { usePlayers } from '../hooks/usePlayers';
import { Player } from '../types/player';
import { analyzeContractPDF } from '../services/geminiService';

const IAModule: React.FC = () => {
    const { players } = usePlayers(false);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const emptyFileInputRef = React.useRef<HTMLInputElement>(null);

    const filteredPlayers = players.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.firstName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log("File input changed", e.target.files);
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setAnalysisResult(null);
            setError(null);
        }
    };

    const handleAnalyze = async (isNew: boolean = false) => {
        if (!selectedFile) return;

        setIsAnalyzing(true);
        setError(null);
        try {
            const data = await analyzeContractPDF(selectedFile, isNew);
            setAnalysisResult({
                type: isNew ? 'new' : 'update',
                fileName: selectedFile.name,
                extractedData: data,
                confidence: 100 // Gemini real analysis
            });
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error al analizar el documento con IA");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-20 animate-fade-in">
            {/* Header */}
            <header className="flex justify-between items-end bg-white p-10 rounded-[40px] border border-zinc-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-proneo-green/5 blur-[100px] -z-10 rounded-full" />
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-zinc-900 uppercase tracking-tighter flex items-center gap-4">
                        <div className="w-12 h-12 bg-proneo-green rounded-2xl flex items-center justify-center text-white shadow-lg shadow-proneo-green/20">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        Laboratorio <span className="text-proneo-green">IA</span>
                    </h1>
                    <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-xs mt-3 flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Exclusivo Directores y Administradores <span className="text-proneo-green/30 text-[10px]">v8.0</span>
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sidebar: Buscador de Jugadores */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-[40px] border border-zinc-100 shadow-xl overflow-hidden flex flex-col h-[750px]">
                        <div className="p-8 border-b border-zinc-50 shrink-0">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-black uppercase text-xs tracking-widest text-zinc-900 flex items-center gap-2">
                                    <UserCircle className="w-4 h-4 text-zinc-300" />
                                    Seleccionar Jugador/a
                                </h3>
                                <button
                                    onClick={() => {
                                        setSelectedPlayer(null);
                                        setAnalysisResult(null);
                                    }}
                                    className="text-[10px] font-black text-proneo-green uppercase hover:underline"
                                >
                                    Limpiar
                                </button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por nombre..."
                                    className="w-full bg-zinc-50 border border-zinc-100 h-14 rounded-2xl pl-12 pr-4 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-proneo-green/5 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filteredPlayers.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        setSelectedPlayer(p);
                                        setAnalysisResult(null);
                                    }}
                                    className={`w-full p-5 rounded-[24px] flex items-center gap-4 transition-all group ${selectedPlayer?.id === p.id ? 'bg-zinc-900 text-white shadow-2xl scale-[1.02]' : 'hover:bg-zinc-50 border border-transparent hover:border-zinc-100 text-zinc-600'}`}
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform">
                                        {p.photoUrl ? (
                                            <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserCircle className="w-6 h-6 text-zinc-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left overflow-hidden">
                                        <p className="text-xs font-black uppercase truncate">{p.name}</p>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedPlayer?.id === p.id ? 'text-proneo-green' : 'text-zinc-400'}`}>
                                            {p.club || 'Sin Club'}
                                        </p>
                                    </div>
                                    <ArrowRight className={`w-4 h-4 transition-transform ${selectedPlayer?.id === p.id ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content: AI & History */}
                <div className="lg:col-span-8 space-y-8">
                    {selectedPlayer || (analysisResult && analysisResult.type === 'new') ? (
                        <>
                            {/* Analysis Card */}
                            <div className="bg-white p-10 rounded-[40px] border border-zinc-100 shadow-xl space-y-8 relative overflow-hidden">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-proneo-green">
                                            <Brain className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">
                                                {analysisResult?.type === 'new' ? 'Crear Nuevo Perfil' : 'Actualizar Ficha Existente'}
                                            </h2>
                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                                {analysisResult?.type === 'new' ? 'Alta procesada por Inteligencia Artificial' : 'Sincronizar PDF con base de datos'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                            />
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className={`flex items-center gap-3 px-6 h-14 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 border-dashed ${selectedFile ? 'bg-zinc-50 border-proneo-green text-proneo-green' : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:border-proneo-green/50 hover:text-proneo-green'}`}
                                            >
                                                <Upload className="w-5 h-5" />
                                                {selectedFile ? selectedFile.name : 'Subir Contrato PDF'}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    console.log("Analyze button clicked", { selectedFile, isNew: !selectedPlayer });
                                                    handleAnalyze(selectedPlayer ? false : true);
                                                }}
                                                disabled={isAnalyzing || !selectedFile}
                                                className="bg-proneo-green text-white px-8 h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:shadow-2xl hover:bg-proneo-green/90 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                                            >
                                                {isAnalyzing ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                        Procesando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FileSearch className="w-5 h-5" />
                                                        {selectedPlayer ? 'Analizar PDF de Actualización' : 'Analizar PDF para Nuevo Jugador'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        {!selectedFile && (
                                            <p className="text-[9px] font-black text-red-400 uppercase tracking-widest animate-pulse">
                                                * Selecciona un PDF para activar la IA
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-50 p-6 rounded-[32px] border border-red-100 animate-in slide-in-from-top-4">
                                        <p className="text-red-600 text-[11px] font-black uppercase tracking-widest text-center">
                                            ⚠️ Error: {error}
                                        </p>
                                    </div>
                                )}

                                {analysisResult && (
                                    <div className="bg-emerald-50 rounded-[32px] p-8 border border-emerald-100 animate-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex flex-col gap-1">
                                                <h4 className="text-emerald-800 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                                                    <ShieldCheck className="w-4 h-4" />
                                                    Extracción Completa
                                                </h4>
                                                <p className="text-[10px] font-bold text-emerald-600/60 uppercase ml-6">
                                                    Archivo: {analysisResult.fileName}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="bg-emerald-200/50 px-4 py-1.5 rounded-full text-[10px] font-black text-emerald-700 uppercase">
                                                    Confianza: {analysisResult.confidence}%
                                                </div>
                                                <button className="bg-zinc-900 text-white px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-proneo-green transition-all shadow-lg active:scale-95">
                                                    {analysisResult.type === 'new' ? 'Guardar Nuevo Jugador' : 'Aplicar y Archivar Contrato'}
                                                </button>
                                            </div>
                                        </div>

                                        {analysisResult.type === 'new' ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest">Nombre Completo</p>
                                                    <p className="text-lg font-black text-emerald-900">{analysisResult.extractedData.firstName} {analysisResult.extractedData.lastName1}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest">Posición Sugerida</p>
                                                    <p className="text-lg font-black text-emerald-900">{analysisResult.extractedData.position}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest">Nacimiento</p>
                                                    <p className="text-lg font-black text-emerald-900">{analysisResult.extractedData.birthDate}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest">Nuevo Vencimiento</p>
                                                    <p className="text-lg font-black text-emerald-900">{analysisResult.extractedData.endDate}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest">Nueva Cláusula</p>
                                                    <p className="text-lg font-black text-emerald-900">{analysisResult.extractedData.clause}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest">Extras/Bonus</p>
                                                    <p className="text-[11px] font-black text-emerald-900 uppercase">{analysisResult.extractedData.bonuses}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest">Comisión Pactada</p>
                                                    <p className="text-lg font-black text-emerald-900">{analysisResult.extractedData.commission}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedPlayer && !analysisResult && (
                                    <div className="p-8 bg-zinc-50 rounded-[32px] border border-zinc-100">
                                        <h3 className="font-black text-zinc-900 uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-zinc-400" />
                                            Contrato Actual (Activo)
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-400 shadow-sm">
                                                    <Calendar className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Fin Contrato</p>
                                                    <p className="font-black text-zinc-900">{selectedPlayer.contract.endDate || 'No definida'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-400 shadow-sm">
                                                    <DollarSign className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Cláusula Rescisión</p>
                                                    <p className="font-black text-zinc-900">{selectedPlayer.contract.clause || 'No definida'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 px-6 border-l border-zinc-200">
                                                <div className="bg-emerald-500/10 px-4 py-1.5 rounded-full text-[10px] font-black text-emerald-600 uppercase">
                                                    Estado: Vigente
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* History Section (Solo si hay jugador seleccionado) */}
                            {selectedPlayer && (
                                <div className="bg-white p-10 rounded-[40px] border border-zinc-100 shadow-sm space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400">
                                            <History className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Historial de Contratos</h2>
                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Versiones archivadas automáticamente</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {selectedPlayer.contractHistory && selectedPlayer.contractHistory.length > 0 ? (
                                            selectedPlayer.contractHistory.map((contract: any, index: number) => (
                                                <div key={index} className="group p-6 rounded-3xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 flex items-center justify-between transition-all">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-300 border border-zinc-100">
                                                            <FileText className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Versión Anterior #{selectedPlayer.contractHistory!.length - index}</p>
                                                            <div className="flex items-center gap-4 mt-1">
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                                                    <span className="text-xs font-bold text-zinc-600">{contract.endDate}</span>
                                                                </div>
                                                                <div className="w-1 h-1 bg-zinc-200 rounded-full" />
                                                                <div className="flex items-center gap-2">
                                                                    <DollarSign className="w-3.5 h-3.5 text-zinc-400" />
                                                                    <span className="text-xs font-bold text-zinc-600">Cláusula: {contract.clause}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button className="h-10 w-10 bg-white border border-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 hover:text-proneo-green hover:border-proneo-green/30 transition-all opacity-0 group-hover:opacity-100">
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-20 text-center bg-zinc-50/50 rounded-[32px] border-2 border-dashed border-zinc-100">
                                                <History className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                                                <h4 className="text-sm font-black text-zinc-400 uppercase tracking-widest">Sin historial acumulado</h4>
                                                <p className="text-[10px] font-bold text-zinc-300 uppercase mt-2 tracking-tight">El historial aparecerá aquí cuando actualices el contrato actual.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-zinc-50/30 rounded-[40px] border-2 border-dashed border-zinc-100 text-center p-10">
                            <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mb-8">
                                <Brain className="w-10 h-10 text-zinc-300" />
                            </div>
                            <h2 className="text-2xl font-black text-zinc-900 uppercase italic">Laboratorio de Inteligencia</h2>
                            <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest mt-4 max-w-sm mb-10">
                                Selecciona un perfil de la izquierda para actualizarlo, o utiliza el botón inferior para dar de alta un nuevo jugador desde un PDF.
                            </p>

                            <div className="flex flex-col items-center gap-6">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    ref={emptyFileInputRef}
                                    onChange={handleFileChange}
                                />
                                <button
                                    onClick={() => emptyFileInputRef.current?.click()}
                                    className={`flex items-center gap-4 px-10 h-20 rounded-[28px] font-black text-sm uppercase tracking-widest transition-all border-2 border-dashed ${selectedFile ? 'bg-white border-proneo-green text-proneo-green shadow-xl' : 'bg-white border-zinc-200 text-zinc-400 hover:border-proneo-green/50 hover:text-proneo-green shadow-sm'}`}
                                >
                                    <Upload className="w-6 h-6" />
                                    {selectedFile ? selectedFile.name : 'Primero sube el PDF aquí'}
                                </button>

                                <button
                                    onClick={() => {
                                        console.log("Empty state analyze button clicked", { selectedFile });
                                        handleAnalyze(true);
                                    }}
                                    disabled={!selectedFile || isAnalyzing}
                                    className="bg-zinc-900 text-white px-12 h-16 rounded-[24px] font-black text-sm uppercase tracking-widest flex items-center gap-4 hover:shadow-2xl hover:bg-proneo-green transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Analizando Documento...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-5 h-5" />
                                            Crear Nuevo Jugador mediante IA
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IAModule;

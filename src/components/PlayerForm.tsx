import React, { useState } from 'react';
import {
    Check,
    Save,
    X,
    ChevronDown,
    Trash,
    Plus,
    User,
    Trophy,
    Building2,
    Briefcase,
    Sparkles,
    FileText,
    UploadCloud,
    Download,
    Eye
} from 'lucide-react';
import { Player, Category, Position, PreferredFoot, PayerType, ContractYear } from '../types/player';
import { usePlayers } from '../hooks/usePlayers';
import PlayerProfile360 from './PlayerProfile360';

interface PlayerFormProps {
    onClose: () => void;
    onSave: (data: Partial<Player>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    isScoutingInitial?: boolean;
    initialData?: Player | null;
}

const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="bg-[#b4c885] px-4 h-10 flex items-center justify-center text-zinc-900 font-black text-[10px] uppercase tracking-wider rounded-sm w-44 text-center shrink-0">
        {children}
    </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className="flex-1 bg-white border border-zinc-200 rounded-sm px-4 h-10 text-sm font-bold text-zinc-700 outline-none focus:border-[#b4c885] transition-all"
    />
);

const Select = ({ name, value, onChange, options }: { name: string, value: any, onChange: any, options: string[] }) => (
    <div className="flex-1 relative">
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full bg-[#f9f9f9] border border-zinc-200 rounded-sm px-4 h-10 text-sm font-bold text-zinc-700 outline-none appearance-none cursor-pointer focus:border-[#b4c885] transition-all"
        >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
    </div>
);

const PlayerForm: React.FC<PlayerFormProps> = ({ onClose, onSave, onDelete, isScoutingInitial = false, initialData = null }) => {
    const { schema, systemLists } = usePlayers(false);
    const [formData, setFormData] = useState<Partial<Player>>(() => {
        if (initialData) {
            return {
                ...initialData,
                customFields: initialData.customFields || {},
                documents: initialData.documents || []
            };
        }
        return {
            firstName: '',
            lastName1: '',
            lastName2: '',
            name: '',
            nationality: 'España',
            birthDate: '',
            age: 0,
            club: 'FC Barcelona',
            league: 'España',
            position: 'Ala' as Position,
            preferredFoot: 'Derecha' as PreferredFoot,
            category: 'Fútbol' as Category,
            isScouting: isScoutingInitial,
            contract: {
                endDate: '',
                clause: '',
                optional: 'No',
                optionalNoticeDate: '',
                conditions: ''
            },
            proneo: {
                contractDate: '',
                agencyEndDate: '',
                commissionPct: 10,
                payerType: 'Club' as PayerType
            },
            sportsBrand: 'Joma',
            sportsBrandEndDate: '',
            selection: '',
            monitoringAgent: 'Jaume',
            monitoringAgent2: '',
            seasons: [],
            salaries: { year1: 0, year2: 0, year3: 0, year4: 0 },
            contractYears: [],
            customFields: {},
            nationality2: '',
            sportsBrand2: '',
            sportsBrandEndDate2: '',
            division: '',
            loanData: {
                isLoaned: false,
                ownerClub: '',
                loanEndDate: ''
            }
        } as Partial<Player>;
    });

    const [showSuccess, setShowSuccess] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showProfile360, setShowProfile360] = useState(false);

    // States for dual fields visibility
    const [showNat2, setShowNat2] = useState(!!formData.nationality2);
    const [showAgent2, setShowAgent2] = useState(!!formData.monitoringAgent2);
    const [showBrand2, setShowBrand2] = useState(!!formData.sportsBrand2);

    // If 360 Mode is active, show only that component
    if (showProfile360 && initialData) {
        return (
            <PlayerProfile360
                player={{ ...initialData, ...formData } as Player}
                onClose={() => setShowProfile360(false)}
                onSave={async (updates) => {
                    await onSave(updates);
                    // Sync the 360 save back to the main form data to prevent overwriting on main save
                    setFormData(prev => ({ ...prev, ...updates }));
                }}
            />
        );
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        setFormData(prev => {
            let newState = { ...prev };

            if (name.includes('.')) {
                const [parent, child] = name.split('.');
                newState = {
                    ...prev,
                    [parent]: {
                        ...(prev[parent as keyof typeof prev] as any),
                        [child]: value
                    }
                };
            } else {
                newState = { ...prev, [name]: value };
            }

            // Auto-generate display name if names change
            if (name === 'firstName' || name === 'lastName1') {
                const fName = name === 'firstName' ? value : newState.firstName || '';
                const lName = name === 'lastName1' ? value : newState.lastName1 || '';
                newState.name = `${fName} ${lName}`.trim();
            }

            return newState;
        });
    };

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!initialData?.id || !onDelete) return;

        setDeleting(true);
        try {
            await onDelete(initialData.id);

            // Hide confirmation, show success
            setShowDeleteConfirm(false);
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                onClose();
            }, 1000);
        } catch (err: any) {
            console.error(err);
            alert("Error al eliminar: " + (err.message || err));
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleSave = async () => {
        if (!formData.firstName || !formData.lastName1) {
            alert("Nombre y Primer Apellido son obligatorios");
            return;
        }
        setSaving(true);
        try {
            // Sanitize contract years (convert strings to numbers)
            const sanitizedData = {
                ...formData,
                contractYears: (formData.contractYears || []).map(y => ({
                    ...y,
                    currency: y.currency || 'EUR',
                    salary: Number(y.salary) || 0,
                    clubCommissionType: y.clubCommissionType || 'percentage',
                    clubCommissionPct: Number(y.clubCommissionPct) || 0,
                    clubCommissionFixed: Number(y.clubCommissionFixed) || 0,
                    playerCommissionType: y.playerCommissionType || 'percentage',
                    playerCommissionPct: Number(y.playerCommissionPct) || 0,
                    playerCommissionFixed: Number(y.playerCommissionFixed) || 0,
                }))
            };
            await onSave(sanitizedData);
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                onClose();
            }, 1000);
        } catch (err: any) {
            alert("Error al guardar: " + err.message);
        } finally {
            setSaving(false);
        }
    };


    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4 md:p-8">
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[10000] bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-white p-8 rounded-[30px] shadow-2xl border border-zinc-100 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-200 min-w-[320px] max-w-sm text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500 shadow-lg shadow-red-500/20">
                            <Trash className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-zinc-800 uppercase tracking-widest leading-tight">¿Eliminar Jugador?</h3>
                            <p className="text-xs font-medium text-zinc-500 leading-relaxed px-4">
                                Esta acción eliminará permanentemente a <span className="font-bold text-zinc-800">{initialData?.name}</span> de la base de datos. No se puede deshacer.
                            </p>
                        </div>
                        <div className="flex gap-3 w-full mt-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 h-12 rounded-xl border border-zinc-200 text-zinc-400 font-bold hover:bg-zinc-50 transition-all uppercase tracking-wider text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="flex-1 h-12 rounded-xl bg-red-500 text-white font-black hover:bg-red-600 transition-all uppercase tracking-wider text-xs shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                            >
                                {deleting ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSuccess && (
                <div className="fixed inset-0 z-[9999] bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-white p-8 rounded-[30px] shadow-2xl border border-zinc-100 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200 min-w-[300px]">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg ${deleting ? 'bg-red-500 shadow-red-500/30' : 'bg-[#b4c885] shadow-[#b4c885]/30'}`}>
                            {deleting ? <Trash className="w-10 h-10" /> : <Check className="w-10 h-10" />}
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-2xl font-black text-zinc-800 uppercase tracking-widest">{deleting ? '¡ELIMINADO!' : '¡GUARDADO!'}</h3>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                {deleting ? 'Jugador eliminado correctamente' : (initialData ? 'Jugador actualizado' : 'Jugador creado correctamente')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in-95 duration-200">
                {/* Close Button - Absolute */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-white/50 hover:bg-white text-zinc-400 hover:text-red-500 rounded-full transition-all backdrop-blur-sm"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Left Sidebar - Branding & Info */}
                <div className="w-full md:w-80 bg-white border-r border-zinc-100 flex flex-col items-center p-8 shrink-0 relative overflow-hidden">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#b4c885]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-zinc-100 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#b4c885] to-[#d5dfb8]" />

                    <div className="mt-8 mb-10 relative z-10 w-full flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-[#b4c885]/20 blur-xl opacity-50 rounded-full" />
                            <img src="/logo-full.png" alt="Proneo Sports" className="w-52 object-contain relative z-10" />
                        </div>
                    </div>

                    <div className="w-full text-center space-y-4">
                        <div className="w-16 h-1 bg-[#b4c885] mx-auto rounded-full" />
                        <h1 className="text-2xl font-black text-zinc-800 uppercase tracking-widest leading-tight">
                            {initialData ? 'EDITAR' : 'NUEVO'}
                            <br />
                            <span className="text-[#b4c885]">JUGADOR</span>
                        </h1>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            Base de Datos Proneo Sports
                        </p>

                        {initialData && (
                            <button
                                onClick={() => setShowProfile360(true)}
                                className="mt-6 w-full h-12 bg-zinc-900 text-white rounded-xl shadow-lg border border-zinc-800 flex items-center justify-center gap-2 hover:bg-black transition-all hover:scale-105 group"
                            >
                                <Sparkles className="w-4 h-4 text-[#b4c885] group-hover:rotate-12 transition-transform" />
                                <span className="font-black text-xs uppercase tracking-widest">Ver Perfil 360°</span>
                            </button>
                        )}
                    </div>

                    {/* Decorative Elements or Summary */}
                    <div className="mt-auto w-full space-y-2 opacity-50">
                        <div className="bg-white p-3 rounded-xl border border-zinc-100 flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#b4c885]/10 rounded-lg flex items-center justify-center text-[#b4c885]">
                                <User className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="h-1.5 w-12 bg-zinc-100 rounded-full mb-1" />
                                <div className="h-1.5 w-20 bg-zinc-100 rounded-full" />
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-zinc-100 flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#b4c885]/10 rounded-lg flex items-center justify-center text-[#b4c885]">
                                <Trophy className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="h-1.5 w-16 bg-zinc-100 rounded-full mb-1" />
                                <div className="h-1.5 w-10 bg-zinc-100 rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Scrollable Form */}
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                    <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scroll-smooth">

                        {/* Section 1: Personal + Sports */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            {/* Personal Data */}
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2 text-xs font-black text-[#b4c885] uppercase tracking-[0.2em] mb-4 border-b border-zinc-100 pb-2">
                                    <User className="w-4 h-4" />
                                    Datos Personales
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Label>FOTO PERFIL</Label>
                                        <div className="flex-1">
                                            <label className="flex items-center justify-center gap-2 w-full h-10 bg-zinc-50 border border-zinc-200 border-dashed hover:border-proneo-green hover:bg-proneo-green/5 rounded-sm cursor-pointer transition-all group" title="Subir Foto">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;

                                                        // 1. Create local preview immediately (Base64)
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            const base64String = reader.result as string;
                                                            // Set immediately so user sees it locally
                                                            handleInputChange({ target: { name: 'photoUrl', value: base64String } } as any);
                                                        };
                                                        reader.readAsDataURL(file);

                                                        // 2. Try Upload to Firebase (if not demo mode)
                                                        // We import isDemoMode dynamically or check config
                                                        const { isDemoMode } = await import('../firebase/config');

                                                        if (!isDemoMode) {
                                                            try {
                                                                const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                                                                const { storage } = await import('../firebase/config');
                                                                const storageRef = ref(storage, `players/${crypto.randomUUID()}_${file.name}`);
                                                                const snapshot = await uploadBytes(storageRef, file);
                                                                const url = await getDownloadURL(snapshot.ref);
                                                                // If upload succeeds, overwrite the base64 with the real URL
                                                                handleInputChange({ target: { name: 'photoUrl', value: url } } as any);
                                                            } catch (error) {
                                                                console.warn("Upload failed (using local preview):", error);
                                                                // Keeps the base64 version which is already set
                                                            }
                                                        }
                                                    }}
                                                />
                                                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-proneo-green uppercase tracking-widest transition-colors">
                                                    {formData.photoUrl ? 'Cambiar Foto' : '+ Subir Foto'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>NOMBRE</Label>
                                        <Input name="firstName" value={formData.firstName} onChange={handleInputChange} />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>PRIMER APELLIDO</Label>
                                        <Input name="lastName1" value={formData.lastName1} onChange={handleInputChange} />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>SEGUNDO APELLIDO</Label>
                                        <Input name="lastName2" value={formData.lastName2} onChange={handleInputChange} />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>NACIONALIDAD</Label>
                                        <div className="flex-1 flex gap-2">
                                            <Input name="nationality" value={formData.nationality} onChange={handleInputChange} />
                                            {!showNat2 && (
                                                <button
                                                    onClick={() => setShowNat2(true)}
                                                    className="w-10 h-10 bg-zinc-100 hover:bg-[#b4c885]/20 text-zinc-400 hover:text-[#b4c885] rounded-sm flex items-center justify-center transition-all"
                                                    title="Añadir Segunda Nacionalidad"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {showNat2 && (
                                        <div className="flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                                            <Label>NACIONALIDAD 2</Label>
                                            <div className="flex-1 flex gap-2">
                                                <Input name="nationality2" value={formData.nationality2} onChange={handleInputChange} placeholder="Opcional" />
                                                <button
                                                    onClick={() => {
                                                        setShowNat2(false);
                                                        setFormData(prev => ({ ...prev, nationality2: '' }));
                                                    }}
                                                    className="w-10 h-10 bg-zinc-50 hover:bg-red-50 text-zinc-300 hover:text-red-500 rounded-sm flex items-center justify-center transition-all"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <Label>FECHA NACIMIENTO</Label>
                                        <Input type="date" name="birthDate" value={formData.birthDate} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>

                            {/* Sports Data */}
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2 text-xs font-black text-[#b4c885] uppercase tracking-[0.2em] mb-4 border-b border-zinc-100 pb-2">
                                    <Trophy className="w-4 h-4" />
                                    Datos Deportivos
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Label>CATEGORÍA</Label>
                                        <Select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                            options={['Fútbol', 'F. Sala', 'Femenino']}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>POSICIÓN</Label>
                                        <Select
                                            name="position"
                                            value={formData.position}
                                            onChange={handleInputChange}
                                            options={systemLists.positions}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>PIERNA HÁBIL</Label>
                                        <Select
                                            name="preferredFoot"
                                            value={formData.preferredFoot}
                                            onChange={handleInputChange}
                                            options={systemLists.feet || []}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>SELECCIÓN</Label>
                                        <Select
                                            name="selection"
                                            value={formData.selection}
                                            onChange={handleInputChange}
                                            options={systemLists.selections || []}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>DIVISIÓN</Label>
                                        <Select
                                            name="division"
                                            value={formData.division}
                                            onChange={handleInputChange}
                                            options={['', ...(systemLists as any).divisions || []]}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>MARCA DEPORTIVA</Label>
                                        <div className="flex-1 flex gap-2">
                                            <Select
                                                name="sportsBrand"
                                                value={formData.sportsBrand}
                                                onChange={handleInputChange}
                                                options={systemLists.brands}
                                            />
                                            {!showBrand2 && (
                                                <button
                                                    onClick={() => setShowBrand2(true)}
                                                    className="w-10 h-10 bg-zinc-100 hover:bg-[#b4c885]/20 text-zinc-400 hover:text-[#b4c885] rounded-sm flex items-center justify-center transition-all"
                                                    title="Añadir Segunda Marca"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>FIN MARCA DEPORTIVA</Label>
                                        <Input type="date" name="sportsBrandEndDate" value={formData.sportsBrandEndDate} onChange={handleInputChange} />
                                    </div>

                                    {showBrand2 && (
                                        <>
                                            <div className="flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                                                <Label>MARCA DEPORTIVA 2</Label>
                                                <div className="flex-1 flex gap-2">
                                                    <Select
                                                        name="sportsBrand2"
                                                        value={formData.sportsBrand2}
                                                        onChange={handleInputChange}
                                                        options={['', ...systemLists.brands]}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            setShowBrand2(false);
                                                            setFormData(prev => ({ ...prev, sportsBrand2: '', sportsBrandEndDate2: '' }));
                                                        }}
                                                        className="w-10 h-10 bg-zinc-50 hover:bg-red-50 text-zinc-300 hover:text-red-500 rounded-sm flex items-center justify-center transition-all"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                                                <Label>FIN MARCA 2</Label>
                                                <Input type="date" name="sportsBrandEndDate2" value={formData.sportsBrandEndDate2} onChange={handleInputChange} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Club & Agency */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            {/* Club Data */}
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2 text-xs font-black text-[#b4c885] uppercase tracking-[0.2em] mb-4 border-b border-zinc-100 pb-2">
                                    <Building2 className="w-4 h-4" />
                                    Situación Contractual
                                </h3>
                                <div className="space-y-3">
                                    {/* Loan Section - Aligned */}
                                    <div className="space-y-3 border-y border-dashed border-zinc-200 py-4 my-2">
                                        <div className="flex items-center justify-between">
                                            <Label>¿CEDIDO?</Label>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-bold ${formData.loanData?.isLoaned ? 'text-zinc-400' : 'text-zinc-800'}`}>NO</span>
                                                <button
                                                    onClick={() => {
                                                        const isLoaned = !formData.loanData?.isLoaned;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            loanData: {
                                                                ...prev.loanData,
                                                                isLoaned,
                                                                ownerClub: isLoaned ? (prev.loanData?.ownerClub || '') : ''
                                                            }
                                                        }));
                                                    }}
                                                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${formData.loanData?.isLoaned ? 'bg-[#b4c885]' : 'bg-zinc-200'}`}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${formData.loanData?.isLoaned ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                                <span className={`text-xs font-bold ${formData.loanData?.isLoaned ? 'text-zinc-800' : 'text-zinc-400'}`}>SI</span>
                                            </div>
                                        </div>

                                        {formData.loanData?.isLoaned && (
                                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                                <Label>CLUB PROPIETARIO</Label>
                                                <Select
                                                    name="loanData.ownerClub"
                                                    value={formData.loanData?.ownerClub}
                                                    onChange={handleInputChange}
                                                    options={formData.category === 'F. Sala' ? ((systemLists as any).clubs_futsal || []) : systemLists.clubs}
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3">
                                            <Label>{formData.loanData?.isLoaned ? 'CLUB DESTINO' : 'EQUIPO'}</Label>
                                            <Select
                                                name="club"
                                                value={formData.club}
                                                onChange={handleInputChange}
                                                options={formData.category === 'F. Sala' ? ((systemLists as any).clubs_futsal || []) : systemLists.clubs}
                                            />
                                        </div>

                                        {formData.loanData?.isLoaned && (
                                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                                <Label>FIN CESIÓN</Label>
                                                <Input type="date" name="loanData.loanEndDate" value={formData.loanData?.loanEndDate} onChange={handleInputChange} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>LIGA</Label>
                                        <Select
                                            name="league"
                                            value={formData.league}
                                            onChange={handleInputChange}
                                            options={systemLists.leagues}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>FECHA FIN CONTRATO</Label>
                                        <Input type="date" name="contract.endDate" value={formData.contract?.endDate} onChange={handleInputChange} />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>OPCIONAL</Label>
                                        <Input name="contract.optional" value={formData.contract?.optional} onChange={handleInputChange} placeholder="Si / No" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>FECHA AVISO OPCIONAL</Label>
                                        <Input type="date" name="contract.optionalNoticeDate" value={formData.contract?.optionalNoticeDate} onChange={handleInputChange} />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>CONDICIONES</Label>
                                        <Input name="contract.conditions" value={formData.contract?.conditions} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>

                            {/* Agency Data */}
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2 text-xs font-black text-[#b4c885] uppercase tracking-[0.2em] mb-4 border-b border-zinc-100 pb-2">
                                    <Briefcase className="w-4 h-4" />
                                    Datos Agencia
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Label>SEGUIMIENTO</Label>
                                        <div className="flex-1 flex gap-2">
                                            <Select
                                                name="monitoringAgent"
                                                value={formData.monitoringAgent}
                                                onChange={handleInputChange}
                                                options={systemLists.agents}
                                            />
                                            {!showAgent2 && (
                                                <button
                                                    onClick={() => setShowAgent2(true)}
                                                    className="w-10 h-10 bg-zinc-100 hover:bg-[#b4c885]/20 text-zinc-400 hover:text-[#b4c885] rounded-sm flex items-center justify-center transition-all"
                                                    title="Añadir Segundo Agente de Seguimiento"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {showAgent2 && (
                                        <div className="flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                                            <Label>SEGUIMIENTO 2</Label>
                                            <div className="flex-1 flex gap-2">
                                                <Select
                                                    name="monitoringAgent2"
                                                    value={formData.monitoringAgent2}
                                                    onChange={handleInputChange}
                                                    options={['', ...systemLists.agents]}
                                                />
                                                <button
                                                    onClick={() => {
                                                        setShowAgent2(false);
                                                        setFormData(prev => ({ ...prev, monitoringAgent2: '' }));
                                                    }}
                                                    className="w-10 h-10 bg-zinc-50 hover:bg-red-50 text-zinc-300 hover:text-red-500 rounded-sm flex items-center justify-center transition-all"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <Label>FECHA CONTRATO</Label>
                                        <Input type="date" name="proneo.contractDate" value={formData.proneo?.contractDate} onChange={handleInputChange} />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label>FECHA FIN AGENCIA</Label>
                                        <Input type="date" name="proneo.agencyEndDate" value={formData.proneo?.agencyEndDate} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Details Section - Compact */}
                        <div className="mt-4 pt-4 border-t border-zinc-100">
                            <h3 className="text-xs font-black text-[#b4c885] uppercase tracking-[0.2em] mb-6 text-center">Detalles Económicos del Contrato</h3>

                            <div className="space-y-4">
                                {(formData.contractYears || []).map((year, index) => (
                                    <div key={year.id} className="flex flex-col md:flex-row items-end gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-100 relative group">
                                        <button
                                            onClick={() => {
                                                const newYears = formData.contractYears?.filter(y => y.id !== year.id);
                                                setFormData(prev => ({ ...prev, contractYears: newYears }));
                                            }}
                                            className="absolute -right-2 -top-2 w-6 h-6 bg-red-50 text-red-400 hover:bg-red-100 rounded-full flex items-center justify-center transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash className="w-3 h-3" />
                                        </button>

                                        <div className="flex-1 space-y-1">
                                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider ml-1">Temporada</span>
                                            <Input
                                                placeholder="Ej: 2024/25"
                                                value={year.year}
                                                onChange={(e) => {
                                                    const newYears = [...(formData.contractYears || [])];
                                                    newYears[index] = { ...newYears[index], year: e.target.value };
                                                    setFormData(prev => ({ ...prev, contractYears: newYears }));
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider ml-1">Salario</span>
                                                <select
                                                    value={year.currency || 'EUR'}
                                                    onChange={(e) => {
                                                        const newYears = [...(formData.contractYears || [])];
                                                        newYears[index] = { ...newYears[index], currency: e.target.value };
                                                        setFormData(prev => ({ ...prev, contractYears: newYears }));
                                                    }}
                                                    className="text-[9px] font-bold text-zinc-500 bg-transparent outline-none cursor-pointer hover:text-zinc-800"
                                                >
                                                    <option value="EUR">EUR (€)</option>
                                                    <option value="USD">USD ($)</option>
                                                    <option value="GBP">GBP (£)</option>
                                                    <option value="JPY">JPY (¥)</option>
                                                    <option value="AUD">AUD ($)</option>
                                                </select>
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={year.salary === 0 ? '' : year.salary}
                                                    onChange={(e) => {
                                                        const newYears = [...(formData.contractYears || [])];
                                                        newYears[index] = { ...newYears[index], salary: e.target.value as any };
                                                        setFormData(prev => ({ ...prev, contractYears: newYears }));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="w-32 space-y-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider ml-1">Club</span>
                                                <button
                                                    onClick={() => {
                                                        const newYears = [...(formData.contractYears || [])];
                                                        const currentType = newYears[index].clubCommissionType || 'percentage';
                                                        newYears[index] = { ...newYears[index], clubCommissionType: currentType === 'percentage' ? 'fixed' : 'percentage' };
                                                        setFormData(prev => ({ ...prev, contractYears: newYears }));
                                                    }}
                                                    className="bg-zinc-200 hover:bg-zinc-300 text-zinc-600 px-2 rounded text-[9px] font-bold uppercase transition-colors"
                                                >
                                                    {year.clubCommissionType === 'fixed' ? 'FIJO' : '%'}
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={year.clubCommissionType === 'fixed' ? year.clubCommissionFixed : year.clubCommissionPct}
                                                    onChange={(e) => {
                                                        const newYears = [...(formData.contractYears || [])];
                                                        const val = Number(e.target.value);
                                                        if (year.clubCommissionType === 'fixed') {
                                                            newYears[index] = { ...newYears[index], clubCommissionFixed: val };
                                                        } else {
                                                            newYears[index] = { ...newYears[index], clubCommissionPct: val };
                                                        }
                                                        setFormData(prev => ({ ...prev, contractYears: newYears }));
                                                    }}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                                                    {year.clubCommissionType === 'fixed' ? (year.currency === 'USD' ? '$' : year.currency === 'GBP' ? '£' : '€') : '%'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-32 space-y-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider ml-1">Jugador</span>
                                                <button
                                                    onClick={() => {
                                                        const newYears = [...(formData.contractYears || [])];
                                                        const currentType = newYears[index].playerCommissionType || 'percentage';
                                                        newYears[index] = { ...newYears[index], playerCommissionType: currentType === 'percentage' ? 'fixed' : 'percentage' };
                                                        setFormData(prev => ({ ...prev, contractYears: newYears }));
                                                    }}
                                                    className="bg-zinc-200 hover:bg-zinc-300 text-zinc-600 px-2 rounded text-[9px] font-bold uppercase transition-colors"
                                                >
                                                    {year.playerCommissionType === 'fixed' ? 'FIJO' : '%'}
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={year.playerCommissionType === 'fixed' ? year.playerCommissionFixed : year.playerCommissionPct}
                                                    onChange={(e) => {
                                                        const newYears = [...(formData.contractYears || [])];
                                                        const val = Number(e.target.value);
                                                        if (year.playerCommissionType === 'fixed') {
                                                            newYears[index] = { ...newYears[index], playerCommissionFixed: val };
                                                        } else {
                                                            newYears[index] = { ...newYears[index], playerCommissionPct: val };
                                                        }
                                                        setFormData(prev => ({ ...prev, contractYears: newYears }));
                                                    }}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                                                    {year.playerCommissionType === 'fixed' ? (year.currency === 'USD' ? '$' : year.currency === 'GBP' ? '£' : '€') : '%'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-28 flex flex-col items-end justify-center pb-2">
                                            <span className="text-[9px] font-bold text-zinc-400 uppercase">Comisión Total</span>
                                            <span className="text-sm font-black text-[#b4c885]">
                                                {(() => {
                                                    const salary = Number(year.salary) || 0;
                                                    const clubComm = year.clubCommissionType === 'fixed'
                                                        ? (Number(year.clubCommissionFixed) || 0)
                                                        : (salary * (Number(year.clubCommissionPct) || 0) / 100);

                                                    const playerComm = year.playerCommissionType === 'fixed'
                                                        ? (Number(year.playerCommissionFixed) || 0)
                                                        : (salary * (Number(year.playerCommissionPct) || 0) / 100);

                                                    const total = clubComm + playerComm;

                                                    return total.toLocaleString('es-ES', {
                                                        style: 'currency',
                                                        currency: year.currency || 'EUR',
                                                        maximumFractionDigits: 0
                                                    });
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => {
                                        const newYear: ContractYear = {
                                            id: crypto.randomUUID(),
                                            year: '',
                                            salary: 0,
                                            currency: 'EUR',
                                            clubCommissionType: 'percentage',
                                            clubCommissionPct: 10,
                                            clubCommissionFixed: 0,
                                            playerCommissionType: 'percentage',
                                            playerCommissionPct: 0,
                                            playerCommissionFixed: 0,
                                            clubPayment: { status: 'Pendiente', dueDate: '', isPaid: false },
                                            playerPayment: { status: 'Pendiente', dueDate: '', isPaid: false },
                                            globalStatus: 'Pendiente'
                                        };
                                        setFormData(prev => ({
                                            ...prev,
                                            contractYears: [...(prev.contractYears || []), newYear]
                                        }));
                                    }}
                                    className="w-full h-10 border-2 border-dashed border-zinc-200 rounded-xl flex items-center justify-center gap-2 text-zinc-400 hover:text-[#b4c885] hover:border-[#b4c885] transition-all font-bold text-xs uppercase tracking-widest"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Añadir Año</span>
                                </button>
                            </div>
                        </div>


                        {/* Contract Repository Section */}
                        <div className="mt-8 pt-8 border-t border-zinc-100">
                            <h3 className="flex items-center justify-center gap-2 text-xs font-black text-[#b4c885] uppercase tracking-[0.2em] mb-6">
                                <FileText className="w-4 h-4" />
                                Repositorio de Contratos
                            </h3>

                            <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 space-y-6">
                                {/* Upload Area */}
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-300 border-dashed rounded-2xl cursor-pointer bg-white hover:bg-zinc-50 transition-colors group">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <UploadCloud className="w-8 h-8 mb-3 text-zinc-400 group-hover:text-[#b4c885] transition-colors" />
                                            <p className="mb-1 text-xs font-bold text-zinc-500">
                                                <span className="text-zinc-800">Click para subir</span> o arrastra el archivo
                                            </p>
                                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">PDF (Máx. 5MB)</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".pdf"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                if (file.type !== 'application/pdf') {
                                                    alert("Solo se permiten archivos PDF para contratos.");
                                                    return;
                                                }

                                                if (file.size > 5 * 1024 * 1024) {
                                                    alert("El archivo excede los 5MB.");
                                                    return;
                                                }

                                                // Upload Logic
                                                const { isDemoMode } = await import('../firebase/config');
                                                let downloadUrl = '';

                                                if (isDemoMode) {
                                                    // In demo mode, we fake it
                                                    downloadUrl = URL.createObjectURL(file);
                                                } else {
                                                    try {
                                                        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                                                        const { storage } = await import('../firebase/config');
                                                        const storageRef = ref(storage, `contracts/${crypto.randomUUID()}_${file.name}`);
                                                        const snapshot = await uploadBytes(storageRef, file);
                                                        downloadUrl = await getDownloadURL(snapshot.ref);
                                                    } catch (error) {
                                                        console.error("Upload error:", error);
                                                        alert("Error al subir el archivo.");
                                                        return;
                                                    }
                                                }

                                                const newDoc = {
                                                    id: crypto.randomUUID(),
                                                    name: file.name,
                                                    url: downloadUrl,
                                                    type: 'contract' as const,
                                                    date: new Date().toISOString()
                                                };

                                                setFormData(prev => ({
                                                    ...prev,
                                                    documents: [...(prev.documents || []), newDoc]
                                                }));
                                            }}
                                        />
                                    </label>
                                </div>

                                {/* File List */}
                                <div className="space-y-3">
                                    {(formData.documents || []).filter(d => d.type === 'contract').length === 0 && (
                                        <p className="text-center text-xs text-zinc-400 font-medium py-4">No hay contratos adjuntos.</p>
                                    )}
                                    {(formData.documents || [])
                                        .filter(d => d.type === 'contract') // Only show contracts
                                        .map((doc) => (
                                            <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-xl group hover:border-[#b4c885] transition-all">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center shrink-0">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-zinc-800 truncate">{doc.name}</p>
                                                        <p className="text-[9px] font-bold text-zinc-400 uppercase">{new Date(doc.date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={doc.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-8 h-8 rounded-full bg-zinc-50 hover:bg-[#b4c885] hover:text-white text-zinc-400 flex items-center justify-center transition-all"
                                                        title="Ver / Descargar Contrato"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm("¿Eliminar este contrato?")) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    documents: prev.documents?.filter(d => d.id !== doc.id)
                                                                }));
                                                            }
                                                        }}
                                                        className="w-8 h-8 rounded-full bg-zinc-50 hover:bg-red-500 hover:text-white text-zinc-400 flex items-center justify-center transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Fields Section */}
                        {schema.length > 0 && (
                            <div className="mt-8 pt-8 border-t border-zinc-100">
                                <h3 className="text-xs font-black text-[#b4c885] uppercase tracking-[0.2em] mb-6 text-center">Campos Personalizados</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {schema
                                        .filter(field => field.category === 'General' || field.category === formData.category)
                                        .map(field => (
                                            <div key={field.id} className="flex items-center gap-3">
                                                <Label>{field.label}</Label>
                                                {field.type === 'boolean' ? (
                                                    <div className="flex-1 flex items-center h-10 px-4 bg-zinc-50 border border-zinc-100 rounded-sm">
                                                        <input
                                                            type="checkbox"
                                                            name={`customFields.${field.id}`}
                                                            checked={!!(formData.customFields as any)?.[field.id]}
                                                            onChange={(e) => {
                                                                const val = e.target.checked;
                                                                setFormData((prev: any) => ({
                                                                    ...prev,
                                                                    customFields: { ...prev.customFields, [field.id]: val }
                                                                }));
                                                            }}
                                                            className="w-4 h-4 rounded border-zinc-300 text-[#b4c885] focus:ring-[#b4c885]"
                                                        />
                                                        <span className="ml-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Activo</span>
                                                    </div>
                                                ) : field.type === 'select' ? (
                                                    <Select
                                                        name={`customFields.${field.id}`}
                                                        value={(formData.customFields as any)?.[field.id] || ''}
                                                        onChange={handleInputChange}
                                                        options={['', ...(field.options || [])]}
                                                    />
                                                ) : (
                                                    <Input
                                                        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                                                        name={`customFields.${field.id}`}
                                                        value={(formData.customFields as any)?.[field.id] || ''}
                                                        onChange={handleInputChange}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Footer Spacer */}
                        <div className="h-12" />
                    </div>

                    {/* Fixed Footer for Save Action */}
                    <div className="p-6 bg-white border-t border-zinc-100 flex justify-between gap-4 shrink-0">
                        <div>
                            {onDelete && initialData && (
                                <button
                                    onClick={handleDeleteClick}
                                    disabled={deleting || saving}
                                    className="px-6 h-12 rounded-xl bg-red-50 text-red-500 font-black hover:bg-red-100 transition-all uppercase tracking-wider text-xs flex items-center gap-2 group"
                                >
                                    {deleting ? (
                                        <div className="w-4 h-4 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                                    ) : (
                                        <Trash className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    )}
                                    {deleting ? 'Eliminando...' : 'Eliminar Jugador'}
                                </button>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={onClose}
                                className="px-8 h-12 rounded-xl border border-zinc-200 text-zinc-400 font-bold hover:bg-zinc-50 transition-all uppercase tracking-wider text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || deleting}
                                className="bg-[#b4c885] hover:bg-[#a3b774] text-white px-10 h-12 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerForm;

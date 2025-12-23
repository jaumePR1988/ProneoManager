import React, { useState } from 'react';
import {
    Check,
    Save,
    X,
    ChevronDown,
    Trash,
    Plus
} from 'lucide-react';
import { Player, Category, Position, PreferredFoot, PayerType, ContractYear } from '../types/player';
import { usePlayers } from '../hooks/usePlayers';

interface PlayerFormProps {
    onClose: () => void;
    onSave: (data: Partial<Player>) => Promise<void>;
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
        className="flex-1 bg-white border border-zinc-300 rounded-sm px-4 h-10 text-sm font-bold text-zinc-700 outline-none focus:border-[#b4c885] transition-all"
    />
);

const Select = ({ name, value, onChange, options }: { name: string, value: any, onChange: any, options: string[] }) => (
    <div className="flex-1 relative">
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full bg-[#f0f0f0] border border-zinc-300 rounded-sm px-4 h-10 text-sm font-bold text-zinc-700 outline-none appearance-none cursor-pointer"
        >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
    </div>
);

const PlayerForm: React.FC<PlayerFormProps> = ({ onClose, onSave, isScoutingInitial = false, initialData = null }) => {
    const { schema, systemLists } = usePlayers(false);
    const [formData, setFormData] = useState<Partial<Player>>(() => {
        if (initialData) {
            return {
                ...initialData,
                customFields: initialData.customFields || {}
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
            sportsBrand: initialData?.sportsBrand || 'Joma',
            sportsBrandEndDate: initialData?.sportsBrandEndDate || '',
            selection: initialData?.selection || '',
            monitoringAgent: initialData?.monitoringAgent || 'Jaume',
            seasons: initialData?.seasons || [],
            salaries: initialData?.salaries || { year1: 0, year2: 0, year3: 0, year4: 0 },
            contractYears: initialData?.contractYears || [],
            customFields: initialData?.customFields || {},
            documents: initialData?.documents || []
        } as Partial<Player>;
    });
    const [showSuccess, setShowSuccess] = useState(false);
    const [saving, setSaving] = useState(false);

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
                    salary: Number(y.salary) || 0,
                    clubCommissionPct: Number(y.clubCommissionPct) || 0,
                    playerCommissionPct: Number(y.playerCommissionPct) || 0
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white p-4 md:p-8 overflow-y-auto">
            {showSuccess && (
                <div className="fixed inset-0 z-[120] bg-white/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-white p-6 rounded-[30px] shadow-2xl border border-zinc-100 flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-[#b4c885] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#b4c885]/30">
                            <Check className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-zinc-800 uppercase tracking-widest">¡Datos Guardados!</h3>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">El jugador ha sido actualizado correctamente</p>
                    </div>
                </div>
            )}
            {/* Reduced vertical padding here */}
            <div className="w-full max-w-6xl space-y-4 animate-fade-in relative py-4">
                <button
                    onClick={onClose}
                    className="fixed top-4 right-4 p-3 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-all z-[110] bg-white/80 backdrop-blur-md shadow-sm"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Header with Logo and Title */}
                <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center gap-8 w-full justify-between">
                        <img src="/logo-full.png" alt="Proneo Sports" className="h-12 object-contain" />
                        <h1 className="text-lg font-bold text-zinc-800 tracking-widest uppercase text-center flex-1 border-b-2 border-zinc-100 pb-1">
                            {initialData ? 'EDITAR DATOS' : 'BASE DATOS'} JUGADORES/ENTRENADORES PRONEOSPORTS SL
                        </h1>
                        <div className="w-32" /> {/* Spacer to balance logo */}
                    </div>
                </div>

                {/* Main Form Container - Reduced Padding */}
                <div className="bg-white border-[3px] border-[#b4c885] rounded-[40px] p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">

                        {/* Left Column: Personal & Sports */}
                        <div className="space-y-8">
                            {/* Personal Data */}
                            <div>
                                <h3 className="text-xs font-black text-[#b4c885] uppercase tracking-[0.2em] mb-6 border-b border-zinc-100 pb-2">Datos Personales</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <Label>NOMBRE</Label>
                                        <Input name="firstName" value={formData.firstName} onChange={handleInputChange} />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>PRIMER APELLIDO</Label>
                                        <Input name="lastName1" value={formData.lastName1} onChange={handleInputChange} />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>SEGUNDO APELLIDO</Label>
                                        <Input name="lastName2" value={formData.lastName2} onChange={handleInputChange} />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>NACIONALIDAD</Label>
                                        <Input name="nationality" value={formData.nationality} onChange={handleInputChange} />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>FECHA NACIMIENTO</Label>
                                        <Input type="date" name="birthDate" value={formData.birthDate} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>

                            {/* Sports Data */}
                            <div>
                                <h3 className="text-xs font-black text-[#b4c885] uppercase tracking-[0.2em] mb-6 border-b border-zinc-100 pb-2">Datos Deportivos</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <Label>DEPORTE</Label>
                                        <Select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                            options={['Fútbol', 'F. Sala', 'Femenino', 'Entrenadores']}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>POSICIÓN</Label>
                                        <Select
                                            name="position"
                                            value={formData.position}
                                            onChange={handleInputChange}
                                            options={systemLists.positions}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>PIERNA HÁBIL</Label>
                                        <Select
                                            name="preferredFoot"
                                            value={formData.preferredFoot}
                                            onChange={handleInputChange}
                                            options={systemLists.feet || []}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>SELECCIÓN</Label>
                                        <Select
                                            name="selection"
                                            value={formData.selection}
                                            onChange={handleInputChange}
                                            options={systemLists.selections || []}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>MARCA DEPORTIVA</Label>
                                        <Select
                                            name="sportsBrand"
                                            value={formData.sportsBrand}
                                            onChange={handleInputChange}
                                            options={systemLists.brands}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>FIN MARCA DEPORTIVA</Label>
                                        <Input type="date" name="sportsBrandEndDate" value={formData.sportsBrandEndDate} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Club & Agency */}
                        <div className="space-y-8">
                            {/* Club Data */}
                            <div>
                                <h3 className="text-xs font-black text-[#b4c885] uppercase tracking-[0.2em] mb-6 border-b border-zinc-100 pb-2">Situación Club</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <Label>EQUIPO</Label>
                                        <Select
                                            name="club"
                                            value={formData.club}
                                            onChange={handleInputChange}
                                            options={systemLists.clubs}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>LIGA</Label>
                                        <Select
                                            name="league"
                                            value={formData.league}
                                            onChange={handleInputChange}
                                            options={systemLists.leagues}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>FECHA FIN CONTRATO</Label>
                                        <Input type="date" name="contract.endDate" value={formData.contract?.endDate} onChange={handleInputChange} />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>OPCIONAL</Label>
                                        <Input name="contract.optional" value={formData.contract?.optional} onChange={handleInputChange} placeholder="Si / No" />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>FECHA AVISO OPCIONAL</Label>
                                        <Input type="date" name="contract.optionalNoticeDate" value={formData.contract?.optionalNoticeDate} onChange={handleInputChange} />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>CONDICIONES</Label>
                                        <Input name="contract.conditions" value={formData.contract?.conditions} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>

                            {/* Agency Data */}
                            <div>
                                <h3 className="text-xs font-black text-[#b4c885] uppercase tracking-[0.2em] mb-6 border-b border-zinc-100 pb-2">Datos Agencia</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <Label>SEGUIMIENTO</Label>
                                        <Select
                                            name="monitoringAgent"
                                            value={formData.monitoringAgent}
                                            onChange={handleInputChange}
                                            options={systemLists.agents}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>FECHA CONTRATO</Label>
                                        <Input type="date" name="proneo.contractDate" value={formData.proneo?.contractDate} onChange={handleInputChange} />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Label>FECHA FIN AGENCIA</Label>
                                        <Input type="date" name="proneo.agencyEndDate" value={formData.proneo?.agencyEndDate} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Details Section - Compact */}
                        <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t border-zinc-100">
                            <h3 className="text-xs font-black text-[#b4c885] uppercase tracking-[0.2em] mb-4 text-center">Detalles Económicos del Contrato</h3>

                            <div className="space-y-4">
                                {(formData.contractYears || []).map((year, index) => (
                                    <div key={year.id} className="flex flex-col md:flex-row items-end gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-100 relative group">
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
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider ml-1">Temporada</span>
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
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider ml-1">Salario</span>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={year.salary === 0 ? '' : year.salary}
                                                    onChange={(e) => {
                                                        const newYears = [...(formData.contractYears || [])];
                                                        // Temporarily store as string to allow seamless typing
                                                        newYears[index] = { ...newYears[index], salary: e.target.value as any };
                                                        setFormData(prev => ({ ...prev, contractYears: newYears }));
                                                    }}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">€</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider ml-1">% Club</span>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={year.clubCommissionPct}
                                                    onChange={(e) => {
                                                        const newYears = [...(formData.contractYears || [])];
                                                        newYears[index] = { ...newYears[index], clubCommissionPct: e.target.value as any };
                                                        setFormData(prev => ({ ...prev, contractYears: newYears }));
                                                    }}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">%</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider ml-1">% Jugador</span>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={year.playerCommissionPct}
                                                    onChange={(e) => {
                                                        const newYears = [...(formData.contractYears || [])];
                                                        newYears[index] = { ...newYears[index], playerCommissionPct: e.target.value as any };
                                                        setFormData(prev => ({ ...prev, contractYears: newYears }));
                                                    }}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">%</span>
                                            </div>
                                        </div>
                                        <div className="w-32 flex flex-col items-end justify-center pb-2">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Comisión Total</span>
                                            <span className="text-sm font-black text-[#b4c885]">
                                                {((Number(year.salary) * (Number(year.clubCommissionPct) / 100)) + (Number(year.salary) * (Number(year.playerCommissionPct) / 100))).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
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
                                            clubCommissionPct: 10, // Default to 10%
                                            playerCommissionPct: 0
                                        };
                                        setFormData(prev => ({
                                            ...prev,
                                            contractYears: [...(prev.contractYears || []), newYear]
                                        }));
                                    }}
                                    className="w-full h-10 border-2 border-dashed border-zinc-200 rounded-xl flex items-center justify-center gap-2 text-zinc-400 hover:text-[#b4c885] hover:border-[#b4c885] transition-all font-bold text-xs uppercase tracking-widest"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Añadir Año de Contrato</span>
                                </button>
                            </div>
                        </div>

                        {/* Dynamic Fields Section */}
                        {schema.length > 0 && (
                            <div className="col-span-1 md:col-span-2 mt-8 pt-8 border-t border-zinc-100">
                                <h3 className="text-xs font-black text-[#b4c885] uppercase tracking-[0.2em] mb-6 text-center">Campos Personalizados</h3>
                                {schema
                                    .filter(field => field.category === 'General' || field.category === formData.category)
                                    .map(field => (
                                        <div key={field.id} className="flex items-center gap-4">
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
                        )}
                    </div>

                    {/* Submit Button - Compact */}
                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[#b4c885] hover:bg-[#a3b774] text-white px-12 h-14 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
                        >
                            {saving ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
                            {saving ? 'GRABANDO...' : 'GRABAR DATOS'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerForm;

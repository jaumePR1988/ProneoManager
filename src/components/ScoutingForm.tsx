import React, { useState } from 'react';
import { X, Save, User, MapPin, Phone, Briefcase, Calendar } from 'lucide-react';
import { Player, Category, Position, PreferredFoot, ScoutingStatus } from '../types/player';

interface ScoutingFormProps {
    initialData?: Player;
    onClose: () => void;
    onSave: (data: Partial<Player>) => Promise<void>;
}

const ScoutingForm: React.FC<ScoutingFormProps> = ({ initialData, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Player>>(() => {
        const base = initialData || {
            firstName: '',
            lastName1: '',
            lastName2: '',
            displayName: '',
            birthDate: '',
            nationality: 'España',
            position: 'Ala',
            preferredFoot: 'Derecha',
            category: 'Fútbol',
            club: '',
            league: '',
            isScouting: true,
        };

        return {
            ...base,
            scouting: {
                currentAgent: '',
                agentEndDate: '',
                contractType: '',
                contractEnd: '',
                status: 'No contactado',
                notes: '',
                lastContactDate: new Date().toISOString().split('T')[0],
                ...(base.scouting || {})
            }
        };
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Ensure isScouting is true
            const dataToSave = { ...formData, isScouting: true };
            await onSave(dataToSave);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updateScoutingField = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            scouting: {
                ...prev.scouting,
                [field]: value
            } as any
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Sidebar */}
                <div className="w-full md:w-80 bg-zinc-900 text-white p-10 flex flex-col justify-between shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-proneo-green/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div>
                        <h2 className="text-2xl font-black italic tracking-tighter mb-2">NUEVO OBJETIVO</h2>
                        <p className="text-zinc-400 text-xs font-medium leading-relaxed">
                            Registra un jugador en seguimiento. Solo necesitamos los datos básicos y de contacto.
                        </p>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="bg-zinc-800/50 p-6 rounded-3xl border border-zinc-700/50 backdrop-blur-sm">
                            <Briefcase className="w-6 h-6 text-proneo-green mb-3" />
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">AGENTE ACTUAL</p>
                            <input
                                type="text"
                                value={formData.scouting?.currentAgent || ''}
                                onChange={(e) => updateScoutingField('currentAgent', e.target.value)}
                                placeholder="Nombre Agente"
                                className="w-full bg-transparent text-lg font-bold text-white placeholder-zinc-600 outline-none"
                            />
                        </div>

                        <div className="bg-zinc-800/50 p-6 rounded-3xl border border-zinc-700/50 backdrop-blur-sm">
                            <Calendar className="w-6 h-6 text-orange-400 mb-3" />
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">FIN CONTRATO AGENTE</p>
                            <input
                                type="date"
                                value={formData.scouting?.agentEndDate || ''}
                                onChange={(e) => updateScoutingField('agentEndDate', e.target.value)}
                                className="w-full bg-transparent text-lg font-bold text-white outline-none [color-scheme:dark]"
                            />
                        </div>

                        <div className="bg-zinc-800/50 p-6 rounded-3xl border border-zinc-700/50 backdrop-blur-sm">
                            <User className="w-6 h-6 text-blue-400 mb-3" />
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">AGENTE PRONEO</p>
                            <input
                                type="text"
                                value={formData.scouting?.contactPerson || ''}
                                onChange={(e) => updateScoutingField('contactPerson', e.target.value)}
                                placeholder="Quién contacta"
                                className="w-full bg-transparent text-lg font-bold text-white placeholder-zinc-600 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Main Form */}
                <form onSubmit={handleSubmit} className="flex-1 p-10 space-y-8 bg-white overflow-y-auto">

                    {/* Header Actions */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 rounded-full border border-zinc-100">
                            <div className={`w-2 h-2 rounded-full ${formData.scouting?.status === 'Negociando' ? 'bg-orange-500 animate-pulse' : 'bg-zinc-300'}`} />
                            <select
                                value={formData.scouting?.status || 'No contactado'}
                                onChange={(e) => updateScoutingField('status', e.target.value)}
                                className="bg-transparent text-[10px] font-black text-zinc-600 uppercase tracking-widest outline-none cursor-pointer"
                            >
                                <option value="No contactado">No contactado</option>
                                <option value="Contactado">Contactado</option>
                                <option value="Negociando">Negociando</option>
                            </select>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                            <X className="w-6 h-6 text-zinc-400" />
                        </button>
                    </div>

                    <div className="space-y-8">
                        {/* Section: Who are they? */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                                <User className="w-4 h-4 text-zinc-400" />
                                Datos Personales
                            </h3>

                            {/* Photo Upload Row */}
                            <div className="flex gap-4 items-center bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                                <div className="w-16 h-16 rounded-xl bg-white border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
                                    {formData.photoUrl ? (
                                        <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-6 h-6 text-zinc-300" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Foto Perfil</label>
                                    <label className="bg-zinc-900 hover:bg-zinc-800 text-white w-full h-10 flex items-center justify-center rounded-lg cursor-pointer transition-all shadow-sm active:scale-95 group" title="Subir desde ordenador">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                try {
                                                    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                                                    const { db, storage, isDemoMode } = await import('../firebase/config');
                                                    const storageRef = ref(storage, `scouting/${crypto.randomUUID()}_${file.name}`);
                                                    const snapshot = await uploadBytes(storageRef, file);
                                                    const url = await getDownloadURL(snapshot.ref);
                                                    updateField('photoUrl', url);
                                                } catch (error) {
                                                    console.error("Upload failed", error);
                                                    alert("Error al subir imagen");
                                                }
                                            }}
                                        />
                                        <span className="text-[10px] font-black uppercase flex items-center gap-2">
                                            {formData.photoUrl ? 'Cambiar Imagen' : 'Subir Imagen'}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nombre</label>
                                    <input
                                        required
                                        className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 font-bold text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all"
                                        value={formData.firstName || ''}
                                        onChange={e => updateField('firstName', e.target.value)}
                                        placeholder="Nombre"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Apellidos</label>
                                    <div className="flex gap-2">
                                        <input
                                            required
                                            className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 font-bold text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all"
                                            value={formData.lastName1 || ''}
                                            onChange={e => updateField('lastName1', e.target.value)}
                                            placeholder="1er Apellido"
                                        />
                                        <input
                                            className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 font-bold text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all"
                                            value={formData.lastName2 || ''}
                                            onChange={e => updateField('lastName2', e.target.value)}
                                            placeholder="2do Apellido"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nacionalidad</label>
                                    <input
                                        className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 font-bold text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all"
                                        value={formData.nationality || ''}
                                        onChange={e => updateField('nationality', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Fecha Nacimiento</label>
                                    <input
                                        type="date"
                                        className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 font-bold text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all"
                                        value={formData.birthDate || ''}
                                        onChange={e => updateField('birthDate', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-zinc-100" />

                        {/* Section: Sports Info */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-zinc-400" />
                                Datos Deportivos
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Club Actual</label>
                                    <input
                                        className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 font-bold text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all"
                                        value={formData.club || ''}
                                        onChange={e => updateField('club', e.target.value)}
                                        placeholder="Equipo"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Categoría</label>
                                    <select
                                        className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 font-bold text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all"
                                        value={formData.category || 'Fútbol'}
                                        onChange={e => updateField('category', e.target.value)}
                                    >
                                        <option value="Fútbol">Fútbol</option>
                                        <option value="F. Sala">F. Sala</option>
                                        <option value="Femenino">Femenino</option>
                                        <option value="Entrenadores">Entrenadores</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Posición</label>
                                    <select
                                        className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 font-bold text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all"
                                        value={formData.position || ''}
                                        onChange={e => updateField('position', e.target.value)}
                                    >
                                        <option value="Portero">Portero</option>
                                        <option value="Defensa">Defensa</option>
                                        <option value="Mediocentro">Mediocentro</option>
                                        <option value="Extremo">Extremo</option>
                                        <option value="Delantero">Delantero</option>
                                        <option value="Cierre">Cierre</option>
                                        <option value="Ala">Ala</option>
                                        <option value="Pivot">Pivot</option>
                                        <option value="Ala/Cierre">Ala/Cierre</option>
                                        <option value="Ala/Pivot">Ala/Pivot</option>
                                        <option value="Entrenador">Entrenador</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-zinc-100" />

                        {/* Section: Contact Log */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                                <Phone className="w-4 h-4 text-zinc-400" />
                                Registro de Contacto
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Último contacto</label>
                                    <input
                                        type="date"
                                        className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 font-bold text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all"
                                        value={formData.scouting?.lastContactDate || ''}
                                        onChange={e => updateScoutingField('lastContactDate', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Notas / Quién contactó</label>
                                    <textarea
                                        className="w-full h-24 bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-medium text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all resize-none"
                                        value={formData.scouting?.notes || ''}
                                        onChange={e => updateScoutingField('notes', e.target.value)}
                                        placeholder="Detalles sobre el contacto..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-10">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-black text-white h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                        >
                            {isSubmitting ? 'Guardando...' : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Guardar Objetivo
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScoutingForm;

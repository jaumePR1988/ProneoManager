import React, { useState } from 'react';
import { X, Save, User, Building2, Phone, Mail, Briefcase, Camera, Loader2 } from 'lucide-react';
import { Contact, ContactCategory } from '../types/contact';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

interface ContactFormProps {
    initialData?: Contact;
    defaultCategory?: string;
    onClose: () => void;
    onSave: (data: Partial<Contact>) => Promise<void>;
}

const ContactForm: React.FC<ContactFormProps> = ({ initialData, defaultCategory = 'Fútbol', onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Contact>>(initialData || {
        name: '',
        role: '',
        club: '',
        category: (defaultCategory as ContactCategory) || 'Fútbol',
        type: 'Club',
        phone: '',
        email: '',
        notes: '',
        photoUrl: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `contacts/${crypto.randomUUID()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            setFormData(prev => ({ ...prev, photoUrl: url }));
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Error al subir la imagen");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 relative">

                {/* Header Background Pattern */}
                <div className="absolute top-0 left-0 w-full h-32 bg-zinc-900 overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-proneo-green/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md z-20"
                >
                    <X className="w-5 h-5" />
                </button>

                <form onSubmit={handleSubmit} className="relative z-10 flex flex-col h-full max-h-[90vh]">

                    {/* Header Content */}
                    <div className="pt-8 pb-6 px-10 flex items-end gap-6">
                        {/* Avatar Upload */}
                        <div className="relative group shrink-0">
                            <div className="w-24 h-24 rounded-2xl bg-zinc-800 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center relative">
                                {formData.photoUrl ? (
                                    <img src={formData.photoUrl} alt="Contact" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-10 h-10 text-zinc-600" />
                                )}
                                {(isUploading) && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-proneo-green text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-emerald-600 transition-transform hover:scale-110 active:scale-95">
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                <Camera className="w-4 h-4" />
                            </label>
                        </div>

                        <div className="mb-2">
                            <h2 className="text-2xl font-black text-white italic tracking-tighter">
                                {initialData ? 'EDITAR CONTACTO' : 'NUEVO CONTACTO'}
                            </h2>
                            <p className="text-zinc-400 text-xs font-medium">Añade los datos de contacto y vinculación</p>
                        </div>
                    </div>

                    {/* Scrollable Form Content */}
                    <div className="flex-1 overflow-y-auto px-10 py-6 bg-white space-y-6">

                        {/* Section: Professional Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <User className="w-3 h-3" /> Nombre Completo
                                </label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej. Joan Laporta"
                                    className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 font-bold text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all placeholder:font-normal"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Briefcase className="w-3 h-3" /> Cargo / Rol
                                </label>
                                <input
                                    required
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    placeholder="Ej. Presidente, Dir. Deportivo..."
                                    className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 font-bold text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all placeholder:font-normal"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Building2 className="w-3 h-3" /> Club / Entidad
                                </label>
                                <input
                                    required
                                    value={formData.club}
                                    onChange={e => setFormData({ ...formData, club: e.target.value })}
                                    placeholder="Ej. FC Barcelona"
                                    className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 font-bold text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all placeholder:font-normal"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Especialidad</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value as ContactCategory })}
                                    className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 font-bold text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all appearance-none"
                                >
                                    <option value="Fútbol">Fútbol</option>
                                    <option value="F. Sala">Fútbol Sala</option>
                                    <option value="Femenino">Femenino</option>
                                    <option value="Entrenadores">Entrenadores</option>
                                    <option value="General">General</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-proneo-green">Tipo de Contacto</label>
                                <div className="flex p-1 bg-zinc-100 rounded-xl">
                                    {(['Club', 'Comunicación'] as const).map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: t })}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === t
                                                    ? 'bg-white text-proneo-green shadow-sm'
                                                    : 'text-zinc-400 hover:text-zinc-600'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-zinc-100" />

                        {/* Section: Contact Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Phone className="w-3 h-3" /> Teléfono
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+34 600 000 000"
                                    className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 font-medium text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Mail className="w-3 h-3" /> Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="contacto@club.com"
                                    className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-xl px-4 font-medium text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 h-12 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || isUploading}
                            className="px-8 h-12 bg-zinc-900 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Guardar Contacto
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default ContactForm;

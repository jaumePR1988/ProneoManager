import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, Save, Trash2 } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

interface Event {
    id?: string;
    title: string;
    type: 'match' | 'training' | 'meeting' | 'trip';
    start: string;
    end: string;
    location: string;
    description: string;
    relatedPlayerId?: string;
}

interface EventFormProps {
    event?: Event | null;
    selectedDate?: Date;
    onClose: () => void;
    onSave: () => void;
}

const EventForm: React.FC<EventFormProps> = ({ event, selectedDate, onClose, onSave }) => {
    const [formData, setFormData] = useState<Event>({
        title: '',
        type: 'meeting',
        start: selectedDate ? selectedDate.toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        end: selectedDate ? new Date(selectedDate.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16) : new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
        location: '',
        description: '',
        relatedPlayerId: ''
    });
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (event) {
            setFormData(event);
        }
        // Fetch players for dropdown
        const fetchPlayers = async () => {
            const q = query(collection(db, 'players'));
            const snap = await getDocs(q);
            setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchPlayers();
    }, [event]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (event?.id) {
                await updateDoc(doc(db, 'events', event.id), { ...formData });
            } else {
                await addDoc(collection(db, 'events'), { ...formData, createdAt: new Date().toISOString() });
            }
            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Error al guardar evento');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!event?.id || !confirm('¿Eliminar evento?')) return;
        setLoading(true);
        try {
            await deleteDoc(doc(db, 'events', event.id));
            onSave();
            onClose();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
                <div className="flex justify-between items-center p-6 border-b border-zinc-100 bg-zinc-50/50">
                    <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">
                        {event ? 'Editar Evento' : 'Nuevo Evento'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Título</label>
                        <input
                            required
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 font-bold text-zinc-900 focus:ring-2 focus:ring-proneo-green/20 outline-none"
                            placeholder="Ej: Reunión con Presidente"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Tipo</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 font-bold text-zinc-900 outline-none appearance-none"
                            >
                                <option value="match">⚽ Partido</option>
                                <option value="training">🏋️ Entrenamiento</option>
                                <option value="meeting">💼 Reunión</option>
                                <option value="trip">✈️ Viaje</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Jugador (Opcional)</label>
                            <select
                                value={formData.relatedPlayerId}
                                onChange={e => setFormData({ ...formData, relatedPlayerId: e.target.value })}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 font-bold text-zinc-900 outline-none appearance-none"
                            >
                                <option value="">-- Ninguno --</option>
                                {players.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} {p.surname}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Inicio</label>
                            <input
                                type="datetime-local"
                                value={formData.start}
                                onChange={e => setFormData({ ...formData, start: e.target.value })}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 font-bold text-zinc-900 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Fin</label>
                            <input
                                type="datetime-local"
                                value={formData.end}
                                onChange={e => setFormData({ ...formData, end: e.target.value })}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 font-bold text-zinc-900 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Ubicación</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                                type="text"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-3 font-bold text-zinc-900 outline-none"
                                placeholder="Ej: Camp Nou, Oficinas..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        {event?.id && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="px-6 py-3 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Trash2 className="w-4 h-4" />
                                    <span>Eliminar</span>
                                </div>
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 rounded-xl bg-zinc-900 text-white font-bold hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/20"
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Save className="w-4 h-4" />
                                <span>{loading ? 'Guardando...' : 'Guardar Evento'}</span>
                            </div>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventForm;

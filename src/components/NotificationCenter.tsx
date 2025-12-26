import React, { useState, useEffect } from 'react';
import {
    Send,
    Smartphone,
    Users,
    Bell,
    CheckCircle2,
    AlertCircle,
    Search,
    Info
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const NotificationCenter: React.FC = () => {
    const [usersWithToken, setUsersWithToken] = useState<any[]>([]);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Buscamos usuarios que tengan un fcmToken registrado (desde la app móvil)
        const q = query(collection(db, 'users'), where('fcmToken', '!=', ''));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsersWithToken(users);
        });
        return () => unsubscribe();
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !message) return;

        setSending(true);
        try {
            // Guardamos el mensaje en una colección global
            // En un entorno productivo, esto dispararía una Cloud Function
            await addDoc(collection(db, 'push_messages'), {
                title,
                message,
                timestamp: serverTimestamp(),
                target: 'all_scouts',
                sentBy: 'Director',
                status: 'queued'
            });

            setStatus('success');
            setTitle('');
            setMessage('');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error) {
            console.error('Error enviando notificación:', error);
            setStatus('error');
        } finally {
            setSending(false);
        }
    };

    const filteredUsers = usersWithToken.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <header className="flex justify-between items-end bg-white p-8 rounded-[32px] border border-zinc-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 uppercase tracking-tighter flex items-center gap-3">
                        Centro de <span className="text-proneo-green">Comunicaciones</span> Push
                    </h1>
                    <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs mt-2">
                        Envío manual de notificaciones a dispositivos móviles
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-emerald-50 px-6 py-3 rounded-2xl flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-emerald-500" />
                        <div>
                            <p className="text-[10px] font-black text-emerald-600/50 uppercase tracking-widest">Dispositivos Listos</p>
                            <p className="text-lg font-black text-emerald-600 leading-none">{usersWithToken.length}</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Panel de Envío */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSend} className="bg-white p-10 rounded-[40px] border border-zinc-100 shadow-xl space-y-8 relative overflow-hidden">
                        {status === 'success' && (
                            <div className="absolute inset-0 bg-emerald-500 flex flex-col items-center justify-center text-white z-50 animate-in fade-in duration-500">
                                <CheckCircle2 className="w-16 h-16 mb-4 animate-bounce" />
                                <h3 className="text-2xl font-black uppercase tracking-tighter">¡Notificación Enviada!</h3>
                                <p className="font-bold opacity-80 uppercase text-[10px] tracking-widest mt-2">Procesando envío a FCM...</p>
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-10 h-10 bg-proneo-green/10 rounded-xl flex items-center justify-center text-proneo-green">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Redactar Mensaje</h2>
                            </div>

                            <div className="grid gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Título de la Notificación</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Ej: Nueva actualización disponible"
                                        className="w-full bg-zinc-50 border border-zinc-100 h-14 rounded-2xl px-6 font-bold focus:bg-white focus:ring-4 focus:ring-proneo-green/5 focus:border-proneo-green/20 outline-none transition-all"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Cuerpo del Mensaje</label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Escribe aquí el contenido que verán los usuarios en su pantalla de bloqueo..."
                                        className="w-full bg-zinc-50 border border-zinc-100 h-32 rounded-2xl p-6 font-bold focus:bg-white focus:ring-4 focus:ring-proneo-green/5 focus:border-proneo-green/20 outline-none transition-all resize-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex items-center justify-between border-t border-zinc-50">
                            <div className="flex items-center gap-2 text-zinc-400">
                                <Info className="w-4 h-4" />
                                <p className="text-[10px] font-bold uppercase tracking-tight">El envío se realizará a través del canal "Broadcast Global".</p>
                            </div>
                            <button
                                type="submit"
                                disabled={sending || !title || !message}
                                className="bg-zinc-900 text-white px-10 h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:shadow-2xl hover:bg-proneo-green transition-all active:scale-95 disabled:opacity-30"
                            >
                                {sending ? 'Enviando...' : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Enviar Notificación
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Guía Informativa */}
                    <div className="bg-zinc-900 rounded-[32px] p-8 text-white flex items-center gap-8 border border-zinc-800">
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center shrink-0">
                            <Smartphone className="w-10 h-10 text-proneo-green" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight">¿Cómo funciona el envío manual?</h3>
                            <p className="text-white/50 text-xs font-medium mt-1 leading-relaxed">
                                Al pulsar enviar, el sistema localiza los **Tokens de Dispositivo** registrados por tus usuarios en la App Móvil. El mensaje se entrega de forma asíncrona a través de los servidores de Firebase Cloud Messaging (FCM).
                            </p>
                            <div className="flex gap-4 mt-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-proneo-green rounded-full" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">iOS / Android Ready</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-proneo-green rounded-full" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Web Push Protocol</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Usuarios Registrados */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm flex flex-col h-[700px]">
                        <div className="p-8 border-b border-zinc-50 shrink-0">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-black uppercase text-xs tracking-[0.2em] text-zinc-900 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-zinc-300" />
                                    Audiencia Lista
                                </h3>
                                <div className="px-3 py-1 bg-zinc-50 rounded-lg text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                    {usersWithToken.length} Dispos.
                                </div>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar usuario..."
                                    className="w-full bg-zinc-50 border border-zinc-100 h-12 rounded-xl pl-12 pr-4 text-xs font-bold outline-none focus:ring-4 focus:ring-proneo-green/5 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filteredUsers.length === 0 ? (
                                <div className="py-20 text-center space-y-4">
                                    <Smartphone className="w-10 h-10 text-zinc-100 mx-auto" />
                                    <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">No se han encontrado dispositivos</p>
                                </div>
                            ) : (
                                filteredUsers.map((u) => (
                                    <div key={u.id} className="group p-4 rounded-2xl hover:bg-zinc-50 border border-transparent hover:border-zinc-100 transition-all flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center overflow-hidden">
                                            {u.photoURL ? (
                                                <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Users className="w-4 h-4 text-zinc-300" />
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-[11px] font-black text-zinc-900 truncate uppercase">{u.name || u.email}</p>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">FCM Activo</p>
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-all">
                                            <div className="w-8 h-8 rounded-lg bg-white border border-zinc-100 flex items-center justify-center text-zinc-300">
                                                <Smartphone className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationCenter;

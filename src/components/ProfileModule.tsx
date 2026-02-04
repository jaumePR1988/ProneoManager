import React, { useState } from 'react';
import { Camera, Lock, User, Save } from 'lucide-react';
import { updateProfile, updatePassword, User as FirebaseUser } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db, messaging } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';

interface ProfileModuleProps {
    user: FirebaseUser;
    hideHeader?: boolean;
}

const ProfileModule: React.FC<ProfileModuleProps> = ({ user, hideHeader = false }) => {
    const [name, setName] = useState(user.displayName || '');
    const [photoURL, setPhotoURL] = useState(user.photoURL || '');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleCleanDevices = async () => {
        if (!confirm('¿Seguro que quieres desconectar todos los otros dispositivos? Solo recibirás notificaciones en ESTE navegador.')) return;
        setLoading(true);
        try {
            let currentToken = '';
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                currentToken = await getToken(messaging, {
                    vapidKey: 'BOUzsUo5hx3dtWfTBxMbzStxKtrJRcubmy4jbrDKaHow9qwj1RFzepvXyZ5HGIvvy0YOVLh4QDcX92DnhQPCi_k',
                    serviceWorkerRegistration: registration
                });
            }

            if (!currentToken) throw new Error("No se pudo identificar este dispositivo (Token no encontrado).");

            if (user.email) {
                const userRef = doc(db, 'users', user.email);
                await updateDoc(userRef, {
                    fcmTokens: [currentToken],
                    lastTokenRefresh: new Date().toISOString()
                });
                setMessage({ type: 'success', text: 'Dispositivos antiguos eliminados. Solo este dispositivo está activo.' });
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: 'Error: ' + e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateProfile(user, { displayName: name });
            if (newPassword) {
                await updatePassword(user, newPassword);
            }
            setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const storageRef = ref(storage, `profiles/${user.email}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await updateProfile(user, { photoURL: url });
            setPhotoURL(url);
            setMessage({ type: 'success', text: 'Imagen de perfil actualizada. Se verá reflejada totalmente al recargar.' });
            setLoading(false);
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Error al subir imagen: ' + error.message });
            setLoading(false);
        }
    };

    return (
        <div className={`max-w-2xl mx-auto space-y-8 ${hideHeader ? 'py-4' : ''}`}>
            {!hideHeader && (
                <header>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight uppercase italic">Mi Perfil</h1>
                    <p className="text-zinc-500 font-medium">Gestiona tu identidad y seguridad</p>
                </header>
            )}

            <div className="bg-white rounded-3xl shadow-xl shadow-zinc-200/50 border border-zinc-100 p-10">
                <div className="flex flex-col items-center mb-10">
                    <div className="relative group">
                        <img
                            src={photoURL || 'https://i.pravatar.cc/150'}
                            alt="Profile"
                            className="w-32 h-32 rounded-full object-cover border-4 border-zinc-50 shadow-lg"
                        />
                        <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                            <Camera className="w-8 h-8" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                    </div>
                    <p className="mt-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Cambiar Foto</p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl h-12 pl-12 pr-4 font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-proneo-green/20"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Dejar en blanco para no cambiar"
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl h-12 pl-12 pr-4 font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-proneo-green/20"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-xs font-bold ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="pt-4 border-t border-zinc-100 space-y-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-zinc-900 text-white h-14 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-proneo-green transition-colors flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>

                        <button
                            type="button"
                            disabled={loading}
                            onClick={handleCleanDevices}
                            className="w-full bg-white border-2 border-zinc-100 text-zinc-400 h-14 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <Lock className="w-4 h-4" />
                            Cerrar sesión en otros dispositivos (Limpiar Tokens)
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileModule;

import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { db, storage, auth } from '../firebase/config';
import {
    Lock,
    ArrowRight,
    Loader2,
    Upload,
    Image as ImageIcon,
    Video,
    CheckCircle2,
    X,
    Trash2,
    LogOut
} from 'lucide-react';

interface PlayerPortalProps {
    playerId: string;
}

const PlayerPortal: React.FC<PlayerPortalProps> = ({ playerId }) => {
    const [player, setPlayer] = useState<any>(null);
    const [loading, setLoading] = useState(false); // Start false, wait for user action
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Media State
    const [uploading, setUploading] = useState(false);
    const [myPhotos, setMyPhotos] = useState<any[]>([]);
    const [myVideos, setMyVideos] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'upload' | 'gallery'>('upload');

    // Remove automatic fetch on mount since it requires auth
    // useEffect(() => {
    //     fetchPlayer();
    // }, [playerId]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchMedia();
        }
    }, [isAuthenticated]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const functions = getFunctions();
            const getProfile = httpsCallable(functions, 'getPublicPlayerProfile');

            // 1. Call Cloud Function to validate PIN and get Token
            const result: any = await getProfile({ playerId, pin });
            const { token, player: playerData } = result.data;

            // 2. Sign in with the custom token
            await signInWithCustomToken(auth, token);

            // 3. Set State
            setPlayer(playerData);
            setIsAuthenticated(true);

        } catch (err: any) {
            console.error("Login failed", err);
            // Friendly error messages
            if (err.message?.includes('Invalid Access Code')) {
                setError('PIN incorrecto. Inténtalo de nuevo.');
            } else if (err.message?.includes('Player not found')) {
                setError('Jugador no encontrado o ID incorrecto.');
            } else {
                setError('Error de conexión o servicio no disponible.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size validation (e.g. 50MB for video, 10MB for photo)
        const maxSize = type === 'photo' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
        if (file.size > maxSize) {
            alert(`El archivo es demasiado grande. Máximo ${type === 'photo' ? '10MB' : '50MB'}.`);
            return;
        }

        setUploading(true);
        try {
            const timestamp = Date.now();
            const storagePath = `players/${playerId}/${type}s/${timestamp}_${file.name}`;
            const storageRef = ref(storage, storagePath);

            await uploadBytes(storageRef, file);

            // Allow time for propagation or just refresh list
            await fetchMedia();

            // If it's a profile photo update, we might want to flag the player profile
            if (type === 'photo') {
                // Optional: Set a flag "hasNewMedia" in Firestore if needed
            }

            alert('Archivo subido correctamente ✅');
        } catch (error) {
            console.error("Upload error:", error);
            alert("Error al subir el archivo.");
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const fetchMedia = async () => {
        // Use same logic as MediaManagerModal
        try {
            const photosRef = ref(storage, `players/${playerId}/photos`);
            const videoRef = ref(storage, `players/${playerId}/videos`);

            const [photosRes, videosRes] = await Promise.all([
                listAll(photosRef).catch(() => ({ items: [] })),
                listAll(videoRef).catch(() => ({ items: [] }))
            ]);

            const loadedPhotos = await Promise.all(photosRes.items.map(async (item) => ({
                name: item.name,
                url: await getDownloadURL(item),
                fullPath: item.fullPath,
                type: 'photo'
            })));

            const loadedVideos = await Promise.all(videosRes.items.map(async (item) => ({
                name: item.name,
                url: await getDownloadURL(item),
                fullPath: item.fullPath,
                type: 'video'
            })));

            setMyPhotos(loadedPhotos);
            setMyVideos(loadedVideos);
        } catch (error) {
            console.error("Error fetching media", error);
        }
    };

    const handleDelete = async (file: any) => {
        if (!confirm("¿Eliminar este archivo?")) return;
        try {
            await deleteObject(ref(storage, file.fullPath));
            await fetchMedia();
        } catch (error) {
            alert("Error al eliminar");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-proneo-green animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {/* Logo Area */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl mb-6">
                            <Lock className="w-8 h-8 text-proneo-green" />
                        </div>
                        <h1 className="text-3xl font-black text-white italic uppercase tracking-tight">
                            Portal Jugador
                        </h1>
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mt-2">
                            {player?.name || 'Acceso Restringido'}
                        </p>
                    </div>

                    {/* Login Card */}
                    <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                                    Código de Acceso (PIN)
                                </label>
                                <input
                                    type="text" // using text to avoid spinners, ideally password type but user asked for "PIN"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={4}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    className="w-full h-16 bg-black/50 border-2 border-white/5 rounded-2xl px-6 text-center text-4xl font-black text-white tracking-[0.5em] outline-none focus:border-proneo-green transition-all placeholder:text-zinc-800"
                                    placeholder="••••"
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                                    <X className="w-5 h-5 text-red-500" />
                                    <p className="text-xs font-bold text-red-400 uppercase tracking-wide">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full h-14 bg-white text-zinc-950 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                Entrar
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </form>
                    </div>

                    <p className="text-center mt-8 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                        Proneo Sports Management © {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        );
    }

    // AUTHENTICATED VIEW
    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <header className="fixed top-0 inset-x-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div>
                        <span className="text-xl font-black italic uppercase tracking-wider">Proneo</span>
                    </div>
                    <button
                        onClick={() => setIsAuthenticated(false)}
                        className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>
            </header>

            <main className="pt-28 pb-20 px-6 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500">

                {/* Welcome Section */}
                <div className="text-center space-y-4">
                    <div className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-zinc-800 mx-auto overflow-hidden">
                        {player.photoUrl ? (
                            <img src={player.photoUrl} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <span className="text-2xl font-black text-zinc-700">{player.name[0]}</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-black italic uppercase tracking-tight">Hola, {player.name.split(' ')[0]}</h1>
                        <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs mt-1">Gestiona tu contenido multimedia</p>
                    </div>
                </div>

                {/* Upload Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="group relative bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-proneo-green/50 rounded-[32px] p-8 cursor-pointer transition-all overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-proneo-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-black/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <ImageIcon className="w-8 h-8 text-proneo-green" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black italic uppercase">Subir Fotos</h3>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Alta Calidad</p>
                            </div>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'photo')}
                            disabled={uploading}
                        />
                    </label>

                    <label className="group relative bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-purple-500/50 rounded-[32px] p-8 cursor-pointer transition-all overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-black/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <Video className="w-8 h-8 text-purple-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black italic uppercase">Subir Vídeo</h3>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Max 50MB</p>
                            </div>
                        </div>
                        <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'video')}
                            disabled={uploading}
                        />
                    </label>
                </div>

                {uploading && (
                    <div className="flex items-center justify-center gap-4 p-4 bg-zinc-900 rounded-2xl border border-white/5">
                        <Loader2 className="w-5 h-5 text-proneo-green animate-spin" />
                        <span className="text-sm font-bold uppercase tracking-widest text-zinc-300">Subiendo archivo...</span>
                    </div>
                )}

                {/* My Content */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                        <h2 className="text-lg font-black italic uppercase tracking-wider">Mi Galería</h2>
                        <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-zinc-400">
                            {myPhotos.length + myVideos.length} Archivos
                        </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {myPhotos.map(file => (
                            <div key={file.fullPath} className="relative aspect-square bg-zinc-900 rounded-2xl overflow-hidden group">
                                <img src={file.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                <button
                                    onClick={() => handleDelete(file)}
                                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {myVideos.map(file => (
                            <div key={file.fullPath} className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden group col-span-2 md:col-span-1">
                                <video src={file.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <Video className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(file)}
                                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 pointer-events-auto"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {myPhotos.length === 0 && myVideos.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-3xl">
                            <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">Aún no has subido contenido</p>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};

export default PlayerPortal;

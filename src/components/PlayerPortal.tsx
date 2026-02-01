import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import imageCompression from 'browser-image-compression';
import { signInWithCustomToken } from 'firebase/auth';
import { db, storage, auth } from '../firebase/config';
import {
    Lock, ArrowRight, Loader2, Upload,
    Image as ImageIcon, Video, CheckCircle2, X, Trash2, LogOut,
    AlertTriangle, Camera, FileText, UploadCloud, Download,
    PenTool, CheckSquare, Trophy, Plus, Calendar, Save, FileDown
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { generatePlayerDossier } from '../utils/pdfGenerator';

interface PlayerPortalProps {
    playerId: string;
}

// PREMIUM UI COMPONENTS
const PremiumToast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
    <div className={`fixed top-6 right-6 z-[60] animate-in slide-in-from-right-10 duration-500 fade-in flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${type === 'success' ? 'bg-zinc-900/90 border-proneo-green/20' : 'bg-red-950/90 border-red-500/20'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === 'success' ? 'bg-proneo-green/10 text-proneo-green' : 'bg-red-500/10 text-red-500'}`}>
            {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </div>
        <div>
            <h4 className={`text-sm font-black uppercase tracking-wider ${type === 'success' ? 'text-white' : 'text-red-100'}`}>
                {type === 'success' ? 'Éxito' : 'Error'}
            </h4>
            <p className="text-xs font-medium text-zinc-400 mt-1">{message}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors ml-2">
            <X className="w-4 h-4 text-zinc-500" />
        </button>
    </div>
);

const PlayerPortal: React.FC<PlayerPortalProps> = ({ playerId }) => {
    const [player, setPlayer] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [processing, setProcessing] = useState<{ type: 'contract' | 'photo' | null, message: string }>({ type: null, message: '' });

    // Media & UI States
    const [uploading, setUploading] = useState(false);
    const [myPhotos, setMyPhotos] = useState<any[]>([]);
    const [myVideos, setMyVideos] = useState<any[]>([]);
    const [draggingProfile, setDraggingProfile] = useState(false);
    const [newPalmaresItem, setNewPalmaresItem] = useState('');
    const [videoUploading, setVideoUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [activeTab, setActiveTab] = useState<'media' | 'contracts' | 'renewal' | 'trajectory'>('media');

    // UI Helpers
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; ref: any | null }>({ isOpen: false, ref: null });

    // Renewal States
    const [renewalStep, setRenewalStep] = useState<'form' | 'sign' | 'complete'>('form');
    // We keep renewalData in a single state object if needed, or derived.
    // Simplifying for reconstruction:
    const [renewalData, setRenewalData] = useState({ dni: '', street: '', cp: '', city: '', province: '' });
    const [sigCanvas, setSigCanvas] = useState<any>(null);

    // Trajectory States
    const [showAddSeason, setShowAddSeason] = useState(false);
    const [newSeason, setNewSeason] = useState({
        season: '',
        club: '',
        division: '',
        matches: 0,
        goals: 0,
        cards: 0,
        minutes: 0
    });

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        let unsubscribe: () => void;

        if (isAuthenticated) {
            fetchMedia();

            // Subscribe to real-time updates to ensure we have the FULL profile
            // (Cloud Function only returns a subset often)
            if (playerId) {
                const playerRef = doc(db, 'players', playerId);
                unsubscribe = onSnapshot(playerRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setPlayer((prev: any) => ({
                            ...prev,
                            ...docSnap.data(),
                            id: docSnap.id // ensure ID is preserved
                        }));
                    }
                });
            }
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [isAuthenticated, playerId]);

    const isRenewalNeeded = React.useMemo(() => {
        if (!player) return false;
        if (!player.proneo?.agencyEndDate) return true;
        const endDate = new Date(player.proneo.agencyEndDate);
        const warningDate = new Date();
        warningDate.setDate(warningDate.getDate() + 60);
        return endDate < warningDate;
    }, [player]);

    const fetchMedia = async () => {
        try {
            // Photos
            const photosRef = ref(storage, `players/${playerId}/photos`);
            const photosList = await listAll(photosRef);
            const photosUrls = await Promise.all(photosList.items.map(async (item) => {
                const url = await getDownloadURL(item);
                return { url, name: item.name, ref: item };
            }));
            setMyPhotos(photosUrls);

            // Videos
            const videosRef = ref(storage, `players/${playerId}/videos`);
            const videosList = await listAll(videosRef);
            const videosUrls = await Promise.all(videosList.items.map(async (item) => {
                const url = await getDownloadURL(item);
                return { url, name: item.name, ref: item };
            }));
            setMyVideos(videosUrls);
        } catch (error) {
            console.error("Error fetching media", error);
        }
    };

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


    // Trigger the modal
    const handleDeleteMedia = (mediaRef: any) => {
        setDeleteConfirm({ isOpen: true, ref: mediaRef });
    };

    // Actual deletion logic
    const confirmDeleteAction = async () => {
        const refToDelete = deleteConfirm.ref;
        if (!refToDelete) return;

        // Close modal first to avoid z-index conflicts
        setDeleteConfirm({ isOpen: false, ref: null });

        setUploading(true);
        setProcessing({ type: 'photo', message: 'Eliminando archivo...' });

        try {
            await deleteObject(refToDelete);
            setToast({ message: 'Archivo eliminado de tu galería', type: 'success' });
            await fetchMedia(); // Ensure list refresh
        } catch (error: any) {
            console.error("Delete error:", error);
            setToast({ message: `Error al eliminar: ${error.message}`, type: 'error' });
        } finally {
            setUploading(false);
            setProcessing({ type: null, message: '' });
        }
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return alert("Solo imágenes.");

        setUploading(true);
        setProcessing({ type: 'photo', message: 'Subiendo a tu galería...' });

        try {
            // Compression - Safety Wrapper
            let fileToUpload = file;
            try {
                const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
                fileToUpload = await imageCompression(file, options);
            } catch (compError) {
                console.warn("Compression failed, uploading original.", compError);
            }

            const path = `players/${playerId}/photos/${Date.now()}_${file.name}`;
            const fileRef = ref(storage, path);
            const metadata = { contentType: file.type };

            await uploadBytes(fileRef, fileToUpload, metadata);

            setToast({ message: 'Foto añadida a tu galería', type: 'success' });
            await fetchMedia();
        } catch (error: any) {
            console.error("Upload error:", error);
            setToast({ message: `Error al subir: ${error.message}`, type: 'error' });
        } finally {
            setUploading(false);
            setProcessing({ type: null, message: '' });
            // Reset input value to allow same file upload
            e.target.value = '';
        }
    };

    const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        let file: File | undefined;
        if ('dataTransfer' in e) {
            e.preventDefault();
            setDraggingProfile(false);
            file = e.dataTransfer.files[0];
        } else {
            file = (e.target as HTMLInputElement).files?.[0];
        }

        if (!file) return;
        if (!file.type.startsWith('image/')) return alert("Solo imágenes.");

        setProcessing({ type: 'photo', message: 'Optimizando y subiendo tu perfil...' });
        setUploading(true);
        try {
            // COMPRESSION
            const options = {
                maxSizeMB: 1, // Max 1MB
                maxWidthOrHeight: 1920,
                useWebWorker: true
            };
            const compressedFile = await imageCompression(file, options);

            const functions = getFunctions();
            const uploadPhoto = httpsCallable(functions, 'uploadPlayerPhoto');

            // Convert to Base64
            const reader = new FileReader();
            reader.readAsDataURL(compressedFile);
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const mimeType = compressedFile.type;

                const result: any = await uploadPhoto({
                    playerId: playerId, // SAFE: Use prop
                    photoBase64: base64,
                    mimeType
                });

                if (result.data.success) {
                    setPlayer((prev: any) => ({ ...prev, photoUrl: result.data.url }));
                    setToast({ message: 'Foto de perfil actualizada (Optimizada)', type: 'success' });
                }
                setUploading(false);
                setProcessing({ type: null, message: '' });
            };
        } catch (error) {
            console.error(error);
            setToast({ message: 'Error al subir foto', type: 'error' });
            setUploading(false);
            setProcessing({ type: null, message: '' });
        }
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limite aumentado a 500MB
        if (!file.type.startsWith('video/')) return alert("Por favor, selecciona un archivo de vídeo.");
        if (file.size > 500 * 1024 * 1024) return alert("El vídeo supera el límite de 500MB.");

        // Aviso si el archivo es grande (>100MB)
        if (file.size > 100 * 1024 * 1024) {
            setToast({ message: 'Archivo grande: la subida tardará un poco más. Mantén la pestaña abierta.', type: 'info' as any });
        }

        setVideoUploading(true);
        setUploadProgress(0);

        try {
            const { uploadBytesResumable, ref: storageRef, getDownloadURL } = await import('firebase/storage');
            const path = `players/${playerId}/videos/${Date.now()}_${file.name}`;
            console.log("Subiendo vídeo:", path);
            const fileRef = storageRef(storage, path);
            const metadata = { contentType: file.type };
            const uploadTask = uploadBytesResumable(fileRef, file, metadata);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error("Upload error", error);
                    setToast({ message: 'Error al subir vídeo', type: 'error' });
                    setVideoUploading(false);
                },
                async () => {
                    await getDownloadURL(uploadTask.snapshot.ref);
                    setToast({ message: 'Vídeo subido con éxito. Aparecerá en tu sección multimedia pronto.', type: 'success' });
                    setVideoUploading(false);
                    fetchMedia(); // Refresh gallery
                }
            );
        } catch (error) {
            console.error(error);
            setVideoUploading(false);
        }
    };

    const handleRenewalSubmit = async () => {
        if (!sigCanvas || sigCanvas.isEmpty()) {
            setToast({ message: 'Debes firmar el contrato', type: 'error' });
            return;
        }

        setLoading(true);
        setProcessing({ type: 'contract', message: 'Firmando digitalmente y generando documento...' });
        try {
            const signatureBase64 = sigCanvas.getTrimmedCanvas().toDataURL('image/png');
            const functions = getFunctions();
            const generateContract = httpsCallable(functions, 'generateAndSignContract');

            const result: any = await generateContract({
                playerId,
                signatureBase64,
                dni: renewalData.dni,
                address: {
                    street: renewalData.street,
                    cp: renewalData.cp,
                    city: renewalData.city,
                    province: renewalData.province
                },
                templateType: player.age >= 18 ? 'adult' : 'minor' // Basic logic
            });

            if (result.data.success) {
                setRenewalStep('complete');
                setToast({ message: 'Contrato renovado correctamente', type: 'success' });
                // Update local player data?
            }
        } catch (error) {
            console.error("Renewal error", error);
            setToast({ message: 'Error al procesar la renovación', type: 'error' });
        } finally {
            setLoading(false);
            setProcessing({ type: null, message: '' });
        }
    };

    // --- RENDER: LOGIN ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen relative flex items-center justify-center p-6 bg-black overflow-hidden font-sans">
                {/* Custom Split Background */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/login-bg-split.png"
                        alt="Background"
                        className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                </div>

                {/* Main Card */}
                <div className="relative z-10 w-full max-w-[400px] flex flex-col items-center animate-in zoom-in-95 duration-700">

                    {/* Brand Logo Container */}
                    <div className="w-24 h-24 bg-zinc-950 rounded-3xl border border-zinc-800 flex items-center justify-center mb-8 shadow-2xl shadow-black/50">
                        <img src="/logo-new.png" alt="Proneo" className="w-16 h-16 object-contain" />
                    </div>

                    {/* Title & Subtitle */}
                    <div className="text-center mb-8 space-y-1">
                        <h1 className="text-3xl font-black italic text-white uppercase tracking-tight drop-shadow-lg">
                            Portal Jugador
                        </h1>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em]">
                            Acceso Restringido
                        </p>
                    </div>

                    {/* Login Form Card */}
                    <div className="w-full bg-zinc-950 rounded-[32px] p-8 border border-white/5 shadow-2xl shadow-black ring-1 ring-white/5">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest pl-1">
                                    Código de Acceso (PIN)
                                </label>
                                <div className="relative group">
                                    <input
                                        type="password"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        className="w-full h-16 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-center text-4xl font-black tracking-[0.5em] text-white focus:outline-none focus:border-white focus:bg-zinc-900 transition-all placeholder:tracking-normal placeholder:text-lg placeholder:font-bold placeholder:text-zinc-700"
                                        placeholder="• • • •"
                                        maxLength={4}
                                        autoFocus
                                    />
                                    {pin.length > 0 && pin.length < 4 && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 justify-center text-red-400 text-[10px] font-bold uppercase tracking-wide bg-red-500/10 py-2 rounded-lg border border-red-500/20 animate-shake">
                                        <AlertTriangle className="w-3 h-3" />
                                        {error}
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || pin.length < 4}
                                className="w-full h-14 bg-white hover:bg-zinc-200 text-zinc-950 rounded-xl font-black uppercase tracking-widest text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-xl shadow-white/5"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Entrar <ArrowRight className="w-5 h-5" /></>}
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <p className="mt-8 text-[10px] text-zinc-600 font-black uppercase tracking-widest mix-blend-plus-lighter">
                        Proneo Sports Management © {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        );
    }

    // --- RENDER: UI ---
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-proneo-green selection:text-black relative">
            {/* FULL SCREEN PROCESSING OVERLAY */}
            {processing.type && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div className="w-24 h-24 rounded-full border-4 border-proneo-green/20 border-t-proneo-green animate-spin mb-8 shadow-[0_0_50px_-12px_rgba(180,200,133,0.3)]"></div>
                    <h2 className="text-3xl font-black italic uppercase text-white tracking-wider animate-pulse mb-4">
                        {processing.type === 'contract' ? 'Firmando Contrato' : 'Procesando Imagen'}
                    </h2>
                    <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">
                        {processing.message}
                    </p>
                </div>
            )}

            {toast && <PremiumToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="h-16 w-16 rounded-2xl overflow-hidden shadow-lg shadow-white/5 bg-zinc-900 border border-white/10 flex items-center justify-center p-1">
                        <img src="/logo-new.png" alt="Proneo" className="w-full h-full object-contain rounded-xl" />
                    </div>

                    <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5 items-center">
                        <button onClick={() => setActiveTab('media')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'media' ? 'bg-white text-zinc-950 shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
                            Multimedia
                        </button>
                        <button onClick={() => setActiveTab('contracts')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'contracts' ? 'bg-white text-zinc-950 shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
                            Contratos
                        </button>
                        <button onClick={() => setActiveTab('trajectory')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'trajectory' ? 'bg-white text-zinc-950 shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
                            Trayectoria
                        </button>
                        {isRenewalNeeded && (
                            <button onClick={() => setActiveTab('renewal')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'renewal' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-red-500 hover:bg-red-500/10'}`}>
                                <PenTool className="w-3 h-3" />
                                Renovación
                            </button>
                        )}
                        <div className="w-[1px] h-6 bg-white/10 mx-2" />
                        <button
                            onClick={async () => {
                                try {
                                    await generatePlayerDossier(player);
                                } catch (err: any) {
                                    console.error("Dossier Error:", err);
                                    alert("Error generating PDF: " + err.message);
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider text-green-400 hover:bg-green-400/10 transition-colors"
                        >
                            <FileDown className="w-4 h-4" />
                            Dossier
                        </button>
                    </div>

                    <button onClick={() => setIsAuthenticated(false)} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-zinc-400 hover:text-red-500">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="pt-28 pb-20 px-6 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500">
                {/* Welcome & Profile Photo */}
                <div className="flex flex-col items-center space-y-6">
                    <div
                        className={`relative group cursor-pointer transition-all duration-300 ${draggingProfile ? 'scale-110' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDraggingProfile(true); }}
                        onDragLeave={() => setDraggingProfile(false)}
                        onDrop={handleProfilePhotoUpload}
                    >
                        <div className={`w-32 h-32 rounded-full bg-zinc-900 border-4 overflow-hidden relative shadow-2xl ${draggingProfile ? 'border-proneo-green shadow-proneo-green/20' : 'border-zinc-800'}`}>
                            {player.photoUrl ? (
                                <img src={player.photoUrl} className="w-full h-full object-cover transition-opacity group-hover:opacity-50" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-900 group-hover:bg-zinc-800 transition-colors">
                                    <span className="text-4xl font-black text-zinc-700 group-hover:text-zinc-500 uppercase">{player.name[0]}</span>
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <Camera className="w-8 h-8 text-white drop-shadow-md" />
                            </div>
                            {uploading && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                        <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleProfilePhotoUpload} disabled={uploading} />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[9px] font-bold px-3 py-1 rounded-full border border-zinc-700 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 pointer-events-none">
                            CAMBIAR FOTO
                        </div>
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl font-black italic uppercase tracking-tight text-white mb-2">
                            Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">{player.name?.split(' ')[0]}</span>
                        </h1>
                        <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">
                            {activeTab === 'media' ? 'Gestiona tu contenido multimedia' : activeTab === 'trajectory' ? 'Tu Historial Deportivo' : 'Tus Documentos y Contratos'}
                        </p>
                    </div>
                </div>

                {/* --- TAB: MEDIA --- */}
                {/* --- TAB: MEDIA (RESTORED BIG CARDS) --- */}
                {activeTab === 'media' && (
                    <div className="space-y-12">
                        {/* BIG ACTION CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1: Perfil */}
                            <div
                                onClick={() => document.getElementById('profile-upload')?.click()}
                                className="bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-[#b4c885]/30 p-8 rounded-[32px] cursor-pointer transition-all hover:scale-[1.02] group flex flex-col items-center justify-center text-center gap-6 min-h-[240px] shadow-lg hover:shadow-[#b4c885]/10"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-[#b4c885] flex items-center justify-center shadow-xl shadow-[#b4c885]/20">
                                    <Camera className="w-8 h-8 text-zinc-900" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black italic uppercase text-white">Foto de Perfil</h3>
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2 group-hover:text-zinc-400">Actualizar Ficha</p>
                                </div>
                                <input id="profile-upload" type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoUpload} />
                            </div>

                            {/* Card 2: Galería */}
                            <div className="bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-blue-500/30 p-8 rounded-[32px] cursor-pointer transition-all hover:scale-[1.02] group flex flex-col items-center justify-center text-center gap-6 min-h-[240px] relative overflow-hidden shadow-lg hover:shadow-blue-500/10">
                                <div className="w-20 h-20 rounded-2xl bg-blue-400 flex items-center justify-center shadow-xl shadow-blue-400/20 relative z-10">
                                    <ImageIcon className="w-8 h-8 text-zinc-900" />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-xl font-black italic uppercase text-white">Subir a Galería</h3>
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2 group-hover:text-zinc-400">Fotos del Partido</p>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                    onChange={handleGalleryUpload}
                                />
                            </div>

                            {/* Card 3: Video */}
                            <div
                                onClick={() => document.getElementById('video-upload')?.click()}
                                className="bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-orange-500/30 p-8 rounded-[32px] cursor-pointer transition-all hover:scale-[1.02] group flex flex-col items-center justify-center text-center gap-6 min-h-[240px] shadow-lg hover:shadow-orange-500/10"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-orange-400 flex items-center justify-center shadow-xl shadow-orange-400/20">
                                    <Video className="w-8 h-8 text-zinc-900" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black italic uppercase text-white">Subir Vídeo</h3>
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2 group-hover:text-zinc-400">Highlights (100MB)</p>
                                </div>
                                <input id="video-upload" type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                            </div>
                        </div>

                        {/* Video Upload Overlay */}
                        {videoUploading && (
                            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                                <div className="max-w-sm w-full space-y-8 text-center">
                                    <div className="relative inline-block">
                                        <div className="w-24 h-24 rounded-3xl bg-orange-400 flex items-center justify-center shadow-2xl shadow-orange-400/20 animate-pulse">
                                            <Video className="w-10 h-10 text-zinc-900" />
                                        </div>
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-zinc-900 rounded-full border border-white/10 flex items-center justify-center shadow-xl">
                                            <span className="text-[10px] font-black text-orange-400">{Math.round(uploadProgress)}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black italic uppercase text-white tracking-tight">Procesando Vídeo</h3>
                                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">No cierres esta ventana mientras optimizamos el contenido</p>
                                    </div>
                                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full bg-orange-400 transition-all duration-300 ease-out"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-orange-400 animate-pulse">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando con la nube</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* GALLERY GRID */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <h3 className="text-2xl font-black italic uppercase text-white">Mi Galería</h3>
                                <div className="bg-zinc-800 px-3 py-1 rounded-full text-[10px] font-bold text-zinc-400">{myPhotos.length + myVideos.length} Archivos</div>
                            </div>

                            <div className="w-full min-h-[300px] border-2 border-dashed border-zinc-800 rounded-[32px] flex flex-col items-center justify-center gap-4 text-zinc-600 p-6">
                                {(myPhotos.length > 0 || myVideos.length > 0) ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-h-[600px] overflow-y-auto pr-2">
                                        {myPhotos.map((photo, i) => (
                                            <div key={`p-${i}`} className="aspect-square bg-zinc-800 rounded-3xl overflow-hidden relative group shadow-2xl">
                                                <img src={photo.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                                                    <a href={photo.url} target="_blank" rel="noreferrer" className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center hover:scale-110 transition-transform">
                                                        <Download className="w-5 h-5" />
                                                    </a>
                                                    <button onClick={() => handleDeleteMedia(photo.ref)} className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {myVideos.map((video, i) => (
                                            <div key={`v-${i}`} className="aspect-square bg-zinc-800 rounded-3xl overflow-hidden relative group shadow-2xl flex flex-col items-center justify-center">
                                                <div className="flex flex-col items-center gap-2 text-zinc-500">
                                                    <Video className="w-8 h-8" />
                                                    <span className="text-[8px] font-black uppercase text-center px-4 truncate max-w-full">
                                                        {video.name.split('_').slice(1).join('_') || 'VÍDEO'}
                                                    </span>
                                                </div>
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                                                    <a href={video.url} target="_blank" rel="noreferrer" className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center hover:scale-110 transition-transform">
                                                        <Download className="w-5 h-5" />
                                                    </a>
                                                    <button onClick={() => handleDeleteMedia(video.ref)} className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
                                            <UploadCloud className="w-6 h-6 text-zinc-700" />
                                        </div>
                                        <span className="font-bold uppercase tracking-widest text-xs">Aún no has subido contenido</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: CONTRACTS --- */}
                {activeTab === 'contracts' && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-black italic uppercase text-white">Documentos Firmados</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {player.documents?.map((doc: any, i: number) => (
                                <div key={i} className="bg-zinc-900 p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white leading-tight">{doc.name || 'Documento sin título'}</p>
                                            <p className="text-xs text-zinc-500 mt-1">{new Date(doc.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <a href={doc.url} target="_blank" rel="noreferrer" className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center hover:scale-110 transition-transform">
                                        <Download className="w-5 h-5" />
                                    </a>
                                </div>
                            ))}
                            {(!player.documents || player.documents.length === 0) && (
                                <div className="col-span-full py-12 text-center border border-dashed border-zinc-800 rounded-3xl">
                                    <FileText className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                    <p className="text-zinc-600 font-bold uppercase text-xs tracking-wider">No tienes contratos firmados</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- TAB: RENEWAL --- */}
                {activeTab === 'renewal' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        {renewalStep === 'form' && (
                            <div className="bg-zinc-900 p-8 rounded-[32px] border border-white/5 space-y-8">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black italic text-white uppercase">Confirmación de Datos</h2>
                                    <p className="text-zinc-400 text-sm">Verifica tus datos personales antes de generar el contrato.</p>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-zinc-500 tracking-widest pl-1">DNI / NIE</label>
                                        <input
                                            type="text"
                                            value={renewalData.dni}
                                            onChange={e => setRenewalData({ ...renewalData, dni: e.target.value })}
                                            className="w-full h-12 bg-black/50 border border-white/10 rounded-xl px-4 text-white font-bold outline-none focus:border-proneo-green"
                                            placeholder="12345678X"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-zinc-500 tracking-widest pl-1">Dirección</label>
                                        <input
                                            type="text"
                                            value={renewalData.street}
                                            onChange={e => setRenewalData({ ...renewalData, street: e.target.value })}
                                            className="w-full h-12 bg-black/50 border border-white/10 rounded-xl px-4 text-white font-bold outline-none focus:border-proneo-green"
                                            placeholder="Calle Ejemplo 123"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-zinc-500 tracking-widest pl-1">Código Postal</label>
                                        <input
                                            type="text"
                                            value={renewalData.cp}
                                            onChange={e => setRenewalData({ ...renewalData, cp: e.target.value })}
                                            className="w-full h-12 bg-black/50 border border-white/10 rounded-xl px-4 text-white font-bold outline-none focus:border-proneo-green"
                                            placeholder="08000"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase text-zinc-500 tracking-widest pl-1">Ciudad</label>
                                            <input
                                                type="text"
                                                value={renewalData.city}
                                                onChange={e => setRenewalData({ ...renewalData, city: e.target.value })}
                                                className="w-full h-12 bg-black/50 border border-white/10 rounded-xl px-4 text-white font-bold outline-none focus:border-proneo-green"
                                                placeholder="Barcelona"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase text-zinc-500 tracking-widest pl-1">Provincia</label>
                                            <input
                                                type="text"
                                                value={renewalData.province}
                                                onChange={e => setRenewalData({ ...renewalData, province: e.target.value })}
                                                className="w-full h-12 bg-black/50 border border-white/10 rounded-xl px-4 text-white font-bold outline-none focus:border-proneo-green"
                                                placeholder="Barcelona"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={() => {
                                            if (!renewalData.dni || !renewalData.street || !renewalData.city) {
                                                setToast({ message: 'Rellena todos los campos', type: 'error' });
                                                return;
                                            }
                                            setRenewalStep('sign');
                                        }}
                                        className="bg-white text-black px-8 py-3 rounded-xl font-black uppercase tracking-wider hover:bg-zinc-200 transition-colors flex items-center gap-2"
                                    >
                                        Continuar <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {renewalStep === 'sign' && (
                            <div className="bg-zinc-900 p-8 rounded-[32px] border border-white/5 space-y-6">
                                <div className="flex items-center gap-4 text-zinc-400 mb-4">
                                    <PenTool className="w-6 h-6 text-proneo-green" />
                                    <p className="text-sm">Firma en el recuadro blanco para renovar por 2 años.</p>
                                </div>

                                <div className="bg-white rounded-xl overflow-hidden h-64 border-2 border-dashed border-zinc-700 relative cursor-crosshair">
                                    <SignatureCanvas
                                        penColor="black"
                                        canvasProps={{ width: 500, height: 256, className: 'sigCanvas w-full h-full' }}
                                        ref={(ref: any) => setSigCanvas(ref)}
                                    />
                                    <div className="absolute bottom-2 right-2 text-[10px] text-zinc-400 pointer-events-none">Firma Digital Certificada</div>
                                </div>

                                <div className="flex justify-between mt-6">
                                    <button
                                        onClick={() => sigCanvas?.clear()}
                                        className="text-zinc-500 hover:text-white px-4 py-2 font-bold uppercase text-xs"
                                    >
                                        Borrar
                                    </button>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setRenewalStep('form')}
                                            className="text-zinc-400 hover:text-white px-4 py-2 font-bold uppercase text-xs"
                                        >
                                            Atrás
                                        </button>
                                        <button
                                            onClick={handleRenewalSubmit}
                                            className="bg-proneo-green text-black px-8 py-3 rounded-xl font-black uppercase tracking-wider hover:scale-105 transition-transform shadow-lg shadow-proneo-green/20"
                                            disabled={loading}
                                        >
                                            {loading ? 'Firmando...' : 'Confirmar Firma'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {renewalStep === 'complete' && (
                            <div className="bg-zinc-900 p-12 rounded-[32px] border border-white/5 text-center flex flex-col items-center gap-6">
                                <div className="w-20 h-20 bg-proneo-green/10 rounded-full flex items-center justify-center mb-4">
                                    <CheckSquare className="w-10 h-10 text-proneo-green" />
                                </div>
                                <h3 className="text-3xl font-black italic text-white uppercase">¡Renovado!</h3>
                                <p className="text-zinc-400 max-w-md">Has renovado tu contrato correctamente. Puedes descargar tu copia en la pestaña de Contratos.</p>
                                <button onClick={() => setActiveTab('contracts')} className="mt-4 bg-white text-black px-8 py-3 rounded-xl font-black uppercase tracking-wider">
                                    Ver Contratos
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* --- TAB: TRAYECTORIA --- */}
                {activeTab === 'trajectory' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        {/* 1. PALMARES & LOGROS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-zinc-900 p-6 rounded-3xl border border-white/5 space-y-4">
                                <h3 className="text-lg font-black italic text-white uppercase flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-proneo-green" />
                                    Palmarés / Títulos
                                </h3>
                                <div className="space-y-3">
                                    {/* List of Items */}
                                    <div className="flex flex-wrap gap-2 min-h-[60px] bg-zinc-950/50 rounded-xl border border-white/10 p-3">
                                        {Array.isArray(player.customFields?.palmares)
                                            ? player.customFields.palmares.map((item: string, idx: number) => (
                                                <span key={idx} className="bg-zinc-800 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-2 border border-white/5">
                                                    {item}
                                                    <button
                                                        onClick={() => {
                                                            const newArr = player.customFields.palmares.filter((_: any, i: number) => i !== idx);
                                                            setPlayer({ ...player, customFields: { ...player.customFields, palmares: newArr } });
                                                        }}
                                                        className="text-zinc-500 hover:text-red-400"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))
                                            : player.customFields?.palmares && (
                                                // Fallback for legacy string data
                                                <span className="bg-zinc-800 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-2 border border-white/5">
                                                    {player.customFields.palmares}
                                                    <button
                                                        onClick={() => setPlayer({ ...player, customFields: { ...player.customFields, palmares: [] } })}
                                                        className="text-zinc-500 hover:text-red-400"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            )
                                        }
                                        {!player.customFields?.palmares?.length && !player.customFields?.palmares && (
                                            <span className="text-zinc-600 text-xs italic p-1">No hay títulos añadidos</span>
                                        )}
                                    </div>

                                    {/* Add Input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newPalmaresItem}
                                            onChange={(e) => setNewPalmaresItem(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (!newPalmaresItem.trim()) return;
                                                    const currentPalmares = Array.isArray(player.customFields?.palmares)
                                                        ? player.customFields.palmares
                                                        : player.customFields?.palmares ? [player.customFields.palmares] : [];

                                                    setPlayer({
                                                        ...player,
                                                        customFields: {
                                                            ...player.customFields,
                                                            palmares: [...currentPalmares, newPalmaresItem.trim()]
                                                        }
                                                    });
                                                    setNewPalmaresItem('');
                                                }
                                            }}
                                            className="flex-1 bg-zinc-950/50 rounded-xl border border-white/10 px-4 py-2 text-sm text-white focus:outline-none focus:border-proneo-green"
                                            placeholder="Añadir título..."
                                        />
                                        <button
                                            onClick={() => {
                                                if (!newPalmaresItem.trim()) return;
                                                const currentPalmares = Array.isArray(player.customFields?.palmares)
                                                    ? player.customFields.palmares
                                                    : player.customFields?.palmares ? [player.customFields.palmares] : [];

                                                setPlayer({
                                                    ...player,
                                                    customFields: {
                                                        ...player.customFields,
                                                        palmares: [...currentPalmares, newPalmaresItem.trim()]
                                                    }
                                                });
                                                setNewPalmaresItem('');
                                            }}
                                            className="bg-proneo-green text-black p-2 rounded-xl hover:bg-green-400 transition-colors"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-zinc-900 p-6 rounded-3xl border border-white/5 space-y-4">
                                <h3 className="text-lg font-black italic text-white uppercase flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-blue-400" />
                                    Logros Personales
                                </h3>
                                <textarea
                                    value={player.customFields?.achievements || ''}
                                    onChange={(e) => setPlayer({ ...player, customFields: { ...player.customFields, achievements: e.target.value } })}
                                    className="w-full h-32 bg-zinc-950/50 rounded-xl border border-white/10 p-4 text-sm text-zinc-300 focus:outline-none focus:border-blue-400 resize-none"
                                    placeholder="Ej. Máximo goleador del torneo, MVP de la final..."
                                />
                            </div>
                        </div>

                        {/* SAVE BUTTON FOR TEXT FIELDS */}
                        <div className="flex justify-end">
                            <button
                                onClick={async () => {
                                    try {
                                        setLoading(true);
                                        const functions = getFunctions();
                                        const updateProfile = httpsCallable(functions, 'updatePlayerProfile');
                                        await updateProfile({
                                            playerId,
                                            pin,
                                            data: {
                                                customFields: {
                                                    palmares: player.customFields?.palmares || '',
                                                    achievements: player.customFields?.achievements || ''
                                                }
                                            }
                                        });
                                        setToast({ message: 'Información guardada correctamente', type: 'success' });
                                    } catch (err) {
                                        console.error(err);
                                        setToast({ message: 'Error al guardar', type: 'error' });
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="bg-white text-black px-6 py-2 rounded-xl font-black uppercase tracking-wider text-xs flex items-center gap-2 hover:bg-zinc-200"
                            >
                                <Save className="w-4 h-4" />
                                Guardar Cambios
                            </button>
                        </div>

                        {/* Current Season Card */}
                        <div className="bg-zinc-900 rounded-[32px] p-8 border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-proneo-green/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-proneo-green/10 transition-colors" />

                            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-proneo-green to-emerald-600 flex items-center justify-center text-zinc-900 shadow-xl shadow-proneo-green/20">
                                    <Trophy className="w-10 h-10" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3 justify-center md:justify-start">
                                        <h2 className="text-2xl font-black italic uppercase text-white">Temporada Actual</h2>
                                        <span className="px-3 py-1 bg-proneo-green text-zinc-900 text-[10px] font-black uppercase tracking-wider rounded-lg animate-pulse">
                                            EN CURSO
                                        </span>
                                    </div>
                                    <p className="text-zinc-400 font-medium">Registros automáticos basados en tu ficha actual.</p>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Club</p>
                                            <p className="text-lg font-bold text-white mt-1 truncate">{player.club || 'Sin Club'}</p>
                                        </div>
                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Categoría</p>
                                            <p className="text-lg font-bold text-white mt-1 truncate">{player.category || '-'}</p>
                                        </div>
                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">División</p>
                                            <p className="text-lg font-bold text-white mt-1 truncate">{player.division || '-'}</p>
                                        </div>
                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Posición</p>
                                            <p className="text-lg font-bold text-white mt-1 truncate">{player.position || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* History List */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black italic uppercase text-white">Historial</h3>
                                <button
                                    onClick={() => setShowAddSeason(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    Añadir Temporada
                                </button>
                            </div>

                            {(!player.seasons || player.seasons.length === 0) ? (
                                <div className="text-center py-12 border border-dashed border-zinc-800 rounded-3xl">
                                    <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                    <p className="text-zinc-500 font-bold">No hay temporadas registradas</p>
                                    <p className="text-zinc-600 text-xs mt-1">Añade tu historial para completar tu perfil 360°</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {player.seasons.sort((a: any, b: any) => b.season.localeCompare(a.season)).map((season: any, index: number) => (
                                        <div key={index} className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 hover:bg-zinc-900 transition-colors flex flex-col md:flex-row gap-6 md:items-center">
                                            <div className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0">
                                                <span className="font-black text-white text-xs">{season.season}</span>
                                            </div>
                                            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div>
                                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Club</p>
                                                    <p className="text-sm font-bold text-white">{season.club}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">División</p>
                                                    <p className="text-sm font-bold text-zinc-300">{season.division}</p>
                                                </div>
                                                {season.goals > 0 && (
                                                    <div>
                                                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Goles</p>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-bold text-proneo-green">{season.goals} ⚽</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add Season Modal */}
                        {showAddSeason && (
                            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                                <div className="bg-zinc-900 p-8 rounded-[32px] w-full max-w-lg border border-white/10 shadow-2xl relative">
                                    <button onClick={() => setShowAddSeason(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>

                                    <h3 className="text-2xl font-black italic uppercase text-white mb-6">Registrar Temporada</h3>

                                    <div className="space-y-4 mb-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Temporada</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej. 2023/24"
                                                    className="w-full h-12 bg-black/50 border border-white/10 rounded-xl px-4 text-white font-bold outline-none focus:border-proneo-green"
                                                    value={newSeason.season}
                                                    onChange={e => setNewSeason({ ...newSeason, season: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Goles</label>
                                                <input
                                                    type="number"
                                                    className="w-full h-12 bg-black/50 border border-white/10 rounded-xl px-4 text-white font-bold outline-none focus:border-proneo-green"
                                                    value={newSeason.goals}
                                                    onChange={e => setNewSeason({ ...newSeason, goals: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Club</label>
                                            <input
                                                type="text"
                                                placeholder="Nombre del Club"
                                                className="w-full h-12 bg-black/50 border border-white/10 rounded-xl px-4 text-white font-bold outline-none focus:border-proneo-green"
                                                value={newSeason.club}
                                                onChange={e => setNewSeason({ ...newSeason, club: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">División / Categoría</label>
                                            <input
                                                type="text"
                                                placeholder="Ej. División de Honor"
                                                className="w-full h-12 bg-black/50 border border-white/10 rounded-xl px-4 text-white font-bold outline-none focus:border-proneo-green"
                                                value={newSeason.division}
                                                onChange={e => setNewSeason({ ...newSeason, division: e.target.value })}
                                            />
                                        </div>
                                    </div>



                                    <button
                                        onClick={async () => {
                                            if (!newSeason.season || !newSeason.club) {
                                                setToast({ message: 'Rellena al menos Temporada y Club', type: 'error' });
                                                return;
                                            }

                                            setLoading(true);
                                            try {
                                                const functions = getFunctions();
                                                const updateProfile = httpsCallable(functions, 'updatePlayerProfile');

                                                // Clone current seasons and add new one
                                                const updatedSeasons = [...(player.seasons || []), newSeason];

                                                await updateProfile({
                                                    playerId: player.id,
                                                    pin,
                                                    data: {
                                                        seasons: updatedSeasons
                                                    }
                                                });

                                                setPlayer((prev: any) => ({
                                                    ...prev,
                                                    seasons: updatedSeasons
                                                }));
                                                setToast({ message: 'Temporada añadida correctamente', type: 'success' });
                                                setShowAddSeason(false);
                                                setNewSeason({ season: '', club: '', division: '', goals: 0 });
                                            } catch (err) {
                                                console.error(err);
                                                setToast({ message: 'Error al guardar temporada', type: 'error' });
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                        className="w-full h-14 bg-white hover:bg-zinc-200 text-zinc-900 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Save className="w-5 h-5" />
                                        Guardar Registro
                                    </button>
                                </div>
                            </div>
                        )
                        }
                    </div >
                )}
            </main >
            {/* DELETE CONFIRMATION MODAL */}
            {deleteConfirm.isOpen && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-black italic uppercase text-white">¿Eliminar Archivo?</h3>
                            <p className="text-zinc-400 text-sm font-medium">
                                Esta acción no se puede deshacer. ¿Estás seguro de que quieres borrarlo de tu galería?
                            </p>
                            <div className="grid grid-cols-2 gap-3 w-full mt-4">
                                <button
                                    onClick={() => setDeleteConfirm({ isOpen: false, ref: null })}
                                    className="h-12 rounded-xl bg-zinc-800 text-white font-bold uppercase tracking-wider text-xs hover:bg-zinc-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDeleteAction}
                                    className="h-12 rounded-xl bg-red-500 text-white font-bold uppercase tracking-wider text-xs hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Sí, Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default PlayerPortal;

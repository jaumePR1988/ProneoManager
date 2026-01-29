import React, { useState, useEffect } from 'react';
import { Camera, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';

interface PublicPhotoUploadProps {
    playerId: string;
}

interface PublicProfile {
    id: string;
    firstName: string;
    lastName1: string;
    name: string;
    club: string;
    category: string;
    photoUrl: string | null;
}

const PublicPhotoUpload: React.FC<PublicPhotoUploadProps> = ({ playerId }) => {
    const [player, setPlayer] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        const fetchPlayer = async () => {
            try {
                const getPublicProfile = httpsCallable(functions, 'getPublicPlayerProfile');
                const result = await getPublicProfile({ playerId });
                const data = result.data as PublicProfile;
                setPlayer(data);
            } catch (err) {
                console.error("Error fetching profile:", err);
                setError('No se pudo encontrar el perfil del jugador o el enlace ha caducado.');
            } finally {
                setLoading(false);
            }
        };

        fetchPlayer();
    }, [playerId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('La imagen es demasiado grande (máximo 5MB)');
                return;
            }
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !player || !preview) return;

        setUploading(true);
        try {
            // Split base64 to get just the data
            const base64Data = preview.split(',')[1];

            const uploadPhoto = httpsCallable(functions, 'uploadPlayerPhoto');
            await uploadPhoto({
                playerId: player.id,
                photoBase64: base64Data,
                mimeType: selectedFile.type
            });

            setSuccess(true);
        } catch (err) {
            console.error("Error uploading:", err);
            alert('Error al subir la imagen. Por favor, inténtalo de nuevo.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
                <Loader2 className="w-12 h-12 text-proneo-green animate-spin mb-4" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Cargando perfil...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-black text-white uppercase italic mb-2">Enlace no válido</h1>
                <p className="text-zinc-500 text-sm max-w-xs">{error}</p>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-24 h-24 bg-proneo-green/10 rounded-full flex items-center justify-center mb-8 border border-proneo-green/20 animate-in zoom-in duration-500">
                    <CheckCircle2 className="w-12 h-12 text-proneo-green" />
                </div>
                <h1 className="text-3xl font-black text-white uppercase italic mb-4">¡Foto Actualizada!</h1>
                <p className="text-zinc-400 text-sm mb-8 max-w-xs">
                    Tu nueva foto se ha guardado correctamente. Ya puedes cerrar esta ventana.
                </p>
                <div className="text-[10px] font-black text-proneo-green uppercase tracking-[0.3em]">
                    PRONEOSPORTS MANAGEMENT
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-proneo-green/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-proneo-green/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

            {/* Logo */}
            <div className="mb-12 relative z-10 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex items-center gap-4 bg-zinc-900/60 p-4 px-7 rounded-[32px] border border-white/5 shadow-2xl backdrop-blur-2xl">
                    <div className="relative">
                        <div className="absolute inset-0 bg-proneo-green/20 blur-xl rounded-full" />
                        <img src="/logo-new.png" alt="Proneo" className="h-14 w-14 object-contain rounded-2xl relative z-10" />
                    </div>
                    <div className="flex flex-col items-start -space-y-1">
                        <span className="text-2xl font-black text-proneo-green tracking-tighter italic leading-none">PRONEO</span>
                        <span className="text-2xl font-black text-proneo-green tracking-tighter italic leading-none opacity-80">MANAGER</span>
                    </div>
                </div>
                <div className="mt-5 text-[9px] font-black text-zinc-500 uppercase tracking-[0.5em] opacity-40">PORTAL DEL JUGADOR</div>
            </div>

            <div className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-[40px] p-10 relative z-10 shadow-2xl">
                <div className="text-center mb-8">
                    <p className="text-2xl font-black text-proneo-green uppercase italic tracking-tight mb-1">¡Hola, {player?.firstName || player?.name}!</p>
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Actualiza tu ficha</h2>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-2">{player?.club} • {player?.category}</p>
                </div>

                {/* Upload Area */}
                <div className="space-y-8">
                    <div
                        className={`aspect-square rounded-[32px] border-2 border-dashed transition-all flex flex-col items-center justify-center relative overflow-hidden ${preview ? 'border-proneo-green/50' : 'border-white/10 hover:border-white/20'
                            }`}
                        onClick={() => document.getElementById('photo-upload')?.click()}
                    >
                        {preview ? (
                            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                    <Camera className="w-8 h-8 text-zinc-400" />
                                </div>
                                <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Toca para seleccionar foto</p>
                                <p className="text-[9px] text-zinc-600 mt-2">Formato JPG o PNG, máx 5MB</p>
                            </>
                        )}
                        <input
                            id="photo-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>

                    <button
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                        className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all ${!selectedFile || uploading
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            : 'bg-proneo-green text-black hover:scale-[1.02] shadow-xl shadow-proneo-green/20'
                            }`}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Subiendo...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5" />
                                <span>Enviar Nueva Foto</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => window.close()}
                        className="w-full text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors py-2"
                    >
                        Cancelar
                    </button>
                </div>
            </div>

            <p className="mt-12 text-[10px] font-bold text-zinc-600 uppercase tracking-widest relative z-10">
                © {new Date().getFullYear()} Proneosports • Todos los derechos reservados
            </p>
        </div>
    );
};

export default PublicPhotoUpload;

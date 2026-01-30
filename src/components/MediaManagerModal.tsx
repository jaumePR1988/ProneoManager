import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Video, Trash2, Download, ExternalLink, Loader2 } from 'lucide-react';
import { ref, listAll, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';
import { storage } from '../firebase/config';

interface MediaFile {
    name: string;
    url: string;
    type: 'photo' | 'video';
    fullPath: string;
    size?: number;
    timeCreated?: string;
}

interface MediaManagerModalProps {
    playerId: string;
    playerName: string;
    onClose: () => void;
}

const MediaManagerModal: React.FC<MediaManagerModalProps> = ({ playerId, playerName, onClose }) => {
    const [photos, setPhotos] = useState<MediaFile[]>([]);
    const [videos, setVideos] = useState<MediaFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchMedia();
    }, [playerId]);

    const fetchMedia = async () => {
        setLoading(true);
        try {
            // Fetch Photos
            const photosRef = ref(storage, `players/${playerId}/photos`);
            const videoRef = ref(storage, `players/${playerId}/videos`);

            const [photosRes, videosRes] = await Promise.all([
                listAll(photosRef).catch(() => ({ items: [] })), // Catch if folder doesn't exist
                listAll(videoRef).catch(() => ({ items: [] }))
            ]);

            // Process Photos
            const photoPromises = photosRes.items.map(async (item) => {
                const url = await getDownloadURL(item);
                const meta = await getMetadata(item);
                return {
                    name: item.name,
                    url,
                    type: 'photo' as const,
                    fullPath: item.fullPath,
                    size: meta.size,
                    timeCreated: meta.timeCreated
                };
            });

            // Process Videos
            const videoPromises = videosRes.items.map(async (item) => {
                const url = await getDownloadURL(item);
                const meta = await getMetadata(item);
                return {
                    name: item.name,
                    url,
                    type: 'video' as const,
                    fullPath: item.fullPath,
                    size: meta.size,
                    timeCreated: meta.timeCreated
                };
            });

            const loadedPhotos = await Promise.all(photoPromises);
            const loadedVideos = await Promise.all(videoPromises);

            // Sort by newest first
            setPhotos(loadedPhotos.sort((a, b) => new Date(b.timeCreated || 0).getTime() - new Date(a.timeCreated || 0).getTime()));
            setVideos(loadedVideos.sort((a, b) => new Date(b.timeCreated || 0).getTime() - new Date(a.timeCreated || 0).getTime()));

        } catch (error) {
            console.error("Error fetching media:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (file: MediaFile) => {
        if (!confirm(`¿Estás seguro de eliminar este archivo permanentemente?\n\n${file.name}`)) return;

        setDeleting(file.fullPath);
        try {
            const fileRef = ref(storage, file.fullPath);
            await deleteObject(fileRef);

            // Update local state
            if (file.type === 'photo') {
                setPhotos(prev => prev.filter(p => p.fullPath !== file.fullPath));
            } else {
                setVideos(prev => prev.filter(v => v.fullPath !== file.fullPath));
            }
        } catch (error) {
            console.error("Error deleting file:", error);
            alert("Error al eliminar el archivo.");
        } finally {
            setDeleting(null);
        }
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl relative">

                {/* Header */}
                <div className="bg-zinc-900 px-8 py-6 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-white italic uppercase tracking-wider">Galería de Medios</h2>
                        <p className="text-proneo-green font-bold text-sm">{playerName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-100 shrink-0">
                    <button
                        onClick={() => setActiveTab('photos')}
                        className={`flex-1 h-16 flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest transition-colors ${activeTab === 'photos'
                                ? 'bg-white text-zinc-900 border-b-2 border-proneo-green'
                                : 'bg-zinc-50 text-zinc-400 hover:text-zinc-600'
                            }`}
                    >
                        <ImageIcon className={`w-5 h-5 ${activeTab === 'photos' ? 'text-proneo-green' : ''}`} />
                        Fotos ({photos.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('videos')}
                        className={`flex-1 h-16 flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest transition-colors ${activeTab === 'videos'
                                ? 'bg-white text-zinc-900 border-b-2 border-proneo-green'
                                : 'bg-zinc-50 text-zinc-400 hover:text-zinc-600'
                            }`}
                    >
                        <Video className={`w-5 h-5 ${activeTab === 'videos' ? 'text-proneo-green' : ''}`} />
                        Vídeos ({videos.length})
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-zinc-50">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-proneo-green" />
                            <p className="text-sm font-bold uppercase tracking-widest">Cargando galería...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'photos' && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {photos.length === 0 ? (
                                        <div className="col-span-full text-center py-20 text-zinc-400">
                                            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                            <p className="font-bold uppercase tracking-wider">No hay fotos subidas</p>
                                        </div>
                                    ) : (
                                        photos.map((file) => (
                                            <div key={file.fullPath} className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-zinc-100 aspect-square flex flex-col">
                                                <div className="flex-1 relative overflow-hidden bg-zinc-100">
                                                    <img src={file.url} alt={file.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                                </div>
                                                <div className="p-3 bg-white shrink-0 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-zinc-400">{formatSize(file.size)}</span>
                                                    <div className="flex gap-2">
                                                        <a href={file.url} target="_blank" download className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600 transition-colors" title="Abrir/Descargar">
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                        <button
                                                            onClick={() => handleDelete(file)}
                                                            disabled={deleting === file.fullPath}
                                                            className="p-2 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            {deleting === file.fullPath ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'videos' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {videos.length === 0 ? (
                                        <div className="col-span-full text-center py-20 text-zinc-400">
                                            <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                            <p className="font-bold uppercase tracking-wider">No hay vídeos subidos</p>
                                        </div>
                                    ) : (
                                        videos.map((file) => (
                                            <div key={file.fullPath} className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-zinc-100">
                                                <div className="aspect-video bg-black relative">
                                                    <video src={file.url} controls className="w-full h-full object-contain" />
                                                </div>
                                                <div className="p-4 bg-white flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold text-zinc-900 truncate max-w-[150px]">{file.name}</p>
                                                        <span className="text-[10px] font-bold text-zinc-400">{formatSize(file.size)}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <a href={file.url} target="_blank" download className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600 transition-colors">
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                        <button
                                                            onClick={() => handleDelete(file)}
                                                            disabled={deleting === file.fullPath}
                                                            className="p-2 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                                                        >
                                                            {deleting === file.fullPath ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Info */}
                <div className="bg-zinc-50 px-8 py-4 border-t border-zinc-200 text-center">
                    <p className="text-[10px] text-zinc-400">
                        Los archivos eliminados no se pueden recuperar. Revisa bien antes de borrar.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MediaManagerModal;

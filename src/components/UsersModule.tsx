import React, { useState } from 'react';
import { Check, X, Shield, Plus, Save, AlertCircle } from 'lucide-react';
import { doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useUsers, UserData } from '../hooks/useUsers';

// Removed duplicate imports

const UsersModule: React.FC = () => {
    const { users, loading } = useUsers();
    // const [users, setUsers] = useState<UserData[]>([]); // REMOVED
    // const [loading, setLoading] = useState(true); // REMOVED
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        name: '',
        role: 'scout',
        sport: 'General'
    });
    const [createError, setCreateError] = useState('');

    /* REMOVED useEffect and duplicate interface
    interface UserData { ... } -> Use imported one if needed or keep local if just for view
    */

    if (loading) return <div className="p-10 text-center text-zinc-400 font-bold animate-pulse">Cargando usuarios...</div>;

    const [activeTab, setActiveTab] = useState<'users' | 'restore'>('users');
    const [restoreStatus, setRestoreStatus] = useState('');

    const handleApprove = async (email: string) => {
        if (confirm(`¿Aprobar acceso a ${email}?`)) {
            await updateDoc(doc(db, 'users', email), { approved: true, role: 'scout' }); // Default to scout
        }
    };

    const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm("⚠️ ADVERTENCIA CRÍTICA ⚠️\n\nEstás a punto de RESTAURAR masivamente la base de datos.\nEsto SOBRESCRIBIRÁ los datos actuales con los del archivo de respaldo.\n\n¿Estás 100% seguro de que quieres continuar?")) {
            event.target.value = ''; // Reset input
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = e.target?.result as string;
                const playersToRestore = JSON.parse(json);

                if (!Array.isArray(playersToRestore)) {
                    alert("El archivo no tiene formato válido (debe ser una lista de jugadores).");
                    return;
                }

                setRestoreStatus(`Iniciando restauración de ${playersToRestore.length} registros...`);
                let successCount = 0;
                let errorCount = 0;

                for (const player of playersToRestore) {
                    try {
                        // Crucial: Use setDoc with merged: true or just setDoc to overwrite exactly with the ID
                        if (!player.id) {
                            console.warn("Skipping player without ID:", player);
                            continue;
                        }

                        // Sanitize: Firestore doesn't like undefined
                        const sanitized = JSON.parse(JSON.stringify(player));

                        await setDoc(doc(db, 'players', player.id), sanitized);
                        successCount++;
                        if (successCount % 10 === 0) setRestoreStatus(`Restaurando... (${successCount}/${playersToRestore.length})`);
                    } catch (err) {
                        console.error("Error restoring player:", player, err);
                        errorCount++;
                    }
                }

                setRestoreStatus(`✅ Restauración completada: ${successCount} restaurados, ${errorCount} errores.`);
                alert(`Proceso finalizado.\n\nRestaurados: ${successCount}\nFallidos: ${errorCount}`);
            } catch (err) {
                console.error("JSON Parse Error", err);
                alert("Error al leer el archivo JSON.");
            }
            event.target.value = ''; // Reset input
        };
        reader.readAsText(file);
    };

    const handleReject = async (email: string) => {
        if (confirm(`¿Eliminar solicitud de ${email}?`)) {
            await deleteDoc(doc(db, 'users', email));
        }
    };

    const handleRoleChange = async (email: string, newRole: string) => {
        await updateDoc(doc(db, 'users', email), { role: newRole });
    };

    const handleSportChange = async (email: string, newSport: string) => {
        await updateDoc(doc(db, 'users', email), { sport: newSport });
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');

        if (!newUser.email || !newUser.name) {
            setCreateError('Todos los campos son obligatorios');
            return;
        }

        if (!newUser.email.endsWith('@proneosports.com')) {
            setCreateError('Debe ser un correo @proneosports.com');
            return;
        }

        try {
            await setDoc(doc(db, 'users', newUser.email), {
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
                sport: newUser.sport,
                approved: true,
                createdAt: new Date().toISOString()
            });
            setShowCreateModal(false);
            setNewUser({ email: '', name: '', role: 'scout', sport: 'General' });
        } catch (err: any) {
            console.error("Error creating user:", err);
            setCreateError('Error al crear usuario. Verifica que no exista.');
        }
    };

    return (
        <div className="space-y-6 bg-slate-50 min-h-screen p-6 -m-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight uppercase italic">Panel de Control</h1>
                    <p className="text-zinc-500 font-medium">Gestión de usuarios y seguridad de datos</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${activeTab === 'users' ? 'bg-zinc-900 text-white shadow-lg' : 'bg-white text-zinc-400 hover:bg-zinc-50'}`}
                    >
                        Usuarios
                    </button>
                    <button
                        onClick={() => setActiveTab('restore')}
                        className={`px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${activeTab === 'restore' ? 'bg-red-500 text-white shadow-lg' : 'bg-white text-red-400 hover:bg-red-50'}`}
                    >
                        <Shield className="w-4 h-4 inline-block mr-2" />
                        Restauración Masiva
                    </button>
                    {activeTab === 'users' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 bg-[#b4c885] text-white px-5 py-3 rounded-2xl hover:bg-[#a3b675] transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-[#b4c885]/20 ml-4"
                        >
                            <Plus className="w-4 h-4" />
                            Crear Usuario
                        </button>
                    )}
                </div>
            </header>

            {activeTab === 'restore' ? (
                <div className="bg-white p-10 rounded-[40px] shadow-xl border border-zinc-100 text-center space-y-8 max-w-2xl mx-auto">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                        <Shield className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-zinc-900 uppercase">Restauración de Emergencia</h2>
                        <p className="text-zinc-500 max-w-md mx-auto">Carga aquí el archivo de copia de seguridad (.json) para restaurar la base de datos completa. <br /><strong className="text-red-500">Esta acción sobrescribirá los datos actuales.</strong></p>
                    </div>

                    <div className="p-8 border-2 border-dashed border-zinc-200 rounded-3xl hover:border-zinc-400 transition-colors bg-zinc-50/50">
                        <label className="cursor-pointer block">
                            <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
                            <span className="block text-zinc-400 font-bold uppercase tracking-widest hover:text-zinc-600 transition-colors">
                                Haz click para seleccionar archivo JSON
                            </span>
                        </label>
                    </div>

                    {restoreStatus && (
                        <div className="p-4 bg-zinc-900 text-white rounded-xl font-mono text-sm animate-pulse">
                            {restoreStatus}
                        </div>
                    )}
                </div>
            ) : (

                <div className="bg-white rounded-3xl shadow-xl shadow-zinc-200/50 border border-zinc-100 overflow-hidden w-full">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-50 border-b border-zinc-100">
                            <tr>
                                <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest">Usuario</th>
                                <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest">Rol</th>
                                <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest">Especialidad</th>
                                <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest text-right">Estado</th>
                                <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {users.map((user) => (
                                <tr key={user.email} className="group hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-400">
                                                {user.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-zinc-900">{user.name}</p>
                                                <p className="text-xs text-zinc-400 font-mono">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="relative">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.email, e.target.value)}
                                                className="appearance-none bg-zinc-100 border border-zinc-200 rounded-lg px-4 py-2 pr-8 text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-proneo-green/20"
                                            >
                                                <option value="director">Director</option>
                                                <option value="admin">Admin</option>
                                                <option value="tesorero">Tesorero/a</option>
                                                <option value="agent">Agente</option>
                                                <option value="scout">Scout</option>
                                                <option value="external_scout">Scout Externo</option>
                                                <option value="comunicacion">Comunicación (Global)</option>
                                                <option value="guest">Invitado</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="relative">
                                            <select
                                                value={user.sport || 'General'}
                                                onChange={(e) => handleSportChange(user.email, e.target.value)}
                                                className="appearance-none bg-zinc-50 border border-zinc-100 rounded-lg px-4 py-2 pr-8 text-[10px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-proneo-green/20"
                                            >
                                                <option value="General">Global / General</option>
                                                <option value="Fútbol">Fútbol</option>
                                                <option value="F. Sala">Fútbol Sala</option>
                                                <option value="Femenino">Femenino</option>
                                                <option value="Entrenadores">Entrenadores</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        {user.approved ? (
                                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                Activo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-widest">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                Pendiente
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {!user.approved ? (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(user.email)}
                                                        className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors"
                                                        title="Aprobar"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(user.email)}
                                                        className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
                                                        title="Rechazar"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                // Action for approved users: Permanent Delete (except self/owner)
                                                user.email !== 'jaume@proneosports.com' && (
                                                    <button
                                                        onClick={() => handleReject(user.email)}
                                                        className="w-10 h-10 rounded-xl bg-zinc-50 text-zinc-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all border border-zinc-100 hover:border-red-100"
                                                        title="Eliminar Usuario"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl space-y-6 relative">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-zinc-900 uppercase">Nuevo Usuario</h2>
                            <p className="text-xs font-bold text-zinc-400">Pre-vincular cuenta para acceso inmediato</p>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-2">Nombre Completo</label>
                                <input
                                    type="text"
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl h-11 px-4 font-bold text-zinc-700 focus:bg-white focus:ring-4 focus:ring-[#b4c885]/10 focus:border-[#b4c885]/50 outline-none transition-all"
                                    placeholder="Ej. Pepito Pérez"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-2">Email Corporativo</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl h-11 px-4 font-bold text-zinc-700 focus:bg-white focus:ring-4 focus:ring-[#b4c885]/10 focus:border-[#b4c885]/50 outline-none transition-all"
                                    placeholder="usuario@proneosports.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-2">Rol</label>
                                    <select
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl h-11 px-4 font-bold text-zinc-700 focus:bg-white focus:ring-4 focus:ring-[#b4c885]/10 focus:border-[#b4c885]/50 outline-none transition-all appearance-none"
                                    >
                                        <option value="director">Director</option>
                                        <option value="admin">Admin</option>
                                        <option value="tesorero">Tesorero/a</option>
                                        <option value="agent">Agente</option>
                                        <option value="scout">Scout</option>
                                        <option value="external_scout">Scout Externo</option>
                                        <option value="comunicacion">Comunicación (Global)</option>
                                        <option value="guest">Invitado</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-2">Especialidad</label>
                                    <select
                                        value={newUser.sport}
                                        onChange={e => setNewUser({ ...newUser, sport: e.target.value })}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl h-11 px-4 font-bold text-zinc-700 focus:bg-white focus:ring-4 focus:ring-[#b4c885]/10 focus:border-[#b4c885]/50 outline-none transition-all appearance-none"
                                    >
                                        <option value="General">General</option>
                                        <option value="Fútbol">Fútbol</option>
                                        <option value="F. Sala">F. Sala</option>
                                        <option value="Femenino">Femenino</option>
                                        <option value="Entrenadores">Entrenadores</option>
                                    </select>
                                </div>
                            </div>

                            {createError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-500 text-xs font-bold flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {createError}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-[#b4c885] text-white h-12 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#a3b675] hover:shadow-lg hover:shadow-[#b4c885]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Crear Usuario
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersModule;

import React, { useState, useEffect } from 'react';
import { Check, X, Shield } from 'lucide-react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface UserData {
    email: string;
    role: string;
    name: string;
    approved: boolean;
    createdAt: string;
}

const UsersModule: React.FC = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                email: doc.id,
                ...doc.data()
            })) as UserData[];
            setUsers(usersData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <div className="p-10 text-center text-zinc-400 font-bold animate-pulse">Cargando usuarios...</div>;

    const handleApprove = async (email: string) => {
        if (confirm(`¿Aprobar acceso a ${email}?`)) {
            await updateDoc(doc(db, 'users', email), { approved: true, role: 'scout' }); // Default to scout
        }
    };

    const handleReject = async (email: string) => {
        if (confirm(`¿Eliminar solicitud de ${email}?`)) {
            await deleteDoc(doc(db, 'users', email));
        }
    };

    const handleRoleChange = async (email: string, newRole: string) => {
        await updateDoc(doc(db, 'users', email), { role: newRole });
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight uppercase italic">Gestión de Usuarios</h1>
                    <p className="text-zinc-500 font-medium">Control de acceso y roles del sistema</p>
                </div>
            </header>

            <div className="bg-white rounded-3xl shadow-xl shadow-zinc-200/50 border border-zinc-100 overflow-hidden w-full">
                <table className="w-full text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-100">
                        <tr>
                            <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest">Usuario</th>
                            <th className="px-8 py-6 text-xs font-black text-zinc-400 uppercase tracking-widest">Rol</th>
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
                                            <option value="guest">Invitado</option>
                                        </select>
                                        <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
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
        </div>
    );
};

export default UsersModule;

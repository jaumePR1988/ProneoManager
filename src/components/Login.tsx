import React, { useState } from 'react';
import { LogIn, UserPlus, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const Login: React.FC = () => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); // Only for register
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // 1. Domain Validation
        if (!email.endsWith('@proneosports.com')) {
            setError('Solo se permiten correos corporativos (@proneosports.com)');
            setLoading(false);
            return;
        }

        try {
            if (isRegistering) {
                // REGISTER FLOW
                if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
                if (!name) throw new Error('El nombre es obligatorio');

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);

                // Update specific profile
                await updateProfile(userCredential.user, {
                    displayName: name
                });

                // Create User Document in Firestore (Pending Approval)
                const isOwner = email === 'jaume@proneosports.com';
                await setDoc(doc(db, 'users', email), {
                    email,
                    name,
                    role: isOwner ? 'admin' : 'guest',
                    approved: isOwner, // Auto-approve owner
                    createdAt: new Date().toISOString()
                });

            } else {
                // LOGIN FLOW
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err: any) {
            console.error("Auth Error:", err);
            let msg = 'Error desconocido';
            if (err.code === 'auth/wrong-password') msg = 'Contraseña incorrecta';
            if (err.code === 'auth/user-not-found') msg = 'Usuario no encontrado';
            if (err.code === 'auth/email-already-in-use') msg = 'Este correo ya está registrado';
            if (err.message) msg = err.message;
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative gradients */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-proneo-green/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-zinc-100 blur-[120px] rounded-full" />

            <div className="w-full max-w-md relative z-10 text-center space-y-8 animate-fade-in shadow-2xl bg-white p-10 rounded-[48px] border border-zinc-100">
                <div className="space-y-4">
                    <img
                        src="/logo-full.png"
                        alt="Proneo Sports Management"
                        className="relative w-64 h-auto object-contain mx-auto"
                    />
                    <div className="h-1 w-16 bg-proneo-green/20 rounded-full mx-auto" />
                </div>

                <div className="text-left space-y-2">
                    <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
                        {isRegistering ? 'Crear Cuenta' : 'Bienvenido'}
                    </h2>
                    <p className="text-sm font-medium text-zinc-400">
                        {isRegistering ? 'Solicita acceso al sistema' : 'Introduce tus credenciales'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {isRegistering && (
                        <div className="relative group">
                            <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-proneo-green transition-colors" />
                            <input
                                type="text"
                                placeholder="Nombre Completo"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl h-14 pl-12 pr-4 font-bold text-zinc-700 focus:bg-white focus:ring-4 focus:ring-proneo-green/10 focus:border-proneo-green/50 outline-none transition-all"
                            />
                        </div>
                    )}

                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-proneo-green transition-colors" />
                        <input
                            type="email"
                            placeholder="correo@proneosports.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl h-14 pl-12 pr-4 font-bold text-zinc-700 focus:bg-white focus:ring-4 focus:ring-proneo-green/10 focus:border-proneo-green/50 outline-none transition-all placeholder:text-zinc-300"
                        />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-proneo-green transition-colors" />
                        <input
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl h-14 pl-12 pr-4 font-bold text-zinc-700 focus:bg-white focus:ring-4 focus:ring-proneo-green/10 focus:border-proneo-green/50 outline-none transition-all placeholder:text-zinc-300"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-500 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-bold animate-pulse">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-zinc-900 text-white h-16 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-proneo-green hover:shadow-lg hover:shadow-proneo-green/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="animate-pulse">Procesando...</span>
                        ) : (
                            isRegistering ? 'Solicitar Acceso' : 'Entrar al Sistema'
                        )}
                    </button>
                </form>

                <div className="pt-6 border-t border-zinc-50 flex flex-col items-center gap-4">
                    <button
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError(null);
                        }}
                        className="text-xs font-bold text-zinc-400 hover:text-proneo-green transition-colors uppercase tracking-wider"
                    >
                        {isRegistering
                            ? '¿Ya tienes cuenta? Inicia Sesión'
                            : '¿No tienes cuenta? Registrate aquí'}
                    </button>

                    <div className="flex flex-col items-center gap-1">
                        <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                            © 2024 Proneo Sports Management • Central Hub
                        </p>
                        <p className="text-[9px] font-bold text-proneo-green/50 uppercase tracking-widest bg-proneo-green/5 px-2 py-1 rounded">
                            v2.1 - Sistema Seguro (Fixed)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

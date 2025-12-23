import React from 'react';
import { LogIn } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase-config';

const Login: React.FC = () => {
    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error: any) {
            console.error("Login Error:", error);
            alert("Error en el inicio de sesión: " + error.message);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative gradients for light mode */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-proneo-green/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-zinc-100 blur-[120px] rounded-full" />

            <div className="w-full max-w-md relative z-10 text-center space-y-12 animate-fade-in shadow-2xl bg-white p-12 rounded-[64px] border border-zinc-100">
                <div className="space-y-6">
                    <div className="relative inline-block">
                        <img
                            src="/logo-full.png"
                            alt="Proneo Sports Management"
                            className="relative w-72 h-auto object-contain mx-auto"
                        />
                    </div>
                </div>

                <div className="space-y-8">
                    <button
                        onClick={handleLogin}
                        className="w-full bg-zinc-900 text-white h-16 rounded-[24px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-proneo-green hover:shadow-lg hover:shadow-proneo-green/20 transition-all active:scale-[0.98] group"
                    >
                        <LogIn className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        <span>Entrar con Google</span>
                    </button>

                    <div className="flex items-center gap-4 py-3 px-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <div className="w-2 h-2 rounded-full bg-proneo-green animate-pulse" />
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-left">
                            Acceso exclusivo con dominio @proneosports.com
                        </p>
                    </div>
                </div>

                <div className="pt-4 border-t border-zinc-50">
                    <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                        © 2024 Proneo Sports Management • Central Hub
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;

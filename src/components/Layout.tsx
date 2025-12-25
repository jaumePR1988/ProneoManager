import React from 'react';
import {
    Users,
    Search,
    Settings,
    LayoutDashboard,
    Plus,
    LogOut,
    Bell,
    FileText,
    Briefcase,
    UserCircle,
    UserCog
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, isDemoMode } from '../firebase/config';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    user: any;
    onNewPlayer: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onNewPlayer }) => {
    // Role-based Tab Filtering
    const userRole = user?.role || 'guest';
    const isAdmin = ['admin', 'director'].includes(userRole);
    const isAgent = userRole === 'agent';
    const isScout = userRole === 'scout';

    const tabs = [
        { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
        { id: 'players', label: 'Futbolistas/Entrenadores', icon: Users },
        { id: 'scouting', label: 'Scouting', icon: Search },
        { id: 'reports', label: 'Reportes', icon: FileText },
        { id: 'admin', label: 'Administración', icon: Briefcase, hidden: !isAdmin },
        { id: 'avisos', label: 'Avisos', icon: Bell }, // Agent sees only own alerts (logic inside module)
        { id: 'settings', label: 'Ajustes', icon: Settings, hidden: isScout }, // Scouts don't need settings
    ].filter(tab => !tab.hidden);

    return (
        <div className="flex h-screen bg-white text-zinc-900 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-80 bg-zinc-50 border-r border-zinc-100 flex flex-col p-8 transition-all">
                <div className="mb-12 flex flex-col items-center text-center space-y-2">
                    <img
                        src="/logo-full.png"
                        alt="Proneo Sports"
                        className="w-48 h-auto object-contain mb-2"
                    />
                    <div className="h-1 w-12 bg-proneo-green rounded-full opacity-20" />
                </div>

                <nav className="flex-1 space-y-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-4 px-6 h-14 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === tab.id
                                ? 'bg-white text-proneo-green shadow-xl shadow-zinc-200/50 border border-zinc-100'
                                : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/50'
                                }`}
                        >
                            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-proneo-green' : 'text-zinc-300'}`} />
                            {tab.label}
                            {activeTab === tab.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-proneo-green" />}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto pt-8 border-t border-zinc-100 space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <img
                            src={user?.photoURL || 'https://i.pravatar.cc/150'}
                            className="w-12 h-12 rounded-2xl border-2 border-white shadow-md ring-4 ring-zinc-50"
                            alt="Profile"
                        />
                        <div className="overflow-hidden">
                            <p className="text-sm font-black text-zinc-900 truncate">{user?.displayName || 'Usuario'}</p>
                            <p className="text-[10px] font-bold text-proneo-green uppercase tracking-widest truncate">
                                {user?.role === 'admin' ? 'Director / Admin' :
                                    user?.role === 'agent' ? 'Agente Proneo' :
                                        user?.role === 'scout' ? 'Scouting' : 'Invitado'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => signOut(auth)}
                        className="w-full flex items-center gap-4 px-6 h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                    >
                        <LogOut className="w-5 h-5" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
                {/* Top Header */}
                <header className="h-24 px-10 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md border-b border-zinc-100 relative z-10">
                    <div className="flex items-center gap-8">
                        {activeTab !== 'reports' && (
                            <h2 className="text-2xl font-black text-zinc-900 tracking-tight capitalize">
                                {tabs.find(t => t.id === activeTab)?.label}
                            </h2>
                        )}

                        {!['dashboard', 'reports', 'players', 'avisos', 'admin'].includes(activeTab) && (
                            <>
                                <div className="h-10 w-[1px] bg-zinc-100 hidden md:block" />
                                <div className="relative hidden md:block group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-proneo-green transition-colors" />
                                    <input
                                        type="text"
                                        placeholder={`Buscar en ${tabs.find(t => t.id === activeTab)?.label}...`}
                                        className="bg-zinc-100/50 border border-zinc-100 rounded-xl pl-12 pr-6 h-12 text-sm font-bold w-72 focus:bg-white focus:ring-4 focus:ring-proneo-green/5 focus:border-proneo-green/20 outline-none transition-all"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {!['dashboard', 'reports', 'settings', 'avisos', 'scouting', 'admin'].includes(activeTab) && (
                            <button
                                onClick={onNewPlayer}
                                className="bg-proneo-green text-white px-6 h-12 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:shadow-xl hover:shadow-proneo-green/20 transition-all active:scale-95 shadow-lg"
                            >
                                <Plus className="w-4 h-4" />
                                Nuevo Jugador
                            </button>
                        )}
                    </div>
                </header>

                {/* Dynamic Viewport */}
                <div className="flex-1 overflow-y-auto p-10 bg-white/50 relative no-scrollbar">
                    {/* Decorative elements for white theme */}
                    <div className="fixed top-24 right-0 w-[400px] h-[400px] bg-proneo-green/[0.02] blur-[150px] -z-10 rounded-full" />
                    <div className="fixed bottom-0 left-80 w-[400px] h-[400px] bg-zinc-100/50 blur-[150px] -z-10 rounded-full" />

                    <div className="animate-fade-in">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;

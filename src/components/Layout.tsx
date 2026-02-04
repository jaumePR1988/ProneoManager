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
    UserCog,
    Send,
    Camera
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    user: any;
    onNewPlayer: () => void;
    playerView?: 'players' | 'contacts';
    onPlayerViewChange?: (view: 'players' | 'contacts') => void;
}

// Define visibility rules for Header elements
const HIDE_SEARCH_TABS = ['dashboard', 'reports', 'players', 'avisos', 'admin', 'users', 'settings', 'calendar', 'scouting', 'multimedia', 'comms'];
const HIDE_NEW_PLAYER_TABS = ['dashboard', 'reports', 'settings', 'avisos', 'scouting', 'admin', 'users', 'calendar', 'multimedia', 'comms'];

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onNewPlayer, playerView, onPlayerViewChange }) => {
    const [pendingCount, setPendingCount] = React.useState(0);
    const [alertsCount, setAlertsCount] = React.useState(0);
    // Role-based Tab Filtering
    const userRole = (user?.role || 'guest').toLowerCase();
    const isAdmin = ['admin', 'director'].includes(userRole);
    const isTreasurer = userRole === 'tesorero' || userRole === 'treasurer';
    const isCommunication = userRole === 'comunicacion';
    const isScout = userRole === 'scout';

    // Authorization for Alerts/Pending Users
    const canSeeAlerts = isAdmin || isTreasurer;

    React.useEffect(() => {
        if (!canSeeAlerts) return;

        // DEBUG: Check tokens
        if (user?.email === 'admin@proneosports.com' && user?.fcmTokens) {
            console.log(`📱 DISPOSITIVOS REGISTRADOS: ${user.fcmTokens.length}`);
            console.log('Tokens:', user.fcmTokens);
        }

        // 1. Pending Users (Only Admin/Director)
        let unsubUsers = () => { };
        if (isAdmin) {
            const qUsers = query(collection(db, 'users'), where('approved', '==', false));
            unsubUsers = onSnapshot(qUsers, (snapshot) => {
                setPendingCount(snapshot.size);
            });
        }

        // 2. Pending Contract Validations (All authorized roles have access)
        const qContracts = query(collection(db, 'players'), where('proneoStatus', '==', 'PendingValidation'));
        const unsubContracts = onSnapshot(qContracts, (snapshot) => {
            setAlertsCount(snapshot.size);
        });

        return () => {
            unsubUsers();
            unsubContracts();
        };
    }, [canSeeAlerts, isAdmin]);

    const tabs = [
        { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
        { id: 'players', label: 'Base de Datos', icon: Users },
        { id: 'scouting', label: 'Scouting', icon: Search, hidden: isTreasurer },
        { id: 'calendar', label: 'Calendario / Informes', icon: Briefcase, hidden: isTreasurer || isScout },
        { id: 'reports', label: 'Reportes', icon: FileText, hidden: isTreasurer },
        { id: 'multimedia', label: 'Multimedia', icon: Camera, hidden: isTreasurer || isScout },
        { id: 'admin', label: 'Administración', icon: Briefcase, hidden: !isAdmin && !isTreasurer },
        { id: 'users', label: 'Usuarios', icon: UserCog, hidden: !isAdmin },
        { id: 'comms', label: 'Comunicaciones', icon: Send, hidden: !isAdmin && !isCommunication },
        { id: 'avisos', label: 'Avisos', icon: Bell },
        { id: 'settings', label: 'Ajustes', icon: Settings, hidden: isScout },
    ].filter(tab => !tab.hidden);

    return (
        <div className="flex h-screen bg-white text-zinc-900 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-80 bg-zinc-50 border-r border-zinc-100 flex flex-col p-6 transition-all overflow-y-auto">
                <div className="mb-8 flex flex-col items-center text-center space-y-2">
                    <img
                        src="/logo-full.png"
                        alt="Proneo Sports"
                        className="w-48 h-auto object-contain mb-2"
                    />
                    <div className="h-1 w-12 bg-proneo-green rounded-full opacity-20" />
                    <p className="text-[10px] font-black text-white bg-red-500 px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg shadow-red-500/20 mt-1 animate-pulse">v1.0.6</p>
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
                            <span className="flex-1 text-left">{tab.label}</span>
                            {tab.id === 'users' && pendingCount > 0 && (
                                <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-red-500/20">
                                    {pendingCount}
                                </span>
                            )}
                            {tab.id === 'avisos' && alertsCount > 0 && (
                                <span className="w-5 h-5 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-orange-500/20">
                                    {alertsCount}
                                </span>
                            )}
                            {activeTab === tab.id && <div className="w-1.5 h-1.5 rounded-full bg-proneo-green ml-2" />}
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
                            {user?.email === 'admin@proneosports.com' && (
                                <div className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full w-fit mb-1 animate-pulse">
                                    📱 {user.fcmTokens?.length || 0}
                                </div>
                            )}
                            <p className="text-sm font-black text-zinc-900 truncate">{user?.displayName || 'Usuario'}</p>
                            <p className="text-[9px] font-bold text-proneo-green/50 uppercase tracking-widest bg-proneo-green/5 px-2 py-1 rounded">
                                Sistema de Gestión
                            </p>
                            <span className="text-[10px] font-bold text-zinc-400">v1.0.6</span>
                            <p className="text-[10px] font-bold text-proneo-green uppercase tracking-widest truncate">
                                {isAdmin ? 'Director / Admin' :
                                    isTreasurer ? 'Tesorero/a' :
                                        userRole === 'agent' ? 'Agente Proneo' :
                                            userRole === 'comunicacion' ? 'Comunicación' :
                                                userRole === 'scout' ? 'Scouting' : 'Invitado'}
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
                            <h2 className="text-2xl font-black text-zinc-900 tracking-tight uppercase">
                                {tabs.find(t => t.id === activeTab)?.label}
                            </h2>
                        )}

                        {!HIDE_SEARCH_TABS.includes(activeTab) && (
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
                        {activeTab === 'players' && playerView && onPlayerViewChange && (
                            <div className="bg-zinc-100/80 backdrop-blur-sm p-1 rounded-xl flex gap-1 border border-zinc-200 shadow-sm mr-2">
                                <button
                                    onClick={() => onPlayerViewChange('players')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${playerView === 'players'
                                        ? 'bg-white text-proneo-green shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-600'
                                        }`}
                                >
                                    Jugadores
                                </button>
                                <button
                                    onClick={() => onPlayerViewChange('contacts')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${playerView === 'contacts'
                                        ? 'bg-white text-proneo-green shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-600'
                                        }`}
                                >
                                    Agenda
                                </button>
                            </div>
                        )}
                        {!HIDE_NEW_PLAYER_TABS.includes(activeTab) && (
                            <button
                                onClick={onNewPlayer}
                                className="bg-proneo-green text-white px-6 h-12 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:shadow-xl hover:shadow-proneo-green/20 transition-all active:scale-95 shadow-lg shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                                Nuevo Jugador
                            </button>
                        )}
                    </div>
                </header>

                {/* Dynamic Viewport */}
                <div className="flex-1 overflow-y-auto p-8 bg-white/50 relative">
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

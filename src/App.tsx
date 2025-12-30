import { useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signOut,
    User as FirebaseUser
} from 'firebase/auth';
import { auth, isDemoMode } from './firebase/config';
// isDemoMode removed from config, checking if used elsewhere or if I should re-add it to config.ts
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PlayerModule from './components/PlayerModule';
import ScoutingModule from './components/ScoutingModule';
import ReportsModule from './components/ReportsModule';
import AdministrationModule from './components/AdministrationModule';
import AvisosModule from './components/AvisosModule';
import SettingsModule from './components/SettingsModule';
import UsersModule from './components/UsersModule';
import ProfileModule from './components/ProfileModule';
import PlayerForm from './components/PlayerForm';
import NotificationCenter from './components/NotificationCenter';
import CalendarModule from './components/CalendarModule';
// import IAModule from './components/IAModule';

import { usePlayers } from './hooks/usePlayers';
import { useAutoLogout } from './hooks/useAutoLogout';

function App() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [error, setError] = useState<string | null>(null);
    const [showPlayerForm, setShowPlayerForm] = useState(false);

    const { addPlayer } = usePlayers();

    const [userRole, setUserRole] = useState<string>('guest');
    const [userSport, setUserSport] = useState<string>('General');

    // Auto-logout hook (15 minutes by default)
    useAutoLogout(user);

    useEffect(() => {
        if (isDemoMode) {
            setUser({
                email: 'demo@proneosports.com',
                displayName: 'Proneo Demo User',
                photoURL: 'https://i.pravatar.cc/150?u=proneo'
            } as FirebaseUser);
            setUserRole('admin');
            setUserSport('General');
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Domain restriction check
                if (firebaseUser.email?.endsWith('@proneosports.com')) {

                    // RBAC: Fetch User Profile
                    try {
                        const { getDoc, doc } = await import('firebase/firestore');
                        const { db } = await import('./firebase/config');
                        const userRef = doc(db, 'users', firebaseUser.email || 'unknown'); // Use email as ID
                        const userSnap = await getDoc(userRef);

                        if (userSnap.exists()) {
                            const userData = userSnap.data();

                            // CHECK APPROVAL
                            if (userData.approved !== true) {
                                signOut(auth);
                                setError('Cuenta pendiente de aprobación por el Director.');
                                setLoading(false);
                                return;
                            }

                            // FORCED ROLE FOR OWNER
                            let finalRole = userData.role || 'guest';
                            const userEmail = (firebaseUser.email || '').toLowerCase();
                            const userName = (firebaseUser.displayName || '').toLowerCase();

                            const isOwnerEmail = userEmail.includes('jaume') || userEmail.includes('jpedragosa');
                            const isOwnerName = userName.includes('jaume');

                            if (isOwnerEmail || isOwnerName) {
                                finalRole = 'director';
                            }

                            setUserRole(finalRole);
                            setUserSport(userData.sport || 'General');
                            setUser(firebaseUser);
                            setError(null);
                        } else {
                            // SELF-HEALING: Create missing doc
                            const { setDoc } = await import('firebase/firestore');
                            const userEmail = firebaseUser.email || 'unknown';

                            await setDoc(userRef, {
                                email: userEmail,
                                name: firebaseUser.displayName || userEmail.split('@')[0],
                                role: 'guest',
                                limitRole: 'guest', // redundancy
                                sport: 'General',
                                approved: false,
                                createdAt: new Date().toISOString()
                            });

                            // Now kick them out but with the right message
                            signOut(auth);
                            setError('Perfil registrado. Esperando aprobación del Director.');
                        }
                    } catch (err) {
                        console.error("Error fetching user data:", err);
                        setError('Error de conexión al verificar permisos.');
                    }

                } else {
                    signOut(auth);
                    setError('Acceso denegado: Solo usuarios @proneosports.com');
                }
            } else {
                setUser(null);
                setUserRole('guest');
                setUserSport('General');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);


    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard setActiveTab={setActiveTab} userRole={userRole} />;
            case 'players':
                return <PlayerModule userRole={userRole} userSport={userSport} userName={user?.displayName || user?.email?.split('@')[0]} />;
            case 'scouting':
                return <ScoutingModule userSport={userSport} userName={user?.displayName || user?.email?.split('@')[0]} userRole={userRole} />;
            case 'calendar':
                return <CalendarModule userSport={userSport as any} userName={user?.displayName || user?.email?.split('@')[0] || ''} userRole={userRole} />;
            case 'reports':
                return <ReportsModule userRole={userRole} userSport={userSport} userName={user?.displayName || user?.email?.split('@')[0]} />;
            case 'admin':
                return <AdministrationModule />;
            case 'avisos':
                return <AvisosModule userSport={userSport} userName={user?.displayName || user?.email?.split('@')[0]} userRole={userRole} />;
            case 'settings':
                return <SettingsModule />;
            case 'users':
                return <UsersModule />;
            case 'profile':
                return user ? <ProfileModule user={user} /> : <Dashboard setActiveTab={setActiveTab} userRole={userRole} />;
            case 'comms':
                return <NotificationCenter />;
            default:
                return <Dashboard setActiveTab={setActiveTab} userRole={userRole} />;
        }
    };

    if (loading && !user) {
        return (
            <div className="min-h-screen bg-proneo-dark flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-proneo-green/20 border-t-proneo-green rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <>
                <Login />
                {error && (
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-3 rounded-2xl text-sm font-bold animate-bounce z-50 backdrop-blur-md">
                        {error}
                    </div>
                )}
            </>
        );
    }

    return (
        <>
            <Layout
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                user={{ ...user, role: userRole }}
                onNewPlayer={() => setShowPlayerForm(true)}
            >
                {renderContent()}
            </Layout>
            {showPlayerForm && (
                <PlayerForm
                    isScoutingInitial={activeTab === 'scouting'}
                    onClose={() => setShowPlayerForm(false)}
                    onSave={async (data) => {
                        await addPlayer(data);
                        // Don't close immediately, let PlayerForm handle the success popup and then close
                    }}
                />
            )}
        </>
    );
}

export default App;

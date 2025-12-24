import { useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signOut,
    User as FirebaseUser
} from 'firebase/auth';
import { auth, isDemoMode } from './firebase-config';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PlayerModule from './components/PlayerModule';
import ScoutingModule from './components/ScoutingModule';
import ReportsModule from './components/ReportsModule';
import AvisosModule from './components/AvisosModule';
import SettingsModule from './components/SettingsModule';

import PlayerForm from './components/PlayerForm';

import { usePlayers } from './hooks/usePlayers';

function App() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [error, setError] = useState<string | null>(null);
    const [showPlayerForm, setShowPlayerForm] = useState(false);

    const { addPlayer } = usePlayers();

    useEffect(() => {
        if (isDemoMode) {
            setUser({
                email: 'demo@proneosports.com',
                displayName: 'Proneo Demo User',
                photoURL: 'https://i.pravatar.cc/150?u=proneo'
            } as FirebaseUser);
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Domain restriction check
                if (user.email?.endsWith('@proneosports.com')) {
                    setUser(user);
                    setError(null);
                } else {
                    signOut(auth);
                    setError('Acceso denegado: Solo usuarios @proneosports.com');
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);


    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'players':
                return <PlayerModule />;
            case 'scouting':
                return <ScoutingModule />;
            case 'reports':
                return <ReportsModule />;
            case 'avisos':
                return <AvisosModule />;
            case 'settings':
                return <SettingsModule />;
            default:
                return <Dashboard />;
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
                user={user}
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

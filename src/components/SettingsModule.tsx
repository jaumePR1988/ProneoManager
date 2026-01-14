import React, { useState } from 'react';
import {
    Settings,
    Plus,
    Trash2,
    Type,
    Hash,
    Calendar,
    List,
    CheckSquare,
    Save,
    LayoutDashboard,
    Pencil,
    Trophy,
    Shield,
    UserCircle,
    Tag,
    Users as UsersIcon
} from 'lucide-react';
import { usePlayers } from '../hooks/usePlayers';
import { DynamicField, Category } from '../types/player';

const SettingsModule: React.FC = () => {
    const { schema, systemLists, updateSchema, updateSystemLists } = usePlayers(false);
    const [activeTab, setActiveTab] = useState<'columns' | 'lists' | 'reduced'>('columns');
    const [isAdding, setIsAdding] = useState(false);
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

    // Local state for system lists to allow smooth typing
    const [localLists, setLocalLists] = useState({
        leagues: '',
        clubs: '',
        positions: '',
        brands: '',
        agents: '',
        selections: '',
        feet: ''
    });

    // Initialize local lists when systemLists loads or tab changes
    React.useEffect(() => {
        setLocalLists({
            leagues: systemLists.leagues.join(', '),
            clubs: systemLists.clubs.join(', '),
            positions: systemLists.positions.join(', '),
            brands: systemLists.brands.join(', '),
            agents: systemLists.agents.join(', '),
            selections: (systemLists as any).selections?.join(', ') || '',
            feet: (systemLists as any).feet?.join(', ') || ''
        });
    }, [systemLists, activeTab]);

    const handleSaveLists = async () => {
        const newLists = {
            ...systemLists,
            leagues: localLists.leagues.split(',').map(s => s.trim()).filter(s => s),
            clubs: localLists.clubs.split(',').map(s => s.trim()).filter(s => s),
            positions: localLists.positions.split(',').map(s => s.trim()).filter(s => s),
            brands: localLists.brands.split(',').map(s => s.trim()).filter(s => s),
            agents: localLists.agents.split(',').map(s => s.trim()).filter(s => s),
            selections: localLists.selections.split(',').map(s => s.trim()).filter(s => s),
            feet: localLists.feet.split(',').map(s => s.trim()).filter(s => s)
        };
        await updateSystemLists(newLists as any);
        alert('Listas actualizadas correctamente');
    };

    const categories: (Category | 'General')[] = ['General', 'Fútbol', 'F. Sala', 'Femenino', 'Entrenadores'];

    const [newField, setNewField] = useState<Partial<DynamicField>>({
        label: '',
        type: 'text',
        category: 'General'
    });

    const handleAddField = async () => {
        if (!newField.label) return;

        if (editingFieldId) {
            // Update existing
            await updateSchema(schema.map(f => f.id === editingFieldId ? { ...newField, id: editingFieldId } as DynamicField : f));
        } else {
            // Create new
            const id = newField.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            const field: DynamicField = {
                id: id + '_' + Date.now(),
                label: newField.label,
                type: newField.type as any,
                category: newField.category as any,
                options: newField.options
            };
            await updateSchema([...schema, field]);
        }

        setIsAdding(false);
        setEditingFieldId(null);
        setNewField({ label: '', type: 'text', category: 'General' });
    };

    const handleEditField = (field: DynamicField) => {
        setNewField(field);
        setEditingFieldId(field.id);
        setIsAdding(true);
    };

    const handleDeleteField = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta columna? Los datos guardados en esta columna para cada jugador se mantendrán pero no serán visibles.')) return;
        await updateSchema(schema.filter(f => f.id !== id));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'text': return <Type className="w-4 h-4" />;
            case 'number': return <Hash className="w-4 h-4" />;
            case 'date': return <Calendar className="w-4 h-4" />;
            case 'select': return <List className="w-4 h-4" />;
            case 'boolean': return <CheckSquare className="w-4 h-4" />;
            default: return <Type className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tight italic uppercase">Ajustes del Sistema</h1>
                    <div className="flex items-center gap-2 mt-4 p-1 bg-zinc-100 rounded-2xl w-fit">
                        <button
                            onClick={() => setActiveTab('columns')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'columns' ? 'bg-white text-[#b4c885] shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Columnas Dinámicas
                        </button>
                        <button
                            onClick={() => setActiveTab('lists')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'lists' ? 'bg-white text-[#b4c885] shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Listas Desplegables
                        </button>
                        <button
                            onClick={() => setActiveTab('reduced')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'reduced' ? 'bg-white text-[#b4c885] shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Vista Reducida
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {activeTab === 'columns' ? (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-[#b4c885] text-white px-6 h-12 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:shadow-xl hover:shadow-[#b4c885]/20 transition-all active:scale-95 shadow-lg"
                        >
                            <Plus className="w-4 h-4" />
                            Añadir Columna
                        </button>
                    ) : (
                        <button
                            onClick={handleSaveLists}
                            className="bg-[#b4c885] text-white px-6 h-12 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:shadow-xl hover:shadow-[#b4c885]/20 transition-all active:scale-95 shadow-lg"
                        >
                            <Save className="w-4 h-4" />
                            Guardar Cambios
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {activeTab === 'columns' ? (
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[40px] border border-zinc-100 shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-zinc-100 bg-zinc-50/30 flex items-center justify-between">
                                <h2 className="text-sm font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-[#b4c885]" />
                                    Esquema Completo de la Base de Datos
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black bg-zinc-100 text-zinc-400 px-3 py-1 rounded-full uppercase tracking-widest">
                                        {20} SISTEMA
                                    </span>
                                    <span className="text-[10px] font-black bg-[#b4c885]/10 text-[#b4c885] px-3 py-1 rounded-full uppercase tracking-widest">
                                        {schema.length} DINÁMICAS
                                    </span>
                                </div>
                            </div>

                            <div className="p-4">
                                <div className="space-y-2 text-left">
                                    {/* Core Columns Section */}
                                    <div className="mb-4">
                                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4 mb-2">Columnas del Sistema (Fijas)</h3>
                                        <div className="space-y-2">
                                            {[
                                                { id: 'firstName', label: 'Nombre', type: 'text' },
                                                { id: 'lastName1', label: '1er Apellido', type: 'text' },
                                                { id: 'lastName2', label: '2do Apellido', type: 'text' },
                                                { id: 'category', label: 'Deporte', type: 'select' },
                                                { id: 'selection', label: 'Selección', type: 'select' },
                                                { id: 'league', label: 'Liga', type: 'select' },
                                                { id: 'club', label: 'Club', type: 'select' },
                                                { id: 'position', label: 'Posición', type: 'select' },
                                                { id: 'preferredFoot', label: 'Pierna Hábil', type: 'select' },
                                                { id: 'birthDate', label: 'Fecha Nacimiento', type: 'date' },
                                                { id: 'nationality', label: 'Nacionalidad', type: 'text' },
                                                { id: 'nationality2', label: 'Nacionalidad 2', type: 'text' },
                                                { id: 'monitoringAgent', label: 'Seguimiento', type: 'select' },
                                                { id: 'monitoringAgent2', label: 'Seguimiento 2', type: 'select' }
                                            ].map(field => (
                                                <div key={field.id} className="flex items-center justify-between p-4 bg-zinc-50/50 border border-dashed border-zinc-200 rounded-2xl opacity-60 grayscale-[0.5]">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-300">
                                                            {getIcon(field.type)}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-tight">{field.label} <span className="ml-2 text-[8px] bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-400">FIJA</span></h3>
                                                            <span className="text-[9px] font-bold text-zinc-300 uppercase">Columna básica del sistema</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-[9px] font-black text-zinc-300 uppercase tracking-widest px-3">PROTEGIDA</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Dynamic Columns Section */}
                                    <div>
                                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4 mb-2">Columnas Personalizadas (Vivas)</h3>
                                        {schema.length === 0 ? (
                                            <div className="py-10 text-center bg-zinc-50 border border-dashed border-zinc-100 rounded-2xl">
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No hay columnas personalizadas</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {schema.map(field => (
                                                    <div key={field.id} className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 rounded-2xl hover:bg-white hover:shadow-md transition-all group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-[#b4c885]">
                                                                {getIcon(field.type)}
                                                            </div>
                                                            <div>
                                                                <h3 className="text-xs font-black text-zinc-800 uppercase tracking-tight">{field.label}</h3>
                                                                <div className="flex flex-col mt-0.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[9px] font-bold text-zinc-400 uppercase">Tipo: {field.type}</span>
                                                                        <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                                                        <span className="text-[9px] font-bold text-[#b4c885] uppercase">{field.category}</span>
                                                                    </div>
                                                                    {field.type === 'select' && field.options && (
                                                                        <span className="text-[8px] font-medium text-zinc-400 lowercase mt-0.5 truncate max-w-xs">
                                                                            opciones: {field.options.join(', ')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleEditField(field)}
                                                                className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-[#b4c885] hover:text-white transition-all flex items-center justify-center"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteField(field.id)}
                                                                className="w-10 h-10 rounded-xl bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'lists' ? (
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[40px] border border-zinc-100 shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-zinc-100 bg-zinc-50/30">
                                <h2 className="text-sm font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                                    <List className="w-4 h-4 text-[#b4c885]" />
                                    Listas Desplegables del Sistema
                                </h2>
                            </div>
                            <div className="p-8 space-y-8">
                                {[
                                    { key: 'leagues' as const, label: 'Ligas', icon: Trophy },
                                    { key: 'clubs' as const, label: 'Equipos/Clubes', icon: Shield },
                                    { key: 'positions' as const, label: 'Posiciones', icon: UserCircle },
                                    { key: 'brands' as const, label: 'Marcas Deportivas', icon: Tag },
                                    { key: 'agents' as const, label: 'Agentes / Seguimiento', icon: UsersIcon },
                                    { key: 'selections' as const, label: 'Niveles de Selección', icon: Trophy },
                                    { key: 'feet' as const, label: 'Piernas Hábiles', icon: UserCircle }
                                ].map(list => (
                                    <div key={list.key} className="space-y-3 text-left">
                                        <div className="flex items-center justify-between ml-4">
                                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                                <list.icon className="w-3.5 h-3.5" />
                                                {list.label}
                                            </label>
                                            <span className="text-[9px] font-bold text-zinc-300 uppercase">{systemLists[list.key].length} opciones</span>
                                        </div>
                                        <div className="relative">
                                            <textarea
                                                value={localLists[list.key]}
                                                onChange={(e) => setLocalLists({ ...localLists, [list.key]: e.target.value })}
                                                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#b4c885]/5 focus:border-[#b4c885]/20 outline-none transition-all resize-none min-h-[100px]"
                                                placeholder={`Ej: ${list.label === 'Ligas' ? 'España, Italia, Premier...' : 'Opción 1, Opción 2...'}`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[40px] border border-zinc-100 shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-zinc-100 bg-zinc-50/30">
                                <h2 className="text-sm font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                                    <LayoutDashboard className="w-4 h-4 text-[#b4c885]" />
                                    Configuración de Vista Reducida (Base de Datos)
                                </h2>
                            </div>
                            <div className="p-8">
                                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-8 leading-relaxed">
                                    Selecciona las columnas que quieres que aparezcan cuando actives la "Vista Reducida" en la base de datos principal.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2 mb-4">
                                        <button
                                            onClick={() => {
                                                const allIds = [
                                                    'firstName', 'lastName1', 'lastName2', 'category', 'selection',
                                                    'league', 'club', 'position', 'preferredFoot', 'birthDate', 'age',
                                                    'nationality', 'nationality2', 'contract.endDate', 'contract.optional', 'contract.optionalNoticeDate',
                                                    'contract.conditions', 'proneo.agencyEndDate', 'proneoStatus', 'sportsBrand',
                                                    'sportsBrandEndDate', 'monitoringAgent', 'monitoringAgent2',
                                                    ...schema.map(f => `custom_${f.id}`)
                                                ];
                                                updateSystemLists({ ...systemLists, reducedColumns: allIds });
                                            }}
                                            className="px-4 py-2 bg-zinc-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-200"
                                        >
                                            Seleccionar Todo
                                        </button>
                                    </div>
                                    {[
                                        { id: 'firstName', label: 'Nombre' },
                                        { id: 'lastName1', label: '1er Apellido' },
                                        { id: 'lastName2', label: '2do Apellido' },
                                        { id: 'category', label: 'Deporte' },
                                        { id: 'selection', label: 'Selección' },
                                        { id: 'league', label: 'Liga' },
                                        { id: 'club', label: 'Club' },
                                        { id: 'position', label: 'Posición' },
                                        { id: 'preferredFoot', label: 'Pierna Hábil' },
                                        { id: 'birthDate', label: 'F. Nacimiento' },
                                        { id: 'nationality', label: 'Nacionalidad' },
                                        { id: 'nationality2', label: 'Nacionalidad 2' },
                                        { id: 'endDate', label: 'Fin Contrato' },
                                        { id: 'optional', label: 'Opcional' },
                                        { id: 'optionalNoticeDate', label: 'Fecha Aviso' },
                                        { id: 'conditions', label: 'Condiciones' },
                                        { id: 'proneoStatus', label: 'Situación Agencia' },
                                        { id: 'sportsBrand', label: 'Marca Dep.' },
                                        { id: 'sportsBrandEndDate', label: 'Fin Marca' },
                                        { id: 'monitoringAgent', label: 'Seguimiento' },
                                        { id: 'monitoringAgent2', label: 'Seguimiento 2' },
                                        ...schema.map(f => ({ id: `custom_${f.id}`, label: f.label }))
                                    ].map(col => {
                                        const isSelected = systemLists.reducedColumns?.includes(col.id);
                                        return (
                                            <button
                                                key={col.id}
                                                onClick={() => {
                                                    const newReduced = isSelected
                                                        ? systemLists.reducedColumns?.filter(id => id !== col.id)
                                                        : [...(systemLists.reducedColumns || []), col.id];
                                                    updateSystemLists({ ...systemLists, reducedColumns: newReduced });
                                                }}
                                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isSelected
                                                    ? 'bg-[#b4c885]/10 border-[#b4c885] text-[#b4c885]'
                                                    : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:border-zinc-200'}`}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-widest">{col.label}</span>
                                                {isSelected && <CheckSquare className="w-4 h-4" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info / Tips */}
                <div className="space-y-6">
                    <div className="bg-zinc-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#b4c885] blur-[80px] opacity-20" />
                        <h3 className="text-xl font-black italic uppercase tracking-tighter mb-4">¿Base de Datos Viva?</h3>
                        <p className="text-zinc-400 text-xs font-bold uppercase leading-loose tracking-widest">
                            Esta función te permite adaptar el sistema a nuevas necesidades sin esperar a actualizaciones de software.
                            <br /><br />
                            Al añadir una columna, se creará un nuevo campo en:
                            <br />
                            <span className="text-[#b4c885] italic">• El Formulario de Jugador</span>
                            <br />
                            <span className="text-[#b4c885] italic">• La Tabla Principal</span>
                            <br />
                            <span className="text-[#b4c885] italic">• El Sistema de Exportación</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Add Field Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                            <h2 className="text-xl font-black text-zinc-900 italic uppercase">{editingFieldId ? 'Editar Columna' : 'Nueva Columna'}</h2>
                            <button onClick={() => { setIsAdding(false); setEditingFieldId(null); setNewField({ label: '', type: 'text', category: 'General' }); }} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Nombre de la Columna</label>
                                <div className="relative">
                                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                    <input
                                        type="text"
                                        value={newField.label}
                                        onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                                        className="w-full h-14 bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-6 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#b4c885]/5 focus:border-[#b4c885]/20 outline-none transition-all placeholder:text-zinc-300"
                                        placeholder="Ej: Talla Botas"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Tipo de Dato</label>
                                    <select
                                        value={newField.type}
                                        onChange={(e) => setNewField({ ...newField, type: e.target.value as any })}
                                        className="w-full h-14 bg-zinc-50 border border-zinc-100 rounded-2xl px-6 text-sm font-bold focus:bg-white outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="text">Texto</option>
                                        <option value="number">Número</option>
                                        <option value="date">Fecha</option>
                                        <option value="boolean">Si/No (Check)</option>
                                        <option value="select">Selección (Desplegable)</option>
                                    </select>
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Categoría</label>
                                    <select
                                        value={newField.category}
                                        onChange={(e) => setNewField({ ...newField, category: e.target.value as any })}
                                        className="w-full h-14 bg-zinc-50 border border-zinc-100 rounded-2xl px-6 text-sm font-bold focus:bg-white outline-none appearance-none cursor-pointer"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {newField.type === 'select' && (
                                <div className="space-y-2 text-left animate-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Opciones (separadas por comas)</label>
                                    <div className="relative">
                                        <List className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                        <input
                                            type="text"
                                            value={newField.options?.join(', ') || ''}
                                            onChange={(e) => {
                                                const opts = e.target.value.split(',').map(o => o.trim()).filter(o => o);
                                                setNewField({ ...newField, options: opts });
                                            }}
                                            className="w-full h-14 bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-6 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-[#b4c885]/5 focus:border-[#b4c885]/20 outline-none transition-all placeholder:text-zinc-300"
                                            placeholder="Ej: Puma, Mizuno, Nike"
                                        />
                                    </div>
                                    <p className="text-[8px] font-bold text-zinc-400 uppercase ml-4 mt-1">Sugerencia: Escribe los valores separados por una coma.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-zinc-50/50 rounded-b-[40px] flex items-center gap-4">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="flex-1 h-14 rounded-2xl text-zinc-500 font-black text-xs uppercase tracking-widest hover:bg-zinc-100 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddField}
                                className="flex-1 h-14 rounded-2xl bg-[#b4c885] text-white font-black text-xs uppercase tracking-widest hover:shadow-xl hover:shadow-[#b4c885]/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {editingFieldId ? 'Guardar Cambios' : 'Crear Columna'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsModule;

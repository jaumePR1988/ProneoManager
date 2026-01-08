import React, { useState, useMemo } from 'react';
import { Search, Plus, Phone, Mail, Building2, Trash2, Edit2, Users } from 'lucide-react';
import { Contact, ContactCategory } from '../types/contact';
import { useContacts } from '../hooks/useContacts';
import ContactForm from './ContactForm';

interface ContactsViewProps {
    userSport: string;
}

const ContactsView: React.FC<ContactsViewProps> = ({ userSport }) => {
    const { contacts, loading, addContact, updateContact, deleteContact } = useContacts(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);

    // Derived state: Filtered contacts
    const filteredContacts = useMemo(() => {
        let filtered = contacts;

        // 1. Filter by Sport (if not General/Global)
        const filterSport = userSport === 'Global' ? 'General' : userSport;
        if (filterSport !== 'General') {
            filtered = filtered.filter(c => c.category === filterSport);
        }

        // 2. Filter by Search
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(lowerSearch) ||
                c.club.toLowerCase().includes(lowerSearch) ||
                c.role.toLowerCase().includes(lowerSearch)
            );
        }

        return filtered;
    }, [contacts, userSport, searchTerm]);

    // Group by Club
    const groupedContacts = useMemo(() => {
        const groups: Record<string, Contact[]> = {};

        filteredContacts.forEach(contact => {
            const clubName = contact.club || 'Sin Club';
            if (!groups[clubName]) {
                groups[clubName] = [];
            }
            groups[clubName].push(contact);
        });

        // Sort clubs alphabetically
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    }, [filteredContacts]);

    const handleSave = async (data: Partial<Contact>) => {
        if (editingContact) {
            await updateContact(editingContact.id, data);
            setEditingContact(null);
        } else {
            await addContact(data as any);
        }
        setIsFormOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Eliminar este contacto?')) {
            await deleteContact(id);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-proneo-green/20 border-t-proneo-green rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">

                {/* Search Bar */}
                <div className="relative w-full md:w-96 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-proneo-green transition-colors" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-2xl text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-proneo-green/20 focus:border-proneo-green outline-none transition-all shadow-sm hover:shadow-md"
                        placeholder="Buscar por nombre, club o cargo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="hidden md:flex flex-col items-end mr-2">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Contactos</span>
                        <span className="text-xl font-black text-zinc-900 leading-none">{filteredContacts.length}</span>
                    </div>
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="flex-1 md:flex-none h-12 px-6 bg-zinc-900 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Contacto
                    </button>
                </div>
            </div>

            {/* Empty State */}
            {filteredContacts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-zinc-100 border-dashed">
                    <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4 text-zinc-300">
                        <Users className="w-8 h-8" />
                    </div>
                    <p className="text-zinc-900 font-bold mb-1">No hay contactos visibles</p>
                    <p className="text-zinc-400 text-sm">Prueba a añadir uno nuevo o cambia los filtros</p>
                </div>
            )}

            {/* Grouped Grid */}
            <div className="space-y-10 pb-20">
                {groupedContacts.map(([clubName, clubContacts]) => (
                    <div key={clubName} className="space-y-4">
                        {/* Club Header */}
                        <div className="flex items-center gap-3 pl-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center shadow-sm">
                                <Building2 className="w-5 h-5 text-zinc-500" />
                            </div>
                            <h3 className="text-xl font-black text-zinc-900 tracking-tight">{clubName}</h3>
                            <div className="h-px bg-zinc-200 flex-1 ml-4 opacity-50"></div>
                        </div>

                        {/* Contacts Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {clubContacts.map(contact => (
                                <div
                                    key={contact.id}
                                    className="group bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm hover:shadow-xl hover:border-zinc-200 transition-all duration-300 relative overflow-hidden"
                                >
                                    {/* Actions Overlay */}
                                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                        <button
                                            onClick={() => setEditingContact(contact)}
                                            className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(contact.id)}
                                            className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div className="flex gap-4">
                                        {/* Avatar */}
                                        <div className="shrink-0">
                                            <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-100 overflow-hidden shadow-inner">
                                                {contact.photoUrl ? (
                                                    <img src={contact.photoUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-zinc-300 font-black text-lg bg-zinc-50">
                                                        {contact.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <h4 className="font-bold text-zinc-900 truncate pr-6">{contact.name}</h4>
                                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide truncate mb-3">{contact.role}</p>

                                            {/* Contact Links */}
                                            <div className="flex gap-2">
                                                {contact.phone && (
                                                    <a
                                                        href={`tel:${contact.phone}`}
                                                        className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                                                        title={contact.phone}
                                                    >
                                                        <Phone className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                                {contact.email && (
                                                    <a
                                                        href={`mailto:${contact.email}`}
                                                        className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                                                        title={contact.email}
                                                    >
                                                        <Mail className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Form Modal */}
            {(isFormOpen || editingContact) && (
                <ContactForm
                    initialData={editingContact || undefined}
                    defaultCategory={userSport}
                    onClose={() => {
                        setIsFormOpen(false);
                        setEditingContact(null);
                    }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default ContactsView;

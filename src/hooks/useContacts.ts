import { useState, useEffect } from 'react';
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Contact } from '../types/contact';

export const useContacts = (enabled: boolean = true) => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const contactsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Contact));

            setContacts(contactsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching contacts:", err);
            setError("No se pudieron cargar los contactos");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [enabled]);

    const addContact = async (data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const now = Date.now();
            await addDoc(collection(db, 'contacts'), {
                ...data,
                createdAt: now,
                updatedAt: now
            });
        } catch (err) {
            console.error("Error adding contact:", err);
            throw err;
        }
    };

    const updateContact = async (id: string, data: Partial<Contact>) => {
        try {
            const ref = doc(db, 'contacts', id);
            await updateDoc(ref, {
                ...data,
                updatedAt: Date.now()
            });
        } catch (err) {
            console.error("Error updating contact:", err);
            throw err;
        }
    };

    const deleteContact = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'contacts', id));
        } catch (err) {
            console.error("Error deleting contact:", err);
            throw err;
        }
    };

    return {
        contacts,
        loading,
        error,
        addContact,
        updateContact,
        deleteContact
    };
};

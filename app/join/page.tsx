'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const joinSchema = z.object({
    name: z.string().min(1, 'Name is required').max(20, 'Name is too long'),
    code: z.string().min(6, 'Code must be 6 characters').max(6).toUpperCase(),
});

type JoinValues = z.infer<typeof joinSchema>;

export default function JoinPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<JoinValues>({
        resolver: zodResolver(joinSchema),
    });

    const onSubmit = async (data: JoinValues) => {
        setError(null);
        try {
            const sessionRef = doc(db, 'sessions', data.code);
            const sessionSnap = await getDoc(sessionRef);

            if (!sessionSnap.exists()) {
                setError("We couldn't find a session with that code.");
                return;
            }

            // Prevent duplicate names
            const partsRef = collection(db, 'sessions', data.code, 'participants');

            // Note: In a production app with secure rules, this query would happen Server Side
            // or the rules would enforce unique names. For v1, this client-side check is sufficient.
            const duplicateCheckQ = query(partsRef, where('name', '==', data.name));
            const duplicateSnap = await getDocs(duplicateCheckQ);

            if (!duplicateSnap.empty) {
                setError("That name is already taken. Try adding an initial!");
                return;
            }

            const docRef = await addDoc(partsRef, {
                name: data.name,
                score: 0,
                joinedAt: serverTimestamp(),
            });

            // Redirect into student view
            router.push(`/session/${data.code}?id=${docRef.id}`);
        } catch (err: any) {
            console.error(err);
            setError('Something went wrong. Please try again.');
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                <div className="text-center">
                    <h1 className="text-3xl font-black tracking-tight text-indigo-900 mb-2">Join Activity</h1>
                    <p className="text-gray-500 text-sm">Enter the code displayed on the board.</p>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Your Name</label>
                        <input
                            {...register('name')}
                            type="text"
                            placeholder="First Name / Nickname"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                        />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Class Code</label>
                        <input
                            {...register('code')}
                            type="text"
                            maxLength={6}
                            placeholder="e.g. A1B2C3"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow uppercase font-mono tracking-widest text-lg"
                        />
                        {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>}
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70 transition-colors"
                        >
                            {isSubmitting ? (
                                <Loader2 className="animate-spin h-6 w-6" />
                            ) : (
                                'Launch'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}

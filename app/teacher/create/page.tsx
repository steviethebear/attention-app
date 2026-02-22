'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSession } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const createSessionSchema = z.object({
    name: z.string().min(1, 'Session name is required'),
    rule: z.string().min(1, 'Hidden rule is required'),
    theme: z.string().optional(),
    passwordPlain: z.string().min(4, 'Password must be at least 4 characters'),
});

type CreateSessionValues = z.infer<typeof createSessionSchema>;

export default function CreateSessionPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<CreateSessionValues>({
        resolver: zodResolver(createSessionSchema),
    });

    const onSubmit = async (data: CreateSessionValues) => {
        setError(null);
        const result = await createSession(data);

        if (result.success && result.code) {
            router.push(`/teacher/${result.code}`);
        } else {
            setError(result.error || 'Something went wrong');
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 p-4 py-12">
            <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-indigo-900 mb-2">Create Session</h1>
                    <p className="text-gray-500">Set up a new Attention activity for your class.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Session Name</label>
                        <input
                            {...register('name')}
                            type="text"
                            placeholder="e.g. 12th Grade Hum - Per 2"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                        />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Hidden Rule</label>
                        <p className="text-xs text-gray-500 mb-2">The AI will generate correct snippets based on this rule.</p>
                        <textarea
                            {...register('rule')}
                            placeholder="e.g. The snippet ends with a question mark."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow resize-none"
                        />
                        {errors.rule && <p className="text-red-500 text-sm mt-1">{errors.rule.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Theme (Optional)</label>
                        <p className="text-xs text-gray-500 mb-2">Loose inspiration for the LLM to use when drafting snippets.</p>
                        <input
                            {...register('theme')}
                            type="text"
                            placeholder="e.g. space, history, language"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Session Password</label>
                        <p className="text-xs text-gray-500 mb-2">Required to control the session later.</p>
                        <input
                            {...register('passwordPlain')}
                            type="password"
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                        />
                        {errors.passwordPlain && <p className="text-red-500 text-sm mt-1">{errors.passwordPlain.message}</p>}
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-colors"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                    Creating...
                                </>
                            ) : (
                                'Create Session'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}

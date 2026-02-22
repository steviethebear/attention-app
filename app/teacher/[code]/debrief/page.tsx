'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, query, orderBy } from 'firebase/firestore';
import { Session, Participant, Response } from '@/types';
import Leaderboard from '@/components/Leaderboard';
import { endSession } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function TeacherDebriefPage({ params }: { params: { code: string } }) {
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [responses, setResponses] = useState<Response[]>([]);
    const [debriefData, setDebriefData] = useState<Record<number, string> | null>(null);
    const [loading, setLoading] = useState(true);

    // Listen to session
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'sessions', params.code), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as Session;
                setSession(data);
                if (data.status === 'complete') {
                    router.push('/');
                }
            } else {
                setSession(null);
            }
            setLoading(false);
        });

        return () => unsub();
    }, [params.code, router]);

    // Listen to participants
    useEffect(() => {
        const q = query(collection(db, 'sessions', params.code, 'participants'), orderBy('joinedAt', 'asc'));
        const unsub = onSnapshot(q, (snapshot) => {
            setParticipants(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Participant & { id: string })));
        });
        return () => unsub();
    }, [params.code]);

    // Listen to ALL responses for the multi-round leaderboard
    useEffect(() => {
        const q = query(collection(db, 'sessions', params.code, 'responses'));
        const unsub = onSnapshot(q, (snapshot) => {
            setResponses(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Response)));
        });
        return () => unsub();
    }, [params.code]);

    // Fetch true correct options via Admin SDK route
    useEffect(() => {
        if (!session || session.status !== 'debrief') return;

        fetch(`/api/debrief-data?code=${params.code}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setDebriefData(data.secrets);
                } else {
                    console.error("Failed to fetch debrief secrets:", data.error);
                }
            })
            .catch(console.error);
    }, [session?.status, params.code]);

    const handleEndSession = async () => {
        await endSession(params.code);
    };

    if (loading || (!debriefData && session?.status === 'debrief')) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
    }

    if (!session) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold text-gray-400">Session not found</div>;

    return (
        <main className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 text-center">
                    <h1 className="text-3xl font-black text-indigo-900 mb-2">Session Debrief</h1>
                    <p className="text-gray-500 font-medium mb-8">The hidden rule regulating attention in this session was:</p>
                    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6 inline-block max-w-2xl w-full">
                        <span className="text-2xl font-bold text-indigo-700">{session.rule}</span>
                    </div>
                </div>

                {/* Multi-Round Leaderboard */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Final Results</h2>
                    <Leaderboard
                        participants={participants}
                        currentRoundResponses={responses}
                        debriefData={debriefData || {}} // Feed the securely fetched truths
                        totalRounds={session.currentRound}
                        showResults={true} // Triggers green/red
                    />
                </div>

                {/* Controls */}
                <div className="flex justify-end">
                    <button
                        onClick={handleEndSession}
                        className="px-8 py-4 bg-red-600 text-white rounded-xl font-bold shadow-sm hover:bg-red-700 transition-all"
                    >
                        End Session
                    </button>
                </div>

            </div>
        </main>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { Session, Round, Participant, Response, SnippetOption } from '@/types';
import JoinCodeDisplay from '@/components/JoinCodeDisplay';
import SnippetGrid from '@/components/SnippetGrid';
import Leaderboard from '@/components/Leaderboard';
import { Loader2 } from 'lucide-react';

export default function ProjectorSessionPage({ params }: { params: { code: string } }) {
    const [session, setSession] = useState<Session | null>(null);
    const [currentRound, setCurrentRound] = useState<Round | null>(null);
    const [participants, setParticipants] = useState<(Participant & { id: string })[]>([]);
    const [responses, setResponses] = useState<(Response & { id: string })[]>([]);
    const [debriefData, setDebriefData] = useState<Record<number, string> | null>(null);
    const [loading, setLoading] = useState(true);

    // Listen to session
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'sessions', params.code), (snap) => {
            if (snap.exists()) {
                setSession(snap.data() as Session);
            } else {
                setSession(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [params.code]);

    // Listen to current round details
    useEffect(() => {
        if (session?.currentRound && session.currentRound > 0) {
            const unsub = onSnapshot(doc(db, 'sessions', params.code, 'rounds', session.currentRound.toString()), (snap) => {
                if (snap.exists()) {
                    setCurrentRound(snap.data() as Round);
                }
            });
            return () => unsub();
        }
    }, [session?.currentRound, params.code]);

    // Listen to participants
    useEffect(() => {
        const pQ = query(collection(db, 'sessions', params.code, 'participants'), orderBy('joinedAt', 'asc'));
        const unsubP = onSnapshot(pQ, (snap) => {
            setParticipants(snap.docs.map(d => ({ ...d.data(), id: d.id } as Participant & { id: string })));
        });

        return () => unsubP();
    }, [params.code]);

    // Listen to responses for leaderboard
    useEffect(() => {
        if (session?.currentRound && session.currentRound > 0) {
            const rQ = query(collection(db, 'sessions', params.code, 'responses'));
            const unsubR = onSnapshot(rQ, (snap) => {
                const allR = snap.docs.map(d => ({ ...d.data(), id: d.id } as Response & { id: string }));
                if (session.status === 'debrief' || session.status === 'complete') {
                    setResponses(allR);
                } else {
                    setResponses(allR.filter(r => r.roundNumber === session.currentRound));
                }
            });
            return () => unsubR();
        }
    }, [session?.currentRound, session?.status, params.code]);

    // Fetch true correct options via Admin SDK route ONLY when transitioning to debrief
    useEffect(() => {
        if (session?.status !== 'debrief' && session?.status !== 'complete') return;

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

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
    if (!session) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold text-gray-400">Session not found</div>;

    const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join` : '';

    return (
        <main className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col items-center">
            <div className="max-w-5xl w-full space-y-6">

                {/* Header - Neutral, NO RULE EXPOSED YET */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-indigo-900">{session.name}</h1>
                        <p className="text-gray-500 font-medium text-lg mt-1">
                            {session.status === 'waiting' && 'Waiting Room'}
                            {session.status === 'round_active' && `Round ${session.currentRound} - Active`}
                            {session.status === 'round_ended' && `Round ${session.currentRound} - Ended`}
                            {(session.status === 'debrief' || session.status === 'complete') && 'Session Debrief'}
                        </p>
                    </div>
                </div>

                {/* Waiting State */}
                {session.status === 'waiting' && (
                    <>
                        <JoinCodeDisplay code={session.code} joinUrl={joinUrl} />
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-800">Joined Students ({participants.length})</h2>
                            </div>
                            {participants.length === 0 ? (
                                <div className="py-12 text-center text-gray-400 font-medium border-2 border-dashed border-gray-200 rounded-xl">
                                    Waiting for students to join...
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {participants.map((p) => (
                                        <div key={p.id} className="py-3 px-4 bg-gray-50 border border-gray-100 rounded-xl font-semibold text-gray-700 text-center truncate">
                                            {p.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Round Active / Ended / Debrief states */}
                {(session.status === 'round_active' || session.status === 'round_ended' || session.status === 'debrief' || session.status === 'complete') && (
                    <>
                        {/* Snippet Grid & Rule Reveal */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            {(session.status === 'debrief' || session.status === 'complete') && (
                                <div className="mb-8 p-6 bg-indigo-50 border-2 border-indigo-200 rounded-xl text-center">
                                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-2">The Hidden Rule Was</h3>
                                    <p className="text-4xl font-black text-indigo-900">{session.rule}</p>
                                </div>
                            )}

                            {currentRound && (
                                <>
                                    <h3 className="text-xl font-bold text-gray-800 mb-6">
                                        {(session.status === 'debrief' || session.status === 'complete') ? `Final logic mapping:` : `Which snippet follows the hidden rule?`}
                                    </h3>
                                    <div className="pointer-events-none">
                                        <SnippetGrid
                                            snippets={currentRound.snippets}
                                            isLocked={true}
                                            correctOption={(debriefData && session.currentRound) ? debriefData[session.currentRound] as SnippetOption : undefined}
                                            showResults={session.status === 'debrief' || session.status === 'complete'}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Live Leaderboard */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-6">Leaderboard</h2>
                            <Leaderboard
                                participants={participants}
                                currentRoundResponses={responses}
                                showResults={session.status === 'debrief' || session.status === 'complete'}
                                debriefData={debriefData || undefined}
                                totalRounds={session.currentRound}
                            />
                        </div>
                    </>
                )}

            </div>
        </main>
    );
}

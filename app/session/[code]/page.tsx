'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { Session, Round, Participant, Response, SnippetOption } from '@/types';
import { useSearchParams } from 'next/navigation';
import SnippetGrid from '@/components/SnippetGrid';
import Leaderboard from '@/components/Leaderboard';
import { Loader2 } from 'lucide-react';

export default function StudentSessionPage({ params }: { params: { code: string } }) {
    const searchParams = useSearchParams();
    const participantId = searchParams.get('id');

    const [session, setSession] = useState<Session | null>(null);
    const [currentRound, setCurrentRound] = useState<Round | null>(null);
    const [participants, setParticipants] = useState<(Participant & { id: string })[]>([]);
    const [responses, setResponses] = useState<(Response & { id: string })[]>([]);
    const [debriefData, setDebriefData] = useState<Record<number, string> | null>(null);
    const [loading, setLoading] = useState(true);

    // Local state for the student's interaction
    const [selectedOption, setSelectedOption] = useState<SnippetOption | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Derived state to check if they already submitted this round
    const hasSubmittedThisRound = responses.some(r => r.participantId === participantId && r.roundNumber === session?.currentRound);

    // Listen to session
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'sessions', params.code), (snap) => {
            if (snap.exists()) {
                const newSession = snap.data() as Session;

                // If round changed, clear local selection
                setSession(prev => {
                    if (prev && prev.currentRound !== newSession.currentRound) {
                        setSelectedOption(null);
                    }
                    return newSession;
                });
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

    // Listen to participants and responses
    useEffect(() => {
        const pQ = query(collection(db, 'sessions', params.code, 'participants'), orderBy('joinedAt', 'asc'));
        const unsubP = onSnapshot(pQ, (snap) => {
            setParticipants(snap.docs.map(d => ({ ...d.data(), id: d.id } as Participant & { id: string })));
        });

        return () => unsubP();
    }, [params.code]);

    useEffect(() => {
        if (session?.currentRound && session.currentRound > 0) {
            const rQ = query(collection(db, 'sessions', params.code, 'responses'));
            const unsubR = onSnapshot(rQ, (snap) => {
                const allR = snap.docs.map(d => ({ ...d.data(), id: d.id } as Response & { id: string }));
                // When in active/ended round, we filter to current round.
                // When in debrief, we need ALL responses array so the multi-column leaderboard functions.
                if (session.status === 'debrief') {
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
        if (session?.status !== 'debrief') return;

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

    const handleSubmit = async () => {
        if (!selectedOption || !session || !participantId) return;
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/score-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionCode: params.code,
                    roundNumber: session.currentRound,
                    participantId: participantId,
                    choice: selectedOption,
                }),
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.error);
            }
        } catch (e) {
            console.error(e);
            alert('Network error submitting response');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
    if (!session || !participantId) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold text-gray-400">Session ended or invalid link</div>;

    return (
        <main className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col items-center">
            <div className="max-w-4xl w-full space-y-6">

                {/* Waiting State */}
                {session.status === 'waiting' && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center mt-12">
                        <h1 className="text-2xl font-black text-indigo-900 leading-tight mb-8">
                            Waiting for the teacher to start...
                        </h1>
                        <Loader2 className="w-12 h-12 text-indigo-200 animate-spin mx-auto mb-6" />
                        <p className="text-gray-500 font-medium">Hang tight! The first round will appear here.</p>
                    </div>
                )}

                {/* Round Active / Ended states */}
                {(session.status === 'round_active' || session.status === 'round_ended' || session.status === 'debrief') && currentRound && (
                    <>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-indigo-900">Round {session.currentRound}</h2>
                            {session.status === 'round_ended' && <span className="text-red-500 font-bold bg-red-50 px-3 py-1 rounded">Round Over</span>}
                            {session.status === 'debrief' && <span className="text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded">Session Debrief</span>}
                        </div>

                        {/* Snippet Grid & Rule Reveal */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            {session.status === 'debrief' && (
                                <div className="mb-8 p-6 bg-indigo-50 border-2 border-indigo-200 rounded-xl text-center">
                                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-2">The Hidden Rule Was</h3>
                                    <p className="text-2xl font-black text-indigo-900">{session.rule}</p>
                                </div>
                            )}

                            <h3 className="text-lg font-bold text-gray-800 mb-4">
                                {session.status === 'debrief' ? `Final logic mapping:` : `Pick the snippet that follows the hidden rule:`}
                            </h3>
                            <SnippetGrid
                                snippets={currentRound.snippets}
                                selectedOption={selectedOption || responses.find(r => r.participantId === participantId && r.roundNumber === session.currentRound)?.choice}
                                correctOption={(debriefData && session.currentRound) ? debriefData[session.currentRound] as SnippetOption : undefined}
                                isLocked={hasSubmittedThisRound || session.status !== 'round_active'}
                                onSelect={setSelectedOption}
                                showResults={session.status === 'debrief'}
                            />

                            {/* Submit Button */}
                            {session.status === 'round_active' && !hasSubmittedThisRound && (
                                <div className="mt-6 flex justify-end pt-6 border-t border-gray-100">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!selectedOption || isSubmitting}
                                        className="px-8 py-4 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center"
                                    >
                                        {isSubmitting && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                                        Submit Answer
                                    </button>
                                </div>
                            )}

                            {/* Status Feedback */}
                            {hasSubmittedThisRound && session.status === 'round_active' && (
                                <div className="mt-6 p-4 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-center border border-indigo-100">
                                    Answer locked in! Waiting for others...
                                </div>
                            )}
                        </div>

                        {/* Live Leaderboard */}
                        <Leaderboard
                            participants={participants}
                            currentRoundResponses={responses}
                            showResults={session.status === 'debrief'}
                            debriefData={debriefData || undefined}
                            totalRounds={session.currentRound}
                        />
                    </>
                )}

            </div>
        </main>
    );
}

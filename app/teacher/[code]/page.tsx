'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { Session, Participant, Response, SnippetOption } from '@/types';
import JoinCodeDisplay from '@/components/JoinCodeDisplay';
import SnippetGrid from '@/components/SnippetGrid';
import Leaderboard from '@/components/Leaderboard';
import RoundControls from '@/components/RoundControls';
import { startRound, endRound, startDebrief } from '@/app/actions';
import { Loader2, Monitor } from 'lucide-react';

export default function TeacherSessionDashboard({ params }: { params: { code: string } }) {
    const [session, setSession] = useState<Session | null>(null);
    const [participants, setParticipants] = useState<(Participant & { id: string })[]>([]);
    const [responses, setResponses] = useState<(Response & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isManualMode, setIsManualMode] = useState(false);
    const [autoStartNextRound, setAutoStartNextRound] = useState(false);

    // Store generated snippets here
    const [previewSnippets, setPreviewSnippets] = useState<{
        snippets: { A: string; B: string; C: string; D: string };
        correctOption: SnippetOption;
    } | null>(null);

    // Store manual edits here
    const [manualForm, setManualForm] = useState({
        A: '', B: '', C: '', D: '', correctOption: 'A' as SnippetOption
    });

    useEffect(() => {
        const unsubSession = onSnapshot(doc(db, 'sessions', params.code), (snap) => {
            if (snap.exists()) {
                const newSession = snap.data() as Session;
                setSession(newSession);

                // Clear preview if a round ends/new session load
                if (newSession.status !== 'waiting' && newSession.status !== 'round_ended') {
                    setPreviewSnippets(null);
                    setIsManualMode(false);
                }
            }
            setLoading(false);
        });

        const q = query(collection(db, 'sessions', params.code, 'participants'), orderBy('joinedAt', 'asc'));
        const unsubParts = onSnapshot(q, (snapshot) => {
            setParticipants(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Participant & { id: string })));
        });

        return () => {
            unsubSession();
            unsubParts();
        };
    }, [params.code]);

    useEffect(() => {
        if (session?.currentRound && session.currentRound > 0) {
            const respQ = query(collection(db, 'sessions', params.code, 'responses'));
            const unsubResp = onSnapshot(respQ, (snapshot) => {
                const allResp = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Response & { id: string }));
                // Only keep responses for current round
                setResponses(allResp.filter(r => r.roundNumber === session.currentRound));
            });
            return () => unsubResp();
        }
    }, [session?.currentRound, params.code]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setIsManualMode(false);
        try {
            const res = await fetch('/api/generate-snippets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionCode: params.code, passwordPlain: 'bypass' }),
            });
            const data = await res.json();

            if (data.fallback) {
                // The API specifically flagged a failure that we should degrade gracefully from
                setIsManualMode(true);
                return;
            }

            if (data.success) {
                const newSnippets = {
                    A: data.snippets.A,
                    B: data.snippets.B,
                    C: data.snippets.C,
                    D: data.snippets.D,
                };

                if (autoStartNextRound) {
                    await startRound(params.code, newSnippets, data.snippets.correct);
                } else {
                    setPreviewSnippets({
                        snippets: newSnippets,
                        correctOption: data.snippets.correct,
                    });
                }
            } else {
                alert(data.error);
            }
        } catch (e) {
            console.error(e);
            setIsManualMode(true); // Fallback on hard network failures
        } finally {
            setIsGenerating(false);
        }
    };

    const handleStartRound = async () => {
        if (isManualMode) {
            // Validate manual inputs
            if (!manualForm.A || !manualForm.B || !manualForm.C || !manualForm.D) {
                alert("Please fill out all 4 snippet options before starting.");
                return;
            }
            await startRound(params.code, { A: manualForm.A, B: manualForm.B, C: manualForm.C, D: manualForm.D }, manualForm.correctOption);
            setIsManualMode(false);
        } else {
            if (!previewSnippets) return;
            await startRound(params.code, previewSnippets.snippets, previewSnippets.correctOption);
            setPreviewSnippets(null);
        }
    };

    const handleEndRound = async () => {
        if (!session) return;
        await endRound(params.code, session.currentRound);
    };

    const handleDebrief = async () => {
        await startDebrief(params.code);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
    if (!session) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold text-gray-400">Session not found</div>;

    const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join` : '';

    return (
        <main className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-indigo-900">{session.name}</h1>
                        <p className="text-gray-500 font-medium">
                            {session.status === 'waiting' && 'Waiting Room'}
                            {session.status === 'round_active' && `Round ${session.currentRound} - Active`}
                            {session.status === 'round_ended' && `Round ${session.currentRound} - Ended`}
                            {session.status === 'debrief' && 'Debrief'}
                        </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-3">
                        <a
                            href={`/projector/${session.code}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                        >
                            <Monitor className="w-4 h-4" />
                            Open Projector View
                        </a>
                        <div>
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider block mb-1">Hidden Rule</span>
                            <span className="text-indigo-600 font-medium bg-indigo-50 px-3 py-1 rounded-md">{session.rule}</span>
                        </div>
                    </div>
                </div>

                {/* Join Code / Waiting Room */}
                {session.status === 'waiting' && (
                    <JoinCodeDisplay code={session.code} joinUrl={joinUrl} />
                )}

                {/* Controls */}
                <RoundControls
                    status={session.status}
                    isGenerating={isGenerating}
                    onGenerateRound={handleGenerate}
                    onStartRound={handleStartRound}
                    onEndRound={handleEndRound}
                    onDebrief={handleDebrief}
                    hasSnippetsReady={!!previewSnippets}
                    isManualMode={isManualMode}
                    onToggleManual={() => setIsManualMode(!isManualMode)}
                    isAutoStart={autoStartNextRound}
                    onToggleAutoStart={() => setAutoStartNextRound(!autoStartNextRound)}
                />

                {/* Teacher Preview */}
                {previewSnippets && !isManualMode && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-indigo-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 font-bold px-4 py-1 text-xs uppercase tracking-widest rounded-bl-lg">Preview</div>
                        <h3 className="text-lg font-bold text-indigo-900 mb-4">Snippet Preview (Not visible to students)</h3>
                        <SnippetGrid
                            snippets={previewSnippets.snippets}
                            correctOption={previewSnippets.correctOption}
                            isLocked={true}
                        />
                    </div>
                )}

                {/* Manual Fallback Entry */}
                {isManualMode && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-orange-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-orange-400 text-orange-900 font-bold px-4 py-1 text-xs uppercase tracking-widest rounded-bl-lg">Manual Entry</div>
                        <h3 className="text-lg font-bold text-indigo-900 mb-4">Enter Snippets Manually</h3>
                        <p className="text-sm text-gray-500 mb-6">Type out your own snippets and select which one satisfies the hidden rule.</p>

                        <div className="space-y-4">
                            {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                                <div key={opt} className={`p-4 rounded-xl border-2 flex gap-4 items-start transition-all ${manualForm.correctOption === opt ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                    <div className="pt-2 flex flex-col items-center gap-2">
                                        <div className="font-bold text-sm text-gray-400">{opt}</div>
                                        <input
                                            type="radio"
                                            name="correctOption"
                                            className="w-5 h-5 text-green-600 appearance-none rounded-full border-2 border-gray-300 checked:bg-green-500 checked:border-green-500 cursor-pointer"
                                            checked={manualForm.correctOption === opt}
                                            onChange={() => setManualForm(prev => ({ ...prev, correctOption: opt }))}
                                        />
                                    </div>
                                    <textarea
                                        value={manualForm[opt]}
                                        onChange={(e) => setManualForm(prev => ({ ...prev, [opt]: e.target.value }))}
                                        placeholder={`Snippet ${opt}...`}
                                        className="w-full bg-transparent resize-none outline-none border-b-2 border-transparent focus:border-indigo-300 py-1"
                                        rows={2}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Dynamic Main View */}
                {(session.status === 'round_active' || session.status === 'round_ended' || session.status === 'debrief' || session.status === 'complete') && (
                    <Leaderboard
                        participants={participants}
                        currentRoundResponses={responses}
                        showResults={session.status === 'debrief'}
                    // We do NOT pass correctOption here (unless debrief) because Teacher view Leaderboard 
                    // doesn't reveal green/red until Debrief per spec.
                    />
                )}

                {/* Waiting Room Roster */}
                {session.status === 'waiting' && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Students ({participants.length})</h2>
                        </div>
                        {participants.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 font-medium border-2 border-dashed border-gray-200 rounded-xl">
                                Waiting for students to join...
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {participants.map((p) => (
                                    <div key={p.id} className="py-3 px-4 bg-gray-50 border border-gray-100 rounded-xl font-semibold text-gray-700 text-center truncate">
                                        {p.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </main>
    );
}

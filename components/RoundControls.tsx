import { Loader2 } from 'lucide-react';

interface RoundControlsProps {
    status: 'waiting' | 'round_active' | 'round_ended' | 'debrief' | 'complete';
    isGenerating: boolean;
    onGenerateRound: () => void;
    onStartRound: () => void;
    onEndRound: () => void;
    onDebrief: () => void;
    hasSnippetsReady: boolean;
    isManualMode: boolean;
    onToggleManual: () => void;
}

export default function RoundControls({
    status,
    isGenerating,
    onGenerateRound,
    onStartRound,
    onEndRound,
    onDebrief,
    hasSnippetsReady,
    isManualMode,
    onToggleManual,
}: RoundControlsProps) {

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mt-6 flex flex-wrap gap-4 items-center justify-between">

            {/* Pre-Round / Waiting */}
            {(status === 'waiting' || status === 'round_ended') && (
                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                    {!isManualMode && (
                        <button
                            onClick={onGenerateRound}
                            disabled={isGenerating}
                            className="flex-1 md:flex-none flex items-center justify-center px-6 py-3 bg-white border-2 border-indigo-200 text-indigo-700 rounded-xl font-bold hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-50 transition-all"
                        >
                            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                            {hasSnippetsReady ? 'Regenerate Snippets' : (status === 'waiting' ? 'Generate 1st Round' : 'Generate Next Round')}
                        </button>
                    )}

                    <button
                        onClick={onToggleManual}
                        className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold border-2 transition-all ${isManualMode
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                    >
                        {isManualMode ? 'Cancel Manual' : 'Manual Entry'}
                    </button>

                    {hasSnippetsReady && !isManualMode && (
                        <button
                            onClick={onStartRound}
                            className="flex-1 md:flex-none px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-sm hover:bg-indigo-700 transition-all"
                        >
                            Start Round
                        </button>
                    )}

                    {isManualMode && (
                        <button
                            onClick={onStartRound}
                            className="flex-1 md:flex-none px-8 py-3 bg-orange-500 text-white rounded-xl font-bold shadow-sm hover:bg-orange-600 transition-all"
                        >
                            Start Round (Manual)
                        </button>
                    )}
                </div>
            )}

            {/* Active Round */}
            {status === 'round_active' && (
                <button
                    onClick={onEndRound}
                    className="w-full md:w-auto px-8 py-3 bg-red-600 text-white rounded-xl font-bold shadow-sm hover:bg-red-700 transition-all"
                >
                    End Round
                </button>
            )}

            {/* Post-Round Debrief Button */}
            {status === 'round_ended' && (
                <div className="flex w-full md:w-auto mt-4 md:mt-0 justify-end md:ml-auto border-t border-gray-100 md:border-t-0 pt-4 md:pt-0">
                    <button
                        onClick={onDebrief}
                        className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-sm hover:bg-black transition-all"
                    >
                        Go to Debrief
                    </button>
                </div>
            )}

        </div>
    );
}

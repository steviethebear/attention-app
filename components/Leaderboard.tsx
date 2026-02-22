import { Participant, Response, SnippetOption } from '@/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface LeaderboardProps {
    participants: (Participant & { id: string })[];
    currentRoundResponses: Response[]; // All responses for the session, or just current round depending on view
    showResults?: boolean;
    correctOption?: SnippetOption | null; // Used for single-round reveal

    // New props for Phase 3 Debrief
    debriefData?: Record<number, string>; // Maps roundNumber -> correctOption
    totalRounds?: number;
}

export default function Leaderboard({
    participants,
    currentRoundResponses,
    showResults = false,
    correctOption,
    debriefData,
    totalRounds,
}: LeaderboardProps) {
    // Sort participants: score descending, then joinedAt ascending
    const sorted = [...participants].sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        const timeA = a.joinedAt?.toMillis() || 0;
        const timeB = b.joinedAt?.toMillis() || 0;
        return timeA - timeB;
    });

    const isMultiRoundDebrief = !!debriefData && !!totalRounds;
    const roundsArray = isMultiRoundDebrief ? Array.from({ length: totalRounds }, (_, i) => i + 1) : [];

    return (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-indigo-50 border-b-2 border-indigo-100 text-indigo-900 font-bold uppercase tracking-wider text-xs">
                            <th className="px-6 py-4 w-16 text-center">Rank</th>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4 text-center border-r border-indigo-100">Score</th>

                            {!isMultiRoundDebrief && (
                                <th className="px-6 py-4 text-center">This Round</th>
                            )}

                            {isMultiRoundDebrief && roundsArray.map(r => (
                                <th key={`th-r${r}`} className="px-4 py-4 text-center">R{r}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sorted.map((p, index) => {

                            // For standard round view (Phase 2 behavior)
                            let thisRoundChoice: string | undefined;
                            let isCorrectPick = false;
                            let isWrongPick = false;

                            if (!isMultiRoundDebrief) {
                                const response = currentRoundResponses.find(r => r.participantId === p.id);
                                thisRoundChoice = response?.choice;
                                isCorrectPick = showResults && thisRoundChoice === correctOption;
                                isWrongPick = showResults && !!thisRoundChoice && thisRoundChoice !== correctOption;
                            }

                            return (
                                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-center font-bold text-gray-400">
                                        {index + 1}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-gray-800">
                                        {p.name}
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-indigo-600 text-lg border-r border-gray-100">
                                        {p.score}
                                    </td>

                                    {/* Standard Mode Column */}
                                    {!isMultiRoundDebrief && (
                                        <td className="px-6 py-4 text-center">
                                            {thisRoundChoice ? (
                                                <span className={cn(
                                                    "inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
                                                    !showResults && "bg-gray-100 text-gray-600",
                                                    isCorrectPick && "bg-green-100 text-green-700 ring-2 ring-green-500",
                                                    isWrongPick && "bg-red-100 text-red-700"
                                                )}>
                                                    {thisRoundChoice}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 font-bold">—</span>
                                            )}
                                        </td>
                                    )}

                                    {/* Debrief Mode Columns */}
                                    {isMultiRoundDebrief && roundsArray.map(r => {
                                        const ans = currentRoundResponses.find(resp => resp.participantId === p.id && resp.roundNumber === r);
                                        const choice = ans?.choice;
                                        const correctForThisRound = debriefData[r];
                                        const hit = choice === correctForThisRound;
                                        const miss = !!choice && choice !== correctForThisRound;

                                        return (
                                            <td key={`td-r${r}`} className="px-4 py-4 text-center">
                                                {choice ? (
                                                    <span className={cn(
                                                        "inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
                                                        hit && "bg-green-100 text-green-700 ring-2 ring-green-500",
                                                        miss && "bg-red-100 text-red-700"
                                                    )}>
                                                        {choice}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-200 font-bold">—</span>
                                                )}
                                            </td>
                                        )
                                    })}

                                </tr>
                            );
                        })}
                        {sorted.length === 0 && (
                            <tr>
                                <td colSpan={isMultiRoundDebrief ? 3 + roundsArray.length : 4} className="px-6 py-12 text-center text-gray-400 font-medium">
                                    No participants yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

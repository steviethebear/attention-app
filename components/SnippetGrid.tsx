'use client';

import { SnippetOption } from '@/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SnippetGridProps {
    snippets: { A: string; B: string; C: string; D: string };
    selectedOption?: SnippetOption | null;
    correctOption?: SnippetOption | null; // provided for Teacher preview
    isLocked?: boolean;
    onSelect?: (option: SnippetOption) => void;
    showResults?: boolean; // If true (Debrief), applies correct/incorrect styling to selected
}

export default function SnippetGrid({
    snippets,
    selectedOption,
    correctOption,
    isLocked = false,
    onSelect,
    showResults = false,
}: SnippetGridProps) {
    const options: SnippetOption[] = ['A', 'B', 'C', 'D'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map((opt) => {
                const isSelected = selectedOption === opt;
                const isCorrectOption = correctOption === opt; // Only true when correctOption is known (Teacher view)
                const isCorrectPick = showResults && isSelected && selectedOption === correctOption;
                const isWrongPick = showResults && isSelected && selectedOption !== correctOption;

                return (
                    <div
                        key={opt}
                        onClick={() => !isLocked && onSelect?.(opt)}
                        className={cn(
                            "relative border-2 rounded-xl p-6 transition-all",
                            !isLocked && "cursor-pointer hover:border-indigo-400 active:scale-[0.98]",
                            isLocked && !isSelected && !isCorrectOption && "opacity-60 cursor-default",

                            // Default states
                            !isSelected && !isCorrectOption && "border-gray-200 bg-white",

                            // Selected (pending result)
                            isSelected && !showResults && "border-indigo-600 bg-indigo-50 shadow-md transform scale-[1.02]",

                            // Teacher Preview (Highlighting the correct answer gently)
                            !showResults && isCorrectOption && "border-indigo-400 bg-indigo-50 shadow-sm",

                            // Results shown explicitly (Debrief mostly)
                            isCorrectPick && "border-green-600 bg-green-50 shadow-md",
                            isWrongPick && "border-red-600 bg-red-50 shadow-md",
                            showResults && !isSelected && isCorrectOption && "border-green-400 bg-green-50/50" // clarify the missed correct answer
                        )}
                    >
                        {/* Label */}
                        <div className={cn(
                            "absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                            isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500",
                            isCorrectPick && "bg-green-600",
                            isWrongPick && "bg-red-600"
                        )}>
                            {opt}
                        </div>

                        {/* Content offset for label */}
                        <div className="mt-8 text-base text-gray-800 leading-relaxed font-medium">
                            {snippets[opt]}
                        </div>

                        {/* Feedback badge if showResults */}
                        {showResults && isSelected && (
                            <div className={cn("absolute top-3 right-3 text-sm font-bold", isCorrectPick ? "text-green-600" : "text-red-600")}>
                                {isCorrectPick ? "Correct" : "Incorrect"}
                            </div>
                        )}

                        {/* Teacher correct badge */}
                        {!showResults && correctOption === opt && (
                            <div className="absolute top-3 right-3 text-xs font-bold bg-indigo-200 text-indigo-800 px-2 py-1 rounded">
                                Correct Rule
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

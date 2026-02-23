import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export type SnippetResponse = {
    A: string;
    B: string;
    C: string;
    D: string;
    correct: 'A' | 'B' | 'C' | 'D';
};

const MODEL_CHAIN = [
    'gemini-3-flash-preview',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash'
];

export async function generateSnippets(rule: string, theme?: string, modelIndex = 0): Promise<SnippetResponse> {
    if (modelIndex >= MODEL_CHAIN.length) {
        throw new Error('All models in the fallback chain failed.');
    }

    const modelName = MODEL_CHAIN[modelIndex];
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
You are generating short text snippets for a classroom activity.

Produce exactly 4 snippets (A, B, C, D) where EXACTLY ONE matches the following rule and the other three do not.

Rule: ${rule}
Theme (optional — use loosely for content inspiration): ${theme || 'general'}

Requirements:
- Each snippet must be 1–3 sentences long
- All four snippets must feel roughly equal in interest and appeal
- Do not make the correct snippet obviously longer, shorter, or higher quality
- The rule match must be subtle — a student should not spot it immediately
- Snippets should feel like things a thoughtful person might actually write — not filler
- Do not label or hint at which snippet matches the rule
- Do not make the initial snippet the same choice (A, B, C, or D) each time; randomly choose which letter it is

Return valid JSON only — no explanation, no markdown:
{"A": "...", "B": "...", "C": "...", "D": "...", "correct": "A"}
`;

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text();

        // Strip markdown code block wrappers if they exist
        if (text.startsWith('```')) {
            text = text.replace(/^```(json)?\n/, '').replace(/\n```$/, '');
        }

        const parsed = JSON.parse(text) as SnippetResponse;

        // Basic validation
        if (!parsed.A || !parsed.B || !parsed.C || !parsed.D || !['A', 'B', 'C', 'D'].includes(parsed.correct)) {
            throw new Error('Invalid JSON structure returned from Gemini');
        }

        // Mathematically shuffle the snippets to guarantee perfect randomness 
        // regardless of the LLM's positional biases.
        const items = [
            { id: 'A', text: parsed.A },
            { id: 'B', text: parsed.B },
            { id: 'C', text: parsed.C },
            { id: 'D', text: parsed.D }
        ];

        const originalCorrectId = parsed.correct;

        // Fisher-Yates shuffle
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }

        const letters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
        let newCorrect: 'A' | 'B' | 'C' | 'D' = 'A';

        items.forEach((item, idx) => {
            if (item.id === originalCorrectId) {
                newCorrect = letters[idx];
            }
        });

        return {
            A: items[0].text,
            B: items[1].text,
            C: items[2].text,
            D: items[3].text,
            correct: newCorrect
        };
    } catch (error) {
        console.error(`Gemini generation error (${modelName}):`, error);
        console.log(`Retrying snippet generation using next fallback model...`);
        return generateSnippets(rule, theme, modelIndex + 1);
    }
}

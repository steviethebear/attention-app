import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export type SnippetResponse = {
    A: string;
    B: string;
    C: string;
    D: string;
    correct: 'A' | 'B' | 'C' | 'D';
};

export async function generateSnippets(rule: string, theme?: string, retries = 1, useFallbackModel = false): Promise<SnippetResponse> {
    // Start with flash-lite, then fallback to heavier flash if requested
    const modelName = useFallbackModel ? 'gemini-2.5-flash' : 'gemini-2.5-flash-lite';
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

        return parsed;
    } catch (error) {
        console.error(`Gemini generation error (${modelName}):`, error);
        if (retries > 0) {
            console.log(`Retrying snippet generation using fallback model (gemini-2.5-flash)...`);
            // Fallback model chain: flash-lite -> flash
            return generateSnippets(rule, theme, retries - 1, true);
        }
        throw new Error('Failed to generate snippets after retries');
    }
}

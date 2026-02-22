import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateSnippets } from '@/lib/llm';

export async function POST(req: NextRequest) {
    try {
        const { sessionCode, passwordPlain } = await req.json();

        if (!sessionCode || !passwordPlain) {
            return NextResponse.json({ error: 'Missing session code or password' }, { status: 400 });
        }

        const sessionRef = adminDb.collection('sessions').doc(sessionCode);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const session = sessionDoc.data()!;

        // Call Gemini
        const result = await generateSnippets(session.rule, session.theme);

        // Only return the generated snippets for the Teacher Preview.
        return NextResponse.json({ success: true, snippets: result });
    } catch (error: any) {
        console.error('Snippet generation API error:', error);
        // Explicitly return a fallback flag so the UI can gracefully downgrade to Manual Entry
        return NextResponse.json({
            error: error.message || 'Failed to generate',
            fallback: true
        }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const sessionCode = searchParams.get('code');

        if (!sessionCode) {
            return NextResponse.json({ error: 'Missing session code' }, { status: 400 });
        }

        const sessionRef = adminDb.collection('sessions').doc(sessionCode);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const session = sessionDoc.data()!;

        // Security Gate: Only return data if the session is currently in debrief state.
        if (session.status !== 'debrief' && session.status !== 'complete') {
            return NextResponse.json({ error: 'Debrief data is not available yet' }, { status: 403 });
        }

        // Fetch all round secrets safely via Admin SDK
        const secretsSnapshot = await sessionRef.collection('round_secrets').get();

        // Map roundNumber -> correctOption
        const decodes: Record<number, string> = {};
        secretsSnapshot.forEach((doc) => {
            const data = doc.data();
            decodes[data.roundNumber] = data.correctOption;
        });

        return NextResponse.json({ success: true, secrets: decodes });

    } catch (error: any) {
        console.error('Debrief API error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch debrief data' }, { status: 500 });
    }
}

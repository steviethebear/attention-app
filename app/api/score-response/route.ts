import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    try {
        const { sessionCode, roundNumber, participantId, choice } = await req.json();

        if (!sessionCode || !roundNumber || !participantId || !choice) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const sessionRef = adminDb.collection('sessions').doc(sessionCode);

        // Read the secret answer via Admin SDK
        const secretRef = sessionRef.collection('round_secrets').doc(roundNumber.toString());
        const secretDoc = await secretRef.get();

        if (!secretDoc.exists) {
            return NextResponse.json({ error: 'Round not found or answer not available' }, { status: 404 });
        }

        const correctOption = secretDoc.data()?.correctOption;
        const isCorrect = (choice === correctOption);

        // Write the response doc using a composite ID: {roundNumber}_{participantId}
        const responseId = `${roundNumber}_${participantId}`;
        const responseRef = sessionRef.collection('responses').doc(responseId);

        // Before writing, ensure the student hasn't already submitted for this round
        const existingResponse = await responseRef.get();
        if (existingResponse.exists) {
            return NextResponse.json({ error: 'You have already submitted an answer for this round' }, { status: 403 });
        }

        await responseRef.set({
            roundNumber,
            participantId,
            choice,
            isCorrect,
            createdAt: FieldValue.serverTimestamp(),
        });

        // If correct, increment score securely
        if (isCorrect) {
            const participantRef = sessionRef.collection('participants').doc(participantId);
            await participantRef.update({
                score: FieldValue.increment(1)
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Score API error:', error);
        return NextResponse.json({ error: error.message || 'Failed to record response' }, { status: 500 });
    }
}

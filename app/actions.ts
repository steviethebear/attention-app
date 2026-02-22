'use server';

import { adminDb } from '@/lib/firebase-admin';
import { generateSessionCode } from '@/lib/session';
import { FieldValue } from 'firebase-admin/firestore';
import * as bcrypt from 'bcryptjs';

export async function createSession(data: { name: string; rule: string; theme?: string; passwordPlain: string }) {
    try {
        const code = generateSessionCode(6);
        const passwordHash = await bcrypt.hash(data.passwordPlain, 10);

        await adminDb.collection('sessions').doc(code).set({
            code,
            name: data.name,
            passwordHash,
            status: 'waiting',
            currentRound: 0,
            rule: data.rule,
            theme: data.theme || '',
            createdAt: FieldValue.serverTimestamp(),
        });

        return { success: true, code };
    } catch (error) {
        console.error('Error creating session:', error);
        return { success: false, error: 'Failed to create session' };
    }
}

export async function startRound(
    sessionCode: string,
    snippets: { A: string; B: string; C: string; D: string },
    correctOption: 'A' | 'B' | 'C' | 'D'
) {
    try {
        const sessionRef = adminDb.collection('sessions').doc(sessionCode);
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) throw new Error("Session not found");

        const session = sessionDoc.data()!;
        const nextRoundNumber = session.currentRound + 1;

        // 1. Save public data to rounds
        await sessionRef.collection('rounds').doc(nextRoundNumber.toString()).set({
            roundNumber: nextRoundNumber,
            snippets,
            status: 'active',
            createdAt: FieldValue.serverTimestamp(),
        });

        // 2. Save protected secret to round_secrets
        await sessionRef.collection('round_secrets').doc(nextRoundNumber.toString()).set({
            roundNumber: nextRoundNumber,
            correctOption: correctOption,
            createdAt: FieldValue.serverTimestamp(),
        });

        // 3. Update Session to the new round
        await sessionRef.update({
            currentRound: nextRoundNumber,
            status: 'round_active',
        });

        return { success: true, roundNumber: nextRoundNumber };
    } catch (error) {
        console.error("Start round error:", error);
        return { success: false, error: "Failed to start round" };
    }
}

export async function endRound(sessionCode: string, roundNumber: number) {
    try {
        const sessionRef = adminDb.collection('sessions').doc(sessionCode);

        await sessionRef.collection('rounds').doc(roundNumber.toString()).update({
            status: 'ended',
        });

        await sessionRef.update({
            status: 'round_ended',
        });

        return { success: true };
    } catch (error) {
        console.error("End round error:", error);
        return { success: false, error: "Failed to end round" };
    }
}

export async function startDebrief(sessionCode: string) {
    try {
        const sessionRef = adminDb.collection('sessions').doc(sessionCode);
        await sessionRef.update({
            status: 'debrief',
        });
        return { success: true };
    } catch (error) {
        console.error("Debrief error:", error);
        return { success: false, error: "Failed to start debrief" };
    }
}

export async function endSession(sessionCode: string) {
    try {
        const sessionRef = adminDb.collection('sessions').doc(sessionCode);
        await sessionRef.update({
            status: 'complete',
        });
        return { success: true };
    } catch (error) {
        console.error("End session error:", error);
        return { success: false, error: "Failed to end session" };
    }
}

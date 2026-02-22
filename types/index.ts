import { Timestamp } from 'firebase/firestore';

export type SessionStatus = 'waiting' | 'round_active' | 'round_ended' | 'debrief' | 'complete';
export type RoundStatus = 'active' | 'ended';
export type SnippetOption = 'A' | 'B' | 'C' | 'D';

export interface Session {
  code: string;
  name: string;
  passwordHash: string;
  status: SessionStatus;
  currentRound: number;
  rule: string;
  theme?: string;
  createdAt: Timestamp;
}

export interface Round {
  roundNumber: number;
  snippets: { A: string; B: string; C: string; D: string };
  correctOption: SnippetOption;
  status: RoundStatus;
  createdAt: Timestamp;
}

export interface Participant {
  name: string;
  score: number;
  joinedAt: Timestamp;
}

export interface Response {
  roundNumber: number;
  participantId: string;
  choice: SnippetOption;
  isCorrect: boolean;
  createdAt: Timestamp;
}

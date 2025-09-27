import { z } from "zod";

// Session status enum
export const SessionStatus = {
  WAITING: "waiting",
  JOINED: "joined",
  SIGNALING: "signaling",
} as const;

export type SessionStatusType = (typeof SessionStatus)[keyof typeof SessionStatus];

// Session metadata schema
export const CreateSessionSchema = z.object({
  host: z.string().min(1),
});

export const JoinSessionSchema = z.object({
  client: z.string().min(1),
});

export const SignalSchema = z.object({
  type: z.enum(["offer", "answer"]),
  sdp: z.string(),
  candidate: z.array(z.string()),
});

export const GetSignalSchema = z.object({
  type: z.enum(["offer", "answer"]),
});

// Session types
export type CreateSessionRequest = z.infer<typeof CreateSessionSchema>;
export type JoinSessionRequest = z.infer<typeof JoinSessionSchema>;
export type SignalRequest = z.infer<typeof SignalSchema>;
export type GetSignalRequest = z.infer<typeof GetSignalSchema>;

export interface SessionMetadata {
  id: string;
  host: string;
  client: string;
  status: SessionStatusType;
  createdAt: string;
}

export interface SessionSignal {
  offer?: {
    sdp: string;
    candidate: string[];
  };
  answer?: {
    sdp: string;
    candidate: string[];
  };
}

export interface Session extends SessionMetadata {
  signal: SessionSignal;
}

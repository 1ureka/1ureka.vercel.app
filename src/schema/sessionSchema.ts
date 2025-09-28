import { z } from "zod";

// Session api schemas
export const sessionSchema = {
  POST: z.object({ host: z.string().min(1) }),
  GET: z.object({ event: z.enum(["join", "offer", "answer"]) }),
  Id: {
    POST: z.object({ client: z.string().min(1) }),
    Signal: { POST: z.object({ type: z.enum(["offer", "answer"]), sdp: z.string(), candidate: z.array(z.string()) }) },
  },
};

export interface SessionMetadata {
  id: string;
  host: string;
  client: string;
  status: "waiting" | "joined" | "signaling";
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

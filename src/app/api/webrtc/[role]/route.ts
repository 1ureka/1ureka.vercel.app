import { NextRequest, NextResponse } from "next/server";

type WebRTCParams = { sdp: string; candidates: string[]; timestamp: number };

// @ts-ignore
const g = globalThis as any;
if (!g.webrtcStore) g.webrtcStore = { offer: null, answer: null };
let memoryStore = g.webrtcStore as {
  offer: WebRTCParams | null;
  answer: WebRTCParams | null;
};

const TTL = 10000; // 10 秒

function isExpired(entry: WebRTCParams | null) {
  if (!entry) return true;
  return Date.now() - entry.timestamp > TTL;
}

export async function GET(req: NextRequest, { params }: { params: { role: string } }) {
  const { role } = params;

  if (role === "offer") return NextResponse.json(isExpired(memoryStore.offer) ? {} : memoryStore.offer);
  if (role === "answer") return NextResponse.json(isExpired(memoryStore.answer) ? {} : memoryStore.answer);

  return NextResponse.json({ error: "invalid role" }, { status: 400 });
}

export async function POST(req: NextRequest, { params }: { params: { role: string } }) {
  const { role } = params;
  const body = (await req.json()) as { sdp: string; candidates: string[] };

  const entry: WebRTCParams = { ...body, timestamp: Date.now() };

  if (role === "offer") {
    memoryStore.offer = entry;
    return NextResponse.json({ ok: true });
  }
  if (role === "answer") {
    memoryStore.answer = entry;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid role" }, { status: 400 });
}

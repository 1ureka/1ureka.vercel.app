import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const WebRTCBodySchema = z.object({
  description: z.string(),
  candidates: z.array(z.string()),
});

type WebRTCEntry = z.infer<typeof WebRTCBodySchema> & { timestamp: number };
type WebRTCStore = Record<string, WebRTCEntry>;

const g = globalThis as { webrtcStore?: WebRTCStore };
if (!g.webrtcStore) g.webrtcStore = {};
const memoryStore = g.webrtcStore;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Handles CORS preflight requests.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Retrieves the stored WebRTC offer or answer along with ICE candidates from memory.
 **/
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!(id in memoryStore)) {
    return NextResponse.json({ error: "not found" }, { status: 404, headers: corsHeaders });
  }

  if (memoryStore[id].timestamp + 10000 < Date.now()) {
    delete memoryStore[id];
    return NextResponse.json({ error: "expired" }, { status: 404, headers: corsHeaders });
  }

  return NextResponse.json(memoryStore[id], { status: 200, headers: corsHeaders });
}

/**
 * Stores the WebRTC offer or answer along with ICE candidates in memory.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  const bodyResult = WebRTCBodySchema.safeParse(await req.json());
  if (!bodyResult.success) {
    return NextResponse.json(
      { error: "invalid body", details: bodyResult.error.errors },
      { status: 400, headers: corsHeaders }
    );
  }

  memoryStore[id] = { ...bodyResult.data, timestamp: Date.now() };
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

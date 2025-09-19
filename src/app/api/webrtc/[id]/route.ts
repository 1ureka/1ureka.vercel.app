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

/**
 * Wraps a JSON response with CORS headers. (So that this api can be called from Electron apps)
 */
function withCORS(json: Record<string, string | string[] | number>, status = 200) {
  return NextResponse.json(json, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/**
 * Handles CORS preflight requests.
 */
export async function OPTIONS() {
  return withCORS({}, 204);
}

/**
 * Retrieves the stored WebRTC offer or answer along with ICE candidates from memory.
 **/
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!(id in memoryStore)) {
    return withCORS({ error: "not found" }, 404);
  }

  if (memoryStore[id].timestamp + 10000 < Date.now()) {
    delete memoryStore[id];
    return withCORS({ error: "expired" }, 404);
  }

  return withCORS(memoryStore[id]);
}

/**
 * Stores the WebRTC offer or answer along with ICE candidates in memory.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  const bodyResult = WebRTCBodySchema.safeParse(await req.json());
  if (!bodyResult.success) {
    return withCORS({ error: "invalid body" }, 400);
  }

  memoryStore[id] = { ...bodyResult.data, timestamp: Date.now() };
  return withCORS({});
}

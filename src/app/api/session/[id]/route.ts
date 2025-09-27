import { NextRequest, NextResponse } from "next/server";
import { JoinSessionSchema } from "@/schema/sessionSchema";
import { sessionService } from "@/utils/session-service";

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
 * Long polling to check if someone has joined the session.
 * Polls for 5 seconds with 500ms intervals.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const session = await sessionService.waitForJoin(id, 5000);

    if (!session) {
      return NextResponse.json({ error: "Session not found or timeout" }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json(session, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error getting session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

/**
 * Joins an existing WebRTC session as a client.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();

    const parseResult = JoinSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.errors },
        { status: 400, headers: corsHeaders }
      );
    }

    const session = await sessionService.joinSession(id, parseResult.data.client);

    if (!session) {
      return NextResponse.json({ error: "Session not found or already joined" }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json(session, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error joining session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

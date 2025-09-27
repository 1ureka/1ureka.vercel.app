import { NextRequest, NextResponse } from "next/server";
import { CreateSessionSchema } from "@/schema/sessionSchema";
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
 * Creates a new WebRTC session with the specified host.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = CreateSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.errors },
        { status: 400, headers: corsHeaders }
      );
    }

    const session = await sessionService.createSession(parseResult.data.host);

    return NextResponse.json(session, {
      status: 201,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

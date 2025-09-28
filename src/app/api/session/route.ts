import { NextRequest, NextResponse } from "next/server";
import { sessionSchema } from "@/schema/sessionSchema";
import { createSession } from "@/utils/session-service";

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
    const parseResult = sessionSchema.POST.safeParse(body);

    if (!parseResult.success) {
      const error = "Invalid request body";
      return NextResponse.json({ error, details: parseResult.error.errors }, { status: 400, headers: corsHeaders });
    }

    const session = await createSession(parseResult.data.host);
    return NextResponse.json(session, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

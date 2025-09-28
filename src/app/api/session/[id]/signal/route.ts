import { NextRequest, NextResponse } from "next/server";
import { sessionSchema } from "@/schema/sessionSchema";
import { addSignal } from "@/utils/session-service";

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
 * Adds a signal (offer or answer) to the session.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();

    const parseResult = sessionSchema.Id.Signal.POST.safeParse(body);
    if (!parseResult.success) {
      const error = "Invalid request body";
      return NextResponse.json({ error, details: parseResult.error.errors }, { status: 400, headers: corsHeaders });
    }

    const session = await addSignal(id, parseResult.data.type, parseResult.data.sdp, parseResult.data.candidate);
    if (!session) {
      const error = "Session not found or not in joined state";
      return NextResponse.json({ error }, { status: 404, headers: corsHeaders });
    } else {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }
    //
  } catch (error) {
    console.error("Error adding signal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

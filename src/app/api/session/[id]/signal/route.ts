import { NextRequest, NextResponse } from "next/server";
import { SignalSchema, GetSignalSchema } from "@/schema/sessionSchema";
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
 * Long polling to check for signals from the other party.
 * Polls for 5 seconds with 200ms intervals.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);

    const queryData = {
      type: searchParams.get("type"),
    };

    const parseResult = GetSignalSchema.safeParse(queryData);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parseResult.error.errors },
        { status: 400, headers: corsHeaders }
      );
    }

    const signal = await sessionService.waitForSignal(id, parseResult.data.type, 5000);

    if (!signal) {
      return NextResponse.json({ error: "Signal not found or timeout" }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json(signal, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error getting signal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

/**
 * Adds a signal (offer or answer) to the session.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();

    const parseResult = SignalSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.errors },
        { status: 400, headers: corsHeaders }
      );
    }

    const session = await sessionService.addSignal(
      id,
      parseResult.data.type,
      parseResult.data.sdp,
      parseResult.data.candidate
    );

    if (!session) {
      return NextResponse.json(
        { error: "Session not found or not in joined state" },
        { status: 404, headers: corsHeaders }
      );
    }

    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error adding signal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

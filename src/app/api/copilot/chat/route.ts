import { NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { processCopilotChat } from "@/lib/copilot/engine";
import type { CopilotRequest } from "@/lib/copilot/engine";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/error.ts";

/**
 * POST /api/copilot/chat
 *
 * OmniRoute Copilot chat endpoint.
 * Accepts user messages about OmniRoute configuration and returns
 * tool-based responses + AI guidance.
 *
 * Body: { messages: [{ role: "user"|"assistant", content: string }] }
 */
export async function POST(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const body: CopilotRequest = await request.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const response = await processCopilotChat(body);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message = sanitizeErrorMessage(error);
    return NextResponse.json({ error: `Copilot error: ${message}` }, { status: 500 });
  }
}

import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { buildSystemPrompt } from "@/lib/prompts";
import { applyRateLimit } from "@/lib/rate-limit";
import type { ChatApiRequest } from "@/types/search";

export async function POST(request: Request) {
  // Early exit if AI is not configured — search results still shown on the client
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "AI service not configured" },
      { status: 503 }
    );
  }

  const rateLimited = applyRateLimit(request, "search");
  if (rateLimited) return rateLimited;

  try {
    const body: ChatApiRequest = await request.json();

    if (!body.messages || body.messages.length === 0) {
      return Response.json({ error: "No messages provided" }, { status: 400 });
    }

    if (!body.currentDocuments || body.currentDocuments.length === 0) {
      return Response.json(
        { error: "No documents provided" },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(body.currentDocuments, body.keywords);

    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemPrompt,
      messages: body.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.3,
      maxOutputTokens: 1024,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}

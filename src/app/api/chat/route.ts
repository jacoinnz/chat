import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createAzure } from "@ai-sdk/azure";
import { buildSystemPrompt } from "@/lib/prompts";
import { applyRateLimit } from "@/lib/rate-limit";
import { resolveAIKey, type ResolvedAIConfig } from "@/lib/ai-key-resolver";
import type { ChatApiRequest } from "@/types/search";

function createModelFromResolved(resolved: ResolvedAIConfig) {
  if (resolved.provider === "openai") {
    const openai = createOpenAI({ apiKey: resolved.key });
    return openai(resolved.modelId);
  }
  if (resolved.provider === "azure_openai") {
    const azure = createAzure({
      apiKey: resolved.key,
      resourceName: resolved.azureEndpoint?.replace(/^https?:\/\//, "").replace(/\.openai\.azure\.com\/?$/, "") || "",
    });
    return azure(resolved.azureDeployment || resolved.modelId);
  }
  // Default: Anthropic
  const anthropic = createAnthropic({ apiKey: resolved.key });
  return anthropic(resolved.modelId);
}

export async function POST(request: Request) {
  const tenantId = request.headers.get("x-tenant-id") || "default";
  const resolved = await resolveAIKey(tenantId);

  if (!resolved) {
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
    const model = createModelFromResolved(resolved);

    const result = streamText({
      model,
      system: systemPrompt,
      messages: body.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: resolved.temperature,
      maxOutputTokens: resolved.maxTokens,
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

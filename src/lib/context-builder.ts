import type { SearchHit, ChatMessage, DocumentContext, ApiConversationMessage } from "@/types/search";
import { stripHighlightTags } from "./content-prep";
import { assessFreshness, getSensitivityLevel } from "./safety";

const MAX_DOCUMENTS = 10;
const MAX_TURNS = 6;

export function buildDocumentContext(hits: SearchHit[]): DocumentContext[] {
  return hits.slice(0, MAX_DOCUMENTS).map((hit, i) => {
    const fields = hit.resource.listItem?.fields ?? hit.resource.fields;
    const freshness = assessFreshness(hit);
    const sensitivity = getSensitivityLevel(hit);

    return {
      index: i + 1,
      name: hit.resource.name || "Untitled",
      webUrl: hit.resource.webUrl || "",
      summary: hit.summary ? stripHighlightTags(hit.summary) : "",
      lastModified: hit.resource.lastModifiedDateTime
        ? new Date(hit.resource.lastModifiedDateTime).toLocaleDateString()
        : "Unknown",
      modifiedBy: hit.resource.lastModifiedBy?.user?.displayName,
      contentType: fields?.ContentType,
      department: fields?.Department,
      sensitivity,
      status: fields?.Status,
      isStale: freshness.isStale,
      stalenessWarning: freshness.warning,
    };
  });
}

export function buildConversationHistory(
  messages: ChatMessage[],
  maxTurns: number = MAX_TURNS
): ApiConversationMessage[] {
  const filtered = messages.filter(
    (m) =>
      m.id !== "welcome" &&
      !m.isLoading &&
      !m.isStreaming &&
      (m.content || "").trim().length > 0
  );

  const maxMessages = maxTurns * 2;
  const recent = filtered.slice(-maxMessages);

  return recent.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

import type { DocumentContext } from "@/types/search";

function formatDocumentSection(docs: DocumentContext[]): string {
  if (docs.length === 0) return "No documents available.";

  return docs
    .map((doc) => {
      const parts = [
        `[${doc.index}] "${doc.name}"`,
        `  URL: ${doc.webUrl}`,
        `  Last modified: ${doc.lastModified}`,
      ];
      if (doc.modifiedBy) parts.push(`  Modified by: ${doc.modifiedBy}`);
      if (doc.department) parts.push(`  Department: ${doc.department}`);
      if (doc.contentType) parts.push(`  Content Type: ${doc.contentType}`);
      if (doc.sensitivity) parts.push(`  Sensitivity: ${doc.sensitivity}`);
      if (doc.status) parts.push(`  Status: ${doc.status}`);
      if (doc.isStale && doc.stalenessWarning) {
        parts.push(`  ⚠ STALE: ${doc.stalenessWarning}`);
      }
      if (doc.summary) parts.push(`  Excerpt: ${doc.summary}`);
      return parts.join("\n");
    })
    .join("\n\n");
}

export function buildSystemPrompt(documents: DocumentContext[]): string {
  return `You are a helpful SharePoint assistant that synthesises answers from search results.

RULES:
- Answer ONLY using the Source Documents below. Never invent information.
- Cite sources using bracket notation [1], [2], etc. matching the document index numbers.
- Combine insights from multiple documents when relevant (cross-document reasoning).
- If the documents do not contain enough information to answer, say so clearly.
- If a document is marked STALE, warn the user to verify with the document owner.
- If a document has Confidential or Restricted sensitivity, remind the user to handle it according to data policy.
- Provide actionable guidance and recommendations when appropriate.
- Use clear, concise language. Keep answers focused and well-structured.
- For follow-up questions, use the conversation history for context.
- Do NOT repeat document excerpts verbatim — synthesise and summarise.
- Do NOT mention that you are an AI or that you are reading documents. Just answer naturally.

SOURCE DOCUMENTS:
${formatDocumentSection(documents)}`;
}

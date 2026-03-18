import { buildSystemPrompt } from "./prompts";
import type { DocumentContext } from "@/types/search";

function makeDoc(overrides: Partial<DocumentContext> = {}): DocumentContext {
  return {
    index: 1,
    name: "Test Document.docx",
    webUrl: "https://tenant.sharepoint.com/doc",
    summary: "A test document about policies.",
    lastModified: "2025-06-01",
    isStale: false,
    ...overrides,
  };
}

describe("buildSystemPrompt", () => {
  it("includes RULES section", () => {
    const prompt = buildSystemPrompt([makeDoc()]);
    expect(prompt).toContain("RULES:");
  });

  it("includes SOURCE DOCUMENTS section", () => {
    const prompt = buildSystemPrompt([makeDoc()]);
    expect(prompt).toContain("SOURCE DOCUMENTS:");
  });

  it("formats document with index, name, URL, and last modified", () => {
    const doc = makeDoc({ index: 3, name: "Budget.xlsx", webUrl: "https://sp.com/budget", lastModified: "2025-05-10" });
    const prompt = buildSystemPrompt([doc]);
    expect(prompt).toContain('[3] "Budget.xlsx"');
    expect(prompt).toContain("URL: https://sp.com/budget");
    expect(prompt).toContain("Last modified: 2025-05-10");
  });

  it("includes optional fields when present", () => {
    const doc = makeDoc({
      modifiedBy: "Alice",
      department: "Engineering",
      contentType: "Policy",
      sensitivity: "Confidential",
      status: "Approved",
    });
    const prompt = buildSystemPrompt([doc]);
    expect(prompt).toContain("Modified by: Alice");
    expect(prompt).toContain("Department: Engineering");
    expect(prompt).toContain("Content Type: Policy");
    expect(prompt).toContain("Sensitivity: Confidential");
    expect(prompt).toContain("Status: Approved");
  });

  it("skips optional fields when absent", () => {
    const doc = makeDoc(); // no optional fields
    const prompt = buildSystemPrompt([doc]);
    expect(prompt).not.toContain("Modified by:");
    expect(prompt).not.toContain("Department:");
    expect(prompt).not.toContain("Content Type:");
    expect(prompt).not.toContain("Sensitivity:");
    expect(prompt).not.toContain("Status:");
  });

  it("includes STALE warning when isStale and stalenessWarning are set", () => {
    const doc = makeDoc({ isStale: true, stalenessWarning: "Last updated 18 months ago" });
    const prompt = buildSystemPrompt([doc]);
    expect(prompt).toContain("STALE: Last updated 18 months ago");
  });

  it("does not include STALE warning when isStale is false", () => {
    const doc = makeDoc({ isStale: false, stalenessWarning: "This should not appear" });
    const prompt = buildSystemPrompt([doc]);
    expect(prompt).not.toContain("⚠ STALE:");
  });

  it("includes keyword section when keywords provided", () => {
    const prompt = buildSystemPrompt([makeDoc()], [
      { term: "HR", synonyms: ["Human Resources", "People & Culture"] },
    ]);
    expect(prompt).toContain("ORGANISATION TERMINOLOGY:");
    expect(prompt).toContain('"HR"');
    expect(prompt).toContain("Human Resources");
  });

  it("omits keyword section when no keywords", () => {
    const prompt = buildSystemPrompt([makeDoc()]);
    expect(prompt).not.toContain("ORGANISATION TERMINOLOGY:");
  });

  it("omits keyword section when keywords array is empty", () => {
    const prompt = buildSystemPrompt([makeDoc()], []);
    expect(prompt).not.toContain("ORGANISATION TERMINOLOGY:");
  });

  it("shows 'No documents available.' for empty documents", () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).toContain("No documents available.");
  });
});

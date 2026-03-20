import { describe, it, expect } from "vitest";
import { analyzeIntent } from "../intent";

describe("analyzeIntent — file type stripping", () => {
  it('"budget reports excel" → query: "budget reports", fileType: "xlsx"', () => {
    const result = analyzeIntent("budget reports excel");
    expect(result.fileType).toBe("xlsx");
    expect(result.refinedQuery).toBe("budget reports");
  });

  it('"excel budget reports" → query: "budget reports", fileType: "xlsx"', () => {
    const result = analyzeIntent("excel budget reports");
    expect(result.fileType).toBe("xlsx");
    expect(result.refinedQuery).toBe("budget reports");
  });

  it('"leave policy pdf" → query: "leave policy", fileType: "pdf"', () => {
    const result = analyzeIntent("leave policy pdf");
    expect(result.fileType).toBe("pdf");
    expect(result.refinedQuery).toBe("leave policy");
  });

  it('"word documents HR" → query: "HR", fileType: "docx"', () => {
    const result = analyzeIntent("word documents HR");
    expect(result.fileType).toBe("docx");
    expect(result.refinedQuery).toBe("HR");
  });

  it('"latest excel files" → query stripped of recency + file type', () => {
    const result = analyzeIntent("latest excel files");
    expect(result.fileType).toBe("xlsx");
    // "latest" stripped by recency, "excel" and "files" stripped by file type
    expect(result.refinedQuery).not.toMatch(/\bexcel\b/i);
    expect(result.refinedQuery).not.toMatch(/\bfiles?\b/i);
  });

  it('"excel" → query: "*", fileType: "xlsx"', () => {
    const result = analyzeIntent("excel");
    expect(result.fileType).toBe("xlsx");
    expect(result.refinedQuery).toBe("*");
  });

  it('"spreadsheet" → fileType: "xlsx"', () => {
    const result = analyzeIntent("spreadsheet");
    expect(result.fileType).toBe("xlsx");
    expect(result.refinedQuery).toBe("*");
  });

  it('"presentation" → fileType: "pptx"', () => {
    const result = analyzeIntent("presentation");
    expect(result.fileType).toBe("pptx");
    expect(result.refinedQuery).toBe("*");
  });

  it("is case-insensitive", () => {
    const result = analyzeIntent("Budget Reports EXCEL");
    expect(result.fileType).toBe("xlsx");
    expect(result.refinedQuery).toBe("Budget Reports");
  });

  it("handles file type at the start of query", () => {
    const result = analyzeIntent("PDF annual report");
    expect(result.fileType).toBe("pdf");
    expect(result.refinedQuery).toBe("annual report");
  });

  it("handles file type in the middle of query", () => {
    const result = analyzeIntent("budget excel reports");
    expect(result.fileType).toBe("xlsx");
    expect(result.refinedQuery).toBe("budget reports");
  });

  it("handles plural file type keywords", () => {
    const result = analyzeIntent("spreadsheets for finance");
    expect(result.fileType).toBe("xlsx");
    expect(result.refinedQuery).toBe("for finance");
  });

  it("handles presentations plural", () => {
    const result = analyzeIntent("marketing presentations");
    expect(result.fileType).toBe("pptx");
    expect(result.refinedQuery).toBe("marketing");
  });

  it("does not match substrings (excellent ≠ excel)", () => {
    const result = analyzeIntent("excellent performance review");
    expect(result.fileType).toBeUndefined();
    expect(result.refinedQuery).toBe("excellent performance review");
  });

  it("does not match substrings (documentation ≠ document)", () => {
    const result = analyzeIntent("documentation guidelines");
    expect(result.fileType).toBeUndefined();
    expect(result.refinedQuery).toBe("documentation guidelines");
  });

  it("handles extension keywords (xlsx, docx, pptx)", () => {
    expect(analyzeIntent("budget xlsx").fileType).toBe("xlsx");
    expect(analyzeIntent("report docx").fileType).toBe("docx");
    expect(analyzeIntent("slides pptx").fileType).toBe("pptx");
  });

  it('"csv export data" → fileType: "csv", query stripped', () => {
    const result = analyzeIntent("csv export data");
    expect(result.fileType).toBe("csv");
    expect(result.refinedQuery).toBe("export data");
  });
});

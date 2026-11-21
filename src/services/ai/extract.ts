import { randomUUID } from "crypto";
import mammoth from "mammoth";
import type {
  ExtractedChapter,
  ExtractedTopic,
  ExtractionResult,
  Language,
  PageSource,
} from "@/types";

const CHAPTER_RE =
  /^(?:chapter|unit|part|section|module|lesson|الفصل|الوحدة|الباب|القسم|الدرس)\s+[\d٠-٩ivxlcdm]+(?:\s*[:.\-–]\s*(.*))?$/i;

const PAGE_RE = /(?:page|صفحة|الصفحة)\s*[:.]?\s*(\d+)/gi;

function detectLanguage(text: string): Language | "mixed" | "unknown" {
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (arabic > 40 && latin > 40) return "mixed";
  if (arabic > latin && arabic > 20) return "ar";
  if (latin > 20) return "en";
  return "unknown";
}

function difficultyFromText(text: string): 1 | 2 | 3 | 4 | 5 {
  const length = text.length;
  const formulas = (text.match(/[=∑∫√±≤≥∞]|\\frac|equation/gi) || []).length;
  const keywords = (text.match(/theorem|definition|proof|نظرية|تعريف|برهان|قانون/gi) || []).length;
  let score = 2;
  if (length > 2500) score += 1;
  if (length > 6000) score += 1;
  if (formulas > 3 || keywords > 4) score += 1;
  return Math.min(5, Math.max(1, score)) as 1 | 2 | 3 | 4 | 5;
}

function estimateMinutes(pages: number, difficulty: number) {
  const perPage = 4 + difficulty * 2;
  return Math.max(10, Math.round(pages * perPage));
}

function splitPagesFromPdfText(fullText: string): { pages: string[]; source: PageSource } {
  const formFeed = fullText.split("\f").map((p) => p.trim()).filter((p) => p.length > 0);
  if (formFeed.length > 1) return { pages: formFeed, source: "pdf_index" };

  const markerSplit = fullText.split(/\n(?=(?:page|صفحة|الصفحة)\s*[:.]?\s*\d+)/i);
  if (markerSplit.length > 2) return { pages: markerSplit.map((p) => p.trim()), source: "printed" };

  const chunks: string[] = [];
  const approx = 1800;
  for (let i = 0; i < fullText.length; i += approx) {
    chunks.push(fullText.slice(i, i + approx));
  }
  return { pages: chunks.length ? chunks : [fullText], source: "estimated" };
}

function headingScore(line: string) {
  const t = line.trim();
  if (!t || t.length > 120) return 0;
  if (CHAPTER_RE.test(t)) return 3;
  if (/^#{1,3}\s+\S/.test(t)) return 2;
  if (t === t.toUpperCase() && /[A-Z]/.test(t) && t.length > 6) return 2;
  if (/^[\d٠-٩]+[.)]\s+\S/.test(t) && t.length < 80) return 1;
  return 0;
}

function buildChapters(pages: string[], pageSource: PageSource): ExtractedChapter[] {
  type Raw = { title: string; start: number; lines: string[] };
  const raw: Raw[] = [];
  let current: Raw = { title: "Introduction", start: 1, lines: [] };

  pages.forEach((page, idx) => {
    const pageNo = idx + 1;
    const lines = page.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const score = headingScore(line);
      if (score >= 2) {
        if (current.lines.join(" ").length > 40 || current.title !== "Introduction") {
          raw.push(current);
        }
        current = { title: line.replace(/^#+\s*/, "").slice(0, 120), start: pageNo, lines: [] };
      } else {
        current.lines.push(line);
      }
    }
  });
  raw.push(current);

  const chapters: ExtractedChapter[] = raw.map((ch, i) => {
    const endPage = raw[i + 1] ? raw[i + 1].start - 1 : pages.length;
    const text = ch.lines.join(" ");
    const topics = splitTopics(ch, endPage, pageSource, text);
    return {
      id: randomUUID(),
      title: ch.title,
      startPage: ch.start,
      endPage: Math.max(ch.start, endPage),
      pageSource,
      topics,
    };
  });

  return chapters.filter((c) => c.topics.length > 0 || c.endPage >= c.startPage);
}

function splitTopics(
  chapter: { title: string; start: number; lines: string[] },
  endPage: number,
  pageSource: PageSource,
  text: string,
): ExtractedTopic[] {
  const subheads = chapter.lines.filter((l) => headingScore(l) === 1);
  const span = Math.max(1, endPage - chapter.start + 1);
  if (subheads.length >= 2) {
    const pagesEach = Math.max(1, Math.floor(span / subheads.length));
    return subheads.map((title, i) => {
      const start = chapter.start + i * pagesEach;
      const end = i === subheads.length - 1 ? endPage : start + pagesEach - 1;
      const difficulty = difficultyFromText(title + text.slice(0, 400));
      return {
        id: randomUUID(),
        title: title.slice(0, 120),
        startPage: start,
        endPage: Math.max(start, end),
        pageSource,
        difficulty,
        estimatedMinutes: estimateMinutes(Math.max(1, end - start + 1), difficulty),
        summary: text.slice(0, 180),
        isEstimate: pageSource === "estimated" || subheads.length > 0,
      };
    });
  }
  const difficulty = difficultyFromText(text);
  return [
    {
      id: randomUUID(),
      title: chapter.title,
      startPage: chapter.start,
      endPage: Math.max(chapter.start, endPage),
      pageSource,
      difficulty,
      estimatedMinutes: estimateMinutes(span, difficulty),
      summary: text.slice(0, 180),
      isEstimate: pageSource === "estimated",
    },
  ];
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  if (Array.isArray(text)) return text.join("\f");
  return String(text || "");
}

function htmlToText(html: string) {
  return html
    .replace(/<h1[^>]*>/gi, "\n# ")
    .replace(/<h2[^>]*>/gi, "\n## ")
    .replace(/<h3[^>]*>/gi, "\n### ")
    .replace(/<\/h[1-3]>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n");
}

async function maybeLlmEnrich(result: ExtractionResult, fullText: string): Promise<ExtractionResult> {
  const key = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) return result;
  try {
    if (process.env.OPENAI_API_KEY) {
      return await enrichWithOpenAI(result, fullText);
    }
    return await enrichWithGemini(result, fullText);
  } catch (error) {
    result.warnings.push(
      "LLM enrichment failed; using deterministic extraction only.",
    );
    result.uncertainty.push(error instanceof Error ? error.message : "llm_error");
    return result;
  }
}

async function enrichWithOpenAI(result: ExtractionResult, fullText: string): Promise<ExtractionResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You analyze educational documents. Never invent chapters or page numbers that are not supported by the extracted text. Return JSON {chapters:[{title,startPage,endPage,topics:[{title,startPage,endPage,difficulty,estimatedMinutes,summary}]}], warnings:string[]}. Page numbers must stay within the known range. Distinguish estimates.",
        },
        {
          role: "user",
          content: JSON.stringify({
            knownPages: result.totalPages,
            pageSource: result.pageSource,
            existingChapters: result.chapters.map((c) => ({
              title: c.title,
              startPage: c.startPage,
              endPage: c.endPage,
            })),
            textPreview: fullText.slice(0, 24000),
          }),
        },
      ],
    }),
  });
  if (!res.ok) throw new Error("OpenAI request failed");
  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  return mergeLlm(result, parsed);
}

async function enrichWithGemini(result: ExtractionResult, fullText: string): Promise<ExtractionResult> {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Analyze this educational document. Never invent pages. Known pages: ${result.totalPages}. Return JSON only.\n${fullText.slice(0, 24000)}`,
              },
            ],
          },
        ],
      }),
    },
  );
  if (!res.ok) throw new Error("Gemini request failed");
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const json = text.replace(/```json|```/g, "");
  return mergeLlm(result, JSON.parse(json));
}

function mergeLlm(result: ExtractionResult, parsed: {
  chapters?: Array<{
    title: string;
    startPage: number;
    endPage: number;
    topics?: Array<{
      title: string;
      startPage: number;
      endPage: number;
      difficulty?: number;
      estimatedMinutes?: number;
      summary?: string;
    }>;
  }>;
  warnings?: string[];
}): ExtractionResult {
  if (!parsed.chapters?.length) return { ...result, usedLlm: true };
  const max = result.totalPages;
  const chapters: ExtractedChapter[] = parsed.chapters
    .map((ch) => {
      const start = clampPage(ch.startPage, max);
      const end = clampPage(ch.endPage, max, start);
      const topics: ExtractedTopic[] = (ch.topics || []).map((t) => ({
        id: randomUUID(),
        title: String(t.title || ch.title).slice(0, 120),
        startPage: clampPage(t.startPage, max, start),
        endPage: clampPage(t.endPage, max, clampPage(t.startPage, max, start)),
        pageSource: result.pageSource,
        difficulty: (Math.min(5, Math.max(1, t.difficulty || 3)) as 1 | 2 | 3 | 4 | 5),
        estimatedMinutes: t.estimatedMinutes || estimateMinutes(1, 3),
        summary: String(t.summary || "").slice(0, 240),
        isEstimate: true,
      }));
      return {
        id: randomUUID(),
        title: String(ch.title).slice(0, 120),
        startPage: start,
        endPage: end,
        pageSource: result.pageSource,
        topics: topics.length
          ? topics
          : [
              {
                id: randomUUID(),
                title: String(ch.title).slice(0, 120),
                startPage: start,
                endPage: end,
                pageSource: result.pageSource,
                difficulty: 3 as const,
                estimatedMinutes: estimateMinutes(end - start + 1, 3),
                summary: "",
                isEstimate: true,
              },
            ],
      };
    })
    .filter((c) => c.startPage <= max);
  return {
    ...result,
    chapters,
    usedLlm: true,
    warnings: [...result.warnings, ...(parsed.warnings || [])],
  };
}

function clampPage(n: number, max: number, min = 1) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function extractDocument(input: {
  buffer: Buffer;
  mimeType: string;
  fileId: string;
  studentId: string;
}): Promise<ExtractionResult> {
  const warnings: string[] = [];
  const uncertainty: string[] = [];
  let text = "";
  let pages: string[] = [];
  let pageSource: PageSource = "estimated";

  if (input.mimeType === "application/pdf") {
    try {
      text = await extractPdfText(input.buffer);
      const split = splitPagesFromPdfText(text);
      pages = split.pages;
      pageSource = split.source;
      if (pageSource === "estimated") {
        uncertainty.push("Printed page numbers were not detected; page ranges are estimates based on text length.");
      }
    } catch (error) {
      warnings.push("PDF text extraction failed.");
      uncertainty.push(error instanceof Error ? error.message : "pdf_error");
    }
  } else if (
    input.mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    input.mimeType === "application/msword"
  ) {
    try {
      const result = await mammoth.convertToHtml({ buffer: input.buffer });
      text = htmlToText(result.value);
      if (result.messages.length) {
        warnings.push(...result.messages.map((m) => m.message));
      }
      const split = splitPagesFromPdfText(text);
      pages = split.pages;
      pageSource = "estimated";
      uncertainty.push("DOC/DOCX files do not have reliable printed page numbers; page ranges are estimates.");
    } catch (error) {
      warnings.push("Word document parsing failed.");
      uncertainty.push(error instanceof Error ? error.message : "docx_error");
    }
  } else if (input.mimeType.startsWith("image/")) {
    warnings.push("Image files require OCR. Automatic OCR is not configured, so this file needs review.");
    uncertainty.push("No text could be extracted from the image.");
  }

  if (!text.trim()) {
    return {
      id: randomUUID(),
      fileId: input.fileId,
      studentId: input.studentId,
      language: "unknown",
      totalPages: 0,
      pageSource,
      chapters: [],
      uncertainty,
      warnings: [...warnings, "No readable text was extracted. The file was not treated as understood."],
      rawTextPreview: "",
      extractedAt: new Date().toISOString(),
      usedLlm: false,
    };
  }

  const chapters = buildChapters(pages, pageSource);
  const assigned = new Set<number>();
  for (const ch of chapters) {
    for (let p = ch.startPage; p <= ch.endPage; p++) assigned.add(p);
  }
  const missing: number[] = [];
  for (let p = 1; p <= pages.length; p++) {
    if (!assigned.has(p)) missing.push(p);
  }
  if (missing.length) {
    uncertainty.push(`Unassigned page ranges: ${missing.slice(0, 20).join(", ")}`);
  }

  const result: ExtractionResult = {
    id: randomUUID(),
    fileId: input.fileId,
    studentId: input.studentId,
    language: detectLanguage(text),
    totalPages: pages.length,
    pageSource,
    chapters,
    uncertainty,
    warnings,
    rawTextPreview: text.slice(0, 2000),
    extractedAt: new Date().toISOString(),
    usedLlm: false,
  };
  return maybeLlmEnrich(result, text);
}

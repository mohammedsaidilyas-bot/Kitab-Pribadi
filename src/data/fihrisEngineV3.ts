import * as pdfjsLib from "pdfjs-dist";
import { createWorker, type Worker } from "tesseract.js";

export type FihrisStatus = "verified" | "review";

export type EngineFihrisEntry = {
  title: string;
  printedPage?: number;
  pdfPage: number;
  status: FihrisStatus;
  confidence: number;
  sourcePage: number;
  targetPdfPage?: number;
  validation?: "exact" | "near" | "unverified";
};

const STORAGE = "kitab-pribadi-fihris-v2";

function readStore(): Record<string, EngineFihrisEntry[]> {
  try { return JSON.parse(localStorage.getItem(STORAGE) || "{}"); } catch { return {}; }
}

export function loadEngineFihris(bookId: string): EngineFihrisEntry[] {
  return readStore()[bookId] || [];
}

function saveEngineFihris(bookId: string, entries: EngineFihrisEntry[]) {
  const all = readStore();
  all[bookId] = entries;
  localStorage.setItem(STORAGE, JSON.stringify(all));
}

function normalizeDigits(text: string) {
  return text
    .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function normalizeArabic(text: string) {
  return text
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function headingKind(line: string) {
  const s = normalizeArabic(line);
  if (/^(فهرس|الفهرس|فهارس|المحتويات|المحتويات العامة)/.test(s)) return "toc";
  if (/^(كتاب|الكتاب|كتب)\b/.test(s)) return "kitab";
  if (/^(باب|الأبواب|ابواب)\b/.test(s)) return "bab";
  if (/^(فصل|الفصل|فصول)\b/.test(s)) return "fasal";
  if (/^(فرع|الفروع|فروع)\b/.test(s)) return "furu";
  if (/^(تنبيه|فائدة|فوائد|مهم|مهمة|ملاحظة|مسألة|مسائل|فائدة مهمة)\b/.test(s)) return "tanbih";
  if (/^(خاتمة|الخاتمة)\b/.test(s)) return "khatimah";
  return null;
}

function extractPrintedPage(line: string): number | undefined {
  const normalized = normalizeDigits(line).replace(/[\s·•|…]+/g, " ").trim();
  const matches = normalized.match(/(?:^|\s)(\d{1,4})\s*$/);
  if (!matches) return undefined;
  const n = Number(matches[1]);
  return n > 0 && n < 10000 ? n : undefined;
}

function parseTocLine(raw: string) {
  const normalized = normalizeDigits(raw).replace(/[·•|…]+/g, " ").replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(.*?)[\s.]+(\d{1,4})$/);
  if (!match) return { title: raw.trim(), printedPage: undefined as number | undefined };
  const n = Number(match[2]);
  return { title: match[1].replace(/[.·•|…]+$/g, "").trim(), printedPage: n > 0 && n < 10000 ? n : undefined };
}

async function pageImage(pdf: pdfjsLib.PDFDocumentProxy, pageNo: number, scale = 1.5) {
  const page = await pdf.getPage(pageNo);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: canvas.getContext("2d")!, viewport, canvas }).promise;
  return canvas;
}

async function recognize(worker: Worker, canvas: HTMLCanvasElement) {
  const result = await worker.recognize(canvas);
  return result.data.text || "";
}

function splitLines(text: string) {
  return text.split(/\r?\n/).map(x => x.replace(/\s+/g, " ").trim()).filter(Boolean);
}



function headingTokens(title: string) {
  return normalizeArabic(title)
    .replace(/^(كتاب|الكتاب|باب|الأبواب|فصل|الفصل|فرع|الفروع|تنبيه|فائدة|مهم|مهمة|ملاحظة|خاتمة|الخاتمة)\s*/, "")
    .split(/\s+/)
    .filter(x => x.length >= 3);
}

function titleMatchesPage(title: string, pageText: string) {
  const page = normalizeArabic(pageText);
  const tokens = headingTokens(title);
  if (!tokens.length) return false;
  const hits = tokens.filter(token => page.includes(token)).length;
  return hits >= Math.max(1, Math.ceil(tokens.length * 0.55));
}

function numbersFromText(text: string) {
  const normalized = normalizeDigits(text);
  return [...normalized.matchAll(/(?:^|\s)(\d{1,4})(?=\s|$)/g)]
    .map(m => Number(m[1]))
    .filter(n => n > 0 && n < 10000);
}

async function extractTextPage(pdf: pdfjsLib.PDFDocumentProxy, pageNo: number) {
  const page = await pdf.getPage(pageNo);
  const content = await page.getTextContent();
  return content.items.map(item => "str" in item ? item.str : "").join(" ");
}

async function buildPrintedPageMap(pdf: pdfjsLib.PDFDocumentProxy) {
  const map = new Map<number, number>();
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const text = await extractTextPage(pdf, pageNo);
    const nums = numbersFromText(text).filter(n => n <= pdf.numPages + 100);
    if (!nums.length) continue;

    // Prefer numbers near the beginning/end of the extracted text because
    // printed folio numbers usually live in a header or footer. If several
    // candidates remain, retain the one closest to the document edge.
    const tokens = normalizeDigits(text).split(/\s+/).filter(Boolean);
    const candidates = nums.map(n => {
      const index = tokens.findIndex(t => t === String(n));
      const edgeDistance = Math.min(index < 0 ? 9999 : index, Math.max(0, tokens.length - 1 - (index < 0 ? 0 : index)));
      return { n, edgeDistance };
    }).sort((a, b) => a.edgeDistance - b.edgeDistance);

    if (candidates[0]) map.set(candidates[0].n, pageNo);
  }
  return map;
}

async function validateEntry(
  pdf: pdfjsLib.PDFDocumentProxy,
  worker: Worker,
  entry: EngineFihrisEntry,
  pageMap: Map<number, number>
) {
  if (!entry.printedPage) return { ...entry, validation: "unverified" as const, confidence: 0.35 };

  const exact = pageMap.get(entry.printedPage);
  const candidates = exact
    ? [exact, exact - 1, exact + 1].filter(p => p >= 1 && p <= pdf.numPages)
    : [];

  for (const candidate of candidates) {
    const text = await extractTextPage(pdf, candidate);
    if (titleMatchesPage(entry.title, text)) {
      return { ...entry, pdfPage: candidate, targetPdfPage: candidate, status: "verified" as const, validation: candidate === exact ? "exact" as const : "near" as const, confidence: candidate === exact ? 0.98 : 0.9 };
    }
  }

  // Scanned pages may have no PDF text. OCR only a small candidate window.
  if (exact) {
    for (const candidate of candidates) {
      const ocr = await recognize(worker, await pageImage(pdf, candidate, 1.4));
      if (titleMatchesPage(entry.title, ocr)) {
        return { ...entry, pdfPage: candidate, targetPdfPage: candidate, status: "verified" as const, validation: candidate === exact ? "exact" as const : "near" as const, confidence: candidate === exact ? 0.94 : 0.86 };
      }
    }
  }

  return { ...entry, pdfPage: exact || entry.pdfPage, targetPdfPage: exact, status: "review" as const, validation: "unverified" as const, confidence: exact ? 0.62 : 0.35 };
}

function pageMapAnchorFromEntry(entry: EngineFihrisEntry) {
  return entry.printedPage && entry.pdfPage && entry.pdfPage !== entry.sourcePage
    ? { printedPage: entry.printedPage, pdfPage: entry.pdfPage }
    : null;
}

function derivePageCalibration(anchors: Array<{ printedPage: number; pdfPage: number }>) {
  const counts = new Map<number, number>();
  for (const anchor of anchors) {
    const offset = anchor.pdfPage - anchor.printedPage;
    counts.set(offset, (counts.get(offset) || 0) + 1);
  }
  let bestOffset = 0;
  let bestCount = 0;
  for (const [offset, count] of counts) {
    if (count > bestCount) {
      bestOffset = offset;
      bestCount = count;
    }
  }
  const confidence = anchors.length ? bestCount / anchors.length : 0;
  return bestCount >= 2 && confidence >= 0.6 ? { offset: bestOffset, confidence } : null;
}

function mergeTocLines(lines: string[]) {
  const result: Array<{ title: string; printedPage?: number }> = [];
  for (const raw of lines) {
    const parsed = parseTocLine(raw);
    if (parsed.printedPage) {
      result.push(parsed);
      continue;
    }

    const text = raw.trim();
    if (!text) continue;

    // A structural heading always starts a new entry. Never merge it into
    // the preceding OCR fragment, even when OCR lost the page number.
    const structural = headingKind(text);
    const last = result[result.length - 1];
    if (structural && structural !== "toc") {
      result.push({ title: text });
      continue;
    }

    // Only merge a fragment when the previous entry has no page number yet.
    // This prevents two complete TOC entries from being accidentally joined.
    if (last && last.printedPage === undefined) {
      last.title = (last.title + " " + text).trim();
    } else {
      result.push({ title: text });
    }
  }
  return result;
}

function isUsefulHeading(line: string) {
  const kind = headingKind(line);
  return Boolean(kind && kind !== "toc" && line.length >= 3 && line.length <= 220);
}

/**
 * Accuracy-first pipeline:
 * 1. Locate likely contents pages with OCR.
 * 2. OCR those pages at higher resolution.
 * 3. Extract only structural headings with an explicit printed page number.
 * 4. Keep the printed page and PDF page separate.
 * 5. Mark mappings as review until a page-number calibration confirms them.
 * No uncertain mapping is silently presented as verified.
 */
export async function buildVerifiedFihris(bookId: string, pdfUrl: string) {
  const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
  const worker = await createWorker("ara");
  const entries: EngineFihrisEntry[] = [];

  try {
    const candidatePages = new Set<number>();
    const edgeCount = Math.min(14, pdf.numPages);

    for (let pageNo = 1; pageNo <= edgeCount; pageNo++) candidatePages.add(pageNo);
    for (let pageNo = Math.max(1, pdf.numPages - edgeCount + 1); pageNo <= pdf.numPages; pageNo++) candidatePages.add(pageNo);

    let tocFound = false;
    for (const pageNo of candidatePages) {
      const text = await recognize(worker, await pageImage(pdf, pageNo, 0.9));
      if (/فهرس|المحتويات|المحتویات/i.test(normalizeArabic(text))) {
        tocFound = true;
        break;
      }
    }

    if (!tocFound) {
      // A scanned book may put its contents in the middle. Sample pages first,
      // then inspect neighbors around any page containing a TOC keyword.
      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 8) {
        const text = await recognize(worker, await pageImage(pdf, pageNo, 0.65));
        if (/فهرس|المحتويات|المحتویات/i.test(normalizeArabic(text))) {
          for (let n = Math.max(1, pageNo - 2); n <= Math.min(pdf.numPages, pageNo + 2); n++) candidatePages.add(n);
          tocFound = true;
        }
      }
    }

    if (!tocFound) {
      saveEngineFihris(bookId, []);
      return { entries: [], tocFound: false };
    }

    for (const pageNo of [...candidatePages].sort((a, b) => a - b)) {
      const text = await recognize(worker, await pageImage(pdf, pageNo, 1.6));
      if (!/فهرس|المحتويات|المحتویات/i.test(normalizeArabic(text))) continue;

      for (const parsed of mergeTocLines(splitLines(text))) {
        const printedPage = parsed.printedPage;
        const title = parsed.title;
        if (!isUsefulHeading(title) || !printedPage) continue;

        const duplicate = entries.some(e => normalizeArabic(e.title) === normalizeArabic(title) && e.printedPage === printedPage);
        if (duplicate) continue;

        entries.push({
          title,
          printedPage,
          pdfPage: pageNo,
          status: "review",
          confidence: 0.55,
          sourcePage: pageNo,
        });
      }
    }
    // Build a real printed-page → PDF-page map before accepting any target.
    // For image-only PDFs this map may be sparse; those entries remain review-only.
    const pageMap = await buildPrintedPageMap(pdf);
    const validated: EngineFihrisEntry[] = [];
    for (const entry of entries) {
      validated.push(await validateEntry(pdf, worker, entry, pageMap));
    }

    saveEngineFihris(bookId, validated);
    return { entries: validated, tocFound: true };
  } finally {
    await worker.terminate();
    await pdf.destroy();
  }
}

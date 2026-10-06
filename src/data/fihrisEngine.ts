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
  if (/^(فهرس|الفهرس|فهارس)/.test(s)) return "toc";
  if (/^(كتاب|الكتاب)\b/.test(s)) return "kitab";
  if (/^(باب|الأبواب)\b/.test(s)) return "bab";
  if (/^(فصل|الفصل)\b/.test(s)) return "fasal";
  if (/^(فرع|الفروع)\b/.test(s)) return "furu";
  if (/^(تنبيه|فائدة|مهم|مهمة|ملاحظة)\b/.test(s)) return "tanbih";
  if (/^(خاتمة|الخاتمة)\b/.test(s)) return "khatimah";
  return null;
}

function extractPrintedPage(line: string): number | undefined {
  const normalized = normalizeDigits(line).replace(/[\s·•|]+/g, " ").trim();
  const matches = normalized.match(/(?:^|\s)(\d{1,4})\s*$/);
  if (!matches) return undefined;
  const n = Number(matches[1]);
  return n > 0 && n < 10000 ? n : undefined;
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

      for (const raw of splitLines(text)) {
        const printedPage = extractPrintedPage(raw);
        const title = raw.replace(/[٠-٩۰-۹]+\s*$/, "").replace(/[|·•]+$/, "").trim();
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

    saveEngineFihris(bookId, entries);
    return { entries, tocFound: true };
  } finally {
    await worker.terminate();
    await pdf.destroy();
  }
}

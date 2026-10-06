import * as pdfjsLib from "pdfjs-dist";

export type AutoFihrisEntry = {
  title: string;
  pdfPage: number;
  printedPage?: number;
};

const KEY = "kitab-pribadi-auto-fihris";

function loadAll(): Record<string, AutoFihrisEntry[]> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

export function loadAutoFihris(bookId: string): AutoFihrisEntry[] {
  return loadAll()[bookId] || [];
}

export function saveAutoFihris(bookId: string, entries: AutoFihrisEntry[]) {
  const all = loadAll();
  all[bookId] = entries;
  localStorage.setItem(KEY, JSON.stringify(all));
}

function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").replace(/[•·]+/g, "").trim();
}

function isHeading(line: string) {
  return /^(باب|فصل|مبحث|تنبيه|فائدة|خاتمة|خاتمة الكتاب|فروع|فرع|فهرس)/.test(line);
}

function printedNumber(line: string): number | undefined {
  const m = line.match(/(?:ص|صفحة|الصفحة)\s*[:.]?\s*(\d{1,4})\s*$/);
  return m ? Number(m[1]) : undefined;
}

/**
 * Offline heuristic extraction. It scans every PDF page and keeps Arabic
 * lines that look like structural headings. It never invents a page number:
 * printedPage is only stored when the PDF text explicitly contains one.
 */
export async function buildAutoFihris(bookId: string, pdfUrl: string): Promise<AutoFihrisEntry[]> {
  const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
  const found: AutoFihrisEntry[] = [];
  try {
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const lines = content.items
        .map((item) => "str" in item ? item.str : "")
        .join(" ")
        .split(/\n+/)
        .map(cleanLine)
        .filter(Boolean);

      for (const line of lines) {
        if (!isHeading(line) || line.length > 180) continue;
        if (found.some((x) => x.title === line && x.pdfPage === pageNo)) continue;
        found.push({ title: line, pdfPage: pageNo, printedPage: printedNumber(line) });
      }
    }
  } finally {
    await pdf.destroy();
  }
  const unique = found.filter((item, i, arr) => arr.findIndex(x => x.title === item.title && x.pdfPage === item.pdfPage) === i);
  saveAutoFihris(bookId, unique);
  return unique;
}

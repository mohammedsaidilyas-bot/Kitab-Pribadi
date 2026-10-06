export type HasyiahCategory = "syarah" | "makna" | "dalil" | "muzakarah" | "faedah" | "tanbih" | "isyak" | "jawab";

export type HasyiahNote = {
  id: string;
  bookId: string;
  pdfPage: number;
  x: number;
  y: number;
  quotedText: string;
  note: string;
  teacher?: string;
  category: HasyiahCategory;
  createdAt: string;
  updatedAt: string;
};

const KEY = "kitab-pribadi-hasyiah";

export function loadHasyiah(): HasyiahNote[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function saveHasyiah(notes: HasyiahNote[]) {
  localStorage.setItem(KEY, JSON.stringify(notes));
}

export function addHasyiah(input: Omit<HasyiahNote, "id" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const note: HasyiahNote = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  saveHasyiah([note, ...loadHasyiah()]);
  return note;
}

export function notesForPage(bookId: string, pdfPage: number) {
  return loadHasyiah().filter(n => n.bookId === bookId && n.pdfPage === pdfPage);
}

import type { FihrisStatus } from "./fihrisEngineV3";

export type FihrisNode = {
  id: string;
  title: string;
  printedPage?: number;
  pdfPage: number;
  targetPdfPage?: number;
  status?: FihrisStatus;
  confidence?: number;
  validation?: "exact" | "near" | "unverified";
  kind: "kitab" | "bab" | "fasal" | "furu" | "tanbih" | "khatimah" | "other";
  parentId?: string;
  depth: number;
};

export function classifyFihris(title: string): FihrisNode["kind"] {
  const s = title.replace(/^[\s\u200f\u200e]+/, "").trim();
  if (/^(كتاب|الكتاب|كتب)\b/.test(s)) return "kitab";
  if (/^(باب|الأبواب|ابواب)\b/.test(s)) return "bab";
  if (/^(فصل|الفصل|فصول)\b/.test(s)) return "fasal";
  if (/^(فرع|الفروع|فروع)\b/.test(s)) return "furu";
  if (/^(تنبيه|فائدة|فوائد|مهم|مهمة|ملاحظة|مسألة|مسائل)\b/.test(s)) return "tanbih";
  if (/^(خاتمة|الخاتمة)\b/.test(s)) return "khatimah";
  return "other";
}

function depthOf(kind: FihrisNode["kind"], stack: FihrisNode[]) {
  if (kind === "other") return stack.length ? stack[stack.length - 1].depth : 0;
  const ranks: Record<FihrisNode["kind"], number> = {
    kitab: 0, bab: 1, fasal: 2, furu: 3, tanbih: 4, khatimah: 0, other: 0,
  };
  if (kind === "khatimah") return 0;
  const rank = ranks[kind];
  const previous = stack.length ? stack[stack.length - 1] : undefined;
  if (!previous) return 0;
  return Math.min(rank, previous.depth + 1);
}

export function buildFihrisHierarchy<T extends {
  title: string;
  pdfPage: number;
  printedPage?: number;
  targetPdfPage?: number;
  status?: FihrisStatus;
  confidence?: number;
  validation?: "exact" | "near" | "unverified";
}>(items: T[]): FihrisNode[] {
  const stack: FihrisNode[] = [];
  return items.map((item, index) => {
    const kind = classifyFihris(item.title);
    const depth = depthOf(kind, stack);
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack.length ? stack[stack.length - 1] : undefined;
    const node: FihrisNode = {
      id: `fihris-${index}-${item.pdfPage}-${item.printedPage ?? "x"}`,
      title: item.title,
      printedPage: item.printedPage,
      pdfPage: item.pdfPage,
      targetPdfPage: item.targetPdfPage,
      status: item.status,
      confidence: item.confidence,
      validation: item.validation,
      kind,
      depth,
      parentId: parent?.id,
    };
    if (kind !== "other") stack.push(node);
    return node;
  });
}

export function childrenOf(nodes: FihrisNode[], parentId?: string) {
  return nodes.filter(node => node.parentId === parentId);
}

export function validateHierarchy(nodes: FihrisNode[]) {
  const failures: Array<{ id: string; reason: string }> = [];
  const rank: Record<FihrisNode["kind"], number> = {
    kitab: 0, bab: 1, fasal: 2, furu: 3, tanbih: 4, khatimah: 0, other: 0,
  };
  for (const node of nodes) {
    if (node.parentId) {
      const parent = nodes.find(item => item.id === node.parentId);
      if (!parent) failures.push({ id: node.id, reason: "parent tidak ditemukan" });
      else if (node.kind !== "other" && parent.kind !== "other" && rank[node.kind] <= rank[parent.kind] && node.kind !== "khatimah") {
        failures.push({ id: node.id, reason: "urutan hierarki tidak valid" });
      }
    }
    if (node.depth < 0 || node.depth > 4) failures.push({ id: node.id, reason: "depth di luar rentang" });
  }
  return { passed: failures.length === 0, checked: nodes.length, failures };
}

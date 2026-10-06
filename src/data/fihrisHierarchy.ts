export type FihrisNode = {
  id: string;
  title: string;
  printedPage?: number;
  pdfPage: number;
  kind: "kitab" | "bab" | "fasal" | "furu" | "tanbih" | "khatimah" | "other";
  parentId?: string;
  depth: number;
};

export function classifyFihris(title: string): FihrisNode["kind"] {
  const s = title.replace(/^[\s\u200f\u200e]+/, "").trim();
  if (/^(كتاب|الكتاب)\b/.test(s)) return "kitab";
  if (/^(باب|الأبواب)\b/.test(s)) return "bab";
  if (/^(فصل|الفصل)\b/.test(s)) return "fasal";
  if (/^(فرع|الفروع)\b/.test(s)) return "furu";
  if (/^(تنبيه|فائدة|مهم|مهمة|ملاحظة)\b/.test(s)) return "tanbih";
  if (/^(خاتمة|الخاتمة)\b/.test(s)) return "khatimah";
  return "other";
}

function depthOf(kind: FihrisNode["kind"]) {
  return kind === "kitab" ? 0 : kind === "bab" ? 1 : kind === "fasal" ? 2 : kind === "furu" || kind === "tanbih" ? 3 : 0;
}

/**
 * Builds parent-child relationships from the ordered Fihris itself.
 * A heading is only attached to a preceding compatible ancestor;
 * it is never attached merely because its text happens to match.
 */
export function buildFihrisHierarchy<T extends { title: string; pdfPage: number; printedPage?: number }>(items: T[]): FihrisNode[] {
  const stack: FihrisNode[] = [];
  return items.map((item, index) => {
    const kind = classifyFihris(item.title);
    const depth = depthOf(kind);
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack.length ? stack[stack.length - 1] : undefined;
    const node: FihrisNode = {
      id: `fihris-${index}-${item.pdfPage}-${item.printedPage ?? "x"}`,
      title: item.title,
      printedPage: item.printedPage,
      pdfPage: item.pdfPage,
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

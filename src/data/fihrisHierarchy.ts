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

function depthOf(kind: FihrisNode["kind"], stack: FihrisNode[]) {
  if (kind === "other") return stack.length ? stack[stack.length - 1].depth : 0;
  const ranks: Record<FihrisNode["kind"], number> = {
    kitab: 0, bab: 1, fasal: 2, furu: 3, tanbih: 4, khatimah: 0, other: 0,
  };
  const rank = ranks[kind];
  const previous = stack.length ? stack[stack.length - 1] : undefined;
  if (!previous) return rank === 0 ? 0 : 0;
  if (kind === "khatimah") return 0;
  return Math.min(rank, previous.depth + 1);
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
    const depth = depthOf(kind, stack);
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

export function validateHierarchy(nodes: FihrisNode[]) {
  const failures: Array<{ id: string; reason: string }> = [];
  const rank: Record<FihrisNode["kind"], number> = {
    kitab: 0, bab: 1, fasal: 2, furu: 3, tanbih: 4, khatimah: 0, other: 0,
  };
  for (const node of nodes) {
    if (node.parentId) {
      const parent = nodes.find(item => item.id === node.parentId);
      if (!parent) {
        failures.push({ id: node.id, reason: "parent tidak ditemukan" });
      } else if (node.kind !== "other" && parent.kind !== "other" && rank[node.kind] <= rank[parent.kind] && node.kind !== "khatimah") {
        failures.push({ id: node.id, reason: "urutan hierarki tidak valid" });
      }
    }
    if (node.depth < 0 || node.depth > 4) {
      failures.push({ id: node.id, reason: "depth di luar rentang" });
    }
  }
  return { passed: failures.length === 0, checked: nodes.length, failures };
}

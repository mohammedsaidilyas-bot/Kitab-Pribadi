export type FihrisEntry = {
  title: string;
  printedPage: number;
  pdfPage: number;
};

const ENTRIES: FihrisEntry[] = [
  { title: "ترجمة المليباري صاحب المتن", printedPage: 3, pdfPage: 5 },
  { title: "ترجمة نووي الجاوي صاحب الشرح", printedPage: 3, pdfPage: 5 },
  { title: "خطبة الشارح", printedPage: 5, pdfPage: 7 },
  { title: "خطبة الكتاب", printedPage: 7, pdfPage: 9 },
  { title: "باب الصلاة", printedPage: 11, pdfPage: 13 },
  { title: "فصل في مسائل منثورة", printedPage: 15, pdfPage: 17 },
  { title: "فصل في كيفية الصلاة المتعلقة بواجب", printedPage: 55, pdfPage: 57 },
  { title: "فصل في سجود السهو", printedPage: 80, pdfPage: 82 },
  { title: "فصل في مفسدات الصلاة", printedPage: 88, pdfPage: 90 },
  { title: "فصل في سنن الصلاة المكتوبة قبل الدخول فيها", printedPage: 93, pdfPage: 95 },
  { title: "فصل في صلاة النفل", printedPage: 97, pdfPage: 99 },
  { title: "فصل في الجماعة في الصلاة", printedPage: 114, pdfPage: 116 },
  { title: "فصل في صلاة الجمعة", printedPage: 132, pdfPage: 134 },
  { title: "فصل في الجنائز", printedPage: 143, pdfPage: 145 },
  { title: "باب ما يحرم استعماله من الملابس والحلي وما لا يحرم", printedPage: 161, pdfPage: 163 },
  { title: "باب الزكاة", printedPage: 164, pdfPage: 166 },
  { title: "فصل في أداء الزكاة", printedPage: 173, pdfPage: 175 },
  { title: "باب الصوم", printedPage: 180, pdfPage: 182 },
  { title: "فصل في صوم التطوع", printedPage: 191, pdfPage: 193 },
  { title: "باب الاعتكاف", printedPage: 193, pdfPage: 195 },
  { title: "باب الحج والعمرة", printedPage: 196, pdfPage: 198 },
  { title: "فصل في محظورات النسك", printedPage: 209, pdfPage: 211 },
  { title: "فرع في أحكام المنذور", printedPage: 216, pdfPage: 218 },
  { title: "باب البيع", printedPage: 219, pdfPage: 221 },
  { title: "فصل في الخيار", printedPage: 227, pdfPage: 229 },
  { title: "فصل في حكم البيع والثمن قبل قبضهما وبعده وبيان القبض", printedPage: 230, pdfPage: 232 },
  { title: "فصل في بيع الأرض والشجر والثمار", printedPage: 232, pdfPage: 234 },
  { title: "فصل في اختلاف العاقدين، وفي التحالف", printedPage: 234, pdfPage: 236 },
  { title: "فصل في القرض والرهن", printedPage: 235, pdfPage: 237 },
  { title: "فصل في الحجر", printedPage: 242, pdfPage: 244 },
  { title: "فصل في الحوالة", printedPage: 243, pdfPage: 245 },
  { title: "باب في الوكالة والقراض", printedPage: 245, pdfPage: 247 },
  { title: "فصل في الشفعة", printedPage: 252, pdfPage: 254 },
  { title: "باب في الإجارة", printedPage: 252, pdfPage: 254 },
  { title: "باب في العارية", printedPage: 257, pdfPage: 259 },
  { title: "فصل في الغصب", printedPage: 259, pdfPage: 261 },
  { title: "باب في مطلق الهبة", printedPage: 260, pdfPage: 262 },
  { title: "باب في الوقف", printedPage: 263, pdfPage: 265 },
  { title: "باب في الإقرار", printedPage: 268, pdfPage: 270 },
  { title: "باب الفرائض", printedPage: 277, pdfPage: 279 },
  { title: "فصل في أصول المسائل وبيان ما يعول منها", printedPage: 286, pdfPage: 288 },
  { title: "فصل في الوديعة", printedPage: 291, pdfPage: 293 },
  { title: "فصل في اللقطة", printedPage: 292, pdfPage: 294 },
  { title: "باب النكاح", printedPage: 294, pdfPage: 296 },
  { title: "فصل في الكفاءة", printedPage: 306, pdfPage: 308 },
  { title: "فصل في نكاح من فيها رق", printedPage: 307, pdfPage: 309 },
  { title: "فصل في الصداق", printedPage: 308, pdfPage: 310 },
  { title: "فصل في القسم والنشوز وعشرة النساء", printedPage: 311, pdfPage: 313 },
  { title: "فصل في الخلع", printedPage: 313, pdfPage: 315 },
  { title: "فصل في الطلاق", printedPage: 315, pdfPage: 317 },
  { title: "فصل في الرجعة", printedPage: 320, pdfPage: 322 },
  { title: "فصل في العدة", printedPage: 322, pdfPage: 324 },
  { title: "فصل في النفقة والكسوة والإسكان", printedPage: 327, pdfPage: 329 },
  { title: "باب الجناية", printedPage: 334, pdfPage: 336 },
  { title: "باب في الردة", printedPage: 339, pdfPage: 341 },
  { title: "باب الحدود", printedPage: 341, pdfPage: 343 },
  { title: "فصل في التعزير", printedPage: 350, pdfPage: 352 },
  { title: "فصل في الصيال", printedPage: 351, pdfPage: 353 },
  { title: "باب الجهاد", printedPage: 354, pdfPage: 356 },
  { title: "باب القضاء", printedPage: 361, pdfPage: 363 },
  { title: "باب الدعوى والبينات", printedPage: 369, pdfPage: 371 },
  { title: "فصل في جواب الدعوى من المدعى عليه وما يتعلق بالجواب", printedPage: 372, pdfPage: 374 },
  { title: "فصل في بيان قدر النصاب في الشهود المختلف باختلاف المشهود به وفي بيان شروطهم", printedPage: 376, pdfPage: 378 },
  { title: "باب في بيان العتق الاختياري والإجباري", printedPage: 388, pdfPage: 390 },
  { title: "خاتمة الكتاب", printedPage: 396, pdfPage: 398 },
  { title: "فهرس المحتويات", printedPage: 397, pdfPage: 399 },
];

export function getFihrisForBook(title: string): FihrisEntry[] {
  const normalized = title.replace(/\.pdf$/i, "").trim();
  return /نهاية\s+الزين/i.test(normalized) ? ENTRIES : [];
}


export type FihrisRegressionCase = FihrisEntry & { expectedOffset: number };

export const NAYATUZ_ZAIN_REGRESSION: FihrisRegressionCase[] = ENTRIES
  .filter(entry => entry.title !== "فهرس المحتويات")
  .map(entry => ({ ...entry, expectedOffset: entry.pdfPage - entry.printedPage }));

export function validateFihrisRegression(entries: FihrisEntry[]) {
  const failures: Array<{ title: string; expected: number; actual?: number }> = [];
  for (const expected of NAYATUZ_ZAIN_REGRESSION) {
    const actual = entries.find(e => e.title === expected.title && e.printedPage === expected.printedPage);
    if (!actual || actual.pdfPage - actual.printedPage !== expected.expectedOffset) {
      failures.push({ title: expected.title, expected: expected.pdfPage, actual: actual?.pdfPage });
    }
  }
  return { passed: failures.length === 0, checked: NAYATUZ_ZAIN_REGRESSION.length, failures };
}


export type FihrisQualityReport = {
  status: "lulus" | "perlu-review" | "bermasalah";
  pageChecked: number;
  hierarchyChecked: number;
  pageFailures: number;
  hierarchyFailures: number;
};

export function buildFihrisQualityReport(
  entries: FihrisEntry[],
  hierarchyReport: { passed: boolean; checked: number; failures: unknown[] },
) : FihrisQualityReport {
  const pageFailures = entries.filter(entry => entry.pdfPage <= 0 || entry.printedPage <= 0).length;
  const hierarchyFailures = hierarchyReport.failures.length;
  const status = pageFailures > 0 || hierarchyFailures > 0
    ? "bermasalah"
    : entries.length === 0 || !hierarchyReport.passed
      ? "perlu-review"
      : "lulus";
  return {
    status,
    pageChecked: entries.length,
    hierarchyChecked: hierarchyReport.checked,
    pageFailures,
    hierarchyFailures,
  };
}

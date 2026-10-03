export interface ContentCategoryStat {
  level1: string;
  level2: string;
  knowledgeCount: number;
  classicsCount: number;
  tutorialCount: number;
  totalCount: number;
  healthScore: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

/** 统计接口返回 details；totalCategories 是一级品类数，不能用作二级品类总数。 */
export function readContentCategoryStats(value: unknown) {
  const payload = isRecord(value) ? value : {};
  const details = Array.isArray(payload.details) ? payload.details : [];
  const rows: ContentCategoryStat[] = details.flatMap((item) => {
    if (!isRecord(item) || typeof item.level1 !== "string" || typeof item.level2 !== "string") return [];
    return [{
      level1: item.level1,
      level2: item.level2,
      knowledgeCount: count(item.knowledgeCount),
      classicsCount: count(item.classicsCount),
      tutorialCount: count(item.tutorialCount),
      totalCount: count(item.totalCount),
      healthScore: Math.min(100, count(item.healthScore)),
    }];
  });
  return { rows, totalGeneratedToday: count(payload.totalGeneratedToday) };
}

export function readCategoryTree(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].every((item) => typeof item === "string"))
    .map(([name, children]) => [name, [...children]]));
}

/** 保存前拒绝空名和同级重名，避免对象键覆盖导致品类静默丢失。 */
export function buildCategoryTreePayload(
  tree: Record<string, string[]>,
  names: Record<string, string>,
): Record<string, string[]> {
  if (Object.keys(tree).length === 0) throw new Error("请至少保留一个一级品类");
  const result: Record<string, string[]> = Object.create(null);
  for (const [oldName, children] of Object.entries(tree)) {
    const name = (names[oldName] ?? oldName).trim();
    if (!name) throw new Error("一级品类名称不能为空");
    if (["__proto__", "prototype", "constructor"].includes(name)) throw new Error("请使用有效的品类名称");
    if (Object.prototype.hasOwnProperty.call(result, name)) throw new Error(`一级品类「${name}」重复，请使用不同名称`);
    if (children.length === 0) throw new Error(`「${name}」至少需要一个二级品类`);
    const normalized = children.map((child) => child.trim());
    if (normalized.some((child) => !child)) throw new Error(`「${name}」存在空的二级品类，请填写或移除`);
    if (new Set(normalized).size !== normalized.length) throw new Error(`「${name}」存在重复的二级品类`);
    result[name] = normalized;
  }
  return result;
}

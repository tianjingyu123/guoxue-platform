/** 开源姓名样本的名字出现次数；只作样本内热度参考。 */
import nameUsage from "./data/name-usage.json"

const SAMPLE = nameUsage as { _meta: { records: number }; given: Record<string, number> }

export function nameSampleHeat(given: string): { level: "low" | "mid" | "high"; count: number | null; note: string } {
  if ([...given].length > 2) {
    return { level: "low", count: null, note: "开源姓名样本统计只覆盖一至二字的名；此名暂无可比样本，不能据此推算全国重名率。" }
  }
  // 为控制数据量，仅保留出现 ≥10 次的名字；少于 10 次一律显示为区间。
  const count = SAMPLE.given[given] ?? null
  const level = count === null ? "low" : count >= 100 ? "high" : "mid"
  const observed = count === null ? "不足 10 次" : `${count} 次`
  return {
    level,
    count,
    note: `在 ${SAMPLE._meta.records.toLocaleString("zh-CN")} 条开源姓名样本中，名「${given}」出现${observed}。样本年代与性别分布不均，不能据此推算全国重名率。`,
  }
}

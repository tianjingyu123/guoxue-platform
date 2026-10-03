import { apiPostOptionalAuth } from '@/utils/request'

/**
 * 服务端排盘计算（第 4 步防抄：算法只在服务端运行，前端包里不再有引擎源码）
 *
 * 入参一律传「墙上时间」分量（year/month/day/hour/minute），服务端在北京时区下构造 Date，
 * 与原先前端本地计算的结果逐次一致（见 apps/server/test/paipan-engine-golden.spec.ts）。
 */
export function computePaipan<T>(tool: string, input: Record<string, unknown>): Promise<T> {
  return apiPostOptionalAuth<T>(`/paipan/engine/${tool}`, input, undefined, 15000)
}

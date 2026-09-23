/**
 * 排盘引擎时区锁：在 Asia/Shanghai 下同步执行引擎。
 *
 * 为什么需要：迁自前端的引擎大量使用 Date 本地时间 getter（getHours/getDate…），
 * 在手机上它们按北京时间运行；服务端进程时区不可控（pm2 未设 TZ），
 * 且服务端已有代码按「进程跑在 UTC」写死了 +8h（如 coin.service），**不能全局改进程时区**。
 *
 * 做法：引擎全是同步函数，JS 单线程——切 TZ → 同步执行 → 恢复，期间不会有其它请求插入。
 * 实测单次切换往返约 11µs。
 *
 * ⚠️ 坑：原本未设 TZ 时，`delete process.env.TZ` 回不到系统时区而是落到 UTC，
 * 所以启动时取出系统时区名，恢复时按名写回。
 */
export const ENGINE_TZ = "Asia/Shanghai";

const PROCESS_TZ: string = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;

export function withEngineTz<T>(fn: () => T): T {
  const prev = process.env.TZ;
  process.env.TZ = ENGINE_TZ;
  try {
    const out = fn();
    if (out && typeof (out as { then?: unknown }).then === "function") {
      // 异步引擎会在 TZ 恢复后才继续执行，结果不可信 —— 直接拒绝
      throw new TypeError("排盘引擎必须是同步函数");
    }
    return out;
  } finally {
    process.env.TZ = prev ?? PROCESS_TZ;
  }
}

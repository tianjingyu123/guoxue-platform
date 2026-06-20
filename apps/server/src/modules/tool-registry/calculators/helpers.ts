/**
 * 计算器共享辅助函数
 * - 确定性选择（替代 Math.random）
 * - 笔画兜底（替代 charCodeAt % N）
 */
import * as crypto from "crypto";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

/** 确定性从数组中选取元素，基于 seed（数字或字符串）取模 */
export function seededPick<T>(arr: T[], seed?: number | string): T {
  if (!arr || arr.length === 0) {
    throw new BusinessException(ErrorCode.VALIDATION_ERROR, "seededPick: 数组不能为空");
  }
  if (seed === undefined || seed === null) {
    // 无 seed 时用时间戳毫秒位作为种子（确定性但随时间变化）
    seed = Date.now();
  }
  let n: number;
  if (typeof seed === "string") {
    n = seed.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  } else {
    n = Math.abs(Math.floor(seed));
  }
  return arr[n % arr.length];
}

/** Fisher-Yates 洗牌，使用 crypto 强随机（替代 Math.random 洗牌） */
export function cryptoShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  const bytes = crypto.randomBytes(result.length * 4);
  for (let i = result.length - 1; i > 0; i--) {
    const j = bytes.readUInt32BE(i * 4) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 确定性洗牌，基于 seed（相同 seed 产生相同顺序） */
export function seededShuffle<T>(arr: T[], seed: number | string): T[] {
  const result = [...arr];
  let s: number;
  if (typeof seed === "string") {
    s = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  } else {
    s = Math.abs(Math.floor(seed));
  }
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Unicode 汉字区间估算笔画兜底（不依赖 charCodeAt % N），基于 Unicode 码点分布估算常用字笔画 */
export function estimateStrokeByUnicode(char: string): number {
  const code = char.charCodeAt(0);
  // CJK统一汉字区间
  if (code >= 0x4e00 && code <= 0x9fff) {
    return Math.min(24, Math.max(1, Math.ceil((code - 0x4e00) / 1200) + 3));
  }
  // CJK扩展A区
  if (code >= 0x3400 && code <= 0x4dbf) {
    return Math.min(24, Math.max(1, Math.ceil((code - 0x3400) / 800) + 5));
  }
  return 4; // 非汉字默认4画
}

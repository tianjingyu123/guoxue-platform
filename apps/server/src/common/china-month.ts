const CHINA_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

/** 北京时间本月 1 日零点对应的 UTC 时刻，不依赖容器本地时区。 */
export function chinaMonthStartUtc(now = new Date()): Date {
  const chinaNow = new Date(now.getTime() + CHINA_UTC_OFFSET_MS);
  return new Date(
    Date.UTC(chinaNow.getUTCFullYear(), chinaNow.getUTCMonth(), 1) - CHINA_UTC_OFFSET_MS,
  );
}

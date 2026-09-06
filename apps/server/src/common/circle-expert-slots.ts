type BusySlot = { start: string; end: string };
export type ExpertSlot = BusySlot & { available: boolean };
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DAY_LABELS: Record<string, number> = {
  sun: 0, sunday: 0, "周日": 0, "周天": 0, "星期日": 0, "星期天": 0,
  mon: 1, monday: 1, "周一": 1, "星期一": 1,
  tue: 2, tuesday: 2, "周二": 2, "星期二": 2,
  wed: 3, wednesday: 3, "周三": 3, "星期三": 3,
  thu: 4, thursday: 4, "周四": 4, "星期四": 4,
  fri: 5, friday: 5, "周五": 5, "星期五": 5,
  sat: 6, saturday: 6, "周六": 6, "星期六": 6,
};

function matchesDay(value: unknown, date: string, weekday: number): boolean {
  if (typeof value !== "string" && typeof value !== "number") return false;
  const day = String(value).trim().toLowerCase();
  if (day === date) return true;
  if (/^[0-7]$/.test(day)) return Number(day) % 7 === weekday;
  return Object.prototype.hasOwnProperty.call(DAY_LABELS, day) && DAY_LABELS[day] === weekday;
}

/** 同一份配置同时决定展示时段与服务端可下单时段；坏配置不生成默认9—18点。 */
export function buildExpertSlots(raw: unknown, targetDate: string, busy: BusySlot[] = []): ExpertSlot[] {
  const date = new Date(`${targetDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== targetDate) return [];
  // 技术边界：避免畸形存量配置造成无界展开，不代替业务配额。
  if (!Array.isArray(raw) || raw.length > 64) return [];
  const weekday = date.getUTCDay();
  const slots = new Map<string, ExpertSlot>();
  const minute = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const format = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const h = entry as Record<string, unknown>;
    if (h.days !== undefined) {
      if (!Array.isArray(h.days) || !h.days.some(day => matchesDay(day, targetDate, weekday))) continue;
    } else if (h.day !== undefined && !matchesDay(h.day, targetDate, weekday)) continue;
    if (typeof h.start !== "string" || typeof h.end !== "string" || !TIME.test(h.start) || !TIME.test(h.end)) continue;
    const start = minute(h.start), end = minute(h.end), interval = h.interval ?? 60;
    if (typeof interval !== "number" || !Number.isInteger(interval) || interval < 1 || interval > 1440 || start >= end) continue;
    for (let from = start; from + interval <= end; from += interval) {
      const slotStart = format(from), slotEnd = format(from + interval);
      slots.set(`${slotStart}-${slotEnd}`, {
        start: slotStart, end: slotEnd,
        available: !busy.some(slot => slot.start < slotEnd && slot.end > slotStart),
      });
    }
  }
  return [...slots.values()].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
}

import { calcSiZhu, type BaziInput } from "@guoxue/bazi-engine";
import { Solar } from "./engine/vendor/lunar";

const GANS = "甲乙丙丁戊己庚辛壬癸";
const ZHIS = "子丑寅卯辰巳午未申酉戌亥";
const JIA_ZI = new Set(Array.from({ length: 60 }, (_, i) => GANS[i % 10] + ZHIS[i % 12]));
const START_YEAR = 1900;

export interface BaziReversePillars {
  year: string;
  month: string;
  day: string;
  hour: string;
  ziShiMode: "traditional" | "modern";
}

export interface BaziReverseCandidate {
  year: number;
  month: number;
  day: number;
  hours: { hour: number; minutes: number[] }[];
}

function matches(input: BaziInput, pillars: BaziReversePillars): boolean {
  const chart = calcSiZhu(input);
  return chart.nian.gan + chart.nian.zhi === pillars.year
    && chart.yue.gan + chart.yue.zhi === pillars.month
    && chart.ri.gan + chart.ri.zhi === pillars.day
    && chart.shi.gan + chart.shi.zhi === pillars.hour;
}

/**
 * 旧历库只反查到运行当年，且它与平台八字引擎的节气边界可能不同。
 * 因此旧库只提供候选公历日；可选时分逐个由实际出盘的引擎复核。
 * 本接口不推断出生时刻，也不把夏令时或真太阳时校正悄悄套在反查结果上。
 */
export function reverseBaziPillars(pillars: BaziReversePillars, endYear = new Date().getFullYear()) {
  const toYear = Math.min(endYear, new Date().getFullYear());
  if (![pillars.year, pillars.month, pillars.day, pillars.hour].every((value) => JIA_ZI.has(value))) {
    return { fromYear: START_YEAR, toYear, candidates: [] as BaziReverseCandidate[] };
  }

  const sect = pillars.ziShiMode === "traditional" ? 1 : 2;
  const seeds = Solar.fromBaZi(pillars.year, pillars.month, pillars.day, pillars.hour, sect, START_YEAR) as Array<{
    getYear(): number; getMonth(): number; getDay(): number;
  }>;
  const dates = new Map<string, { year: number; month: number; day: number }>();
  for (const seed of seeds) {
    // 晚子换日及两引擎节气交界可能让旧库的代表日期差一天。
    for (const offset of [-1, 0, 1]) {
      const date = new Date(Date.UTC(seed.getYear(), seed.getMonth() - 1, seed.getDay() + offset));
      const year = date.getUTCFullYear();
      if (year < START_YEAR || year > toYear) continue;
      const month = date.getUTCMonth() + 1;
      const day = date.getUTCDate();
      dates.set(`${year}-${month}-${day}`, { year, month, day });
    }
  }

  const zhi = pillars.hour[1];
  const branch = ZHIS.indexOf(zhi);
  const possibleHours = branch === 0 ? [0, 23] : [branch * 2 - 1, branch * 2];
  const candidates: BaziReverseCandidate[] = [];
  for (const date of dates.values()) {
    const hours = possibleHours.map((hour) => {
      const minutes: number[] = [];
      for (let minute = 0; minute < 60; minute++) {
        if (matches({
          name: "", gender: "男", ...date, hour, minute,
          ziShiMode: pillars.ziShiMode, useTrueSolarTime: false, useDaylightSaving: false,
        }, pillars)) minutes.push(minute);
      }
      return { hour, minutes };
    }).filter((item) => item.minutes.length > 0);
    if (hours.length > 0) candidates.push({ ...date, hours });
  }
  candidates.sort((a, b) => a.year - b.year || a.month - b.month || a.day - b.day);
  return { fromYear: START_YEAR, toYear, candidates };
}

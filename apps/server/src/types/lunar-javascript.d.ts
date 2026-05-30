declare module "lunar-javascript" {
  export class Solar {
    static fromDate(date: Date): Solar;
    static fromYmd(year: number, month: number, day: number): Solar;
    getLunar(): Lunar;
  }

  export class Lunar {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getSecond(): number;
    getYearGan(): string;
    getYearZhi(): string;
    getYearInGanZhi(): string;
    getYearShengXiao(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getMonthInGanZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getDayInGanZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getTimeInGanZhi(): string;
    getJieQi(): string;
    getXiu(): string;
    getXiuLuck(): string;
    getXiuSong(): string;
    getZhiXing(): string;
    getDayYi(): string[];
    getDayJi(): string[];
    getDayJiShen(): string[];
    getDayXiongSha(): string[];
    getDayNaYin(): string;
    getPengZuGan(): string;
    getPengZuZhi(): string;
    getChong(): string;
    getSha(): string;
    getDayChong(): string;
    getDayChongGan(): string;
    getDayChongShengXiao(): string;
    getDayChongDesc(): string;
    getDaySha(): string;
    getDayPositionTai(): string;
    getMonthPositionTai(): string;
    getYearPositionTaiSui(): string;
    getDayPositionTaiSui(): string;
    getFestivals(): string[];
    getOtherFestivals(): string[];
    getShengxiao(): string;
    getJie(): string;
    getCurrentJieQi(): { name: string };
    getNextJieQi(): { name: string; month: number; day: number };
    getPrevJieQi(): { name: string; month: number; day: number };
    getWeek(): number;
    getWeekInChinese(): string;
    getDayTianShen(): string;
    getDayTianShenType(): string;
    getDayTianShenLuck(): string;
    getTimeTianShen(): string;
    getTimeTianShenType(): string;
    getTimeTianShenLuck(): string;
    getShuJiu(): string;
    getFoto(): string;
    getTao(): string;
  }
}

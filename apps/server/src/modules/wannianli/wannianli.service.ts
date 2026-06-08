/**
 * 万年历中央数据层 - 缓存服务
 *
 * 三级缓存策略：
 *   热数据（今天±7天） — Redis 1h TTL
 *   查询结果（日期范围） — Redis 24h TTL
 *   全年数据 — Redis 7d TTL
 *
 * 天文计算入表（节气/农历/干支/二十八宿），干支推导留算法（建除/纳音/时辰干支）
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const WEEK_DAYS = ["星期日","星期一","星期二","星期三","星期四","星期五","星期六"];
const NA_YIN = [
  "海中金","炉中火","大林木","路旁土","剑锋金","山头火",
  "涧下水","城头土","白蜡金","杨柳木","泉中水","屋上土",
  "霹雳火","松柏木","流年水","沙中金","山下火","平地木",
  "壁上土","金箔金","覆灯火","天河水","大驿土","钗环金",
  "桑柘木","柘榴木","大海水","石榴木","大海水",
];
const SHENG_XIAO = ["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"];
const JIAN_CHU = ["建","除","满","平","定","执","破","危","成","收","开","闭"];

export interface WanNianLiDayRow {
  solarDate: Date;
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  isLeap: boolean;
  nianGan: string;
  nianZhi: string;
  yueGan: string;
  yueZhi: string;
  riGan: string;
  riZhi: string;
  lunarYearGZ: string;
  lunarMonthGZ: string;
  lunarDayGZ: string;
  jieQi: string | null;
  erShiBaXiu: string;
  shengXiao: string;
  weekDay: number;
}

export interface DayDetail {
  solarDate: string;
  lunarDate: string;
  nianGanZhi: string;
  yueGanZhi: string;
  riGanZhi: string;
  shiGanZhi: string[];
  weekDay: string;
  jieQi?: string;
  lunarMonth: string;
  lunarDay: string;
  isLeap: boolean;
  jianChu: string;
  erShiBaXiu: string;
  naYin: string;
  jiuXing: string;
  zhiShen: string;
  pengZu: string;
  taiShen: string;
  chongSha: string;
  suiSha: string;
  yi: string[];
  ji: string[];
  jiShen: string[];
  xiongSha: string[];
  shiChenJiXiong: any[];
  score: number;
}

const CACHE_TTL = {
  hotData: 3600,       // 1h：热数据（今天±7天）
  query: 86400,        // 24h：查询结果
  fullYear: 604800,    // 7d：全年数据
};

@Injectable()
export class WannianliService {
  private readonly logger = new Logger(WannianliService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ═══ 单日查询 ═══

  async getByDate(date: Date): Promise<WanNianLiDayRow | null> {
    const key = `wl:day:${this.ds(date)}`;
    const cached = await this.redis.getJson<WanNianLiDayRow>(key);
    if (cached) return cached;

    const row = await this.prisma.wanNianLiDay.findUnique({
      where: { solarDate: date },
    });
    if (row) {
      await this.redis.setJson(key, row, CACHE_TTL.hotData);
    }
    return row;
  }

  /** 获取今日数据（以 Asia/Shanghai 时区为准） */
  async getToday(): Promise<WanNianLiDayRow | null> {
    const now = new Date();
    const shanghai = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    const today = new Date(Date.UTC(shanghai.getFullYear(), shanghai.getMonth(), shanghai.getDate()));
    return this.getByDate(today);
  }

  // ═══ 日期范围查询 ═══

  async getByDateRange(start: Date, end: Date): Promise<WanNianLiDayRow[]> {
    const key = `wl:range:${this.ds(start)}:${this.ds(end)}`;
    const cached = await this.redis.getJson<WanNianLiDayRow[]>(key);
    if (cached) return cached;

    const rows = await this.prisma.wanNianLiDay.findMany({
      where: { solarDate: { gte: start, lte: end } },
      orderBy: { solarDate: "asc" },
    });

    if (rows.length > 0) {
      // 小范围用热数据TTL，大范围用查询TTL
      const days = Math.ceil((end.getTime() - start.getTime()) / 86400000);
      const ttl = days <= 30 ? CACHE_TTL.hotData : CACHE_TTL.query;
      await this.redis.setJson(key, rows, ttl);
    }
    return rows;
  }

  // ═══ 农历年月查询 ═══

  async getByLunarYearMonth(lunarYear: number, lunarMonth: number, includeLeap = true): Promise<WanNianLiDayRow[]> {
    const key = `wl:lunar:${lunarYear}:${lunarMonth}`;
    const cached = await this.redis.getJson<WanNianLiDayRow[]>(key);
    if (cached) return cached;

    const where: any = { lunarYear, lunarMonth };
    if (!includeLeap) where.isLeap = false;

    const rows = await this.prisma.wanNianLiDay.findMany({
      where,
      orderBy: { solarDate: "asc" },
    });

    if (rows.length > 0) {
      await this.redis.setJson(key, rows, CACHE_TTL.query);
    }
    return rows;
  }

  // ═══ 全年数据 ═══

  async getFullYear(year: number): Promise<WanNianLiDayRow[]> {
    const key = `wl:year:${year}`;
    const cached = await this.redis.getJson<WanNianLiDayRow[]>(key);
    if (cached) return cached;

    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));

    const rows = await this.prisma.wanNianLiDay.findMany({
      where: { solarDate: { gte: start, lt: end } },
      orderBy: { solarDate: "asc" },
    });

    if (rows.length > 0) {
      await this.redis.setJson(key, rows, CACHE_TTL.fullYear);
    }
    return rows;
  }

  // ═══ 节气查询 ═══

  async getJieQiByYear(year: number): Promise<{ name: string; date: string; time: string }[]> {
    const key = `wl:jieqi:${year}`;
    const cached = await this.redis.getJson<{ name: string; date: string; time: string }[]>(key);
    if (cached) return cached;

    const rows = await this.prisma.wanNianLiDay.findMany({
      where: { solarDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) }, jieQi: { not: null } },
      orderBy: { solarDate: "asc" },
      select: { solarDate: true, jieQi: true },
    });

    // 需要从 bazi-engine 获取精确时刻，这里只返回日期
    const result = rows.map(r => ({
      name: r.jieQi!,
      date: r.solarDate.toISOString().slice(0, 10),
      time: "00:00:00", // 精确时刻需查 bazi-engine，此处占位
    }));

    if (result.length > 0) {
      await this.redis.setJson(key, result, CACHE_TTL.fullYear);
    }
    return result;
  }

  // ═══ 干支推导（留算法，不存表） ═══

  /** 时柱干支（日上起时，五鼠遁） */
  hourGanZhi(dayGan: string, shiZhiIdx: number): string {
    const dIdx = TIAN_GAN.indexOf(dayGan);
    const baseGan = [0, 2, 4, 6, 8][Math.floor(dIdx / 2)];
    return TIAN_GAN[(baseGan + shiZhiIdx) % 10] + DI_ZHI[shiZhiIdx];
  }

  /** 建除值日 */
  jianChuValue(yueZhi: string, riZhi: string): string {
    const mIdx = DI_ZHI.indexOf(yueZhi);
    const dIdx = DI_ZHI.indexOf(riZhi);
    return JIAN_CHU[(dIdx - mIdx + 12) % 12];
  }

  /** 纳音 */
  naYinValue(nianGan: string, nianZhi: string): string {
    const g = TIAN_GAN.indexOf(nianGan);
    const z = DI_ZHI.indexOf(nianZhi);
    return NA_YIN[(Math.floor(g / 2) * 6 + Math.floor(z / 2)) % 30] ?? "未知";
  }

  /** 彭祖百忌 */
  pengZu(riGan: string, riZhi: string): string {
    const ganMap: Record<string, string> = {
      "甲":"甲不开仓财物耗散","乙":"乙不栽植千株不长","丙":"丙不修灶必见灾殃","丁":"丁不剃头头必生疮",
      "戊":"戊不受田田主不祥","己":"己不破券二比并亡","庚":"庚不经络织机虚张","辛":"辛不合酱主人不尝",
      "壬":"壬不泱水更难提防","癸":"癸不词讼理弱敌强",
    };
    const zhiMap: Record<string, string> = {
      "子":"子不问卜自惹祸殃","丑":"丑不冠带主不还乡","寅":"寅不祭祀神鬼不尝","卯":"卯不穿井水泉不通",
      "辰":"辰不哭泣必主重丧","巳":"巳不远行财物伏藏","午":"午不苫盖屋主更张","未":"未不服药毒气入肠",
      "申":"申不安床鬼祟入房","酉":"酉不宴客醉坐颠狂","戌":"戌不吃犬作怪上床","亥":"亥不嫁娶不利新郎",
    };
    return `${ganMap[riGan] ?? ""} ${zhiMap[riZhi] ?? ""}`.trim();
  }

  /** 冲煞 */
  chongSha(riZhi: string): string {
    const idx = DI_ZHI.indexOf(riZhi);
    const chongIdx = (idx + 6) % 12;
    const directions = ["南","东","北","西"];
    return `冲${SHENG_XIAO[chongIdx]}（${TIAN_GAN[chongIdx % 10]}${DI_ZHI[chongIdx]}）煞${directions[Math.floor(chongIdx / 3) % 4]}`;
  }

  // ═══ 构建单日详情（查表 + 算法推导） ═══

  buildDayDetail(row: WanNianLiDayRow): DayDetail {
    const d = row.solarDate instanceof Date ? row.solarDate : new Date(row.solarDate as unknown as string);
    const dStr = d instanceof Date && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : String(row.solarDate || "").slice(0, 10);
    const jc = this.jianChuValue(row.yueZhi, row.riZhi);

    // 12时辰干支
    const shiGanZhi: string[] = [];
    for (let h = 0; h < 12; h++) {
      shiGanZhi.push(this.hourGanZhi(row.riGan, h));
    }

    // 从数据库获取的数据
    const nianGZ = row.nianGan + row.nianZhi;
    const yueGZ = row.yueGan + row.yueZhi;
    const riGZ = row.riGan + row.riZhi;
    const naYin = this.naYinValue(row.nianGan, row.nianZhi);
    const pengZu = this.pengZu(row.riGan, row.riZhi);
    const chongSha = this.chongSha(row.riZhi);

    return {
      solarDate: dStr,
      lunarDate: `${row.lunarYearGZ}年${row.isLeap ? "闰" : ""}${row.lunarMonth}月${row.lunarDay}日`,
      nianGanZhi: nianGZ,
      yueGanZhi: yueGZ,
      riGanZhi: riGZ,
      shiGanZhi,
      weekDay: WEEK_DAYS[row.weekDay],
      jieQi: row.jieQi ?? undefined,
      lunarMonth: `${row.lunarMonthGZ}月（${row.isLeap ? "闰" : ""}${row.lunarMonth}月）`,
      lunarDay: `${row.lunarDayGZ}日（${row.lunarDay}日）`,
      isLeap: row.isLeap,
      jianChu: jc,
      erShiBaXiu: row.erShiBaXiu,
      naYin,
      jiuXing: String((row.weekDay + 1) % 9 + 1),
      zhiShen: this.zhiShen(row.riZhi),
      pengZu,
      taiShen: this.taiShen(row.riZhi),
      chongSha,
      suiSha: "岁煞南",
      yi: this.getYi(jc),
      ji: this.getJi(jc),
      jiShen: this.getJiShen(jc),
      xiongSha: this.getXiongSha(jc),
      shiChenJiXiong: [],
      score: this.calcDayScore(jc),
    };
  }

  // ═══ 黄历规则（算法推导） ═══

  private zhiShen(dayZhi: string): string {
    const map: Record<string, string> = {
      "子":"金匮","丑":"天德","寅":"白虎","卯":"玉堂",
      "辰":"天牢","巳":"玄武","午":"司命","未":"勾陈",
      "申":"青龙","酉":"明堂","戌":"天刑","亥":"朱雀",
    };
    return map[dayZhi] ?? "未知";
  }

  private taiShen(dayZhi: string): string {
    const map: Record<string, string> = {
      "子":"碓磨房外正北","丑":"厕厨东南","寅":"碓磨炉外西北",
      "卯":"厨灶门外正东","辰":"厨灶炉外正东","巳":"碓磨炉灶占大门",
      "午":"厨灶碓房内正南","未":"仓房厕外正南","申":"碓磨炉外正西",
      "酉":"厨灶门外正西","戌":"厨灶炉外西北","亥":"厨灶床外西北",
    };
    return map[dayZhi] ?? "未知";
  }

  private getYi(jc: string): string[] {
    const map: Record<string, string[]> = {
      "建":["出行","开市","祭祀","祈福"],"除":["祭祀","祈福","出行","开市","上书"],
      "满":["祭祀","祈福","嫁娶","动土","开市"],"平":["出行","开市","交易","移徙"],
      "定":["祭祀","祈福","裁衣","订婚"],"执":["祭祀","祈福","出行"],
      "破":["求医","治病","拆卸","扫除"],"危":["祭祀","祈福","交易","立券"],
      "成":["嫁娶","开市","交易","立券","移徙"],"收":["祭祀","祈福","开市","交易"],
      "开":["嫁娶","开市","出行","移徙","入宅"],"闭":["祭祀","祈福","补垣","塞穴"],
    };
    return map[jc] ?? [];
  }

  private getJi(jc: string): string[] {
    const map: Record<string, string[]> = {
      "建":["安葬","行丧"],"除":["嫁娶","安葬"],
      "满":["安葬","行丧","求医"],"平":["嫁娶","安葬"],
      "定":["出行","嫁娶","开市"],"执":["开市","动土","嫁娶"],
      "破":["嫁娶","出行","开市"],"危":["嫁娶","开市","动土"],
      "成":["诉讼","求医"],"收":["嫁娶","安葬","行丧"],
      "开":["安葬","行丧"],"闭":["嫁娶","出行","开市"],
    };
    return map[jc] ?? [];
  }

  private getJiShen(jc: string): string[] {
    const map: Record<string, string[]> = {
      "建":["月德","要安"],"除":["阳德","益后"],"满":["天德","福星"],
      "平":["月德","时德"],"定":["三合","临日"],"执":["阳德","解神"],
      "破":["驿马","天马"],"危":["天德","敬安"],"成":["月德","三合","普护"],
      "收":["天德","母仓"],"开":["月德","驿马","天后"],"闭":["天赦","守日"],
    };
    return map[jc] ?? [];
  }

  private getXiongSha(jc: string): string[] {
    const map: Record<string, string[]> = {
      "建":["月煞","大煞"],"除":["月破","大耗"],"满":["月厌","劫煞"],
      "平":[],"定":["死气","月虚"],"执":["小耗","劫煞"],
      "破":["月破","大耗","劫煞"],"危":["月煞","死气"],
      "成":["小耗"],"收":["月煞"],"开":["月厌","天吏"],"闭":["血支","五虚"],
    };
    return map[jc] ?? [];
  }

  private calcDayScore(jc: string): number {
    const jiShen = this.getJiShen(jc);
    const xiongSha = this.getXiongSha(jc);
    return Math.min(100, Math.max(30, 60 + jiShen.length * 10 - xiongSha.length * 5));
  }

  // ═══ 工具方法 ═══

  /** 格式化日期键 */
  private ds(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  /** 清除某年的所有缓存 */
  async invalidateYear(year: number): Promise<void> {
    await this.redis.delByPattern(`wl:year:${year}:*`);
    await this.redis.delByPattern(`wl:jieqi:${year}:*`);
    this.logger.log(`已清除 ${year} 年万年历缓存`);
  }
}

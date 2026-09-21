import type { ReportKnowledgeSeed } from "./types";
import { BAZI_SEEDS } from "./bazi";
import { ZIWEI_SEEDS } from "./ziwei";
import { LIUYAO_SEEDS } from "./liuyao";
import { MEIHUA_SEEDS } from "./meihua";
import { QIMEN_SEEDS } from "./qimen";
import { DALIUREN_SEEDS } from "./daliuren";
import { DEBATE_SEEDS } from "./debates";
import { DEBATE_SEEDS_2 } from "./debates2";
import { DEBATE_SEEDS_3 } from "./debates3";
import { MANGPAI_SEEDS } from "./mangpai";
import { COUPLE_SEEDS } from "./couple";
import { XIAOLIUREN_SEEDS } from "./xiaoliuren";
import { XIAOLIUREN_RISHI_SEEDS } from "./xiaoliuren-rishi";
import { XUANKONG_SEEDS } from "./xuankong";
import { XUANKONG_COMBO_SEEDS } from "./xuankong-combo";
import { JINKOUJUE_SEEDS } from "./jinkoujue";
import { BAZHAI_SEEDS } from "./bazhai";
import { YINPAN_QIMEN_SEEDS } from "./yinpan-qimen";
import { YINPAN_XIANGYI_SEEDS } from "./yinpan-xiangyi";
import { YINPAN_CASE_SEEDS } from "./yinpan-cases";
import { GUA64_SEEDS } from "./gua64";
import { QIMEN_LIUREN_EXT_SEEDS } from "./qimen-liuren-ext";

export type { ReportKnowledgeSeed } from "./types";

/**
 * 六个工具的报告知识种子。
 *
 * 排在前面的工具先入库；同一工具内按写入顺序。
 * 每个工具都必须有条目——决策人 2026-09-18 定的底线是「不能让某个工具的报告过于单薄」，
 * 古籍少的工具就从公开知识整理成体系补上，来源记在 sourceRefs 里。
 */
export const REPORT_KNOWLEDGE_SEEDS: ReportKnowledgeSeed[] = [
  ...BAZI_SEEDS,
  ...ZIWEI_SEEDS,
  ...LIUYAO_SEEDS,
  ...MEIHUA_SEEDS,
  ...QIMEN_SEEDS,
  ...DALIUREN_SEEDS,
  // 观点对照条目排在最后：它们按议题成组，与上面的单点知识是两种用途
  ...DEBATE_SEEDS,
  ...DEBATE_SEEDS_2,
  // 第三批：给议题偏少的五个工具各补一个核心分歧（奇门定局、六壬月将、紫微三合飞星、六爻空破、梅花互变）
  ...DEBATE_SEEDS_3,
  // 盲派：与子平问的不是同一个问题（子平问力量够不够，盲派问这局在做什么功、成没成），
  // 两说并列摆出来，用户才知道为什么找不同师傅会听到不同的话
  ...MANGPAI_SEEDS,
  // 双人合盘：信号只能来自「关系」（报告双方共享，不得出现任何一方的生辰四柱）
  ...COUPLE_SEEDS,
  // 小六壬：第 9 个工具，重心在「三宫各管一段」，对治网上那套一句话断法
  ...XIAOLIUREN_SEEDS,
  // 日时组合三十六句：2026-09-19 从前端 RISHI_DUAN 表迁入（分层方案：断语收回后端）
  ...XIAOLIUREN_RISHI_SEEDS,
  // 玄空：断的是房子不是人，两条红线写在条目里——不断生死病苦、不劝拆改不荐商品
  ...XUANKONG_SEEDS,
  // 山向星组合八十一句：2026-09-19 从前端 COMBO_TEXT 迁入。
  // 传统讲法原样存证，另给按红线改写的读法——前端原表在给用户显示
  // 「二五交加必损主，重病、死亡」，与后端「不断生死病苦」的主线是打架的。
  ...XUANKONG_COMBO_SEEDS,
  // 金口诀：重心是「用爻定着落、四位分主客、动说的是变化不是吉凶」
  ...JINKOUJUE_SEEDS,
  // 八宅：宅盘管房子、命盘管人，两盘并出；凶星名字最吓人（绝命五鬼），
  // 所以红线写得比玄空更死——不拿方位断生死病苦、不劝搬家拆改、不荐物件
  ...BAZHAI_SEEDS,
  // 阴盘奇门：与前面所有工具的组织方式都不同——它是「象意词典＋组合方法＋案例」，
  // 不是格局对照表。取象直读靠符号组合，检索信号取用神宫上实际出现的那几个符号。
  ...YINPAN_QIMEN_SEEDS,
  ...YINPAN_XIANGYI_SEEDS,
  ...YINPAN_CASE_SEEDS,
  // 六十四卦：卦名是六爻/梅花每一卦必然产出的检索信号，按卦立条，
  // 每份报告都能带出一条只属于这一卦的依据，而不是十份卦书共用同一批通则
  ...GUA64_SEEDS,
  // 奇门九宫落点与六壬初传取象：这两个工具此前只有骨架条目，落到具体盘上没话可讲
  ...QIMEN_LIUREN_EXT_SEEDS,
];

/** 按盘类型统计，供 seeder 日志与测试核对覆盖面 */
export function seedCountByType(seeds: ReportKnowledgeSeed[] = REPORT_KNOWLEDGE_SEEDS): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of seeds) out[s.paipanType] = (out[s.paipanType] ?? 0) + 1;
  return out;
}

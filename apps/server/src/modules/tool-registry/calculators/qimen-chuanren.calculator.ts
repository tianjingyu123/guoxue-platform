// ── 奇门穿壬计算引擎 ──
// 算法参考：《奇门遁甲秘笈大全》《大六壬指南》
// 奇门定方 + 六壬定时，双层嵌套，以奇门九宫穿壬七十二局
// 复用 calculateQimenYang 真实排盘 + calculateDaLiuRen 真实六壬

import type { QimenResult, DaLiuRenResult, LiuRenGong } from "@guoxue/shared";
import { calculateQimenYang } from "./qimen.calculator";
import { calculateDaLiuRen } from "./daliuren.calculator";

const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const BA_GUA_8 = ["坎","坤","震","巽","中","乾","兑","艮","离"];

/** 奇门宫→壬支穿连映射 */
const GONG_TO_LIUREN_ZHI: Record<string, string[]> = {
  "坎":["子"], "坤":["未","申"], "震":["卯"], "巽":["辰","巳"],
  "乾":["戌","亥"], "兑":["酉"], "艮":["丑","寅"], "离":["午"],
};

/** 地支→后天八卦宫位映射 */
const ZHI_TO_BAGUA: Record<string, string> = {
  "子":"坎", "丑":"艮", "寅":"艮", "卯":"震", "辰":"巽", "巳":"巽",
  "午":"离", "未":"坤", "申":"坤", "酉":"兑", "戌":"乾", "亥":"乾",
};

// ══════════════════════════════════════════════
// 七十二局完整表
// 9局 × 8时辰地支组 = 72局
// 每局含：局名、值符星、值使门、穿壬天将、吉凶、详解
// ══════════════════════════════════════════════

const NINE_STARS = ["天蓬","天芮","天冲","天辅","天禽","天心","天柱","天任","天英"];
const EIGHT_MEN = ["休门","死门","伤门","杜门","开门","惊门","生门","景门"];
const TIAN_JIANG_12 = ["贵人","螣蛇","朱雀","六合","勾陈","青龙","天空","白虎","太常","玄武","太阴","天后"];

/**
 * 🔴 2026-09-19 切除：这里原有一张「七十二局表」，是**编造的**。
 *
 * 它按下标算术生成：starIdx=(ju+t-1)%9、menIdx=(ju+t)%8、tianJiangIdx=(ju*3+t*2)%12，
 * 吉凶再靠几个硬编码的下标桶打分。这三个公式不对应任何术数规则。
 * 而且 t 只取 0..7（子丑寅卯辰巳午未），补 8..11 的循环是个空循环——
 * 申酉戌亥四个时辰本来就没有局，靠 `%72` 回绕硬凑。
 *
 * 决定性的证据是它**与已核验的奇门引擎自相矛盾**：同一份 summary 里，
 * 引擎说「值符：天心」，这张表说「穿壬第72局：天柱值符」。
 * 采样 2026-09 的 60 个时辰，**58 盘的值符对不上**（剩两盘是碰巧撞对）。
 *
 * 切除范围仅限这一层。本计算器的骨架是对的——它调用已核验的
 * `calculateQimenYang` 与 `calculateDaLiuRen`，不自己手搓月将（金口诀正是栽在这里），
 * 宫支映射也是标准的后天八卦纳支。留骨架、去伪层。
 */

// ══════════════════════════════════════════════

/** 计算时柱地支索引 (0=子时, 1=丑时...) */
function calcShiZhiIndex(hour: number): number {
  return Math.floor(((hour + 1) % 24) / 2);
}

/**
 * 综合吉凶：由九宫逐宫的穿壬评分汇总而来。
 *
 * 2026-09-19 新增，用来替掉那张编造的七十二局表——旧做法是按下标算术
 * 凭空生成一个吉凶档位，与真盘毫无关系（值符都对不上）。
 * 现在取的是**真盘逐宫算出来的结果**：把九宫各自的档位折成分数取均值，
 * 再折回档位。这样得到的综合判断至少与盘面同源，说得出凭据。
 */
function summarizeJiXiong(mappings: { gongChuanJiXiong: string }[]): string {
  const SCORE: Record<string, number> = { 大吉: 2, 吉: 1, 平: 0, 小凶: -1, 凶: -2 };
  if (!mappings.length) return "平";
  const avg = mappings.reduce((a, m) => a + (SCORE[m.gongChuanJiXiong] ?? 0), 0) / mappings.length;
  if (avg >= 1.2) return "大吉";
  if (avg >= 0.4) return "吉";
  if (avg > -0.4) return "平";
  if (avg > -1.2) return "小凶";
  return "凶";
}

export function calculateQimenChuanren(input: Record<string, unknown>): Record<string, unknown> {
  const datetime = (input.datetime as string) ?? new Date().toISOString();
  const method = (input.method as string) ?? "zhuanpan";
  const qiJuMethod = (input.qiJuMethod as string) ?? "chaibu";
  const trueSolar = input.trueSolar as boolean ?? false;
  // 六壬参数暴露给用户
  // 纯日期串按字面取年份——`new Date("2024-01-01").getFullYear()` 在 UTC 以西的机器上得 2023
  const dtYear = /^(\d{4})-/.exec(String(datetime))?.[1];
  const birthYear =
    (input.birthYear as number) ?? (dtYear ? Number(dtYear) : new Date(datetime).getFullYear()) - 30;
  const gender = (input.gender as string) ?? "男";

  const d = new Date(datetime);
  const hour = d.getHours();
  const minute = d.getMinutes();

  // ── 1. 奇门排盘（真实算法） ──
  const qimenResult: QimenResult = calculateQimenYang({
    datetime,
    method,
    qiJuMethod,
    anGanMethod: "zhishimen-qi",
    useTrueSolar: trueSolar,
  });

  // ── 2. 六壬排盘（真实算法） ──
  const liveTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const liuRenResult = calculateDaLiuRen({
    datetime,
    birthYear,
    gender: gender as "男" | "女",
    liveTime,
    useTrueSolarTime: trueSolar,
  }) as unknown as DaLiuRenResult;

  // ── 3. 七十二局计算 ──
  const shiZhiIdx = calcShiZhiIndex(hour);
  const juNumber = qimenResult.juNumber;

  // ── 4. 六壬数据索引（按地支快速查找） ──
  const lrGongByZhi = new Map<string, LiuRenGong>();
  for (const g of liuRenResult.gongs) {
    lrGongByZhi.set(g.zhi as string, g);
  }

  // 四课涉及的地支集合
  const siKeZhiSet = new Set<string>();
  for (const k of liuRenResult.siKe) {
    siKeZhiSet.add(k.xiaZhi as string);
    siKeZhiSet.add(k.shangZhi as string);
  }

  // 三传涉及的地支集合
  const sanChuanZhiSet = new Set<string>();
  sanChuanZhiSet.add(liuRenResult.sanChuan.chu.zhi as string);
  sanChuanZhiSet.add(liuRenResult.sanChuan.zhong.zhi as string);
  sanChuanZhiSet.add(liuRenResult.sanChuan.mo.zhi as string);

  // 空亡集合
  const kongWangSet = new Set<string>();
  for (const kw of liuRenResult.kongWang) {
    kongWangSet.add(kw as string);
  }

  // 神煞按地支索引
  const shenShaByZhi = new Map<string, { name: string; type: string; description: string }[]>();
  for (const ss of liuRenResult.shenSha) {
    const list = shenShaByZhi.get(ss.zhi as string) ?? [];
    list.push(ss);
    shenShaByZhi.set(ss.zhi as string, list);
  }

  // ── 5. 奇门九宫穿壬支映射（深度穿透） ──
  const chuanrenMappings = qimenResult.gongs
    .filter(g => g.index !== 5) // 排除中宫
    .map(g => {
      const gongName = BA_GUA_8[g.index - 1] ?? g.name;
      // 该宫对应的壬支列表
      const lrZhiList = GONG_TO_LIUREN_ZHI[gongName] ?? [DI_ZHI[g.index - 1]];

      // 对每个壬支穿透六壬数据
      const zhiAnalysis = lrZhiList.map(zhi => {
        const lrGong = lrGongByZhi.get(zhi);
        const inSiKe = siKeZhiSet.has(zhi);
        const inSanChuan = sanChuanZhiSet.has(zhi);
        const isKongWang = kongWangSet.has(zhi as any);
        const shenShaList = shenShaByZhi.get(zhi) ?? [];

        // 穿壬综合判断
        let chuanJiXiong = "平";
        let score = 0;
        if (inSanChuan) score += zhi === liuRenResult.sanChuan.chu.zhi ? 2 : 1;
        if (inSiKe) score += 1;
        if (isKongWang) score -= 2;
        if (lrGong?.tianJiang) {
          const jiang = lrGong.tianJiang;
          if (["贵人","青龙","六合","太常"].includes(jiang)) score += 1;
          if (["白虎","玄武","螣蛇","天空"].includes(jiang)) score -= 1;
        }
        const jiShenCount = shenShaList.filter(s => s.type === "ji").length;
        const xiongShenCount = shenShaList.filter(s => s.type === "xiong").length;
        score += jiShenCount - xiongShenCount;

        if (score >= 3) chuanJiXiong = "大吉";
        else if (score >= 1) chuanJiXiong = "吉";
        else if (score === 0) chuanJiXiong = "平";
        else if (score >= -2) chuanJiXiong = "小凶";
        else chuanJiXiong = "凶";

        return {
          zhi,
          bagua: ZHI_TO_BAGUA[zhi] ?? "",
          tianPan: lrGong?.tianPan ?? "",
          tianJiang: lrGong?.tianJiang ?? "",
          dunGan: lrGong?.dunGan ?? "",
          liuQin: lrGong?.liuQin ?? "",
          inSiKe,
          inSanChuan,
          sanChuanPosition: inSanChuan
            ? (liuRenResult.sanChuan.chu.zhi === zhi ? "初传" : liuRenResult.sanChuan.zhong.zhi === zhi ? "中传" : "末传")
            : "",
          isKongWang,
          shenSha: shenShaList,
          chuanJiXiong,
          chuanDesc: buildZhiChuanDesc(zhi, lrGong, inSiKe, inSanChuan, isKongWang, shenShaList, chuanJiXiong),
        };
      });

      // 宫位综合穿壬评分
      const worstJiXiong = zhiAnalysis
        .map(z => ["大吉","吉","平","小凶","凶"].indexOf(z.chuanJiXiong))
        .reduce((a, b) => Math.max(a, b), 0);
      const gongChuanJiXiong = ["大吉","吉","平","小凶","凶"][worstJiXiong];

      return {
        qimenGong: {
          index: g.index,
          name: gongName,
          bagua: g.bagua,
          diPan: g.diPan,
          tianPan: g.tianPan,
          star: g.star,
          men: g.men,
          shen: g.shen,
          isRuMu: g.isRuMu,
          isJiXing: g.isJiXing,
          isMenPo: g.isMenPo,
          changSheng: g.changSheng,
          kongWang: g.kongWang,
          maXing: g.maXing,
          shenSha: g.shenSha,
        },
        liurenZhi: lrZhiList,
        baguaName: gongName,
        gongChuanJiXiong,
        zhiAnalysis,
        gongChuanDesc: buildGongChuanDesc(gongName, g, zhiAnalysis, gongChuanJiXiong),
      };
    });

  // ── 6. 值符宫穿壬专题 ──
  const zhiFuGong = qimenResult.gongs.find(g => g.shen === "值符");
  const zhiFuGongName = zhiFuGong ? (BA_GUA_8[zhiFuGong.index - 1] ?? zhiFuGong.name) : "中";
  const zhiFuChuanZhi = GONG_TO_LIUREN_ZHI[zhiFuGongName] ?? ["子"];
  const zhiFuMapping = chuanrenMappings.find(m => m.qimenGong.name === zhiFuGongName);

  // ── 7. 四课三传摘要 ──
  const siKeSummary = liuRenResult.siKe.map(k => ({
    index: k.index,
    label: `${["一","二","三","四"][k.index - 1]}课`,
    xia: `${k.xiaGan}${k.xiaZhi}`,
    shang: k.shangZhi,
    desc: k.description,
  }));

  const sanChuanSummary = {
    chu: { zhi: liuRenResult.sanChuan.chu.zhi, tianJiang: liuRenResult.sanChuan.chu.tianJiang, desc: liuRenResult.sanChuan.chu.description },
    zhong: { zhi: liuRenResult.sanChuan.zhong.zhi, tianJiang: liuRenResult.sanChuan.zhong.tianJiang, desc: liuRenResult.sanChuan.zhong.description },
    mo: { zhi: liuRenResult.sanChuan.mo.zhi, tianJiang: liuRenResult.sanChuan.mo.tianJiang, desc: liuRenResult.sanChuan.mo.description },
    zongMen: liuRenResult.zongMen,
    zongMenDesc: liuRenResult.zongMenDesc,
  };

  // ── 8. 结构化断语 ──
  // 综合吉凶改由九宫穿壬的逐宫评分汇总（真盘数据），不再取自编造的局表
  const overallJiXiong = summarizeJiXiong(chuanrenMappings);

  const duanYu = {
    summary: [
      `奇门${qimenResult.dunType === "yang" ? "阳遁" : "阴遁"}${juNumber}局，用事${qimenResult.jieQi}，${qimenResult.yongShi}时。`,
      `值符${qimenResult.zhiFu}落${zhiFuGongName}宫，值使${qimenResult.zhiShiMen}。`,
      `综合判${overallJiXiong}。值符宫穿${zhiFuChuanZhi.join("、")}支——奇门定其方，六壬察其时，方时合参以断吉凶。`,
    ].join(""),
    overallJiXiong,
    zhiFuAnalysis: zhiFuMapping
      ? {
        gongName: zhiFuGongName,
        chuanZhi: zhiFuChuanZhi,
        gongChuanJiXiong: zhiFuMapping.gongChuanJiXiong,
        zhiDetail: zhiFuMapping.zhiAnalysis,
        desc: zhiFuMapping.gongChuanDesc,
      }
      : null,
    perPalace: chuanrenMappings.map(m => ({
      gongName: m.qimenGong.name,
      bagua: m.baguaName,
      star: m.qimenGong.star,
      men: m.qimenGong.men,
      shen: m.qimenGong.shen,
      gongJiXiong: m.gongChuanJiXiong,
      zhiDetail: m.zhiAnalysis,
      desc: m.gongChuanDesc,
    })),
  };

  const gongSummary = chuanrenMappings.slice(0, 4).map(m =>
    `${m.qimenGong.name}宫(${m.qimenGong.star}+${m.qimenGong.men})：${m.gongChuanJiXiong}`
  );
  const summary = [
    "┌─ 奇门穿壬 ────────────────────────────┐",
    `│ 奇门${qimenResult.dunType === "yang" ? "阳遁" : "阴遁"}${juNumber}局  ${qimenResult.jieQi}`.padEnd(36) + "│",
    `│ 值符：${qimenResult.zhiFu}  值使：${qimenResult.zhiShiMen}`.padEnd(36) + "│",
    `│ 六壬：${liuRenResult.zhanShi}  月将：${liuRenResult.yueJiang}(${liuRenResult.yueJiangZhi})`.padEnd(36) + "│",
    `│ 穿壬综合：${overallJiXiong}（九宫逐宫汇总）`.padEnd(36) + "│",
    "├─ 九宫穿壬 ────────────────────────────┤",
    ...gongSummary.map(s => `│ ${s}`.padEnd(36) + "│"),
    "├─ 四课三传 ────────────────────────────┤",
    `│ 初传：${liuRenResult.sanChuan.chu.zhi}  中传：${liuRenResult.sanChuan.zhong.zhi}  末传：${liuRenResult.sanChuan.mo.zhi}`.padEnd(36) + "│",
    "├─ 出处 ────────────────────────────────┤",
    "│ 《奇门遁甲秘笈大全》《大六壬指南》      │",
    "└────────────────────────────────────────┘",
  ].join("\n");

  return {
    input: { datetime, method, qiJuMethod, trueSolar, birthYear, gender },
    qimen: {
      juShu: juNumber,
      dunType: qimenResult.dunType === "yang" ? "阳遁" : "阴遁",
      jieQi: qimenResult.jieQi,
      yongShi: qimenResult.yongShi,
      gongs: qimenResult.gongs,
      zhiFu: qimenResult.zhiFu,
      zhiShiMen: qimenResult.zhiShiMen,
      prevJu: qimenResult.prevJu,
      nextJu: qimenResult.nextJu,
    },
    liuren: {
      zhanShi: liuRenResult.zhanShi,
      yueJiang: liuRenResult.yueJiang,
      yueJiangZhi: liuRenResult.yueJiangZhi,
      dayNight: liuRenResult.dayNight,
      jieQi: liuRenResult.jieQi,
      riGanZhi: liuRenResult.riGanZhi,
      gongs: liuRenResult.gongs,
      siKe: siKeSummary,
      sanChuan: sanChuanSummary,
      keJing: liuRenResult.keJing,
      shenSha: liuRenResult.shenSha,
      kongWang: liuRenResult.kongWang,
      nianMing: liuRenResult.nianMing,
      xingNian: liuRenResult.xingNian,
      duanYu: liuRenResult.duanYu,
    },
    chuanren: {
      overallJiXiong,
      zhiFuGongName,
      zhiFuChuanZhi,
      mappings: chuanrenMappings,
      desc: "以奇门定方，以六壬定时。方定则九宫八卦之象可推，时定则四课三传之机可察，方时合参而后断。",
    },
    duanYu,
    summary,
  };
}

// ── 辅助函数 ──

function buildZhiChuanDesc(
  zhi: string,
  lrGong: LiuRenGong | undefined,
  inSiKe: boolean,
  inSanChuan: boolean,
  isKongWang: boolean,
  shenShaList: { name: string; type: string; description: string }[],
  jiXiong: string,
): string {
  const parts: string[] = [];
  if (lrGong?.tianPan) parts.push(`天盘${lrGong.tianPan}`);
  if (lrGong?.tianJiang) parts.push(`乘${lrGong.tianJiang}`);
  if (lrGong?.liuQin) parts.push(`${lrGong.liuQin}`);
  if (inSiKe) parts.push("入四课");
  if (inSanChuan) parts.push("入三传");
  if (isKongWang) parts.push("逢空亡");
  if (shenShaList.length > 0) parts.push(`带${shenShaList.map(s => s.name).join("、")}`);
  const base = parts.length > 0 ? `${zhi}支(${parts.join("，")})` : `${zhi}支`;
  if (jiXiong === "大吉" || jiXiong === "吉") return `${base}，气机顺遂为吉。`;
  if (jiXiong === "平") return `${base}，气机中和为平。`;
  return `${base}，气机滞涩为${jiXiong === "凶" ? "凶" : "小凶"}，宜谨慎。`;
}

function buildGongChuanDesc(
  gongName: string,
  gong: { star: string; men: string; shen: string; isRuMu: boolean; isJiXing: boolean; isMenPo: boolean },
  zhiAnalysis: { chuanJiXiong: string }[],
  jiXiong: string,
): string {
  const ez = zhiAnalysis;
  const jiCount = ez.filter(z => z.chuanJiXiong === "大吉" || z.chuanJiXiong === "吉").length;
  const xiongCount = ez.filter(z => z.chuanJiXiong === "凶" || z.chuanJiXiong === "小凶").length;

  const statusTags: string[] = [];
  if (gong.isRuMu) statusTags.push("入墓");
  if (gong.isJiXing) statusTags.push("击刑");
  if (gong.isMenPo) statusTags.push("门破");
  const status = statusTags.length > 0 ? `（${statusTags.join("、")}）` : "";

  const jiXiongText = jiXiong === "大吉" || jiXiong === "吉"
    ? "穿壬得力，此宫气运亨通"
    : jiXiong === "平"
    ? "穿壬中和，此宫气运平稳"
    : "穿壬失势，此宫气运受阻";

  return `${gongName}宫${gong.star}+${gong.men}+${gong.shen}${status}。穿壬${ez.length}支，吉${jiCount}凶${xiongCount}。${jiXiongText}。`;
}

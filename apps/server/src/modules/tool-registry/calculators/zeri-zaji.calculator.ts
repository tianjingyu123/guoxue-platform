// ── 择日杂忌计算引擎 ──
// 算法参考：《协纪辨方书》《玉匣记》《鳌头通书》《选择宗镜》
// 择日学中各类杂忌：杨公忌、月忌、四离四绝、红纱、重丧、三丧、土王用事等

import type { ZeRiZaJiResult, ZaJiItem } from "@guoxue/shared";

const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// 月建对应月支（寅=正月）
function getMonthZhi(month: number): string {
  return DI_ZHI[(month + 1) % 12];
}

// 年支
function getYearZhi(year: number): string {
  return DI_ZHI[(year - 4) % 12];
}

// 地支六冲
const CHONG: Record<string, string> = {
  "子":"午","丑":"未","寅":"申","卯":"酉","辰":"戌","巳":"亥",
  "午":"子","未":"丑","申":"寅","酉":"卯","戌":"辰","亥":"巳",
};

// 地支六害
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const HAI: Record<string, string> = {
  "子":"未","丑":"午","寅":"巳","卯":"辰","辰":"卯",
  "巳":"寅","午":"丑","未":"子","申":"亥","酉":"戌","戌":"酉","亥":"申",
};

// 地支三合
const SAN_HE: Record<string, string[]> = {
  "申":["申","子","辰"], "子":["申","子","辰"], "辰":["申","子","辰"],
  "亥":["亥","卯","未"], "卯":["亥","卯","未"], "未":["亥","卯","未"],
  "寅":["寅","午","戌"], "午":["寅","午","戌"], "戌":["寅","午","戌"],
  "巳":["巳","酉","丑"], "酉":["巳","酉","丑"], "丑":["巳","酉","丑"],
};

interface JiXiongDay {
  name: string;
  rule: string;
  dateHint: string;
  description: string;
  jiXiong: string;
  source: string;
  huaJie?: string;
}

export function calculateZeRiZaJi(input: Record<string, unknown>): ZeRiZaJiResult {
  const year = (input.year as number) || new Date().getFullYear();
  const month = (input.month as number) || 1;

  const monthZhi = getMonthZhi(month);
  const yearZhi = getYearZhi(year);
  const items: ZaJiItem[] = [];

  const monthStr = String(month).padStart(2, "0");

  // ═══════════ 诸忌日列表 ═══════════

  const allDays: JiXiongDay[] = [
    // ── 杨公忌日 ──
    {
      name: "杨公忌日",
      rule: `正月十三、二月十一、三月初九...十二月十九`,
      dateHint: ["13","11","9","7","5","3","1","29","27","25","23","21","19"][month - 1],
      description: "杨公十三忌日，为杨筠松（杨救贫）所定，一年十三日，百事禁忌。相传为杨公遭遇凶险之日，后世忌嫁娶、开市、出行、安葬。",
      jiXiong: "大凶",
      source: "《协纪辨方书·杨公忌》",
      huaJie: "忌用，无可化解。建议另择吉日。",
    },
    // ── 月忌日 ──
    {
      name: "月忌日（初五）",
      rule: "每月初五",
      dateHint: "5",
      description: "月忌日：初五为月忌之首。每月初五、十四、二十三三日，为五黄入中宫之日，不宜开张、出行、嫁娶。",
      jiXiong: "凶",
      source: "《玉匣记·月忌》",
      huaJie: "若无法避免，用铜铃或金属器物化解。",
    },
    {
      name: "月忌日（十四）",
      rule: "每月十四",
      dateHint: "14",
      description: "月忌日：十四为月中，五黄居中之力最盛，大事勿用。宜静不宜动。",
      jiXiong: "凶",
      source: "《玉匣记·月忌》",
    },
    {
      name: "月忌日（廿三）",
      rule: "每月廿三",
      dateHint: "23",
      description: "月忌日：廿三为月忌之末，靠近月末阴气渐增，不宜重要决策和出行。",
      jiXiong: "凶",
      source: "《玉匣记·月忌》",
    },
    // ── 岁破日 ──
    {
      name: "岁破日",
      rule: `太岁${yearZhi}，岁破在${CHONG[yearZhi]}方`,
      dateHint: "XX",
      description: `今年太岁在${yearZhi}，岁破在${CHONG[yearZhi]}方。凡${CHONG[yearZhi]}日不可用事，犯之主破财、伤灾、官非。岁破为年中最凶之煞之一，修造动土尤忌。`,
      jiXiong: "大凶",
      source: "《协纪辨方书·岁破》",
      huaJie: `避开${CHONG[yearZhi]}日，若无法避免，提前做善事化解。`,
    },
    // ── 月破日 ──
    {
      name: "月破日",
      rule: `月建${monthZhi}，月破在${CHONG[monthZhi]}`,
      dateHint: "XX",
      description: `本月月建${monthZhi}，月破在${CHONG[monthZhi]}方。${CHONG[monthZhi]}日为该月月破日，与月建正冲，万事不宜。月破日主破坏、离散，嫁娶、开业、动土尤忌。`,
      jiXiong: "大凶",
      source: "《协纪辨方书·月破》",
      huaJie: "月破日不可用事，建议移至次日或前日。",
    },
    // ── 四离日 ──
    {
      name: "四离日（春分前）",
      rule: "春分前一日（2月中）",
      dateHint: month === 2 ? "春分前一日" : "",
      description: "四离日：春分、秋分、夏至、冬至前一日。此四日为四季之中阴阳分离之时，大事不宜，婚嫁出行尤忌。《玉匣记》：离者，阴阳分离也。",
      jiXiong: "大凶",
      source: "《玉匣记·四离四绝》",
      huaJie: "过此日后即可用事。",
    },
    {
      name: "四离日（秋分前）",
      rule: "秋分前一日（8月中）",
      dateHint: month === 8 ? "秋分前一日" : "",
      description: "四离日之秋分前一日，金气肃杀阴阳分离之际。忌婚嫁、出行、开业。",
      jiXiong: "大凶",
      source: "《玉匣记·四离四绝》",
    },
    // ── 四绝日 ──
    {
      name: "四绝日（立春前）",
      rule: "立春前一日（2月初）",
      dateHint: month === 2 ? "立春前一日" : "",
      description: "四绝日：立春、立夏、立秋、立冬前一日。季节交替，气绝而续，大事不宜。四绝比四离更凶，忌一切吉事。",
      jiXiong: "大凶",
      source: "《玉匣记·四离四绝》",
      huaJie: "过此日后听次日可用吉事。",
    },
    {
      name: "四绝日（立秋前）",
      rule: "立秋前一日（8月初）",
      dateHint: month === 8 ? "立秋前一日" : "",
      description: "四绝日之立秋前一日，夏绝秋生交替之际。忌动土、出行、婚嫁。",
      jiXiong: "大凶",
      source: "《玉匣记·四离四绝》",
    },
    // ── 红纱日 ──
    {
      name: "红纱日",
      rule: `巳酉丑年${yearZhi === "巳" || yearZhi === "酉" || yearZhi === "丑" ? `忌${DI_ZHI.indexOf("寅") + 1}月${SAN_HE[yearZhi].join("、")}日` : "非本年"}`,
      dateHint: "XX",
      description: "红纱日又作红砂日，为嫁娶大忌。孟月（寅申巳亥）忌酉日，仲月（子午卯酉）忌巳日，季月（辰戌丑未）忌丑日。犯之主损丁破财。",
      jiXiong: "凶",
      source: "《协纪辨方书·红纱》",
      huaJie: "避开该日即可。",
    },
    // ── 重丧日 ──
    {
      name: "重丧日",
      rule: `正月甲日、二月乙日...依月建推`,
      dateHint: ["甲","乙","戊","丙","丁","己","庚","辛","己","壬","癸","己"][month - 1] + "日",
      description: "重丧日为安葬大忌。每月有一天为重丧日，该日下葬主家中有重复丧事。正二月尤忌。",
      jiXiong: "大凶",
      source: "《鳌头通书·重丧》",
      huaJie: "若不得已，用五谷铜钱镇墓穴四角化解。",
    },
    // ── 三丧日 ──
    {
      name: "三丧日",
      rule: `春${["辰","未","戌","丑"][Math.floor((month - 1) / 3)]}日`,
      dateHint: `四季之辰戌丑未日`,
      description: "三丧日安葬大忌，重丧之后又三丧，犯之主家中接连有丧。凡辰戌丑未日下葬，需核对是否为三丧日。",
      jiXiong: "大凶",
      source: "《鳌头通书·三丧》",
      huaJie: "三丧恶煞要以符咒化解，普通人家建议避开。",
    },
    // ── 土王用事 ──
    {
      name: "土王用事",
      rule: "立春/立夏/立秋/立冬前18天",
      dateHint: month === 1 || month === 4 || month === 7 || month === 10 ? "土王用事期间" : "",
      description: "土王用事：四季之末18天为土王当令，此时动土修造犯土煞。忌起基、动土、修造、安门等一切兴工之事。",
      jiXiong: "凶",
      source: "《协纪辨方书·土王》",
      huaJie: "土王期间不动土即可，可做室内装修小修小补。",
    },
    // ── 月厌日 ──
    {
      name: "月厌日",
      rule: `正月${DI_ZHI[(DI_ZHI.indexOf(monthZhi) + 5) % 12]}日`,
      dateHint: `${DI_ZHI[(DI_ZHI.indexOf(monthZhi) + 5) % 12]}日`,
      description: "月厌日为月中阴气最盛之日，忌嫁娶、出行、迁徙。嫁娶犯月厌，主夫妻不睦。出行犯月厌，主迷途遇险。",
      jiXiong: "凶",
      source: "《协纪辨方书·月厌》",
      huaJie: "避开即可，或用天德合日对冲化解。",
    },
    // ── 天贼日 ──
    {
      name: "天贼日",
      rule: `孟月(${DI_ZHI.filter((_, i) => i % 4 === 0).join("、")})忌${DI_ZHI[(DI_ZHI.indexOf(monthZhi) + 4) % 12]}日`,
      dateHint: "XX",
      description: "天贼日为出行大忌，犯之主路遇盗贼劫掠。远行、搬家、货物运输均须避之。",
      jiXiong: "凶",
      source: "《协纪辨方书·天贼》",
      huaJie: "出行前拜关公或请护身符，但仍以避开为佳。",
    },
    // ── 十恶大败日 ──
    {
      name: "十恶大败日",
      rule: "甲辰/乙巳/壬申/丙申/丁亥/庚辰/戊戌/癸亥/辛巳/己丑",
      dateHint: "须查具体干支",
      description: "十恶大败日为全年十大凶日，诸事不宜。开仓、出货、签约、交易大忌，犯之主破败亏空。《选择宗镜》云：十恶大败，仓库金银化为尘。",
      jiXiong: "大凶",
      source: "《选择宗镜·十恶大败》",
      huaJie: "财库空虚之日，忌一切财务相关操作。",
    },
  ];

  // 生成杂忌条目（过滤无用的dateHint）
  for (const d of allDays) {
    if (!d.dateHint || d.dateHint === "XX" || d.dateHint === "" || d.dateHint.includes("非本年")) {
      // 跳过无具体日期的条目（但保留岁破/月破类作为信息提示）
      if (["岁破日", "月破日", "红纱日", "天贼日"].includes(d.name)) {
        items.push({
          name: d.name,
          date: `${year}-${monthStr}-信息`,
          description: `${d.description} (${d.rule}) 来源：${d.source}${d.huaJie ? " 化解：" + d.huaJie : ""}`,
          jiXiong: d.jiXiong,
        });
      }
      continue;
    }

    if (d.dateHint.length <= 2) {
      // 具体日期
      const day = parseInt(d.dateHint);
      if (!isNaN(day) && day >= 1 && day <= 31) {
        items.push({
          name: d.name,
          date: `${year}-${monthStr}-${String(day).padStart(2, "0")}`,
          description: `${d.description} 来源：${d.source}${d.huaJie ? " 化解：" + d.huaJie : ""}`,
          jiXiong: d.jiXiong,
        });
      }
    } else {
      // 文字描述的日期（如"甲日"、"春分前一日"等）
      items.push({
        name: d.name,
        date: `${year}-${monthStr}-${d.dateHint}`,
        description: `${d.description} 来源：${d.source}${d.huaJie ? " 化解：" + d.huaJie : ""}`,
        jiXiong: d.jiXiong,
      });
    }
  }

  // 统计
  const daXiong = items.filter(i => i.jiXiong === "大凶").length;
  const xiong = items.filter(i => i.jiXiong === "凶").length;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const jiCount = items.filter(i => i.name.includes("忌日") && i.jiXiong === "大凶").length;

  const summary = [
    `【择日杂忌报告】${year}年${month}月（月建${monthZhi}）`,
    ``,
    `┌─ 本月禁忌统计 ─────────────────`,
    `│ 大凶日类型：${daXiong}种`,
    `│ 凶日类型：${xiong}种`,
    `│ 杂忌条目总数：${items.length}条`,
    `│`,
    `├─ 重要禁忌日 ─────────────────`,
    ...items.filter(i => i.jiXiong === "大凶").slice(0, 6).map(i =>
      `│ · ${i.name}：${i.description.substring(0, 60)}`
    ),
    `│`,
    `├─ 择日要诀 ─────────────────`,
    `│ 1. 大事（婚嫁/开业/搬迁/动土）须避开大凶日`,
    `│ 2. 月忌日（初五/十四/廿三）不宜重要决策`,
    `│ 3. 四离四绝日百事不宜，尤忌婚嫁出行`,
    `│ 4. 杨公忌日一年仅13天，务必避开`,
    `│ 5. 岁破月破为冲煞之首，动土修造大忌`,
    `│`,
    `├─ 吉日参考 ─────────────────`,
    `│ 避开以上禁忌日后，宜优先选择：`,
    `│ · 天德日/月德日 — 百福骈臻`,
    `│ · 大明吉日/上吉日 — 参考董公择日法`,
    `│ · 天赦日 — 百无禁忌`,
    `│`,
    `└─ 古籍参考 ─────────────────`,
    `   《协纪辨方书·卷六》论月表诸煞`,
    `   《玉匣记·杂忌篇》`,
    `   《鳌头通书·选择篇》`,
    ``,
    `择日之道，先去其凶，后取其吉。凶煞既避，吉神自来。`,
  ].filter(Boolean).join("\n");

  return { items, summary };
}

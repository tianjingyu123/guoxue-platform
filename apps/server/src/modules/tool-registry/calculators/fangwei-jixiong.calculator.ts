// ── 方位吉凶计算引擎 ──
// 算法参考：《阳宅十书》《八宅明镜》《协纪辨方书》《罗经解定》
// 年月神煞方位+太岁岁破+三煞+五黄+化解方法

import { ZHI } from "@guoxue/bazi-engine";
import type { FangWeiJiXiongResult, FangWeiInfo } from "@guoxue/shared";

// 二十四山列表
const SHAN_24 = ["壬","子","癸","丑","艮","寅","甲","卯","乙","辰","巽","巳","丙","午","丁","未","坤","申","庚","酉","辛","戌","乾","亥"];

// 二十四山方位名称
const FANG_WEI_NAMES: Record<string, string> = {
  "壬":"北偏西", "子":"正北", "癸":"北偏东", "丑":"东北偏北", "艮":"正东北", "寅":"东北偏东",
  "甲":"东偏北", "卯":"正东", "乙":"东偏南", "辰":"东南偏东", "巽":"正东南", "巳":"东南偏南",
  "丙":"南偏东", "午":"正南", "丁":"南偏西", "未":"西南偏南", "坤":"正西南", "申":"西南偏西",
  "庚":"西偏南", "酉":"正西", "辛":"西偏北", "戌":"西北偏西", "乾":"正西北", "亥":"西北偏北",
};

// 八卦方位对应
const BA_GUA_DIR: Record<string, string> = {
  "子":"坎(北)", "癸":"坎(北)", "壬":"坎(北)",
  "丑":"艮(东北)", "艮":"艮(东北)", "寅":"艮(东北)",
  "甲":"震(东)", "卯":"震(东)", "乙":"震(东)",
  "辰":"巽(东南)", "巽":"巽(东南)", "巳":"巽(东南)",
  "丙":"离(南)", "午":"离(南)", "丁":"离(南)",
  "未":"坤(西南)", "坤":"坤(西南)", "申":"坤(西南)",
  "庚":"兑(西)", "酉":"兑(西)", "辛":"兑(西)",
  "戌":"乾(西北)", "乾":"乾(西北)", "亥":"乾(西北)",
};

// 八卦五行
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BA_GUA_WX: Record<string, string> = {
  "坎":"水", "艮":"土", "震":"木", "巽":"木", "离":"火", "坤":"土", "兑":"金", "乾":"金",
};

// 地支六冲
const CHONG: Record<string, string> = {
  "子":"午","丑":"未","寅":"申","卯":"酉","辰":"戌","巳":"亥",
  "午":"子","未":"丑","申":"寅","酉":"卯","戌":"辰","亥":"巳",
};

// 年三煞（按三合局）
const SAN_SHA: Record<string, string[]> = {
  "申":["巳","午","未"], "子":["巳","午","未"], "辰":["巳","午","未"], // 申子辰年煞在南
  "亥":["申","酉","戌"], "卯":["申","酉","戌"], "未":["申","酉","戌"], // 亥卯未年煞在西
  "寅":["亥","子","丑"], "午":["亥","子","丑"], "戌":["亥","子","丑"], // 寅午戌年煞在北
  "巳":["寅","卯","辰"], "酉":["寅","卯","辰"], "丑":["寅","卯","辰"], // 巳酉丑年煞在东
};

// 五黄方位（按流年）
// 五黄每年飞入不同宫位
const WU_HUANG: Record<string, string> = {
  "子":"坎(北)", "丑":"艮(东北)", "寅":"艮(东北)", "卯":"震(东)",
  "辰":"巽(东南)", "巳":"巽(东南)", "午":"离(南)", "未":"坤(西南)",
  "申":"坤(西南)", "酉":"兑(西)", "戌":"乾(西北)", "亥":"乾(西北)",
};

// 岁煞/劫煞/灾煞（按三合局）
const SUI_SAN_SHA: Record<string, { suiSha: string; jieSha: string; zaiSha: string }> = {
  "申":{suiSha:"未", jieSha:"巳", zaiSha:"午"}, "子":{suiSha:"未", jieSha:"巳", zaiSha:"午"}, "辰":{suiSha:"未", jieSha:"巳", zaiSha:"午"},
  "亥":{suiSha:"戌", jieSha:"申", zaiSha:"酉"}, "卯":{suiSha:"戌", jieSha:"申", zaiSha:"酉"}, "未":{suiSha:"戌", jieSha:"申", zaiSha:"酉"},
  "寅":{suiSha:"丑", jieSha:"亥", zaiSha:"子"}, "午":{suiSha:"丑", jieSha:"亥", zaiSha:"子"}, "戌":{suiSha:"丑", jieSha:"亥", zaiSha:"子"},
  "巳":{suiSha:"辰", jieSha:"寅", zaiSha:"卯"}, "酉":{suiSha:"辰", jieSha:"寅", zaiSha:"卯"}, "丑":{suiSha:"辰", jieSha:"寅", zaiSha:"卯"},
};

// 煞的级别与化解方法
interface ShaInfo {
  name: string; level: string; description: string; huaJie: string; source: string;
}

function getShaDetail(shaType: string): ShaInfo {
  const shaMap: Record<string, ShaInfo> = {
    "岁破": {
      name: "岁破", level: "大凶",
      description: "岁破与太岁正冲，为年中第一大煞。岁破方不宜动土、修造、安床、开门。犯之主人丁损伤、破财官非。",
      huaJie: "岁破方宜静不宜动。若必须动土，须先在大吉方开工，再转至岁破方。安放八卦镜或铜葫芦于该方可减缓煞气。",
      source: "《协纪辨方书·岁破》",
    },
    "月破": {
      name: "月破", level: "大凶",
      description: "月破与月建正冲，为月内第一大煞。月破方不可修造、动土、搬迁。犯之主当月不顺、口舌官非。",
      huaJie: "月破方当月避免任何动工。过月后煞气自然消除。如急需，可于天德方先行告土再施工。",
      source: "《协纪辨方书·月破》",
    },
    "年三煞": {
      name: "年三煞", level: "大凶",
      description: "年三煞（劫煞/灾煞/岁煞）为年中三大凶煞汇聚之方。此方忌修造动土，犯之主伤人破财。三煞方可向不可坐。",
      huaJie: "三煞方最忌修造。若实在无法避开，需择天赦日或天德日开工，并在工地四角埋五帝钱化解。住宅三煞方宜做厕所或仓库。",
      source: "《协纪辨方书·三煞》",
    },
    "月三煞": {
      name: "月三煞", level: "凶",
      description: "月三煞为月内三煞汇聚之方，力度较年三煞轻但仍有煞气。此方月内不可动土修造。",
      huaJie: "当月避开即可。月过则煞解。",
      source: "《协纪辨方书·月煞》",
    },
    "五黄": {
      name: "五黄煞", level: "大凶",
      description: "五黄廉贞星为九星中最凶之星，所到之方忌动土、修造、安床、开门。五黄属土，火生土故忌红色、火旺之物。",
      huaJie: "五黄方宜静不宜动。铜铃或铜钱六枚串挂于该方位可泄五黄土气（土生金，金泄土）。忌放红色物品和发热电器。",
      source: "《紫白诀·五黄》",
    },
    "岁煞": {
      name: "岁煞", level: "凶",
      description: "岁煞为年三煞之一，位于三煞之末。此方动土易有意外血光之灾。",
      huaJie: "与年三煞化解方法相同。放泰山石敢当于该方可镇煞。",
      source: "《协纪辨方书·岁煞》",
    },
    "劫煞": {
      name: "劫煞", level: "凶",
      description: "劫煞为年三煞之一，位于三煞之首。主破财、盗贼、劫夺之事。",
      huaJie: "此方不宜开门开窗。若已是门窗，挂风铃或金属帘化解。",
      source: "《协纪辨方书·劫煞》",
    },
    "灾煞": {
      name: "灾煞", level: "凶",
      description: "灾煞为年三煞之中，主疾病、灾祸、意外。此方不宜安床及长期坐卧。",
      huaJie: "安放白水晶或六帝钱化解。保持该方位整洁明亮，不堆杂物。",
      source: "《协纪辨方书·灾煞》",
    },
  };
  return shaMap[shaType] || {
    name: shaType, level: "小凶",
    description: "此方有煞气，宜静不宜动。",
    huaJie: "保持该方位干净整洁，不安床不坐卧即可。",
    source: "《协纪辨方书》",
  };
}

// 太岁方位（即年支所在方位）
function getTaiSuiFang(yearZhi: string): string {
  const map: Record<string, string> = {
    "子":"正北(坎宫)", "丑":"东北(艮宫)", "寅":"东北(艮宫)", "卯":"正东(震宫)",
    "辰":"东南(巽宫)", "巳":"东南(巽宫)", "午":"正南(离宫)", "未":"西南(坤宫)",
    "申":"西南(坤宫)", "酉":"正西(兑宫)", "戌":"西北(乾宫)", "亥":"西北(乾宫)",
  };
  return map[yearZhi] || "未知";
}

export function calculateFangWeiJiXiong(input: Record<string, unknown>): FangWeiJiXiongResult {
  const year = (input.year as number) || new Date().getFullYear();
  const month = (input.month as number) || 1;

  const yearZhi = ZHI[(year - 4) % 12];
  const monthZhi = ZHI[(month + 1) % 12];

  // 基础煞气
  const suiPo = CHONG[yearZhi] || "";
  const yuePo = CHONG[monthZhi] || "";
  const nianSanSha = SAN_SHA[yearZhi] || [];
  const yueSanSha = SAN_SHA[monthZhi] || [];
  const suiSan = SUI_SAN_SHA[yearZhi] || { suiSha: "", jieSha: "", zaiSha: "" };

  // 五黄方位
  const wuHuangZhi = Object.keys(CHONG).find(k => CHONG[k] === yearZhi) || yearZhi;
  const wuHuangFang = WU_HUANG[wuHuangZhi] || "未知";

  // 太岁方
  const taiSuiFang = getTaiSuiFang(yearZhi);

  const fangWeiList: FangWeiInfo[] = SHAN_24.map(shan => {
    const nianShas: string[] = [];
    const yueShas: string[] = [];
    let jiXiong = "吉";

    // 岁破
    if (shan === suiPo) {
      nianShas.push("岁破(大凶)");
      jiXiong = "大凶";
    }
    // 月破
    if (shan === yuePo) {
      yueShas.push("月破(大凶)");
      if (jiXiong !== "大凶") jiXiong = "凶";
    }
    // 年三煞
    if (nianSanSha.includes(shan)) {
      nianShas.push("年三煞(大凶)");
      if (jiXiong === "吉") jiXiong = "凶";
      else if (jiXiong === "凶") jiXiong = "大凶";
    }
    // 月三煞
    if (yueSanSha.includes(shan)) {
      yueShas.push("月三煞(凶)");
      if (jiXiong === "吉") jiXiong = "小凶";
    }
    // 岁煞/劫煞/灾煞
    if (shan === suiSan.suiSha) {
      nianShas.push("岁煞(凶)");
      if (jiXiong === "吉") jiXiong = "凶";
    }
    if (shan === suiSan.jieSha) {
      nianShas.push("劫煞(凶)");
      if (jiXiong === "吉") jiXiong = "凶";
    }
    if (shan === suiSan.zaiSha) {
      nianShas.push("灾煞(凶)");
      if (jiXiong === "吉") jiXiong = "凶";
    }

    // 五黄（按年支对应的五黄位）
    if (shan === wuHuangZhi) {
      nianShas.push("五黄煞(大凶)");
      if (jiXiong !== "大凶") jiXiong = "大凶";
    }

    const baGuaKey = shan;
    const baGuaInfo = BA_GUA_DIR[baGuaKey] || "";

    // 构建描述
    const nianShaStr = nianShas.join("、");
    const yueShaStr = yueShas.join("、");

    let desc = `${FANG_WEI_NAMES[shan]}方（${baGuaInfo}）`;
    const shaDetails: string[] = [];
    if (nianShaStr) {
      for (const ns of nianShas) {
        const info = getShaDetail(ns.replace(/\(.*\)/, ""));
        shaDetails.push(`${ns}：${info.huaJie}`);
      }
      desc += `。年煞：${nianShaStr}`;
    }
    if (yueShaStr) {
      desc += `。月煞：${yueShaStr}`;
    }
    if (!nianShaStr && !yueShaStr) {
      desc += " — 本月该方安宁无冲煞";
    }
    if (shaDetails.length > 0) {
      desc += `。【化解】${shaDetails.join(" ")}`;
    }

    return {
      fangWei: `${shan}山（${FANG_WEI_NAMES[shan]}）`,
      nianSha: nianShaStr,
      yueSha: yueShaStr,
      jiXiong,
      description: desc,
    };
  });

  const xiongFang = fangWeiList.filter(f => f.jiXiong !== "吉").length;
  const daXiongFang = fangWeiList.filter(f => f.jiXiong === "大凶").length;
  const nianShaFang = fangWeiList.filter(f => f.nianSha).map(f => f.fangWei);

  const summary = [
    `【方位吉凶报告】${year}年${month}月`,
    ``,
    `┌─ 流年煞气总览 ─────────────────`,
    `│ 太岁方：${taiSuiFang} — 太岁所在，宜静不宜动`,
    `│ 岁破方：${suiPo}山（${FANG_WEI_NAMES[suiPo] || ""}）— 与太岁正冲，年第一大煞`,
    `│ 五黄方：${wuHuangFang} — 五黄大煞，忌动土修造`,
    `│ 年三煞：${nianSanSha.join("、")}方 — 三煞汇聚，可向不可坐`,
    `│ 劫煞：${suiSan.jieSha}方 灾煞：${suiSan.zaiSha}方 岁煞：${suiSan.suiSha}方`,
    `│`,
    `├─ 本月煞气 ─────────────────`,
    `│ 月建：${monthZhi}（${month}月）`,
    `│ 月破方：${yuePo}山（${FANG_WEI_NAMES[yuePo] || ""}）— 本月不可动土`,
    `│ 月三煞：${yueSanSha.join("、")}方`,
    `│`,
    `├─ 二十四山统计 ─────────────────`,
    `│ 吉方：${24 - xiongFang}山 凶方：${xiongFang}山（其中大凶${daXiongFang}山）`,
    `│ 年煞方位：${nianShaFang.join("、") || "无"}`,
    `│`,
    `├─ 实用指南 ─────────────────`,
    `│ 1. 太岁方和岁破方今年禁止动土修造`,
    `│ 2. 五黄方宜挂铜铃六枚泄煞`,
    `│ 3. 三煞方可向不可坐——门的朝向可以，但不可坐卧`,
    `│ 4. 月破方本月暂不用事，过月即安`,
    `│ 5. 动土修造首选天德/月德/生气方`,
    `│ 6. 安床首选延年/生气/天医方`,
    `│`,
    `└─ 古籍参考 ─────────────────`,
    `   《阳宅十书》论年月神煞`,
    `   《八宅明镜》论宫星生克`,
    `   《协纪辨方书》卷六论月表方位`,
    `   《罗经解定》论二十四山`,
    ``,
    `凡修造动土，先去其煞，后取其吉。煞方避之则吉，犯之则凶。`,
  ].filter(Boolean).join("\n");

  return { fangWeiList, summary };
}

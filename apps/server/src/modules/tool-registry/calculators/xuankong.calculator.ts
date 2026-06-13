// ── 玄空飞星计算引擎 ──
// 三元九运/运盘/山盘/向盘/替卦/飞星组合/旺山旺向
// 参考：沈氏玄空学/玄空秘旨/沈竹礽飞星赋

import type { XuanKongResult, XuanKongGong, XuanKongGeJu } from "@guoxue/shared";

// ── 二十四山数据（龙山向水+三元龙+阴阳+洛书宫） ──
const SHAN_24: Record<string, { long: "天元龙"|"地元龙"|"人元龙"; yinYang: "阴"|"阳"; gong: string; luoShu: number; tiGuaStar: number }> = {
  // 坎宫(北) 洛书1
  "壬":{long:"地元龙",yinYang:"阳",gong:"坎",luoShu:1,tiGuaStar:2},
  "子":{long:"天元龙",yinYang:"阴",gong:"坎",luoShu:1,tiGuaStar:1},
  "癸":{long:"人元龙",yinYang:"阴",gong:"坎",luoShu:1,tiGuaStar:1},
  // 艮宫(东北) 洛书8
  "丑":{long:"地元龙",yinYang:"阴",gong:"艮",luoShu:8,tiGuaStar:7},
  "艮":{long:"天元龙",yinYang:"阳",gong:"艮",luoShu:8,tiGuaStar:7},
  "寅":{long:"人元龙",yinYang:"阳",gong:"艮",luoShu:8,tiGuaStar:9},
  // 震宫(东) 洛书3
  "甲":{long:"地元龙",yinYang:"阳",gong:"震",luoShu:3,tiGuaStar:1},
  "卯":{long:"天元龙",yinYang:"阴",gong:"震",luoShu:3,tiGuaStar:2},
  "乙":{long:"人元龙",yinYang:"阴",gong:"震",luoShu:3,tiGuaStar:2},
  // 巽宫(东南) 洛书4
  "辰":{long:"地元龙",yinYang:"阴",gong:"巽",luoShu:4,tiGuaStar:6},
  "巽":{long:"天元龙",yinYang:"阳",gong:"巽",luoShu:4,tiGuaStar:6},
  "巳":{long:"人元龙",yinYang:"阳",gong:"巽",luoShu:4,tiGuaStar:6},
  // 离宫(南) 洛书9
  "丙":{long:"地元龙",yinYang:"阳",gong:"离",luoShu:9,tiGuaStar:7},
  "午":{long:"天元龙",yinYang:"阴",gong:"离",luoShu:9,tiGuaStar:9},
  "丁":{long:"人元龙",yinYang:"阴",gong:"离",luoShu:9,tiGuaStar:9},
  // 坤宫(西南) 洛书2
  "未":{long:"地元龙",yinYang:"阴",gong:"坤",luoShu:2,tiGuaStar:2},
  "坤":{long:"天元龙",yinYang:"阳",gong:"坤",luoShu:2,tiGuaStar:2},
  "申":{long:"人元龙",yinYang:"阳",gong:"坤",luoShu:2,tiGuaStar:1},
  // 兑宫(西) 洛书7
  "庚":{long:"地元龙",yinYang:"阳",gong:"兑",luoShu:7,tiGuaStar:9},
  "酉":{long:"天元龙",yinYang:"阴",gong:"兑",luoShu:7,tiGuaStar:7},
  "辛":{long:"人元龙",yinYang:"阴",gong:"兑",luoShu:7,tiGuaStar:7},
  // 乾宫(西北) 洛书6
  "戌":{long:"地元龙",yinYang:"阴",gong:"乾",luoShu:6,tiGuaStar:6},
  "乾":{long:"天元龙",yinYang:"阳",gong:"乾",luoShu:6,tiGuaStar:6},
  "亥":{long:"人元龙",yinYang:"阳",gong:"乾",luoShu:6,tiGuaStar:6},
};

// ── 九宫飞星路径（洛书飞步） ──
// 中5→乾6→兑7→艮8→离9→坎1→坤2→震3→巽4
const FEI_XING_PATH = [5, 6, 7, 8, 9, 1, 2, 3, 4];
// 宫名→方位
const GONG_DIRECTION: Record<string, string> = {
  "坎":"正北","坤":"西南","震":"正东","巽":"东南","中":"中央","乾":"西北","兑":"正西","艮":"东北","离":"正南",
};

// 飞星→名称
const STAR_NAMES: Record<number, string> = {
  1:"一白贪狼",2:"二黑巨门",3:"三碧禄存",4:"四绿文曲",5:"五黄廉贞",
  6:"六白武曲",7:"七赤破军",8:"八白左辅",9:"九紫右弼",
};

/** 飞星布盘：中宫入中数字，按顺/逆飞布9宫，返回洛书1-9宫对应的星 */
function buFeiXing(center: number, direction: "顺"|"逆"): Record<number, number> {
  const result: Record<number, number> = {};
  // 找到入中数字在飞星路径中的位置
  const centerIdx = FEI_XING_PATH.indexOf(center);
  // 中5宫 = 入中数字
  result[5] = center;
  // 其余8宫按路径飞布
  for (let step = 1; step <= 8; step++) {
    const pathPos = direction === "顺"
      ? (centerIdx + step) % 9
      : (centerIdx - step + 9) % 9;
    const star = FEI_XING_PATH[pathPos];
    const gongIndex = FEI_XING_PATH[step]; // 飞星落在哪个洛书宫
    result[gongIndex] = star;
  }
  return result;
}

/** 获取24山对应的洛书宫运星（从运盘中查找） */
function getYunStarAt(shan: string, yunPan: Record<number, number>): number {
  const luoShu = SHAN_24[shan]?.luoShu ?? 1;
  return yunPan[luoShu];
}

// ── 星组合吉凶（30+关键组合）──
// 参考：《玄空秘旨》《飞星赋》《沈氏玄空学》
function starComboComment(shan: number, xiang: number, yun: number): string {
  const key = `${Math.min(shan, xiang)}-${Math.max(shan, xiang)}`;
  const combos: Record<string, string> = {
    // ── 一白贪狼 ──
    "1-1":"一一天元，水水比和。主智慧官贵，尤利文职学业。",
    "1-2":"一二水土相克。坎坤配，主腹疾子宫病，孕妇需防。",
    "1-3":"一三水木相生。龙身有鳞化龙之象，利仕途文贵。",
    "1-4":"一四同宫，准发科名之显。文昌官贵，利学业文职，名扬天下。",
    "1-5":"一五水土相克，五黄廉贞煞气重。耳病肾病，慎防水厄。",
    "1-6":"一六共宗，水金相生。主官运亨通，文武双全，文章振发。",
    "1-7":"一七水金亦生，但七为破军。易因酒色财气招灾，谨防桃花劫。",
    "1-8":"一八水土相克。八白财星受伤，虽能得财但恐因财致疾。",
    "1-9":"一九水火既济。水火相冲，若能合十则大吉，否则多桃花口舌。",
    // ── 二黑巨门 ──
    "2-2":"二二坤土比和。未申年病符叠至，主脾胃腹疾，孕妇尤忌。",
    "2-3":"二三斗牛煞。木克土，官非口舌、母子不和、肠胃疾病。",
    "2-4":"二四木克土。婆媳不和、姑嫂相争、风湿关节痛。",
    "2-5":"二五交加，损主重病。二黑病符+五黄煞，主重疾缠身，最凶之局。",
    "2-6":"二六土金相生。坤乾交泰，主田产丰厚、官贵财旺。",
    "2-7":"二七同道，火土相生。横财巨富，但火炎土燥需防火灾血光。",
    "2-8":"二八土土比和。巨门左辅相见，主田宅丰厚，置业大利。",
    "2-9":"二九火土相生。愚钝顽冥，火炎土燥，防目疾心脑血管病。",
    // ── 三碧禄存 ──
    "3-3":"三三蚩尤煞。木木比和，双木成林本是吉，但三碧为蚩尤星，好斗生非。",
    "3-4":"三四同宫，碧绿风魔。手足相残、兄弟阋墙、肝胆神经疾患。",
    "3-5":"三五木克土。三碧禄存遇五黄，官非牢狱之灾，慎行守法。",
    "3-6":"三六金克木。雷风金伐，父子不和、车祸外伤、肝胆受损。",
    "3-7":"三七金木相克。穿心煞，主手足残疾、手术刀伤、血光官司。",
    "3-8":"三八为朋，木土相制。人财两旺但口舌多，宜忍让化解。",
    "3-9":"三九木火通明。震离相配，长子掌权，文贵声名。但防火爆伤肝。",
    // ── 四绿文曲 ──
    "4-4":"四四双木。文曲双至，利文章科举，但防淫邪桃花。",
    "4-5":"四五木克土。文曲遇廉贞，因文惹祸、因色招灾，慎言行。",
    "4-6":"四六金克木。文曲武曲相克，文职受挫、官非牵连、股肱有伤。",
    "4-7":"四七金木交战。阴神满地，男女淫乱、刀伤破相、是非不断。",
    "4-8":"四八木土相克。文曲财星相制，文名受损但财可保，宜取舍。",
    "4-9":"四九为友，木火通明。文贵声名，事业显达，科甲之应。",
    // ── 五黄廉贞（大煞）──
    "5-5":"五五廉贞叠至。双五黄同宫，大凶之极，重病横祸，急宜化解。",
    "5-6":"五六土金相生。五黄煞气被六白金化泄，凶中有吉，宜金器化解。",
    "5-7":"五七土金亦生。七赤破军化五黄煞，凶中藏机，宜金水调和。",
    "5-8":"五八土土。五黄遇八白，煞气见财星，宜以金泄土生水化解。",
    "5-9":"五九火土。五黄廉贞遇九紫火，火生土更旺煞气，急宜化解。",
    // ── 六白武曲 ──
    "6-6":"六六双金。武曲叠见，官贵权威极盛，但刚极易折须防。",
    "6-7":"六七交剑煞。金金比和本是吉，但六七双金相争，官非口舌刀伤。",
    "6-8":"六八相生，土金相生。武贵财旺，家业稳固，父慈子孝。",
    "6-9":"六九同宫，火金相克。肺病血症，上呼吸道疾病，火克金凶。",
    // ── 七赤破军 ──
    "7-7":"七七双金。破军叠见，好勇斗狠，刀伤手术，盗贼之灾。",
    "7-8":"七八土金相生。破军财星遇左辅，意外横财但来路不正须防。",
    "7-9":"七九同宫，火金相克。回禄之灾，火灾口舌，手术血光。",
    // ── 八白左辅 ──
    "8-8":"八八双土。左辅叠见，田宅丰厚，财源广进，置业大利。",
    "8-9":"八九火土相生。左辅遇右弼，火生土旺财，田宅大旺。",
    // ── 九紫右弼 ──
    "9-9":"九九双火。右弼叠见，火炎太盛，眼疾心脑血管病，但喜庆多。",
  };

  if (combos[key]) return combos[key];

  // 合十局
  if (shan + xiang === 10) return "夫妇合十，阴阳交媾，丁财两旺大吉。";
  // 五黄
  if (shan === 5 || xiang === 5) return "五黄飞临，宜静不宜动，需铜铃六帝钱化解。";
  // 二黑
  if (shan === 2 || xiang === 2) return "二黑病符星到宫，注意健康，宜铜葫芦化解。";
  // 当令旺星
  if (shan === yun || xiang === yun) return "当令旺星到宫，大吉大利。";
  // 失令
  if (shan >= 7 - yun || xiang >= 7 - yun) return "失令退气之星飞临，运势渐退，宜守不宜攻。";
  return `山${shan}${STAR_NAMES[shan] ?? ""}向${xiang}${STAR_NAMES[xiang] ?? ""}，星组平和。`;
}

// ── 格局判断 ──
function calcGeJu(yun: number, gongs: XuanKongGong[], shanGong: string, xiangGong: string): XuanKongGeJu[] {
  const ju: XuanKongGeJu[] = [];
  const wangStar = yun;

  // 找坐山宫和向方宫
  const shanGongData = gongs.find(g => g.gongName === shanGong);
  const xiangGongData = gongs.find(g => g.gongName === xiangGong);

  // 旺山旺向：坐山宫山星=当令星 且 向方宫向星=当令星
  const isWangShan = shanGongData?.shanStar === wangStar;
  const isWangXiang = xiangGongData?.xiangStar === wangStar;
  ju.push({
    name:"旺山旺向", active: isWangShan && isWangXiang,
    desc:"当令旺星到山到向，丁财两旺，人财两发，玄空最吉格局。",
  });

  // 上山下水：山星到向、向星到山
  const isShangShan = shanGongData?.shanStar !== wangStar && xiangGongData?.shanStar === wangStar;
  const isXiaShui = xiangGongData?.xiangStar !== wangStar && shanGongData?.xiangStar === wangStar;
  ju.push({
    name:"上山下水", active: isShangShan || isXiaShui,
    desc:"山星下水、向星上山，丁财两败，玄空最凶格局。",
  });

  // 双星到向：向方宫山向星同为当令
  const isDoubleXiang = !!(xiangGongData && xiangGongData.shanStar === wangStar && xiangGongData.xiangStar === wangStar);
  ju.push({
    name:"双星到向", active: isDoubleXiang,
    desc:"山向双星会于向方，旺财不旺丁。宜向方见水。",
  });

  // 双星到坐
  const isDoubleShan = !!(shanGongData && shanGongData.shanStar === wangStar && shanGongData.xiangStar === wangStar);
  ju.push({
    name:"双星到坐", active: isDoubleShan,
    desc:"山向双星会于坐方，旺丁不旺财。宜坐方见山。",
  });

  // 全局合十检查
  let heShiCount = 0;
  for (const g of gongs) {
    if (g.shanStar + g.xiangStar === 10) heShiCount++;
  }
  if (heShiCount >= 6) {
    ju.push({ name:"夫妇合十", active:true, desc:"全局多宫山向合十，阴阳交媾，主丁财两旺绵长。" });
  }

  // 伏吟检查：山星或向星与地盘(运盘)全同
  let shanFuYin = true, xiangFuYin = true;
  for (const g of gongs) {
    if (g.shanStar !== g.yunStar) shanFuYin = false;
    if (g.xiangStar !== g.yunStar) xiangFuYin = false;
  }
  if (shanFuYin) ju.push({ name:"山星伏吟", active:true, desc:"山星全盘与运星同，主人口不宁，宜化解。" });
  if (xiangFuYin) ju.push({ name:"向星伏吟", active:true, desc:"向星全盘与运星同，主财运不济，宜化解。" });

  return ju;
}

/** 元运计算（三元九运，每运20年） */
function calcYuanYun(year: number): { yuanYun: number; yunRange: string } {
  const yunStarts: [number, number, string][] = [
    [1864,1,"1864-1883（一运·坎水）"],[1884,2,"1884-1903（二运·坤土）"],
    [1904,3,"1904-1923（三运·震木）"],[1924,4,"1924-1943（四运·巽木）"],
    [1944,5,"1944-1963（五运·中土）"],[1964,6,"1964-1983（六运·乾金）"],
    [1984,7,"1984-2003（七运·兑金）"],[2004,8,"2004-2023（八运·艮土）"],
    [2024,9,"2024-2043（九运·离火）"],
  ];
  for (let i = yunStarts.length - 1; i >= 0; i--) {
    if (year >= yunStarts[i][0]) return { yuanYun: yunStarts[i][1], yunRange: yunStarts[i][2] };
  }
  return { yuanYun: 1, yunRange: "1864之前（一运之前）" };
}

/** 主计算函数 */
export function calculateXuanKong(input: Record<string, unknown>): XuanKongResult {
  const shan = (input.shan as string) ?? "壬";
  const xiang = (input.xiang as string) ?? "丙";
  const year = (input.year as number) ?? 2024;
  const tiGua = (input.tiGua as boolean) ?? false;
  const yuanYunCalc = calcYuanYun(year);
  const yuanYunVal = (input.yuanYun as number) ?? yuanYunCalc.yuanYun;

  const shanInfo = SHAN_24[shan] ?? SHAN_24["壬"];
  const xiangInfo = SHAN_24[xiang] ?? SHAN_24["丙"];

  // ── 第1步：运盘（地盘） ──
  const yunPan = buFeiXing(yuanYunVal, "顺"); // 运盘始终顺飞

  // ── 第2步：山盘 ──
  // 坐山宫位的运星 = 山星入中数
  let shanCenter = getYunStarAt(shan, yunPan);
  if (tiGua) {
    // 替卦：用起星诀替代山星入中
    shanCenter = shanInfo.tiGuaStar;
  }
  const shanOrder = shanInfo.yinYang === "阳" ? "顺" : "逆";
  const shanPan = buFeiXing(shanCenter, shanOrder);

  // ── 第3步：向盘 ──
  let xiangCenter = getYunStarAt(xiang, yunPan);
  if (tiGua) {
    xiangCenter = xiangInfo.tiGuaStar;
  }
  const xiangOrder = xiangInfo.yinYang === "阳" ? "顺" : "逆";
  const xiangPan = buFeiXing(xiangCenter, xiangOrder);

  // ── 第4步：构建九宫 ──
  const gongOrder: [string, number][] = [
    ["离",9],["艮",8],["兑",7],["乾",6],["中",5],["巽",4],["震",3],["坤",2],["坎",1],
  ];
  const gongs: XuanKongGong[] = gongOrder.map(([name, luoShu]) => {
    const yunStar = yunPan[luoShu] as 1|2|3|4|5|6|7|8|9;
    const shanStar = shanPan[luoShu] as 1|2|3|4|5|6|7|8|9;
    const xiangStar = xiangPan[luoShu] as 1|2|3|4|5|6|7|8|9;

    // 标记特殊格局
    const patterns: string[] = [];
    if (shanStar + xiangStar === 10) patterns.push("合十");
    if (shanStar === yuanYunVal && xiangStar === yuanYunVal) patterns.push("到山到向");
    if (shanStar === xiangStar && shanStar === yunStar) patterns.push("伏吟");

    return {
      gongName: name,
      direction: GONG_DIRECTION[name] ?? "",
      yunStar, shanStar, xiangStar,
      shanOrder, xiangOrder,
      pattern: patterns.length > 0 ? patterns.join("+") as any : undefined,
      comment: starComboComment(shanStar, xiangStar, yunStar),
    };
  });

  // ── 第5步：找坐山宫和向方宫 ──
  const shanGongName = shanInfo.gong;
  const xiangGongName = xiangInfo.gong;

  // ── 第6步：格局 ──
  const geJu = calcGeJu(yuanYunVal, gongs, shanGongName, xiangGongName);

  // ── 第7步：风水建议 ──
  const advice = gongs.filter(g => g.gongName !== "中").map((g) => {
    let jiXiong: "吉" | "凶" | "平" = "平";
    if (g.shanStar === yuanYunVal || g.xiangStar === yuanYunVal) jiXiong = "吉";
    else if (g.shanStar === 5 || g.xiangStar === 5 || g.shanStar === 2 || g.xiangStar === 2) jiXiong = "凶";
    return {
      direction: g.direction,
      starCombo: `${g.shanStar}-${g.xiangStar}`,
      jiXiong,
      suggestion: jiXiong === "吉"
        ? "宜设主卧/客厅/大门，纳旺气催吉。"
        : jiXiong === "凶"
          ? "宜设厕所/储物间，或用铜铃/金属风水物化解二五煞气。"
          : "可设辅助房间，保持整洁通风，安忍水调和。",
    };
  });

  // ── 第8步：断语 ──
  const activeJu = geJu.filter(g => g.active);
  const tiGuaType = tiGua ? (shanInfo.tiGuaStar !== getYunStarAt(shan, yunPan) && xiangInfo.tiGuaStar !== getYunStarAt(xiang, yunPan) ? "双替" : shanInfo.tiGuaStar !== getYunStarAt(shan, yunPan) ? "山替" : xiangInfo.tiGuaStar !== getYunStarAt(xiang, yunPan) ? "向替" : "none") : "none";

  const duanYu = [
    `坐${shan}向${xiang}，${yuanYunCalc.yunRange}。`,
    `运星${yuanYunVal}入中，山星${shanCenter}(${STAR_NAMES[shanCenter]})入中${shanOrder}飞，向星${xiangCenter}(${STAR_NAMES[xiangCenter]})入中${xiangOrder}飞。`,
    tiGuaType !== "none" ? `替卦：${tiGuaType}。` : "",
    activeJu.length > 0 ? activeJu.map(j => j.desc).join("") : "山向格局一般。",
  ].filter(Boolean).join("");

  return {
    input: { shan: shan as any, xiang: xiang as any, year, yuanYun: yuanYunVal as any, tiGua },
    basicInfo: {
      yuanYun: yuanYunVal as any,
      yunRange: yuanYunCalc.yunRange,
      shanLong: shanInfo.long,
      xiangLong: xiangInfo.long,
      shanYinYang: shanInfo.yinYang,
      xiangYinYang: xiangInfo.yinYang,
      tiGuaType: tiGuaType as any,
      yunStarCenter: yuanYunVal as any,
      shanStarCenter: shanCenter as any,
      xiangStarCenter: xiangCenter as any,
    },
    gongs,
    geJu,
    wangShanWangXiang: {
      isWang: geJu.some(g => g.name === "旺山旺向" && g.active),
      isShangShan: geJu.some(g => g.name === "上山下水" && g.active),
      isShuangXing: geJu.some(g => g.name === "双星到向" && g.active),
      desc: geJu.find(g => g.active)?.desc ?? "山向格局一般。",
    },
    advice,
    duanYu,
  };
}

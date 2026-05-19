// ── 电子罗盘计算引擎 ──
// 二十四山/磁偏角/纳甲/三合水法/各流派风水指导

import type { LuoPanInput, LuoPanResult, LuoPanLayer, ShanAnalysis, FengShuiAdvice } from "@guoxue/shared";

const SHAN_24 = ["壬","子","癸","丑","艮","寅","甲","卯","乙","辰","巽","巳","丙","午","丁","未","坤","申","庚","酉","辛","戌","乾","亥"] as const;

const SHAN_INFO: Record<string, { yinYang: string; guaGong: string; sanYuanLong: string; degree: number }> = {
  "壬":{yinYang:"阳",guaGong:"坎",sanYuanLong:"地元龙",degree:345}, "子":{yinYang:"阴",guaGong:"坎",sanYuanLong:"天元龙",degree:0},
  "癸":{yinYang:"阴",guaGong:"坎",sanYuanLong:"人元龙",degree:15}, "丑":{yinYang:"阴",guaGong:"艮",sanYuanLong:"地元龙",degree:30},
  "艮":{yinYang:"阳",guaGong:"艮",sanYuanLong:"天元龙",degree:45}, "寅":{yinYang:"阳",guaGong:"艮",sanYuanLong:"人元龙",degree:60},
  "甲":{yinYang:"阳",guaGong:"震",sanYuanLong:"地元龙",degree:75}, "卯":{yinYang:"阴",guaGong:"震",sanYuanLong:"天元龙",degree:90},
  "乙":{yinYang:"阴",guaGong:"震",sanYuanLong:"人元龙",degree:105}, "辰":{yinYang:"阴",guaGong:"巽",sanYuanLong:"地元龙",degree:120},
  "巽":{yinYang:"阳",guaGong:"巽",sanYuanLong:"天元龙",degree:135}, "巳":{yinYang:"阳",guaGong:"巽",sanYuanLong:"人元龙",degree:150},
  "丙":{yinYang:"阳",guaGong:"离",sanYuanLong:"地元龙",degree:165}, "午":{yinYang:"阴",guaGong:"离",sanYuanLong:"天元龙",degree:180},
  "丁":{yinYang:"阴",guaGong:"离",sanYuanLong:"人元龙",degree:195}, "未":{yinYang:"阴",guaGong:"坤",sanYuanLong:"地元龙",degree:210},
  "坤":{yinYang:"阳",guaGong:"坤",sanYuanLong:"天元龙",degree:225}, "申":{yinYang:"阳",guaGong:"坤",sanYuanLong:"人元龙",degree:240},
  "庚":{yinYang:"阳",guaGong:"兑",sanYuanLong:"地元龙",degree:255}, "酉":{yinYang:"阴",guaGong:"兑",sanYuanLong:"天元龙",degree:270},
  "辛":{yinYang:"阴",guaGong:"兑",sanYuanLong:"人元龙",degree:285}, "戌":{yinYang:"阴",guaGong:"乾",sanYuanLong:"地元龙",degree:300},
  "乾":{yinYang:"阳",guaGong:"乾",sanYuanLong:"天元龙",degree:315}, "亥":{yinYang:"阳",guaGong:"乾",sanYuanLong:"人元龙",degree:330},
};

// 中国主要城市磁偏角参考表（WMM模型近似值，单位：度，负=西偏）
const CITY_DECLINATION: [string, number, number, number][] = [
  ["北京", 116.4, 39.9, -5.8], ["上海", 121.5, 31.2, -4.2],
  ["广州", 113.3, 23.1, -3.3], ["深圳", 114.1, 22.5, -3.1],
  ["成都", 104.1, 30.6, -5.8], ["重庆", 106.5, 29.5, -5.2],
  ["杭州", 120.2, 30.3, -4.0], ["武汉", 114.3, 30.6, -4.5],
  ["西安", 108.9, 34.3, -5.5], ["南京", 118.8, 32.0, -4.4],
  ["哈尔滨", 126.6, 45.7, -8.5], ["长春", 125.3, 43.9, -8.0],
  ["沈阳", 123.4, 41.8, -7.2], ["济南", 117.0, 36.7, -5.3],
  ["郑州", 113.7, 34.8, -5.0], ["长沙", 113.0, 28.2, -4.2],
  ["福州", 119.3, 26.1, -3.5], ["昆明", 102.7, 25.0, -4.5],
  ["贵阳", 106.7, 26.6, -4.8], ["兰州", 103.8, 36.1, -5.0],
  ["乌鲁木齐", 87.6, 43.8, -6.5], ["拉萨", 91.1, 29.6, -4.0],
  ["呼和浩特", 111.7, 40.8, -5.8], ["太原", 112.5, 37.9, -5.4],
  ["石家庄", 114.5, 38.0, -5.3], ["合肥", 117.3, 31.9, -4.6],
  ["南昌", 115.9, 28.7, -4.0], ["南宁", 108.3, 22.8, -4.0],
  ["海口", 110.3, 20.0, -3.0], ["香港", 114.2, 22.3, -3.1],
];

/** 根据经纬度计算磁偏角（最近参考点+经度梯度估算） */
function calcMagneticDeclination(longitude?: number, latitude?: number): number {
  if (longitude === undefined || latitude === undefined) return -5.5;
  let nearestDist = Infinity, nearestDecl = -5.5;
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  for (const [, cityLon, cityLat, decl] of CITY_DECLINATION) {
    const dLon = (longitude - cityLon) * cosLat;
    const dLat = latitude - cityLat;
    const dist = Math.sqrt(dLon * dLon + dLat * dLat);
    if (dist < nearestDist) { nearestDist = dist; nearestDecl = decl; }
  }
  return nearestDist > 5
    ? Math.round((-3 - (120 - longitude) * 0.35) * 10) / 10
    : Math.round(nearestDecl * 10) / 10;
}

// 纳甲信息
const NA_JIA: Record<string, string> = {
  "子":"坎纳戊","丑":"艮纳丙","寅":"艮纳丙","卯":"震纳庚","辰":"巽纳辛","巳":"巽纳辛",
  "午":"离纳己","未":"坤纳乙","申":"坤纳乙","酉":"兑纳丁","戌":"乾纳甲","亥":"乾纳甲",
};

/** 度到二十四山 */
function degreeToShan(deg: number): { shan: string; chaoxiang: string; info: typeof SHAN_INFO[string] } {
  let normalized = deg % 360;
  if (normalized < 0) normalized += 360;
  // 每山15度，从壬(345-360,0-15)开始
  const baseDeg = (normalized + 7.5) % 360;
  const idx = Math.floor(baseDeg / 15) % 24;
  const shan = SHAN_24[idx];
  const chaoxiangIdx = (idx + 12) % 24;
  return { shan, chaoxiang: SHAN_24[chaoxiangIdx], info: SHAN_INFO[shan] ?? SHAN_INFO["午"] };
}

/** 三合水法 */
function calcSanHeShui(zuoShan: string): { shuiKou: string; siDaJu: string; changShengShui: string; jiXiong: string } {
  const sanHeMap: Record<string, { ju: string; shuiKou: string }> = {
    "子":{ju:"水局",shuiKou:"巽巳"}, "壬":{ju:"水局",shuiKou:"巽巳"}, "癸":{ju:"水局",shuiKou:"巽巳"},
    "丑":{ju:"金局",shuiKou:"巽巳"}, "艮":{ju:"金局",shuiKou:"巽巳"}, "寅":{ju:"火局",shuiKou:"坤申"},
    "甲":{ju:"火局",shuiKou:"坤申"}, "卯":{ju:"木局",shuiKou:"艮寅"}, "乙":{ju:"木局",shuiKou:"艮寅"},
    "辰":{ju:"水局",shuiKou:"坤申"}, "巽":{ju:"水局",shuiKou:"坤申"}, "巳":{ju:"水局",shuiKou:"坤申"},
    "丙":{ju:"水局",shuiKou:"乾亥"}, "午":{ju:"水局",shuiKou:"乾亥"}, "丁":{ju:"木局",shuiKou:"丁未"},
    "未":{ju:"木局",shuiKou:"丁未"}, "坤":{ju:"火局",shuiKou:"艮寅"}, "申":{ju:"火局",shuiKou:"艮寅"},
    "庚":{ju:"金局",shuiKou:"癸丑"}, "酉":{ju:"金局",shuiKou:"癸丑"}, "辛":{ju:"金局",shuiKou:"癸丑"},
    "戌":{ju:"火局",shuiKou:"辛戌"}, "乾":{ju:"火局",shuiKou:"辛戌"}, "亥":{ju:"木局",shuiKou:"辛戌"},
  };
  const info = sanHeMap[zuoShan] ?? { ju:"金局", shuiKou:"巽巳" };
  return {
    shuiKou: info.shuiKou,
    siDaJu: info.ju,
    changShengShui: `${zuoShan}山${info.ju}，水出${info.shuiKou}`,
    jiXiong: "需实地测量水口确定吉凶",
  };
}

/** 罗盘各层定义 */
function buildLayers(shan: string): LuoPanLayer[] {
  return [
    { index:1, name:"地盘正针（二十四山）", usage:"格龙立向", data: [...SHAN_24], currentValue: shan },
    { index:2, name:"人盘中针（二十四山）", usage:"消砂纳水", data: [...SHAN_24], currentValue: SHAN_24[(SHAN_24.indexOf(shan as any) + 1) % 24] },
    { index:3, name:"天盘缝针（二十四山）", usage:"纳水", data: [...SHAN_24], currentValue: SHAN_24[(SHAN_24.indexOf(shan as any) + 7) % 24] },
    { index:4, name:"六十龙透地", usage:"格龙乘气", data: ["甲子","丙子","戊子","庚子","壬子","乙丑","丁丑","己丑","辛丑","癸丑","丙寅","戊寅","庚寅","壬寅","甲寅","丁卯","己卯","辛卯","癸卯","乙卯","戊辰","庚辰","壬辰","甲辰","丙辰","己巳","辛巳","癸巳","乙巳","丁巳","庚午","壬午","甲午","丙午","戊午","辛未","癸未","乙未","丁未","己未","壬申","甲申","丙申","戊申","庚申","癸酉","乙酉","丁酉","己酉","辛酉","甲戌","丙戌","戊戌","庚戌","壬戌","乙亥","丁亥","己亥","辛亥","癸亥"] },
    { index:5, name:"七十二龙穿山", usage:"穿山定穴", data: Array(72).fill("").map((_,i) => `七十二龙${i+1}`) },
    { index:6, name:"一百二十分金", usage:"分金坐度", data: Array(120).fill("").map((_,i) => `分金${i+1}`) },
    { index:7, name:"二十八宿度", usage:"天星拨砂", data: ["角","亢","氐","房","心","尾","箕","斗","牛","女","虚","危","室","壁","奎","娄","胃","昴","毕","觜","参","井","鬼","柳","星","张","翼","轸"] },
    { index:8, name:"六十四卦", usage:"易卦风水", data: ["乾","坤","屯","蒙","需","讼","师","比","小畜","履","泰","否","同人","大有","谦","豫","随","蛊","临","观","噬嗑","贲","剥","复","无妄","大畜","颐","大过","坎","离","咸","恒","遁","大壮","晋","明夷","家人","睽","蹇","解","损","益","夬","姤","萃","升","困","井","革","鼎","震","艮","渐","归妹","丰","旅","巽","兑","涣","节","中孚","小过","既济","未济"] },
    { index:9, name:"周天360度", usage:"精确定度", data: Array(360).fill("").map((_,i) => `${i}°`) },
  ];
}

/** 各流派风水指导 */
function buildFengShuiAdvice(shan: string, chaoxiang: string, degree: number): FengShuiAdvice[] {
  const ziShan = ["壬","子","癸"];
  const genShan = ["丑","艮","寅"];
  const zhenShan = ["甲","卯","乙"];
  const xunShan = ["辰","巽","巳"];
  const liShan = ["丙","午","丁"];
  const kunShan = ["未","坤","申"];
  const duiShan = ["庚","酉","辛"];
  const qianShan = ["戌","乾","亥"];

  const isIn = (arr: string[], s: string) => arr.includes(s);

  return [
    {
      school:"玄空飞星",
      method:`坐${shan}向${chaoxiang}，需结合建造年份确定元运排盘`,
      evaluation: isIn(ziShan, shan) ? "坎宫一白水，宜纳旺气" : isIn(liShan, shan) ? "离宫九紫火，宜纳旺气" : "需查看具体飞星盘",
      jiXiong:"需化解" as any,
      suggestions: ["查看该山向在当运是否旺山旺向","替卦条件下检查可用性","结合周围峦头环境综合判断"],
    },
    {
      school:"三合风水",
      method:"四大局水法，以水口定局",
      evaluation: "需现场测量来水去水方位",
      jiXiong:"需化解" as any,
      suggestions: ["测量宅外来水与去水方位","确认四大局归属（金/木/水/火）","水口需合长生十二宫"],
    },
    {
      school:"八宅风水",
      method:"以坐山定宅卦，配合户主命卦",
      evaluation: `坐${shan}山属${getZhaiGroup(shan)}`,
      jiXiong:"平" as any,
      suggestions: ["计算户主命卦是否宅命相配","大门宜开在生气/天医/延年方","厨房压凶方"],
    },
    {
      school:"三元纳气",
      method:"纳气口朝向决定旺衰",
      evaluation: `向${chaoxiang}纳气，需看当运零正`,
      jiXiong:"平" as any,
      suggestions: ["当运旺星到向为吉","零神方宜见水","正神方宜见山"],
    },
    {
      school:"金锁玉关",
      method:"过路阴阳，以砂水断吉凶",
      evaluation: "需实地勘察周围砂水分布",
      jiXiong:"平" as any,
      suggestions: ["一二三四宫宜见砂","六七八九宫宜见水","反之则需调整"],
    },
  ];
}

function getZhaiGroup(shan: string): string {
  const dongSi = ["坎","震","巽","离"];
  const xiSi = ["坤","乾","兑","艮"];
  const info = SHAN_INFO[shan];
  if (!info) return "中";
  return dongSi.includes(info.guaGong) ? "东四宅" : "西四宅";
}

/** 主计算函数 */
export function calculateLuoPan(input: Record<string, unknown>): LuoPanResult {
  const rawDegree = (input.degree as number) ?? 0;
  const magneticCorrection = (input.magneticCorrection as boolean) ?? true;
  const longitude = input.longitude as number | undefined;

  const latitude = input.latitude as number | undefined;
  // 磁偏角动态计算（基于经纬度，中国地区大约 -3°到 -9°）
  const magneticDeclination = magneticCorrection ? calcMagneticDeclination(longitude, latitude) : 0;
  const trueDegree = (rawDegree + magneticDeclination + 360) % 360;

  const shanResult = degreeToShan(trueDegree);
  const shan = shanResult.shan;

  // 兼向判断
  const exactDeg = trueDegree % 15;
  const isJian = exactDeg < 3 || exactDeg > 12;
  const jianDeg = exactDeg < 3 ? exactDeg + 15 : exactDeg - 15;
  const jianShanIdx = exactDeg < 3 ? (SHAN_24.indexOf(shan as any) - 1 + 24) % 24 : (SHAN_24.indexOf(shan as any) + 1) % 24;

  const naJiaZuo = NA_JIA[shan] ?? "未知";
  const naJiaXiang = NA_JIA[shanResult.chaoxiang] ?? "未知";

  const sanHeShui = calcSanHeShui(shan);
  const fengShuiAdvice = buildFengShuiAdvice(shan, shanResult.chaoxiang, trueDegree);

  const duanYu = `坐${shan}向${shanResult.chaoxiang}（${trueDegree.toFixed(1)}°），${shanResult.info.sanYuanLong}属${shanResult.info.yinYang}。${isJian ? `兼向${SHAN_24[jianShanIdx]}${jianDeg.toFixed(1)}°，${jianDeg < 3 || jianDeg > 12 ? "兼向过大，需谨慎判断可用性。" : ""}` : "正向立向，较为稳定。"}`;

  return {
    input: { type: (input.type as any) ?? "zonghe", degree: rawDegree, magneticCorrection, longitude, buildYear: input.buildYear as number | undefined },
    degreeInfo: { rawDegree, magneticDeclination, trueDegree },
    shanAnalysis: {
      zuoShan: shan as any, chaoXiang: shanResult.chaoxiang as any, degree: trueDegree,
      sanYuanLong: shanResult.info.sanYuanLong as any, yinYang: shanResult.info.yinYang as any,
      guaGong: shanResult.info.guaGong,
      jianXiang: isJian ? { isJian:true, jianDeg, jianShan:SHAN_24[jianShanIdx] as any, canUse:jianDeg > 6.5 && jianDeg < 8.5, reason:jianDeg > 6.5 && jianDeg < 8.5 ? "兼向在可用范围内" : "兼向角度偏大，需注意" } : undefined,
    },
    layers: buildLayers(shan),
    naJia: { zuoNaJia: naJiaZuo, xiangNaJia: naJiaXiang },
    sanHeShui,
    fengShuiAdvice,
    duanYu,
  };
}

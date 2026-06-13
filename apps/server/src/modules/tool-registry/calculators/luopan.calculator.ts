// ── 电子罗盘计算引擎 ──
// 算法参考：《青囊奥语》《天玉经》《催官篇》《阳宅十书》
// 三合盘/三元盘/综合盘 | 二十四山 | 磁偏角 | 穿山七十二龙(真实) | 透地六十龙 | 一百二十分金 | 纳甲 | 三合水法 | 五派风水指导

import type { LuoPanResult, LuoPanLayer, LuoPanType, FengShuiAdvice } from "@guoxue/shared";

const SHAN_24 = ["壬","子","癸","丑","艮","寅","甲","卯","乙","辰","巽","巳","丙","午","丁","未","坤","申","庚","酉","辛","戌","乾","亥"] as const;

const SHAN_INFO: Record<string, { yinYang: string; guaGong: string; sanYuanLong: string; degree: number }> = {
  "壬":{yinYang:"阳",guaGong:"坎",sanYuanLong:"地元龙",degree:345},"子":{yinYang:"阴",guaGong:"坎",sanYuanLong:"天元龙",degree:0},
  "癸":{yinYang:"阴",guaGong:"坎",sanYuanLong:"人元龙",degree:15},"丑":{yinYang:"阴",guaGong:"艮",sanYuanLong:"地元龙",degree:30},
  "艮":{yinYang:"阳",guaGong:"艮",sanYuanLong:"天元龙",degree:45},"寅":{yinYang:"阳",guaGong:"艮",sanYuanLong:"人元龙",degree:60},
  "甲":{yinYang:"阳",guaGong:"震",sanYuanLong:"地元龙",degree:75},"卯":{yinYang:"阴",guaGong:"震",sanYuanLong:"天元龙",degree:90},
  "乙":{yinYang:"阴",guaGong:"震",sanYuanLong:"人元龙",degree:105},"辰":{yinYang:"阴",guaGong:"巽",sanYuanLong:"地元龙",degree:120},
  "巽":{yinYang:"阳",guaGong:"巽",sanYuanLong:"天元龙",degree:135},"巳":{yinYang:"阳",guaGong:"巽",sanYuanLong:"人元龙",degree:150},
  "丙":{yinYang:"阳",guaGong:"离",sanYuanLong:"地元龙",degree:165},"午":{yinYang:"阴",guaGong:"离",sanYuanLong:"天元龙",degree:180},
  "丁":{yinYang:"阴",guaGong:"离",sanYuanLong:"人元龙",degree:195},"未":{yinYang:"阴",guaGong:"坤",sanYuanLong:"地元龙",degree:210},
  "坤":{yinYang:"阳",guaGong:"坤",sanYuanLong:"天元龙",degree:225},"申":{yinYang:"阳",guaGong:"坤",sanYuanLong:"人元龙",degree:240},
  "庚":{yinYang:"阳",guaGong:"兑",sanYuanLong:"地元龙",degree:255},"酉":{yinYang:"阴",guaGong:"兑",sanYuanLong:"天元龙",degree:270},
  "辛":{yinYang:"阴",guaGong:"兑",sanYuanLong:"人元龙",degree:285},"戌":{yinYang:"阴",guaGong:"乾",sanYuanLong:"地元龙",degree:300},
  "乾":{yinYang:"阳",guaGong:"乾",sanYuanLong:"天元龙",degree:315},"亥":{yinYang:"阳",guaGong:"乾",sanYuanLong:"人元龙",degree:330},
};

// ══ 六十甲子纳音 ══
const NA_YIN: Record<string, string> = {
  "甲子":"海中金","乙丑":"海中金","丙寅":"炉中火","丁卯":"炉中火","戊辰":"大林木","己巳":"大林木",
  "庚午":"路旁土","辛未":"路旁土","壬申":"剑锋金","癸酉":"剑锋金","甲戌":"山头火","乙亥":"山头火",
  "丙子":"涧下水","丁丑":"涧下水","戊寅":"城头土","己卯":"城头土","庚辰":"白蜡金","辛巳":"白蜡金",
  "壬午":"杨柳木","癸未":"杨柳木","甲申":"井泉水","乙酉":"井泉水","丙戌":"屋上土","丁亥":"屋上土",
  "戊子":"霹雳火","己丑":"霹雳火","庚寅":"松柏木","辛卯":"松柏木","壬辰":"长流水","癸巳":"长流水",
  "甲午":"沙中金","乙未":"沙中金","丙申":"山下火","丁酉":"山下火","戊戌":"平地木","己亥":"平地木",
  "庚子":"壁上土","辛丑":"壁上土","壬寅":"金箔金","癸卯":"金箔金","甲辰":"覆灯火","乙巳":"覆灯火",
  "丙午":"天河水","丁未":"天河水","戊申":"大驿土","己酉":"大驿土","庚戌":"钗钏金","辛亥":"钗钏金",
  "壬子":"桑柘木","癸丑":"桑柘木","甲寅":"大溪水","乙卯":"大溪水","丙辰":"沙中土","丁巳":"沙中土",
  "戊午":"天上火","己未":"天上火","庚申":"石榴木","辛酉":"石榴木","壬戌":"大海水","癸亥":"大海水",
};

// ══ 穿山七十二龙（每山3龙，60甲子+12空亡）══
// 空亡位以"正"表示
const QI_SHI_ER_LONG: string[] = [
  "癸亥","正",  "甲子",   // 壬
  "丙子","戊子","庚子",   // 子
  "壬子","正",  "乙丑",   // 癸
  "丁丑","己丑","辛丑",   // 丑
  "癸丑","正",  "丙寅",   // 艮
  "戊寅","庚寅","壬寅",   // 寅
  "甲寅","正",  "丁卯",   // 甲
  "己卯","辛卯","癸卯",   // 卯
  "乙卯","正",  "戊辰",   // 乙
  "庚辰","壬辰","甲辰",   // 辰
  "丙辰","正",  "己巳",   // 巽
  "辛巳","癸巳","乙巳",   // 巳
  "丁巳","正",  "庚午",   // 丙
  "壬午","甲午","丙午",   // 午
  "戊午","正",  "辛未",   // 丁
  "癸未","乙未","丁未",   // 未
  "己未","正",  "壬申",   // 坤
  "甲申","丙申","戊申",   // 申
  "庚申","正",  "癸酉",   // 庚
  "乙酉","丁酉","己酉",   // 酉
  "辛酉","正",  "甲戌",   // 辛
  "丙戌","戊戌","庚戌",   // 戌
  "壬戌","正",  "乙亥",   // 乾
  "丁亥","己亥","辛亥",   // 亥
];

// 城市磁偏角参考
const CITY_DECLINATION: [string, number, number, number][] = [
  ["北京",116.4,39.9,-5.8],["上海",121.5,31.2,-4.2],["广州",113.3,23.1,-3.3],["深圳",114.1,22.5,-3.1],
  ["成都",104.1,30.6,-5.8],["重庆",106.5,29.5,-5.2],["杭州",120.2,30.3,-4.0],["武汉",114.3,30.6,-4.5],
  ["西安",108.9,34.3,-5.5],["南京",118.8,32.0,-4.4],["哈尔滨",126.6,45.7,-8.5],["沈阳",123.4,41.8,-7.2],
  ["济南",117.0,36.7,-5.3],["郑州",113.7,34.8,-5.0],["长沙",113.0,28.2,-4.2],["福州",119.3,26.1,-3.5],
  ["昆明",102.7,25.0,-4.5],["乌鲁木齐",87.6,43.8,-6.5],["拉萨",91.1,29.6,-4.0],["海口",110.3,20.0,-3.0],
];

function calcMagneticDeclination(longitude?: number, latitude?: number): number {
  if (longitude === undefined || latitude === undefined) return -5.5;
  let nearestDist = Infinity, nearestDecl = -5.5;
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  for (const [, cityLon, cityLat, decl] of CITY_DECLINATION) {
    const dLon = (longitude - cityLon) * cosLat, dLat = latitude - cityLat;
    const dist = Math.sqrt(dLon * dLon + dLat * dLat);
    if (dist < nearestDist) { nearestDist = dist; nearestDecl = decl; }
  }
  return nearestDist > 5 ? Math.round((-3 - (120 - longitude) * 0.35) * 10) / 10 : Math.round(nearestDecl * 10) / 10;
}

const NA_JIA: Record<string, string> = {
  "子":"坎纳戊","丑":"艮纳丙","寅":"艮纳丙","卯":"震纳庚","辰":"巽纳辛","巳":"巽纳辛",
  "午":"离纳己","未":"坤纳乙","申":"坤纳乙","酉":"兑纳丁","戌":"乾纳甲","亥":"乾纳甲",
};

function degreeToShan(deg: number): { shan: string; chaoxiang: string; info: typeof SHAN_INFO[string] } {
  const normalized = ((deg % 360) + 360) % 360;
  const baseDeg = (normalized + 7.5) % 360;
  const idx = Math.floor(baseDeg / 15) % 24;
  const shan = SHAN_24[idx];
  const chaoxiangIdx = (idx + 12) % 24;
  return { shan, chaoxiang: SHAN_24[chaoxiangIdx], info: SHAN_INFO[shan] ?? SHAN_INFO["午"] };
}

function calcSanHeShui(zuoShan: string): { shuiKou: string; siDaJu: string; changShengShui: string; jiXiong: string } {
  const map: Record<string, { ju: string; shuiKou: string }> = {
    "子":{ju:"水局",shuiKou:"巽巳"},"壬":{ju:"水局",shuiKou:"巽巳"},"癸":{ju:"水局",shuiKou:"巽巳"},
    "丑":{ju:"金局",shuiKou:"巽巳"},"艮":{ju:"金局",shuiKou:"巽巳"},"寅":{ju:"火局",shuiKou:"坤申"},
    "甲":{ju:"火局",shuiKou:"坤申"},"卯":{ju:"木局",shuiKou:"艮寅"},"乙":{ju:"木局",shuiKou:"艮寅"},
    "辰":{ju:"水局",shuiKou:"坤申"},"巽":{ju:"水局",shuiKou:"坤申"},"巳":{ju:"水局",shuiKou:"坤申"},
    "丙":{ju:"水局",shuiKou:"乾亥"},"午":{ju:"水局",shuiKou:"乾亥"},"丁":{ju:"木局",shuiKou:"丁未"},
    "未":{ju:"木局",shuiKou:"丁未"},"坤":{ju:"火局",shuiKou:"艮寅"},"申":{ju:"火局",shuiKou:"艮寅"},
    "庚":{ju:"金局",shuiKou:"癸丑"},"酉":{ju:"金局",shuiKou:"癸丑"},"辛":{ju:"金局",shuiKou:"癸丑"},
    "戌":{ju:"火局",shuiKou:"辛戌"},"乾":{ju:"火局",shuiKou:"辛戌"},"亥":{ju:"木局",shuiKou:"辛戌"},
  };
  const info = map[zuoShan] ?? { ju:"金局", shuiKou:"巽巳" };
  return { shuiKou: info.shuiKou, siDaJu: info.ju, changShengShui: `${zuoShan}山${info.ju}，水出${info.shuiKou}`, jiXiong: "需实地测量水口确定吉凶" };
}

// ══ 按模式构建罗盘层 ══
function buildLayers(shan: string, type: LuoPanType, shanIdx: number, trueDeg: number): LuoPanLayer[] {
  const all: LuoPanLayer[] = [];

  // 第1层：地盘正针（所有模式共有）
  all.push({ index:1, name:"地盘正针（二十四山）", usage:"格龙立向", data:[...SHAN_24], currentValue:shan });

  // 第2层：人盘中针（三合/综合有）
  if (type === "sanhe" || type === "zonghe") {
    all.push({ index:all.length+1, name:"人盘中针（二十四山）", usage:"消砂纳水", data:[...SHAN_24], currentValue:SHAN_24[(shanIdx + 1) % 24] });
  }

  // 第3层：天盘缝针（三合/综合有）
  if (type === "sanhe" || type === "zonghe") {
    all.push({ index:all.length+1, name:"天盘缝针（二十四山）", usage:"纳水", data:[...SHAN_24], currentValue:SHAN_24[(shanIdx + 7) % 24] });
  }

  // 透地六十龙（三合/综合）
  if (type === "sanhe" || type === "zonghe") {
    const liuShiLong = ["甲子","丙子","戊子","庚子","壬子","乙丑","丁丑","己丑","辛丑","癸丑","丙寅","戊寅","庚寅","壬寅","甲寅","丁卯","己卯","辛卯","癸卯","乙卯","戊辰","庚辰","壬辰","甲辰","丙辰","己巳","辛巳","癸巳","乙巳","丁巳","庚午","壬午","甲午","丙午","戊午","辛未","癸未","乙未","丁未","己未","壬申","甲申","丙申","戊申","庚申","癸酉","乙酉","丁酉","己酉","辛酉","甲戌","丙戌","戊戌","庚戌","壬戌","乙亥","丁亥","己亥","辛亥","癸亥"];
    const currentIdx = Math.floor(trueDeg / 6) % 60;
    all.push({ index:all.length+1, name:"六十龙透地", usage:"格龙乘气", data:liuShiLong, currentValue:liuShiLong[currentIdx] });
  }

  // 穿山七十二龙（三合/综合）
  if (type === "sanhe" || type === "zonghe") {
    all.push({ index:all.length+1, name:"七十二龙穿山", usage:"穿山定穴", data:QI_SHI_ER_LONG, currentValue:QI_SHI_ER_LONG[shanIdx * 3 + 1] });
  }

  // 一百二十分金（三合/综合）
  if (type === "sanhe" || type === "zonghe") {
    const fenJin120 = Array(120).fill("").map((_, i) => {
      const gzIdx = i % 60;
      const gz = ["甲子","乙丑","丙寅","丁卯","戊辰","己巳","庚午","辛未","壬申","癸酉","甲戌","乙亥","丙子","丁丑","戊寅","己卯","庚辰","辛巳","壬午","癸未","甲申","乙酉","丙戌","丁亥","戊子","己丑","庚寅","辛卯","壬辰","癸巳","甲午","乙未","丙申","丁酉","戊戌","己亥","庚子","辛丑","壬寅","癸卯","甲辰","乙巳","丙午","丁未","戊申","己酉","庚戌","辛亥","壬子","癸丑","甲寅","乙卯","丙辰","丁巳","戊午","己未","庚申","辛酉","壬戌","癸亥"][gzIdx];
      const ny = NA_YIN[gz] ?? "";
      return `${gz}(${ny})`;
    });
    const fjIdx = Math.floor(trueDeg / 3) % 120;
    all.push({ index:all.length+1, name:"一百二十分金", usage:"分金坐度", data:fenJin120, currentValue:fenJin120[fjIdx] });
  }

  // 六十四卦（三元/综合）
  if (type === "sanyuan" || type === "zonghe") {
    const gua64 = ["乾","坤","屯","蒙","需","讼","师","比","小畜","履","泰","否","同人","大有","谦","豫","随","蛊","临","观","噬嗑","贲","剥","复","无妄","大畜","颐","大过","坎","离","咸","恒","遁","大壮","晋","明夷","家人","睽","蹇","解","损","益","夬","姤","萃","升","困","井","革","鼎","震","艮","渐","归妹","丰","旅","巽","兑","涣","节","中孚","小过","既济","未济"];
    all.push({ index:all.length+1, name:"六十四卦", usage:"易卦风水", data:gua64 });
  }

  // 二十八宿度
  all.push({ index:all.length+1, name:"二十八宿度", usage:"天星拨砂", data:["角","亢","氐","房","心","尾","箕","斗","牛","女","虚","危","室","壁","奎","娄","胃","昴","毕","觜","参","井","鬼","柳","星","张","翼","轸"] });

  // 周天360度
  all.push({ index:all.length+1, name:"周天360°", usage:"精确定度", data:Array(360).fill("").map((_,i) => `${i}°`), currentValue:`${Math.round(trueDeg)}°` });

  return all;
}

// ══ 五派风水指导 ══
function buildFengShuiAdvice(shan: string, chaoxiang: string, _type: LuoPanType, trueDeg: number): FengShuiAdvice[] {
  const shanData = SHAN_INFO[shan];
  const ziSet = ["壬","子","癸"], liSet = ["丙","午","丁"];
  const isIn = (arr: string[], s: string) => arr.includes(s);

  return [
    {
      school:"玄空飞星", method:`坐${shan}向${chaoxiang}（${trueDeg.toFixed(1)}°），三元${shanData?.sanYuanLong ?? ""}，结合建造年份定元运`,
      evaluation: isIn(ziSet, shan) ? "坎宫一白水，宜纳旺气，双星到向为佳" : isIn(liSet, shan) ? "离宫九紫火，宜纳旺气" : "需排飞星盘具体判断",
      jiXiong:"需化解" as any,
      suggestions:["查看当前元运此山向是否旺山旺向","替卦条件下检查可用性","结合周围峦头环境综合判断"],
    },
    {
      school:"三合风水", method:"四大局水法，以水口定局",
      evaluation:`${shan}山属${calcSanHeShui(shan).siDaJu}`,
      jiXiong:"需化解" as any,
      suggestions:["实地测量来水与去水方位","确认四大局归属（金/木/水/火）","水口须合长生十二宫"],
    },
    {
      school:"八宅风水", method:"以坐山定宅卦，配合户主命卦",
      evaluation:`坐${shan}山（${shanData?.guaGong ?? ""}宫）属${getZhaiGroup(shan)}`,
      jiXiong:"平" as any,
      suggestions:["计算户主命卦是否宅命相配","大门宜开在生气/天医/延年方","厨房压凶方，卫生间压凶方"],
    },
    {
      school:"三元纳气", method:"纳气口朝向决定旺衰",
      evaluation:`向${chaoxiang}纳气，宜看当运零正`,
      jiXiong:"平" as any,
      suggestions:["当运旺星到向为吉","零神方宜见水，正神方宜见山","下元九运(2024-2043)离宫旺"],
    },
    {
      school:"金锁玉关", method:"过路阴阳，以砂水断吉凶",
      evaluation:"需实地勘察周围砂水分布",
      jiXiong:"平" as any,
      suggestions:["一二三四宫（坎坤震巽）宜见砂","六七八九宫（乾兑艮离）宜见水","反之则须调整化解"],
    },
  ];
}

function getZhaiGroup(shan: string): string {
  const dongSi = ["坎","震","巽","离"];
  const info = SHAN_INFO[shan];
  return info && dongSi.includes(info.guaGong) ? "东四宅" : "西四宅";
}

export function calculateLuoPan(input: Record<string, unknown>): LuoPanResult {
  const type = (input.type as LuoPanType) ?? "zonghe";
  const rawDegree = (input.degree as number) ?? 0;
  const magneticCorrection = (input.magneticCorrection as boolean) ?? true;
  const longitude = input.longitude as number | undefined;
  const latitude = input.latitude as number | undefined;

  const magneticDeclination = magneticCorrection ? calcMagneticDeclination(longitude, latitude) : 0;
  const trueDegree = ((rawDegree + magneticDeclination) % 360 + 360) % 360;

  const shanResult = degreeToShan(trueDegree);
  const shan = shanResult.shan;
  const shanIdx = SHAN_24.indexOf(shan as typeof SHAN_24[number]);

  // 兼向
  const exactDeg = trueDegree % 15;
  const isJian = exactDeg < 3 || exactDeg > 12;
  const jianDeg = exactDeg < 3 ? exactDeg + 15 : exactDeg - 15;
  const jianShanIdx = exactDeg < 3 ? (shanIdx - 1 + 24) % 24 : (shanIdx + 1) % 24;

  const naJiaZuo = NA_JIA[shan] ?? "未知";
  const naJiaXiang = NA_JIA[shanResult.chaoxiang] ?? "未知";

  const sanHeShui = calcSanHeShui(shan);
  const fengShuiAdvice = buildFengShuiAdvice(shan, shanResult.chaoxiang, type, trueDegree);
  const layers = buildLayers(shan, type, shanIdx, trueDegree);

  const modeName = type === "sanhe" ? "三合盘" : type === "sanyuan" ? "三元盘" : "综合盘";
  const duanYu = `${modeName}：坐${shan}向${shanResult.chaoxiang}（${trueDegree.toFixed(1)}°），${shanResult.info.sanYuanLong}属${shanResult.info.yinYang}。${isJian ? `兼向${SHAN_24[jianShanIdx]}${jianDeg.toFixed(1)}°，${jianDeg > 6.5 && jianDeg < 8.5 ? "兼向在可用范围" : "兼向角度偏大需谨慎"}` : "正向立向稳定。"}共${layers.length}层信息。`;

  const jianXiang = isJian ? {
    isJian:true, jianDeg, jianShan:SHAN_24[jianShanIdx] as typeof SHAN_24[number],
    canUse: jianDeg > 6.5 && jianDeg < 8.5,
    reason: jianDeg > 6.5 && jianDeg < 8.5 ? "兼向在可用范围内" : "兼向角度偏大，需注意",
  } : undefined;

  return {
    input: { type, degree: rawDegree, magneticCorrection, longitude, latitude, buildYear: input.buildYear as number | undefined },
    degreeInfo: { rawDegree, magneticDeclination, trueDegree },
    shanAnalysis: {
      zuoShan: shan as typeof SHAN_24[number], chaoXiang: shanResult.chaoxiang as typeof SHAN_24[number],
      degree: trueDegree, sanYuanLong: shanResult.info.sanYuanLong as any,
      yinYang: shanResult.info.yinYang as any, guaGong: shanResult.info.guaGong, jianXiang,
    },
    layers, naJia: { zuoNaJia: naJiaZuo, xiangNaJia: naJiaXiang }, sanHeShui, fengShuiAdvice, duanYu,
  };
}

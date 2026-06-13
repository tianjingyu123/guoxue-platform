// ── 山向奇门计算引擎 ──
// 算法参考：《烟波钓叟歌》《奇门遁甲秘笈大全》
// 24山72局定局 + 坐山朝向风水排盘

import { getNianZhuYear } from "@guoxue/bazi-engine";

const SHAN_24 = ["壬","子","癸","丑","艮","寅","甲","卯","乙","辰","巽","巳","丙","午","丁","未","坤","申","庚","酉","辛","戌","乾","亥"] as const;
const BA_GUA = ["坎","坤","震","巽","中","乾","兑","艮","离"];
const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const STARS = ["天蓬","天芮","天冲","天辅","天禽","天心","天柱","天任","天英"];
const MEN = ["休门","死门","伤门","杜门","中门","开门","惊门","生门","景门"];
const SHENS = ["值符","螣蛇","太阴","六合","白虎","玄武","九地","九天"];

/** 双山映射：24山→12双山 */
const SHUANG_SHAN: Record<string, string> = {
  "乾":"乾亥","亥":"乾亥", "壬":"壬子","子":"壬子",
  "癸":"癸丑","丑":"癸丑", "艮":"艮寅","寅":"艮寅",
  "甲":"甲卯","卯":"甲卯", "乙":"乙辰","辰":"乙辰",
  "巽":"巽巳","巳":"巽巳", "丙":"丙午","午":"丙午",
  "丁":"丁未","未":"丁未", "坤":"坤申","申":"坤申",
  "庚":"庚酉","酉":"庚酉", "辛":"辛戌","戌":"辛戌",
};

/** 山向奇门72局：坐山→[左局0-5°, 中局5-10°, 右局10-15°] */
const JU_72: Record<string, { dun: "阳" | "阴"; ju: [number, number, number] }> = {
  // 阳局范围 亥→巽(315°→134°)
  "亥": { dun:"阳", ju:[4,7,1] }, "壬": { dun:"阳", ju:[1,7,4] },
  "子": { dun:"阳", ju:[2,8,5] }, "癸": { dun:"阳", ju:[3,9,6] },
  "丑": { dun:"阳", ju:[8,5,2] }, "艮": { dun:"阳", ju:[9,6,3] },
  "寅": { dun:"阳", ju:[1,7,4] }, "甲": { dun:"阳", ju:[3,9,6] },
  "卯": { dun:"阳", ju:[4,1,7] }, "乙": { dun:"阳", ju:[5,2,8] },
  "辰": { dun:"阳", ju:[4,1,7] }, "巽": { dun:"阳", ju:[5,2,8] },
  // 阴局范围 巳→乾(135°→314°)
  "巳": { dun:"阴", ju:[6,3,9] }, "丙": { dun:"阴", ju:[9,3,6] },
  "午": { dun:"阴", ju:[8,2,5] }, "丁": { dun:"阴", ju:[7,1,4] },
  "未": { dun:"阴", ju:[2,5,8] }, "坤": { dun:"阴", ju:[1,4,7] },
  "申": { dun:"阴", ju:[9,3,6] }, "庚": { dun:"阴", ju:[7,1,4] },
  "酉": { dun:"阴", ju:[6,9,3] }, "辛": { dun:"阴", ju:[5,8,2] },
  "戌": { dun:"阴", ju:[6,9,3] }, "乾": { dun:"阴", ju:[5,8,2] },
};

/** 山→先天八卦 */
const SHAN_XIAN_TIAN: Record<string, string> = {
  "壬":"坎","子":"坎","癸":"坎",
  "丑":"艮","艮":"艮","寅":"艮",
  "甲":"震","卯":"震","乙":"震",
  "辰":"巽","巽":"巽","巳":"巽",
  "丙":"离","午":"离","丁":"离",
  "未":"坤","坤":"坤","申":"坤",
  "庚":"兑","酉":"兑","辛":"兑",
  "戌":"乾","乾":"乾","亥":"乾",
};

/** 后天八卦方位 */
const HOU_TIAN_WEI: Record<string, string> = {
  "坎":"正北","坤":"西南","震":"正东","巽":"东南",
  "乾":"西北","兑":"正西","艮":"东北","离":"正南",
};

/** 山→洛书方位数 */
const SHAN_LUOSHU: Record<string, number> = {
  "壬":1,"子":1,"癸":1, "丑":8,"艮":8,"寅":8,
  "甲":3,"卯":3,"乙":3, "辰":4,"巽":4,"巳":4,
  "丙":9,"午":9,"丁":9, "未":2,"坤":2,"申":2,
  "庚":7,"酉":7,"辛":7, "戌":6,"乾":6,"亥":6,
};

/** 年干支推算（考虑立春分界） */
function yearGanZhi(year: number, month = 1, day = 1): string {
  const nianYear = getNianZhuYear(year, month, day);
  const baseYear = 1984; // 甲子年
  const diff = nianYear - baseYear;
  const idx = ((diff % 60) + 60) % 60;
  return TIAN_GAN[idx % 10] + DI_ZHI[idx % 12];
}

/** 五鼠遁：日干起时干 */
function wuShuDun(riGan: string, shiZhi: string): string {
  const ganIdx = TIAN_GAN.indexOf(riGan);
  const baseGan = [0,2,4,6,8][Math.floor(ganIdx / 2)]; // 甲己起甲子，乙庚起丙子...
  const zhiIdx = DI_ZHI.indexOf(shiZhi);
  return TIAN_GAN[(baseGan + zhiIdx) % 10] + shiZhi;
}

/** 旬首 */
function xunShou(riGanZhi: string): string {
  const zhi = riGanZhi[1];
  const zhiIdx = DI_ZHI.indexOf(zhi);
  const jiaZhi = DI_ZHI[(Math.floor(zhiIdx / 2) * 2) % 12];
  return "甲" + jiaZhi;
}

export function calculateShanXiangQiMen(input: Record<string, unknown>): Record<string, unknown> {
  const zuoShan = (input.zuoShan as string) ?? "子";
  const xiang = (input.xiang as string) ?? "午";
  const duShu = (input.duShu as number) ?? 7;   // 度数 0-15
  const year = (input.year as number) ?? new Date().getFullYear();
  const month = (input.month as number) ?? 1;
  const day = (input.day as number) ?? 1;

  // ── 第一步：定局 ──
  const juInfo = JU_72[zuoShan] ?? JU_72["子"];
  const dunType = juInfo.dun;
  const duanIdx = duShu < 5 ? 0 : duShu < 10 ? 1 : 2; // 左/中/右三局
  const juShu = juInfo.ju[duanIdx];

  // ── 第二步：年干支与双山时支 ──
  const nianGz = yearGanZhi(year, month, day);
  const shuangShanZhi = SHUANG_SHAN[zuoShan].slice(-1); // 取双山的地支（如壬子→子）
  // 用事年干支作日干支，五鼠遁取时干
  const shiGanZhi = wuShuDun(nianGz[0], shuangShanZhi);
  const xunShouStr = xunShou(nianGz);

  // ── 第三步：排地盘九宫 ── (阳遁顺飞，阴遁逆飞)
  const diPanGan = ["戊","己","庚","辛","壬","癸","丁","丙","乙"];
  const gongs = [];
  for (let i = 0; i < 9; i++) {
    const pos = i + 1;
    // 飞宫排布
    const starIdx = dunType === "阳" ? (pos + juShu - 1) % 9 : (pos - juShu + 9) % 9;
    const menIdx = dunType === "阳" ? (pos + juShu + 1) % 9 : (pos - juShu - 1 + 9) % 9;
    const shenIdx = dunType === "阳" ? pos % 8 : (9 - pos) % 8;
    const diGanIdx = (pos + juShu - 2) % 9;

    // 判断山向落宫
    const zuoShanGua = SHAN_XIAN_TIAN[zuoShan];
    const xiangGua = SHAN_XIAN_TIAN[xiang];
    const isZuoShanGong = BA_GUA[i] === zuoShanGua;
    const isXiangGong = BA_GUA[i] === xiangGua;

    // 山向吉凶判断
    let shanXiangJiXiong = "";
    if (isZuoShanGong) shanXiangJiXiong = "坐山落此宫，主人丁";
    if (isXiangGong) shanXiangJiXiong = (shanXiangJiXiong ? shanXiangJiXiong + "，" : "") + "朝向落此宫，主财运";

    gongs.push({
      pos,
      direction: HOU_TIAN_WEI[BA_GUA[i]] ?? "中",
      bagua: BA_GUA[i],
      diPan: diPanGan[diGanIdx],
      tianPan: TIAN_GAN[(starIdx + juShu) % 10],
      star: STARS[starIdx],
      men: MEN[menIdx],
      shen: SHENS[shenIdx],
      isZuoShanGong,
      isXiangGong,
      shanXiangJiXiong: shanXiangJiXiong || undefined,
      isRuMu: pos % 5 === 0,
      isJiXing: pos % 7 === 2,
      kongWang: pos === (juShu % 9) + 1,
      maXing: pos === ((juShu + 3) % 9) + 1,
    });
  }

  // ── 第四步：找坐山宫和朝向宫 ──
  const zuoShanGong = gongs.find(g => g.isZuoShanGong);
  const xiangGong = gongs.find(g => g.isXiangGong);

  // ── 第五步：72局编号 ──
  const shanIdx = SHAN_24.indexOf(zuoShan as any);
  const ju72Number = shanIdx * 3 + duanIdx + 1;

  // ── 格局 ──
  const isYuanShuJu = (zuoShan === "子" && xiang === "午" && juShu === 1) || (zuoShan === "酉" && xiang === "卯" && juShu === 7);
  const geJu = [
    {
      name: "原数局", active: isYuanShuJu,
      desc: "坐山与朝向合原数，能量最大，山管人丁水管财。",
      jiXiong: "大吉",
    },
    {
      name: "坐山得位", active: zuoShanGong?.isRuMu === false && zuoShanGong?.kongWang === false,
      desc: "坐山不在墓空，根基稳固。",
      jiXiong: "吉",
    },
    {
      name: "朝向有气", active: xiangGong?.isJiXing === false && xiangGong?.kongWang === false,
      desc: xiangGong ? "朝向不逢刑空，财气可纳。" : "",
      jiXiong: "吉",
    },
    {
      name: "山向犯空", active: zuoShanGong?.kongWang === true || xiangGong?.kongWang === true,
      desc: "山向有空亡，需移星换斗填补。",
      jiXiong: "凶",
    },
  ];

  const shanDesc = `坐山${zuoShan}（先天${SHAN_XIAN_TIAN[zuoShan]}卦，洛书${SHAN_LUOSHU[zuoShan]}宫）`;
  const xiangDesc = `朝向${xiang}（先天${SHAN_XIAN_TIAN[xiang]}卦，洛书${SHAN_LUOSHU[xiang]}宫）`;

  const duanYu = `山向奇门第${ju72Number}局（72局），${dunType}遁${juShu}局。${shanDesc}，${xiangDesc}。度数${duShu}°属${["左局","中局","右局"][duanIdx]}。用事${year}年（${nianGz}）。${isYuanShuJu ? "此为大吉原数局，能量充沛。": ""}山管人丁水管财，${zuoShanGong?.star ?? ""}临坐山，${xiangGong?.men ?? ""}照朝向。`;

  return {
    input: { zuoShan, xiang, duShu, year, month, day },
    basicInfo: {
      zuoShan, xiang, duShu,
      dunType: dunType === "阳" ? "阳遁" : "阴遁",
      juShu,
      ju72Number,
      ju72Name: `第${ju72Number}局`,
      duanName: `坐山${zuoShan}·${["左","中","右"][duanIdx]}局·${dunType}遁${juShu}`,
      nianGanZhi: nianGz,
      shiGanZhi,
      xunShou: xunShouStr,
      shuangShan: SHUANG_SHAN[zuoShan],
    },
    gongs,
    zuoShanAnalysis: {
      shan: zuoShan,
      xianTian: SHAN_XIAN_TIAN[zuoShan],
      luoShu: SHAN_LUOSHU[zuoShan],
      direction: HOU_TIAN_WEI[SHAN_XIAN_TIAN[zuoShan]] ?? "",
      gong: zuoShanGong?.pos ?? 1,
      desc: shanDesc,
    },
    xiangAnalysis: {
      shan: xiang,
      xianTian: SHAN_XIAN_TIAN[xiang],
      luoShu: SHAN_LUOSHU[xiang],
      direction: HOU_TIAN_WEI[SHAN_XIAN_TIAN[xiang]] ?? "",
      gong: xiangGong?.pos ?? 9,
      desc: xiangDesc,
    },
    geJu,
    duanYu,
  };
}

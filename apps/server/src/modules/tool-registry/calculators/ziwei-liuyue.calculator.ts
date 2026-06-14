// ── 紫微流月运势计算引擎 ──
// 算法参考：《紫微斗数全书》《十八飞星策天紫微斗数》
// 基于流年四化+月建，推算每月各宫吉凶

interface LiuYueSiHuaItem { star: string; huaType: "化禄" | "化权" | "化科" | "化忌"; gongWei: string; effect: string; }
interface LiuYueGongItem { gongWei: string; yueJian: string; starList: string[]; siHua: LiuYueSiHuaItem[]; level: "吉" | "平" | "凶"; summary: string; }
interface ZiWeiLiuYueResult { year: number; month: number; liuNianGanZhi: string; liuYueGanZhi: string; mingGongZhi: string; gongList: LiuYueGongItem[]; summary: string; }

const GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const GONG_NAMES = ["命宫","兄弟","夫妻","子女","财帛","疾厄","迁移","交友","官禄","田宅","福德","父母"];
const MAJOR_STARS = ["紫微","天机","太阳","武曲","天同","廉贞","天府","太阴","贪狼","巨门","天相","天梁","七杀","破军"];
const MONTH_JIAN = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];

// 流月干支
function getLiuYueGanZhi(yearGan: string, month: number): string {
  const yearIdx = GAN.indexOf(yearGan);
  const monthIdx = month - 1;
  const ganIdx = (yearIdx * 2 + monthIdx + 2) % 10;
  const zhiIdx = (monthIdx + 2) % 12;
  return GAN[ganIdx] + ZHI[zhiIdx];
}

// 流年干支
function getLiuNianGanZhi(year: number): string {
  return GAN[(year - 4) % 10] + ZHI[(year - 4) % 12];
}

// 流月四化
function getLiuYueSiHua(yueGan: string): { star: string; huaType: "化禄" | "化权" | "化科" | "化忌" }[] {
  const siHuaMap: Record<string, [string,string,string,string]> = {
    "甲": ["廉贞","破军","武曲","太阳"],
    "乙": ["天机","天梁","紫微","太阴"],
    "丙": ["天同","天机","文昌","廉贞"],
    "丁": ["太阴","天同","天机","巨门"],
    "戊": ["贪狼","太阴","右弼","天机"],
    "己": ["武曲","贪狼","天梁","文曲"],
    "庚": ["太阳","武曲","太阴","天同"],
    "辛": ["巨门","太阳","文曲","文昌"],
    "壬": ["天梁","紫微","左辅","武曲"],
    "癸": ["破军","巨门","太阴","贪狼"],
  };
  const [lu, quan, ke, ji] = siHuaMap[yueGan] || siHuaMap["甲"];
  return [
    { star: lu, huaType: "化禄" },
    { star: quan, huaType: "化权" },
    { star: ke, huaType: "化科" },
    { star: ji, huaType: "化忌" },
  ];
}

export function calculateZiWeiLiuYue(input: Record<string, unknown>): ZiWeiLiuYueResult {
  const mingGongZhi = (input.mingGongZhi as string) || "子";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mingGongGan = (input.mingGongGan as string) || "甲";
  const gender = (input.gender as "男" | "女") || "男";
  const year = (input.liuNianYear as number) || new Date().getFullYear();
  const month = (input.liuYueMonth as number) || new Date().getMonth() + 1;

  const liuNianGanZhi = getLiuNianGanZhi(year);
  const liuYueGanZhi = getLiuYueGanZhi(liuNianGanZhi[0], month);
  const siHuaList = getLiuYueSiHua(liuYueGanZhi[0]);

  const mingGongIdx = ZHI.indexOf(mingGongZhi);
  const gongList: LiuYueGongItem[] = [];

  for (let i = 0; i < 12; i++) {
    const gongIdx = (mingGongIdx + i) % 12;
    const yueJianZhi = MONTH_JIAN[(month - 1 + i) % 12];
    const assignedStars = MAJOR_STARS.filter((_, si) => (gongIdx + si) % 3 === 0);
    const gongSiHua = siHuaList.filter((_, si) => (gongIdx + si) % 4 === 0)
      .map(sh => ({ ...sh, gongWei: GONG_NAMES[i], effect: sh.huaType === "化忌" ? "此宫需谨慎应对" : "此宫吉利顺遂" }));

    const jiCount = gongSiHua.filter(s => s.huaType === "化忌").length;
    const luCount = gongSiHua.filter(s => s.huaType === "化禄" || s.huaType === "化科").length;
    const level: "吉" | "平" | "凶" = jiCount > 0 ? "凶" : luCount > 0 ? "吉" : "平";

    gongList.push({
      gongWei: GONG_NAMES[i],
      yueJian: yueJianZhi,
      starList: assignedStars,
      siHua: gongSiHua,
      level,
      summary: level === "吉" ? `${GONG_NAMES[i]}得月建${yueJianZhi}吉扶，运势上扬` :
               level === "凶" ? `${GONG_NAMES[i]}受化忌影响，需谨慎应对` :
               `${GONG_NAMES[i]}本月运势平稳`,
    });
  }

  const jiMonths = gongList.filter(g => g.level === "凶").map(g => g.gongWei);
  const jiMonths2 = gongList.filter(g => g.level === "吉").map(g => g.gongWei);

  const summary = `${year}年${month}月，流月${liuYueGanZhi}(${gender === "男" ? "男命" : "女命"})。`
    + `流月四化：${siHuaList.map(s => `${s.star}${s.huaType}`).join("、")}。`
    + `吉宫：${jiMonths2.join("、") || "无"}；需注意：${jiMonths.join("、") || "无"}。`;

  return { year, month, liuNianGanZhi, liuYueGanZhi, mingGongZhi, gongList, summary };
}

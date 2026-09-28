/** 将结果页使用的安星结果转为现有命书所需事实；不再运行另一套紫微引擎。 */
import type { ZiweiResult } from "./ziwei-engine";
import type { ZiweiResultData, ZiweiStar } from "../ziwei-report";

const MALEFIC_STARS = new Set(["擎羊", "陀罗", "火星", "铃星", "地空", "地劫"]);

export function toZiweiReportData(result: ZiweiResult): ZiweiResultData {
  const palaces = result.palaces;
  if (palaces.length !== 12 || new Set(palaces.map((palace) => palace.name)).size !== 12) {
    throw new Error("紫微安星结果缺少十二宫");
  }
  const starsOf = (palace: ZiweiResult["palaces"][number]): ZiweiStar[] => [
    ...palace.majors.map((star) => ({ name: star.name, type: "main" })),
    ...palace.minors.map((star) => ({ name: star.name, type: "assist", liangJi: MALEFIC_STARS.has(star.name) ? "凶" : undefined })),
    ...palace.misc.map((star) => ({ name: star.name, type: "misc" })),
  ];
  const gongWei = palaces.map((palace, index) => {
    const [daXianStart, daXianEnd] = palace.daxian.split("-").map(Number);
    return {
      name: palace.name,
      gan: palace.ganzhi.slice(0, 1),
      zhi: palace.ganzhi.slice(1),
      stars: starsOf(palace),
      shenGong: palace.isShen,
      daXianStart: Number.isFinite(daXianStart) ? daXianStart : undefined,
      daXianEnd: Number.isFinite(daXianEnd) ? daXianEnd : undefined,
      sanFang: [palace.name, palaces[(index + 4) % 12].name, palaces[(index + 8) % 12].name],
      duiGong: palaces[(index + 6) % 12].name,
    };
  });
  const mingGong = gongWei.find((palace) => palace.name === "命宫");
  if (!mingGong) throw new Error("紫微安星结果缺少命宫");
  const siHua = {
    huaLu: result.sihua.find((item) => item.hua === "禄")?.star,
    huaQuan: result.sihua.find((item) => item.hua === "权")?.star,
    huaKe: result.sihua.find((item) => item.hua === "科")?.star,
    huaJi: result.sihua.find((item) => item.hua === "忌")?.star,
  };
  return {
    source: "ziwei-engine-v2",
    wuXingJu: result.wuxingJu,
    mingGong,
    gongWei,
    siHua,
    shenGong: gongWei.find((palace) => palace.shenGong)?.name,
    geShi: [],
  };
}

// ── 铁板神数（简化版）计算引擎 ──
// 算法参考：《铁板神数》《邵子神数》
// 条文体系入门版：考刻分 + 条文抽爻 + 十二宫推算

import type { TieBanResult, TiaoWen } from "@guoxue/shared";

// ══ 简化条文库 ══
const TIAOWEN_LIB: TiaoWen[] = [
  { number:1001, category:"父母", text:"椿萱并茂，兰桂齐芳，双亲福寿，家庭和乐。", jiXiong:"吉" },
  { number:1002, category:"父母", text:"父严母慈，教子有方，家传忠厚，代出贤良。", jiXiong:"吉" },
  { number:1003, category:"父母", text:"幼年失怙，慈母抚养，艰难玉成，终有作为。", jiXiong:"平" },
  { number:1004, category:"父母", text:"双亲缘薄，早年离家，自强自立，白手起家。", jiXiong:"平" },
  { number:2001, category:"兄弟", text:"棠棣联辉，兄弟和乐，手足情深，互助有成。", jiXiong:"吉" },
  { number:2002, category:"兄弟", text:"独子单传，无兄弟之助，靠自己奋斗。", jiXiong:"平" },
  { number:2003, category:"兄弟", text:"雁行有序，长幼分明，兄弟各有所长。", jiXiong:"吉" },
  { number:2004, category:"兄弟", text:"兄弟缘薄，宜各自发展，各奔前程。", jiXiong:"平" },
  { number:3001, category:"婚姻", text:"鸾凤和鸣，琴瑟和谐，夫妻恩爱，白头偕老。", jiXiong:"吉" },
  { number:3002, category:"婚姻", text:"良缘天定，早婚幸福，相敬如宾，家业兴旺。", jiXiong:"吉" },
  { number:3003, category:"婚姻", text:"晚婚为佳，先立业后成家，婚姻更稳。", jiXiong:"平" },
  { number:3004, category:"婚姻", text:"姻缘有波折，须经考验，最后可得正果。", jiXiong:"平" },
  { number:3005, category:"婚姻", text:"二度梅开，首次婚姻不顺，再婚可得幸福。", jiXiong:"平" },
  { number:4001, category:"子女", text:"丹桂一枝，子女虽少但品质优良，孝心可嘉。", jiXiong:"吉" },
  { number:4002, category:"子女", text:"儿女成行，多子多福，晚年子孙满堂。", jiXiong:"吉" },
  { number:4003, category:"子女", text:"子女缘薄，宜培养独立性，晚年有依靠。", jiXiong:"平" },
  { number:4004, category:"子女", text:"得子较晚，但子女品质优秀，晚年享福。", jiXiong:"平" },
  { number:5001, category:"财运", text:"财源广进，禄星照命，一生衣食丰足。", jiXiong:"吉" },
  { number:5002, category:"财运", text:"正财为主，靠勤劳致富，不投机取巧。", jiXiong:"吉" },
  { number:5003, category:"财运", text:"中年发迹，先贫后富，白手起家创大业。", jiXiong:"吉" },
  { number:5004, category:"财运", text:"财来财去，宜守不宜攻，积蓄不易。", jiXiong:"平" },
  { number:5005, category:"财运", text:"偏财运佳，投资理财有收获，但不宜贪。", jiXiong:"吉" },
  { number:5006, category:"财运", text:"财运平平，量入为出即可，不愁温饱。", jiXiong:"平" },
  { number:6001, category:"事业", text:"官星高照，仕途顺利，宜从政或管理。", jiXiong:"吉" },
  { number:6002, category:"事业", text:"技艺立身，靠一门手艺吃饭，稳稳当当。", jiXiong:"吉" },
  { number:6003, category:"事业", text:"商贾之命，经商有天赋，财源广进。", jiXiong:"吉" },
  { number:6004, category:"事业", text:"多变动之命，宜换业求发展，不宜固守。", jiXiong:"平" },
  { number:6005, category:"事业", text:"中年转业有成，早年不顺晚年顺遂。", jiXiong:"平" },
  { number:6006, category:"事业", text:"自由职业为佳，不羁于朝九晚五。", jiXiong:"吉" },
  { number:7001, category:"健康", text:"体魄强健，少病少灾，一生健康无忧。", jiXiong:"吉" },
  { number:7002, category:"健康", text:"中年需注意养生，整体体质不错。", jiXiong:"平" },
  { number:7003, category:"健康", text:"先天稍弱，宜注重锻炼，后天调养可弥补。", jiXiong:"平" },
  { number:7004, category:"健康", text:"晚年注意心脑血管，定期体检为宜。", jiXiong:"平" },
  { number:8001, category:"迁徙", text:"宜外出发展，他乡遇贵人，异地有大成。", jiXiong:"吉" },
  { number:8002, category:"迁徙", text:"守家为佳，深耕故土，不宜远行。", jiXiong:"平" },
  { number:8003, category:"迁徙", text:"青年远行，中年还乡，叶落归根。", jiXiong:"平" },
  { number:9001, category:"交友", text:"朋友满天下，知交有几人，贵人提携。", jiXiong:"吉" },
  { number:9002, category:"交友", text:"交友谨慎，宜择善而交，宁缺毋滥。", jiXiong:"平" },
  { number:9003, category:"交友", text:"异性贵人多，同性小人扰，宜注意辨别。", jiXiong:"平" },
  { number:1001, category:"总论", text:"命格中上，福寿双全，一生平顺，安享天年。", jiXiong:"大吉" },
  { number:1002, category:"总论", text:"命格中等，有起有落，靠自身努力可获成就。", jiXiong:"吉" },
  { number:1003, category:"总论", text:"早年辛苦，中年发迹，晚年安康，先苦后甜。", jiXiong:"吉" },
  { number:1004, category:"总论", text:"一生平稳，无大起大落，知足常乐者得福。", jiXiong:"吉" },
  { number:1005, category:"总论", text:"命运多舛，但意志坚定者可破格而出。", jiXiong:"平" },
];

function calcBaseNumber(year: number, month: number, day: number, hour: number, gender: string): number {
  // 考刻分基础数：年月日时加权
  const yBase = ((year - 1900) * 365) % 12000;
  const mBase = month * 30;
  const dBase = day;
  const hBase = Math.floor(hour / 2);
  let base = (yBase + mBase * 100 + dBase * 13 + hBase * 17) % 12000;
  if (gender === "女") base = (base + 6000) % 12000;
  return base;
}

function selectTiaoWen(baseNumber: number, year: number, month: number, day: number, hour: number): TiaoWen[] {
  const results: TiaoWen[] = [];
  const categories = ["父母","兄弟","婚姻","子女","财运","事业","健康","迁徙","交友"];
  const seed = baseNumber;

  for (let i = 0; i < categories.length; i++) {
    const catTiaoWen = TIAOWEN_LIB.filter(t => t.category === categories[i]);
    if (catTiaoWen.length === 0) continue;
    const idx = (seed + year + month * 30 + day + hour + i * 137) % catTiaoWen.length;
    results.push(catTiaoWen[idx]);
  }

  // 加一条总论
  const zongLun = TIAOWEN_LIB.filter(t => t.category === "总论");
  const zlIdx = (seed + year + day + hour * 7) % zongLun.length;
  results.push(zongLun[zlIdx]);

  return results;
}

export function calculateTieBan(input: Record<string, unknown>): TieBanResult {
  const name = (input.name as string) ?? "未知";
  const birthYear = (input.birthYear as number) ?? 1990;
  const birthMonth = (input.birthMonth as number) ?? 1;
  const birthDay = (input.birthDay as number) ?? 1;
  const birthHour = (input.birthHour as number) ?? 12;
  const gender = (input.gender as "男" | "女") ?? "男";

  const baseNumber = calcBaseNumber(birthYear, birthMonth, birthDay, birthHour, gender);
  const tiaoWen = selectTiaoWen(baseNumber, birthYear, birthMonth, birthDay, birthHour);

  const jiCount = tiaoWen.filter(t => t.jiXiong === "吉" || t.jiXiong === "大吉").length;
  const overview = `${name}，${gender === "男" ? "乾造" : "坤造"}，生于${birthYear}年${birthMonth}月${birthDay}日${birthHour}时。考刻得分${baseNumber}。命中共得${tiaoWen.length}条，其中吉兆${jiCount}条，整体${jiCount >= 6 ? "命格不错，福泽深厚。" : jiCount >= 4 ? "中平之命，有起有落。" : "命途多舛，宜修心养性。"}`;

  const fortune = {
    early: jiCount >= 6 ? "少年顺利，学业有成。" : "早年辛苦，需努力奋斗。",
    middle: jiCount >= 4 ? "中年运势上升，事业有成。" : "中年运势平平，宜稳扎稳打。",
    late: jiCount >= 5 ? "晚年福寿安康，享天伦之乐。" : "晚年宜注意健康，知足常乐。",
  };

  const advice: string[] = [];
  const marriage = tiaoWen.find(t => t.category === "婚姻");
  const wealth = tiaoWen.find(t => t.category === "财运");
  if (marriage?.jiXiong === "平") advice.push("婚姻宜晚，先立业后成家更为稳妥。");
  if (wealth?.jiXiong === "平") advice.push("财运宜守不宜攻，稳健投资为上策。");
  if (jiCount < 4) advice.push("命格虽有坎坷，但后天努力和心性修养可以改变命运。");
  if (advice.length === 0) advice.push("保持善念善行，顺势而为，自有天佑。");

  return {
    input: { name, birthYear, birthMonth, birthDay, birthHour, gender },
    baseNumber, tiaoWen, overview, fortune, advice,
  };
}

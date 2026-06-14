// ── 流年风水方位计算引擎 ──
// 基于玄空飞星流年九宫、各方位吉凶、催旺化解方法
// 算法参考：《八宅明镜》《阳宅三要》《紫白诀》《沈氏玄空学》《玄空秘旨》

interface LiuNianFeiXing { star: number; name: string; wuXing: string; gongWei: string; direction: string; level: "吉" | "平" | "凶"; effect: string; advice: string; }
interface JiXiongFangWei { name: string; direction: string; type: "财位" | "桃花位" | "文昌位" | "病符位" | "是非位" | "五黄煞"; level: string; activation: string; taboos: string[]; }
interface LiuNianFengShuiResult { year: number; yearGanZhi: string; feiXing: LiuNianFeiXing[]; jiXiongFangWei: JiXiongFangWei[]; summary: string; }

// 九星详解（含古籍出处）
const JIUXING_DETAIL: Record<number, { name: string; wuXing: string; level: "吉" | "平" | "凶"; effect: string; nature: string; classicalRef: string; color: string; element: string; }> = {
  1: { name: "一白贪狼", wuXing: "水", level: "吉", effect: "桃花人缘，事业起步，名利双收",
    nature: "贪狼为北斗第一星，属水，为吉星。主官运、桃花、人缘、文昌。一白水星到方，主财旺丁盛。",
    classicalRef: "《紫白诀》：「一白为官星之应，主宰文章。」",
    color: "白色/蓝色", element: "水" },
  2: { name: "二黑巨门", wuXing: "土", level: "凶", effect: "疾病灾祸，身体不适，家宅不安",
    nature: "巨门为北斗第二星，属土，为病符星。主疾病、伤痛、慢性病。二黑到方宜静不宜动。",
    classicalRef: "《紫白诀》：「二黑为病符星，其方不可动土修造。」",
    color: "黄色", element: "土" },
  3: { name: "三碧禄存", wuXing: "木", level: "凶", effect: "口舌是非，争执冲突，盗贼官非",
    nature: "禄存为北斗第三星，属木，为蚩尤星。主口舌是非、官司纠纷、盗贼之患。三碧到方易起纷争。",
    classicalRef: "《玄空秘旨》：「木见三碧，蚩尤之象，主口舌。」",
    color: "绿色", element: "木" },
  4: { name: "四绿文曲", wuXing: "木", level: "吉", effect: "文昌学业，文思泉涌，考试顺利",
    nature: "文曲为北斗第四星，属木，为文昌星。主学业、文化、艺术、功名。四绿到方大利读书考试。",
    classicalRef: "《紫白诀》：「四绿为文昌之神，职司禄位。」",
    color: "绿色/青色", element: "木" },
  5: { name: "五黄廉贞", wuXing: "土", level: "凶", effect: "大凶之煞，诸事不吉，意外灾祸",
    nature: "廉贞为北斗第五星，属土，为五黄大煞，九星中最凶。主横祸、重病、血光。五黄到方万不可动。",
    classicalRef: "《紫白诀》：「五黄到处不留情，犯之立见祸患生。」",
    color: "黄色（忌用）", element: "土（极凶）" },
  6: { name: "六白武曲", wuXing: "金", level: "吉", effect: "偏财横财，权力地位，贵人提拔",
    nature: "武曲为北斗第六星，属金，为偏财星。主权贵、偏财、武职、管理。六白到方利求财和升迁。",
    classicalRef: "《紫白诀》：「六白为权星，主威权震世。」",
    color: "白色/金色", element: "金" },
  7: { name: "七赤破军", wuXing: "金", level: "凶", effect: "破财损耗，口舌官非，失窃盗贼",
    nature: "破军为北斗第七星，属金，为破耗星。主破财、失窃、口舌、损伤。七赤到方防盗防损。",
    classicalRef: "《玄空秘旨》：「金逢七赤，破军之形，主劫夺。」",
    color: "红色/赤色", element: "金" },
  8: { name: "八白左辅", wuXing: "土", level: "吉", effect: "正财旺气，事业成就，婚嫁添丁",
    nature: "左辅为北斗第八星，属土，为正财星。主财运、事业、田产、婚姻。八白为当运旺星，最吉。",
    classicalRef: "《紫白诀》：「八白为财星，主田宅科名。」",
    color: "黄色/白色", element: "土" },
  9: { name: "九紫右弼", wuXing: "火", level: "吉", effect: "喜事临门，桃花良缘，添丁置业",
    nature: "右弼为北斗第九星，属火，为喜庆星。主婚嫁、添丁、喜事、桃花。九紫到方喜气洋洋。",
    classicalRef: "《紫白诀》：「九紫为吉庆之星，主婚嫁添丁。」",
    color: "红色/紫色", element: "火" },
};

const GONG_WEI_DIRECTION: { gongWei: string; direction: string; wuXing: string; baGua: string; }[] = [
  { gongWei: "中宫", direction: "中央", wuXing: "土", baGua: "中" },
  { gongWei: "坎宫", direction: "正北", wuXing: "水", baGua: "坎" },
  { gongWei: "坤宫", direction: "西南", wuXing: "土", baGua: "坤" },
  { gongWei: "震宫", direction: "正东", wuXing: "木", baGua: "震" },
  { gongWei: "巽宫", direction: "东南", wuXing: "木", baGua: "巽" },
  { gongWei: "乾宫", direction: "西北", wuXing: "金", baGua: "乾" },
  { gongWei: "兑宫", direction: "正西", wuXing: "金", baGua: "兑" },
  { gongWei: "艮宫", direction: "东北", wuXing: "土", baGua: "艮" },
  { gongWei: "离宫", direction: "正南", wuXing: "火", baGua: "离" },
];

// 星宫生克分析
function analyzeXingGong(starWuXing: string, gongWuXing: string): string {
  const sheng: Record<string, string> = { "木":"火","火":"土","土":"金","金":"水","水":"木" };
  const ke: Record<string, string> = { "木":"土","土":"水","水":"火","火":"金","金":"木" };
  if (starWuXing === gongWuXing) return "星宫比和，气场协调";
  if (sheng[starWuXing] === gongWuXing) return "星生宫，泄气稍减，尚可";
  if (sheng[gongWuXing] === starWuXing) return "宫生星，星得生扶，吉星更吉凶星更凶";
  if (ke[starWuXing] === gongWuXing) return "星克宫，宫受克，吉减半";
  if (ke[gongWuXing] === starWuXing) return "宫克星，星被制，凶星受制吉星受抑";
  return "星宫关系平和";
}

function getYearStar(year: number): number {
  return (10 - (year - 1900 + 5) % 9) || 9;
}

function getFeiXingGrid(centerStar: number): Map<string, number> {
  const startIdx = (9 - centerStar) % 9;
  const grid = new Map<string, number>();
  grid.set("中宫", centerStar);
  const gongNames = ["乾宫", "兑宫", "艮宫", "离宫", "坎宫", "坤宫", "震宫", "巽宫"];
  for (let i = 0; i < 8; i++) {
    const star = ((startIdx - i + 9) % 9) || 9;
    grid.set(gongNames[i], star);
  }
  return grid;
}

function getJiXiongList(grid: Map<string, number>): JiXiongFangWei[] {
  const list: JiXiongFangWei[] = [];
  const dirMap = new Map(GONG_WEI_DIRECTION.map(g => [g.gongWei, g.direction]));

  for (const [gongWei, star] of grid) {
    const dir = dirMap.get(gongWei) || "";
    const info = JIUXING_DETAIL[star];

    if (star === 8) list.push({ name: `正财位(${info.name})`, direction: dir, type: "财位", level: "大吉", activation: "放置聚宝盆、水晶球、貔貅、黄水晶、保险柜。宜明亮整洁常活动。", taboos: ["不可堆放杂物", "不可阴暗潮湿", "不可做厕所"] });
    if (star === 6) list.push({ name: `偏财位(${info.name})`, direction: dir, type: "财位", level: "吉", activation: "放置黄水晶、金属摆件、铜钱串。宜在此方办公。", taboos: ["不可有火性物品克制(红色/电器)", "不可杂乱"] });
    if (star === 9) list.push({ name: `喜神位(${info.name})`, direction: dir, type: "桃花位", level: "吉", activation: "放置红色饰品、鲜花、粉水晶、鸳鸯摆件。催婚催丁。", taboos: ["不可枯萎", "不可摆放过多假花", "已婚者适度"] });
    if (star === 4) list.push({ name: `文昌位(${info.name})`, direction: dir, type: "文昌位", level: "吉", activation: "放置文昌塔、毛笔四支、水养富贵竹四枝。宜做书房。", taboos: ["不可堆放杂物", "不宜做厕所", "不宜安床"] });
    if (star === 1) list.push({ name: `桃花位(${info.name})`, direction: dir, type: "桃花位", level: "吉", activation: "放置鲜花、粉水晶、圆形饰品、鸳鸯图。催桃花人缘。", taboos: ["不可枯萎败落", "已婚者适度使用", "不宜动土"] });
    if (star === 2) list.push({ name: `病符位(${info.name})`, direction: dir, type: "病符位", level: "凶", activation: "放置铜葫芦、六帝钱、白色水晶簇。宜静不宜动。", taboos: ["不可动土修造", "不可安床在此方", "忌红色黄色物品"] });
    if (star === 5) list.push({ name: `五黄煞(${info.name})`, direction: dir, type: "五黄煞", level: "大凶", activation: "放置铜铃六个串挂、六帝钱、白色地毯。绝对静守。", taboos: ["绝对不可动土修造", "不可开门", "不可坐卧", "忌红色黄色催旺"] });
    if (star === 3) list.push({ name: `是非位(${info.name})`, direction: dir, type: "是非位", level: "凶", activation: "放置红色物品(火泄木)、紫色饰品、小夜灯。", taboos: ["不宜放置植物(木助煞)", "不可在此争吵", "不宜开门"] });
    if (star === 7) list.push({ name: `破财位(${info.name})`, direction: dir, type: "是非位", level: "凶", activation: "放置一杯静水(水泄金气)、蓝色地毯。减少在此活动。", taboos: ["不可放金属物品(金助煞)", "不可做财位使用", "不宜红色"] });
  }

  return list;
}

export function calculateLiuNianFengShui(input: Record<string, unknown>): LiuNianFengShuiResult {
  const year = (input.year as number) || new Date().getFullYear();
  const zuoXiang = (input.zuoXiang as string) || "";
  const mingGua = (input.mingGua as string) || "";

  const centerStar = getYearStar(year);
  const grid = getFeiXingGrid(centerStar);
  const dirLookup = new Map(GONG_WEI_DIRECTION.map(g => [g.gongWei, g]));

  const feiXing: LiuNianFeiXing[] = [];
  for (const [gongWei, star] of grid) {
    const info = JIUXING_DETAIL[star];
    const gongInfo = dirLookup.get(gongWei);
    const sg = analyzeXingGong(info.wuXing, gongInfo?.wuXing || "");
    feiXing.push({
      star, name: info.name, wuXing: info.wuXing,
      gongWei, direction: gongInfo?.direction || "",
      level: info.level, effect: info.effect,
      advice: `${info.level === "吉" ? "可在此方位活动、办公、安床" : "宜静不宜动，放置相应的化解物品"}。${sg}。`,
    });
  }

  const jiXiongFangWei = getJiXiongList(grid);

  const yearGanZhi = `${["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"][(year - 4) % 10]}${["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"][(year - 4) % 12]}`;
  const centerInfo = JIUXING_DETAIL[centerStar];
  const jiCount = feiXing.filter(f => f.level === "吉").length;
  const xiongCount = feiXing.filter(f => f.level === "凶").length;
  const jiList = jiXiongFangWei.filter(f => f.level.includes("吉"));
  const xiongList = jiXiongFangWei.filter(f => f.level.includes("凶"));

  const summary = [
    `【${year}年（${yearGanZhi}）玄空飞星风水布局】`,
    ``,
    `┌─ 年星入中 ─────────────────`,
    `│ 年星${centerInfo.name}（${centerInfo.wuXing}）入中宫`,
    `│ ${centerInfo.nature}`,
    `│ 出处：${centerInfo.classicalRef}`,
    ``,
    `├─ 九宫飞星分布 ─────────────────`,
    `│ 吉星${jiCount}颗 凶星${xiongCount}颗`,
    `│`,
    ...feiXing.map(f => {
      const m = f.level === "吉" ? "★" : f.level === "凶" ? "●" : "◎";
      return `│ ${m} ${f.gongWei}(${f.direction})：${f.name}(${f.wuXing}) — ${f.effect}`;
    }),
    ``,
    `├─ 重点方位催旺 ─────────────────`,
    ...jiList.slice(0, 5).map(j => `│ ☆ ${j.name}(${j.direction})：${j.activation.substring(0, 40)}`),
    ``,
    `├─ 重点方位化解 ─────────────────`,
    ...xiongList.slice(0, 3).map(x => `│ ⚠ ${x.name}(${x.direction})：${x.activation.substring(0, 40)}`),
    ``,
    `├─ 布局要点 ─────────────────`,
    `│ 1. 大门宜开在吉星方位，纳天地旺气`,
    `│ 2. 主卧床宜安在八白/六白/九紫吉方`,
    `│ 3. 书桌宜在四绿文昌位，面朝吉方`,
    `│ 4. 五黄方和二黑方全年不可动土修造`,
    `│ 5. 厨房宜压凶方（压在凶星上以火制煞）`,
    `│ 6. 厕所宜压凶方（压在凶星上以污治煞）`,
    `${zuoXiang ? `│ 7. 坐向${zuoXiang}需结合宅命盘综合判断` : ""}`,
    ``,
    `├─ 各星宫生克 ─────────────────`,
    ...feiXing.map(f => {
      const gi = dirLookup.get(f.gongWei);
      const sg = analyzeXingGong(f.wuXing, gi?.wuXing || "");
      return `│ · ${f.gongWei}：${f.name}(${f.wuXing})入${gi?.baGua || ""}宫(${gi?.wuXing || ""}) → ${sg}`;
    }),
    ``,
    `└─ 古籍参考 ─────────────────`,
    `   《紫白诀》：「白为官星，紫为吉庆，黄为煞气，碧为是非。」`,
    `   《沈氏玄空学》：「三元九运，二十年一易。九星飞泊，一年一更。」`,
    `   《玄空秘旨》：「不知来路，焉知入路。盘中八卦皆空。」`,
    `   《阳宅三要》：「门主灶为阳宅三要，三者各得其所则家道昌隆。」`,
    ``,
    `玄空之道，以时运为纲，以九星为目。顺时而布局，则宅旺人安；逆时而妄动，则灾祸立至。${mingGua ? `命卦${mingGua}需与宅卦配合使用。` : ""}`,
  ].filter(Boolean).join("\n");

  return { year, yearGanZhi, feiXing, jiXiongFangWei, summary };
}

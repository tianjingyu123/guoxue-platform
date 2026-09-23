import { PaipanReportService } from "./paipan-report.service";
import { buildZiweiChartView, extractZiweiFacts, ziweiSignals, type ZiweiResultData } from "./ziwei-report";
import { ZIWEI_REPORT_TEMPLATE, getReportTemplate } from "./report-template";

/**
 * 夹具取自真实引擎输出（1990-05-23 巳时 女，农历四月廿九，庚午年），
 * 与服务端存库结构同形（wuXingJu / mingGong / gongWei / siHua / shenGong / geShi，input 另存）。
 */
const star = (name: string, type: string, liangJi = type === "sisha" ? "凶" : "吉") => ({ name, type, wuXing: "金", liangJi });
const GONGS: ZiweiResultData["gongWei"] = [
  { name: "命宫", zhi: "子", gan: "丙", stars: [star("武曲", "main"), star("七杀", "main"), star("天刑", "sisha")], shenGong: false, daXianStart: 2, daXianEnd: 11, sanFang: ["命宫", "财帛", "官禄"], duiGong: "迁移", gongQi: "涧下水" },
  { name: "兄弟", zhi: "亥", gan: "乙", stars: [star("天梁", "main")], daXianStart: 12, daXianEnd: 21 },
  { name: "夫妻", zhi: "戌", gan: "甲", stars: [star("天相", "main"), star("文昌", "assist")], shenGong: true, daXianStart: 22, daXianEnd: 31 },
  { name: "子女", zhi: "酉", gan: "癸", stars: [star("巨门", "main")], daXianStart: 32, daXianEnd: 41 },
  // 禄存在引擎里 type=sisha 而 liangJi=吉：按 type 分煞会把它写成煞星
  { name: "财帛", zhi: "申", gan: "壬", stars: [star("贪狼", "main"), star("擎羊", "sisha"), star("禄存", "sisha", "吉"), star("天马", "sisha", "中性")], daXianStart: 42, daXianEnd: 51 },
  { name: "疾厄", zhi: "未", gan: "辛", stars: [], daXianStart: 52, daXianEnd: 61 },
  { name: "迁移", zhi: "午", gan: "庚", stars: [star("天府", "main")], daXianStart: 62, daXianEnd: 71 },
  { name: "交友", zhi: "巳", gan: "己", stars: [star("天同", "main")], daXianStart: 72, daXianEnd: 81 },
  { name: "官禄", zhi: "辰", gan: "戊", stars: [star("破军", "main"), star("左辅", "assist")], daXianStart: 82, daXianEnd: 91 },
  { name: "田宅", zhi: "卯", gan: "丁", stars: [star("太阴", "main")], daXianStart: 92, daXianEnd: 101 },
  { name: "福德", zhi: "寅", gan: "丙", stars: [star("武曲", "assist")], daXianStart: 102, daXianEnd: 111 },
  { name: "父母", zhi: "丑", gan: "乙", stars: [star("太阳", "main")], daXianStart: 112, daXianEnd: 121 },
];
const CHART: ZiweiResultData = {
  wuXingJu: "水二局",
  mingGong: GONGS![0],
  gongWei: GONGS,
  siHua: { huaLu: "太阳", huaQuan: "武曲", huaKe: "太阴", huaJi: "天同" },
  shenGong: "夫妻",
  geShi: ["杀破狼", "机月同梁", "禄马交驰"],
};
const INPUT = {
  name: "测试",
  gender: "女",
  year: 1990, month: 5, day: 23, hour: 10,
  lunarMonth: 4, lunarDay: 29, lunarHour: "巳",
  lunarYearGan: "庚", lunarYearZhi: "午",
};

function setup(resultData: unknown = CHART) {
  const store: any[] = [];
  const prisma: any = {
    paipanRecord: {
      findUnique: jest.fn(async () => ({
        id: "rec-z1",
        userId: "u1",
        paipanType: "ZIWEI",
        resultData,
        inputParams: INPUT,
      })),
    },
    aiAnalysisRecord: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `r${store.length + 1}`, createdAt: new Date(), ...data };
        store.push(row);
        return row;
      }),
      update: jest.fn(),
      findUnique: jest.fn(async ({ where }: any) => store.find((r) => r.id === where.id) ?? null),
    },
  };
  const gateway: any = { chat: jest.fn() };
  const knowledge: any = { baziSignals: jest.fn(() => []), findEvidence: jest.fn(async () => []), groupDebates: jest.fn(() => []) };
  return { svc: new PaipanReportService(prisma, gateway, knowledge, { assertReportAccess: jest.fn() } as any), prisma, gateway, knowledge };
}

const modelJson = () =>
  JSON.stringify({
    summary: "命宫武曲七杀，行事果决。",
    sections: [
      { sectionId: "s3", content: "命宫与主星一节。", evidenceIds: [] },
      { sectionId: "s4", content: "身宫与命身关系一节。", evidenceIds: [] },
      { sectionId: "s5", content: "三方四正一节。", evidenceIds: [] },
      { sectionId: "s6", content: "生年四化一节。", evidenceIds: [] },
      { sectionId: "s10", content: "大限节奏一节。", evidenceIds: [] },
      { sectionId: "sZZ", content: "自造小节，应丢弃。", evidenceIds: [] },
    ],
    limitations: ["紫微各派看法不一"],
  });

describe("紫微斗数命书", () => {
  it("盘面事实来自引擎：五行局、命宫主星、身宫、十二宫", () => {
    const f = extractZiweiFacts(CHART, INPUT);
    expect(f.wuXingJu).toBe("水二局");
    expect(f.mingGongZhi).toBe("子");
    expect(f.mingGong).toContain("丙子");
    expect(f.mingMainStars).toEqual(["武曲", "七杀"]);
    expect(f.mingNoMainStar).toBe(false);
    // 主星、辅星、煞星分开列，读者一眼看出哪几颗是骨干
    expect(f.mingGong).toContain("主星武曲、七杀");
    expect(f.mingGong).toContain("煞天刑");
    expect(f.gongs).toHaveLength(12);
    expect(f.gongs[0]).toContain("命宫（丙子）");
    expect(f.gongs.find((x) => x.startsWith("夫妻"))).toContain("【身宫】");
    // 大限起讫随宫带出，s10 才有得讲
    expect(f.gongs[0]).toContain("大限2-11岁");
  });

  it("身宫按宫名给出，命身同宫时单独标记", () => {
    const f = extractZiweiFacts(CHART, INPUT);
    expect(f.shenGong).toBe("夫妻");
    expect(f.shenGongLine).toContain("身宫在夫妻");
    expect(f.shenSameAsMing).toBe(false);

    const same = extractZiweiFacts({ ...CHART, shenGong: "命宫" }, INPUT);
    expect(same.shenSameAsMing).toBe(true);
  });

  it("三方四正不重复列命宫，对宫单独给出", () => {
    const f = extractZiweiFacts(CHART, INPUT);
    expect(f.sanFang).toHaveLength(2); // 财帛、官禄（命宫已单列）
    expect(f.sanFang.join("")).not.toContain("命宫（");
    expect(f.sanFang[0]).toContain("财帛（申）");
    // 吉凶以 liangJi 为准，不以 type 为准：禄存天马是吉曜，不能列进煞里
    expect(f.sanFang[0]).toContain("辅禄存、天马");
    expect(f.sanFang[0]).toContain("煞擎羊");
    expect(f.sanFang[0]).not.toContain("煞擎羊、禄存");
    expect(f.duiGong).toContain("对宫迁移");
    expect(f.duiGong).toContain("天府");
  });

  it("生年四化定位到宫：星在哪一宫是断盘的关键线索", () => {
    const f = extractZiweiFacts(CHART, INPUT);
    expect(f.huaLu).toBe("太阳（在父母·丑）");
    expect(f.huaQuan).toBe("武曲（在命宫·子）"); // 武曲在命宫与福德都出现，取先命中的宫
    expect(f.huaKe).toBe("太阴（在田宅·卯）");
    expect(f.huaJi).toBe("天同（在交友·巳）");
    // 盘中没有这颗星时如实说明，不装作找到了
    const miss = extractZiweiFacts({ ...CHART, siHua: { huaJi: "廉贞" } }, INPUT);
    expect(miss.huaJi).toContain("本盘未见此星");
  });

  it("命宫无主星如实标记（借对宫是紫微的固定处理，不能略过）", () => {
    const noMain = JSON.parse(JSON.stringify(CHART)) as ZiweiResultData;
    noMain.gongWei![0].stars = [star("天刑", "sisha")];
    noMain.mingGong = noMain.gongWei![0];
    const f = extractZiweiFacts(noMain, INPUT);
    expect(f.mingNoMainStar).toBe(true);
    expect(f.mingGong).toContain("无主星");
    expect(ziweiSignals(f).some((s) => s.value === "命无主星")).toBe(true);
  });

  it("引擎不算庙旺利陷，事实里如实声明，不留给模型去编", () => {
    const f = extractZiweiFacts(CHART, INPUT);
    expect(f.miaoXianNote).toBe("本盘未计算星曜庙旺利陷");
    const v = buildZiweiChartView(CHART, INPUT);
    expect(v.provenance.find((p) => p.label === "星曜亮度")?.value).toContain("不作庙陷论断");
  });

  it("检索信号以命宫主星为首，格局次之", () => {
    const sig = ziweiSignals(extractZiweiFacts(CHART, INPUT));
    expect(sig[0].reason).toBe("命宫主星");
    expect(sig[0].weight).toBe(10);
    expect(sig.some((x) => x.reason === "格局" && x.value === "杀破狼")).toBe(true);
    expect(sig.some((x) => x.reason === "五行局")).toBe(true);
    expect(sig.some((x) => x.reason === "生年化忌")).toBe(true);
  });

  it("十二宫图：地支固定落位，中间留白，命宫身宫与三方四正标出", () => {
    const v = buildZiweiChartView(CHART, INPUT);
    expect(v.grid).toHaveLength(16); // 4×4 回字形
    expect(v.grid.map((g) => g.zhi)).toEqual(["巳", "午", "未", "申", "辰", "", "", "酉", "卯", "", "", "戌", "寅", "丑", "子", "亥"]);
    // 中间四格留白
    expect(v.grid.filter((g) => !g.zhi)).toHaveLength(4);
    const ming = v.grid.find((g) => g.isMing)!;
    expect(ming.zhi).toBe("子");
    expect(ming.main).toEqual(["武曲", "七杀"]);
    expect(ming.daXian).toBe("2-11");
    expect(v.grid.find((g) => g.isShen)?.name).toBe("夫妻");
    // 三方四正（命/财/官/迁）成一组高亮
    expect(v.grid.filter((g) => g.inSanFang).map((g) => g.name).sort()).toEqual(["命宫", "官禄", "财帛", "迁移"]);
    expect(v.siHua.map((x) => x.label)).toEqual(["化禄", "化权", "化科", "化忌"]);
    expect(v.geShi).toContain("杀破狼");
  });

  it("模板是紫微自己的一套：十二宫维度，不套八字的十神版面", () => {
    const tpl = getReportTemplate("ziwei");
    expect(tpl).toBe(ZIWEI_REPORT_TEMPLATE);
    const titles = tpl.sections.map((s) => s.title);
    expect(titles).toContain("命宫与主星");
    expect(titles).toContain("身宫与命身关系");
    expect(titles).toContain("三方四正");
    expect(titles).toContain("生年四化");
    expect(titles).toContain("大限节奏");
    // 八字的版面不该出现在紫微命书里
    expect(titles).not.toContain("日主与格局");
    expect(titles).not.toContain("大运节奏");
    // 提示词里明令不得自行断庙陷
    expect(tpl.sections.find((s) => s.id === "s3")?.brief).toContain("不得凭空断庙陷");
  });

  it("端到端：按紫微模板出书，模型自造小节被丢弃，盘面事实不经模型", async () => {
    const { svc, gateway } = setup();
    gateway.chat.mockResolvedValue({ content: modelJson(), model: "m1", usage: { totalTokens: 100 } });
    const res = await svc.generateReport("u1", "rec-z1");
    const report = res.content;

    expect(report.title).toContain("紫微斗数");
    const ids = report.sections.map((s: any) => s.id);
    expect(ids).not.toContain("sZZ"); // 平台定结构，模型不得新增小节
    expect(ids[0]).toBe("s1");

    const fact = report.sections[0];
    expect(fact.type).toBe("fact");
    expect(fact.title).toBe("盘面事实（排盘引擎计算）"); // 各盘统一的「引擎出品」标识
    expect(fact.deterministic).toBe(true); // 下游据此跳过改写，不靠标题文字
    expect(fact.content).toContain("水二局");
    expect(fact.content).toContain("命宫在丙子");
    expect(fact.content).toContain("身宫在夫妻");
    expect(fact.content).toContain("化忌天同（在交友·巳）");
    expect(fact.content).toContain("本盘未计算星曜庙旺利陷");
    // 十二宫逐宫列出，语音答疑才定位得到
    expect(fact.content).toContain("田宅（丁卯）");
  });

  it("术语注解用紫微自己的词表：拿八字词表来注，正文一个词都对不上", async () => {
    const { svc, gateway } = setup();
    gateway.chat.mockResolvedValue({ content: modelJson(), model: "m1", usage: {} });
    const res = await svc.generateReport("u1", "rec-z1");
    const terms = (res.content.glossary ?? []).map((t: any) => t.term);

    expect(terms).toContain("三方四正");
    expect(terms).toContain("身宫");
    expect(terms).toContain("化忌");
    expect(terms).toContain("五行局");
    // 八字的词不该混进来
    expect(terms).not.toContain("日主");
    expect(terms).not.toContain("用神");
  });

  it("缺十二宫数据时明确报错，不生成占位命书", async () => {
    const { svc } = setup({ wuXingJu: "水二局" });
    await expect(svc.generateReport("u1", "rec-z1")).rejects.toThrow("缺少十二宫数据");
  });

  it("推演页：定局安命 → 布十二宫 → 取三方四正与四化 → 检索 → 成书", async () => {
    const { svc } = setup();
    const pre = await svc.preflight("u1", "rec-z1");
    const keys = pre.steps.map((s: any) => s.key);
    expect(keys).toEqual(["cast", "chart", "structure", "evidence", "compose"]);
    expect(pre.steps[0].detail).toContain("水二局");
    // 生辰明文按隐私设计不入库，取不到时不写占位话
    const noLunar = await setup().svc.preflight("u1", "rec-z1");
    expect(noLunar.steps[0].detail).not.toContain("农历生日");
    expect(pre.steps[1].detail).toContain("12 宫已布");
    expect(pre.steps[1].detail).toContain("身宫在夫妻");
    expect(pre.steps[2].detail).toContain("武曲、七杀");
    expect(pre.steps[4].detail).toContain("未计算星曜庙旺利陷");
    // 知识库没有紫微条目时如实说明，不编依据
    expect(pre.steps[3].detail).toContain("暂无");
    expect(pre.seals.dian).toBe(false);
  });
});

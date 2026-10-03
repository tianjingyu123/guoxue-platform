import { buildQimenYangMingLiPrompt, buildQimenYangPrompt } from "./qimen";

const baseResult = {
  dunType: "yang",
  juNumber: 3,
  jieQi: "立秋",
  yongShi: "甲子",
  zhiFu: "天蓬",
  zhiShiMen: "休门",
  gongs: [{
    index: 1, name: "坎一宫", bagua: "坎", diPan: "戊", tianPan: "壬",
    star: "天蓬", men: "休门", shen: "值符", isRuMu: false, isJiXing: false,
    isMenPo: false, kongWang: false, maXing: false,
  }],
  dipanBashen: ["值符"],
};

describe("奇门AI提示词", () => {
  it("阳盘断事包含所问事项和真实排盘参数", () => {
    const prompt = buildQimenYangPrompt({
      matter: "是否适合今年换工作",
      method: "飞盘",
      qiJuMethod: "置闰",
      datetime: "2026-07-21 10:30",
    } as any, baseResult as any);
    expect(prompt).toContain("是否适合今年换工作");
    expect(prompt).toContain("飞盘");
    expect(prompt).toContain("置闰");
    expect(prompt).toContain("坎一宫");
  });

  it("阳盘命理兼容当前接口的mingli字段并写入四柱大运", () => {
    const prompt = buildQimenYangMingLiPrompt({
      birthTime: "1990-01-01 12:00",
      place: "北京",
      gender: "male",
    } as any, {
      ...baseResult,
      mingli: {
        siZhu: {
          nian: { gan: "己", zhi: "巳" }, yue: { gan: "丙", zhi: "子" },
          ri: { gan: "甲", zhi: "寅" }, shi: { gan: "庚", zhi: "午" },
        },
        qiYun: { startAge: 6, desc: "6岁起运" },
        daYun: [{ gan: "丁", zhi: "丑", startAge: 6, endAge: 15 }],
      },
    } as any);
    expect(prompt).toContain("己巳 丙子 甲寅 庚午");
    expect(prompt).toContain("丁丑（6-15岁）");
    expect(prompt).toContain("北京");
  });

  it("缺少九宫数组时诚实降级而非抛错", () => {
    expect(buildQimenYangPrompt({} as any, {} as any)).toContain("暂无九宫数据");
  });
});

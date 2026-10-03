import { computeJinkoujue } from "@guoxue/shared/paipan";

describe("金口诀随机地分的保存一致性", () => {
  it("已经抽定的地分在保存重算时不再重新随机；未预选时仍可随机起课", () => {
    const random = jest.spyOn(Math, "random").mockReturnValue(0.9);
    try {
      const input = {
        date: new Date(2026, 8, 20, 14, 0),
        sizhu: { year: "丙午", month: "丁酉", day: "丁亥", hour: "丁未" },
        jiangMethod: "jie" as const,
        guirenSchool: "A" as const,
        guiType: "day" as const,
      };
      const fixed = computeJinkoujue({ ...input, difenMethod: "random", difenZhi: "寅" });
      const manual = computeJinkoujue({ ...input, difenMethod: "manual", difenZhi: "寅" });
      const fresh = computeJinkoujue({ ...input, difenMethod: "random" });
      expect(fixed.difen).toEqual({ zhi: "寅", method: "随机" });
      expect(fixed.positions).toEqual(manual.positions);
      expect(fresh.difen.zhi).not.toBe("寅");
    } finally {
      random.mockRestore();
    }
  });
});

import { PaipanEngineService } from "../src/modules/paipan/engine/paipan-engine.service";
import { withEngineTz } from "../src/modules/paipan/engine/engine-tz";
import { calculateQimenYin } from "../src/modules/tool-registry/calculators/qimen.calculator";
import { PaipanService } from "../src/modules/paipan/paipan.service";

describe("阴盘预览与报告同盘", () => {
  const engine = new PaipanEngineService();

  for (const clock of [
    [2006, 5, 23, 19, 45],
    [2019, 5, 2, 9, 9],
    [2024, 7, 15, 10, 0],
    [2026, 12, 22, 14, 0],
  ]) {
    it(`${clock.join("-")} 的自动盘与报告一致`, () => {
      const [year, month, day, hour, minute] = clock;
      const input = { year, month, day, hour, minute };
      const display = engine.run("yinpan", input) as any;
      const report = withEngineTz(() => calculateQimenYin({
        datetime: new Date(year, month - 1, day, hour, minute).toISOString(),
      }));
      expect(display.ju.num).toBe(report.juNumber);
      expect(display.ju.isYang ? "yang" : "yin").toBe(report.dunType);
      expect(display.zhifu.star).toBe(report.zhiFu);
      expect(display.zhishi.men).toBe(report.zhiShiMen);
      for (const gong of report.gongs) {
        const palace = display.palaces[gong.index];
        expect(palace.diGan).toBe(gong.diPan);
        expect([palace.tianGan, palace.tianGan2].filter(Boolean).join("")).toBe(gong.tianPan);
      }
    });
  }

  it("手选局仍与报告手选同盘，不混用自动定局", () => {
    const display = engine.run("yinpan", {
      year: 2026, month: 9, day: 29, hour: 14, minute: 0, juLabel: "阴遁3局",
    }) as any;
    const report = withEngineTz(() => calculateQimenYin({
      datetime: new Date(2026, 8, 29, 14, 0).toISOString(),
      customJu: 3, dunType: "yin",
    }));
    expect([display.ju.isYang, display.ju.num]).toEqual([false, 3]);
    expect(report.juNumber).toBe(3);
    expect(report.dunType).toBe("yin");
    expect(display.zhifu.star).toBe(report.zhiFu);
    expect(display.zhishi.men).toBe(report.zhiShiMen);
  });

  it("UTC 服务进程下，保存报告仍透传真太阳时和手选局，并注明自动参考局", async () => {
    const input = {
      year: 2026, month: 9, day: 29, hour: 14, minute: 0,
      trueSolar: true, lng: 115.42, juLabel: "阴遁3局",
      matter: "课程安排",
    };
    const display = engine.run("yinpan", input) as any;
    const service = Object.create(PaipanService.prototype) as PaipanService;
    const previousTz = process.env.TZ;
    process.env.TZ = "UTC";
    let saved: Awaited<ReturnType<PaipanService["calcYinpan"]>>;
    try {
      saved = await service.calcYinpan(input);
    } finally {
      if (previousTz === undefined) delete process.env.TZ;
      else process.env.TZ = previousTz;
    }
    expect([saved.dunType, saved.juNumber]).toEqual(["yin", 3]);
    expect(saved.zhiFu).toBe(display.zhifu.star);
    expect(saved.zhiShiMen).toBe(display.zhishi.men);
    expect(saved.juParts).toContain("本盘手选阴遁3局");
    expect(saved.matter).toBe("课程安排");
  });
});

import { computeZiwei, toZiweiChart } from "./ziwei-engine";
import { toZiweiReportData } from "./ziwei-report-adapter";
import { buildZiweiChartView, extractZiweiFacts } from "../ziwei-report";
import { PaipanService } from "../paipan.service";
import { PaipanReportService } from "../paipan-report.service";
import { ENGINES } from "./engine-registry";

process.env.ENCRYPTION_KEY = "test-key-for-32-byte-encryption!";

const INPUT = {
  year: 1990, month: 1, day: 20, hour: 10, minute: 20,
  gender: "男" as const, useTrueSolar: false,
};

describe("消费者紫微盘与命书同源", () => {
  it("十二宫、主星、生年四化直接取自结果页安星引擎", () => {
    const result = computeZiwei(INPUT);
    const chart = toZiweiChart(result, "测试", INPUT.year, 2026);
    const report = toZiweiReportData(result);
    const facts = extractZiweiFacts(report, { gender: INPUT.gender });
    const view = buildZiweiChartView(report);
    expect(report.gongWei).toHaveLength(12);
    expect(view.grid.filter((palace) => palace.name)).toHaveLength(12);
    expect(report.wuXingJu).toBe(chart.wuxingJu);
    for (const palace of chart.palaces) {
      const saved = report.gongWei?.find((item) => item.gan + item.zhi === palace.ganzhi);
      expect(saved?.name).toBe(palace.name);
      expect(saved?.stars?.filter((star) => star.type === "main").map((star) => star.name))
        .toEqual(palace.majors.map((star) => star.name));
    }
    expect(report.mingGong).toBeDefined();
    expect(facts.mingGong).toContain(`${report.mingGong!.gan}${report.mingGong!.zhi}`);
    expect(facts.miaoXianNote).toContain("不以庙旺利陷作论断");
    expect(report.siHua?.huaJi).toBe(result.sihua.find((item) => item.hua === "忌")?.star);
  });

  it("服务端重算并加密保存本人记录，不接收客户端盘面", async () => {
    const create = jest.fn().mockResolvedValue({ id: "own-record" });
    const service = new PaipanService({ paipanRecord: { create } } as any, {} as any);
    const record = await service.saveZiweiConsumerRecord("owner-1", {
      name: "测试", gender: "男", y: 1990, m: 1, d: 20, hour: 10, minute: 20, nowYear: 2026,
    });
    expect(record.id).toBe("own-record");
    expect(record.chart.palaces).toHaveLength(12);
    const saved = create.mock.calls[0][0].data;
    expect(saved.userId).toBe("owner-1");
    expect(saved.paipanType).toBe("ZIWEI");
    expect(saved.resultData.source).toBe("ziwei-engine-v2");
    expect(saved.resultData.gongWei).toHaveLength(12);
    expect(saved.clientBirth).not.toContain("1990-1-20");
    expect(JSON.stringify(saved.inputParams)).not.toContain("1990");
    const reportService = new PaipanReportService({} as any, {} as any, {} as any, {} as any);
    const plan = await (reportService as any).prepareChart({
      paipanType: saved.paipanType, resultData: saved.resultData, inputParams: saved.inputParams,
    });
    expect(plan.paipanType).toBe("ziwei");
    expect(plan.chartView.grid.filter((palace: { name: string }) => palace.name)).toHaveLength(12);
    expect(plan.factLines.join(" ")).toContain(saved.resultData.wuXingJu);
  });

  it("拒绝无效公历日期且不写库", async () => {
    const create = jest.fn();
    const service = new PaipanService({ paipanRecord: { create } } as any, {} as any);
    await expect(service.saveZiweiConsumerRecord("owner-1", {
      name: "测试", gender: "男", y: 2026, m: 2, d: 30, hour: 10, minute: 0,
    })).rejects.toThrow("出生日期无效");
    expect(create).not.toHaveBeenCalled();
  });

  it.each([false, true])("与公开预览入口同盘（真太阳时 %s）", async (useTrueSolar) => {
    const input = {
      name: "测试", gender: "男" as const, y: 1990, m: 1, d: 20,
      hour: 10, minute: 20, lng: 116.4, useTrueSolar, nowYear: 2026,
    };
    const preview = ENGINES.ziwei.run(ENGINES.ziwei.parse(input));
    const create = jest.fn().mockResolvedValue({ id: "own-record" });
    const service = new PaipanService({ paipanRecord: { create } } as any, {} as any);
    const saved = await service.saveZiweiConsumerRecord("owner-1", input);
    expect(saved.chart).toEqual((preview as { chart: unknown }).chart);
  });
});

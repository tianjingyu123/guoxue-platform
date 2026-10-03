import { PaipanService } from "./paipan.service";
import { YinpanInputDto } from "./paipan.dto";
import { extractYinpanFacts, buildYinpanChartView } from "./yinpan-report";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/** 用真实起局引擎走预览、保存和报告九宫，避免用手写盘面自证一致。 */
describe("阴盘预览、存盘与报告同盘", () => {
  it.each([
    ["自动定局", { year: 2026, month: 9, day: 19, hour: 14, minute: 10, matter: "事业合作" }],
    ["真太阳时和手选局", { year: 2026, month: 9, day: 19, hour: 14, minute: 10, matter: "事业合作", trueSolar: true, lng: 116.4, juLabel: "阳遁4局" }],
  ])("%s：报告九宫与用户预览一致", async (_name, input) => {
    const create = jest.fn().mockResolvedValue({ id: "yin-1" });
    const prisma = { paipanRecord: { create } } as unknown as PrismaService;
    const service = new PaipanService(prisma, {} as RedisService);
    const dto = input as YinpanInputDto;

    const preview = await service.calcYinpan(dto);
    const saved = await service.calcYinpanAndSave("user-1", dto);
    const record = create.mock.calls[0][0].data;
    const facts = extractYinpanFacts(record.resultData, {
      matter: record.inputParams.matter,
      juParts: record.inputParams.juParts,
    });
    const reportChart = buildYinpanChartView(facts);

    expect(saved.result).toEqual(preview);
    expect(record.resultData).toEqual(preview);
    expect(record.inputParams.juParts).toBe(preview.juParts);
    expect(facts.ju).toBe(`${preview.dunType === "yang" ? "阳遁" : "阴遁"}${preview.juNumber}局`);
    expect(reportChart.cells).toHaveLength(9);
    for (const cell of reportChart.cells) {
      const palace = preview.gongs.find((gong) => gong.index === cell.palace);
      expect(palace).toBeDefined();
      expect(cell.diPan).toBe(palace!.diPan);
      expect(cell.tianPan).toBe(palace!.tianPan);
      expect(cell.star).toBe(palace!.star);
      expect(cell.men).toBe(palace!.men);
    }
  });
});

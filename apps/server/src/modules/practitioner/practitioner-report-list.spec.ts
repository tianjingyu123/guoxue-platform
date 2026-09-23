import { PractitionerService } from "./practitioner.service";

describe("工作台报告列表分页", () => {
  it("按本人和筛选条件分页，并返回筛选后的真实总数", async () => {
    const prisma: any = {
      practitionerReport: {
        findMany: jest.fn().mockResolvedValue([{ id: "r41" }]),
        count: jest.fn().mockResolvedValue(87),
      },
    };
    const service = new PractitionerService(prisma);
    jest.spyOn(service as any, "reportQuota").mockResolvedValue({ used: 120, limit: null, unlimited: true });

    const result = await service.listReports("teacher-1", { status: "draft", keyword: "陈", page: "3" });
    expect(prisma.practitionerReport.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ownerId: "teacher-1", status: "draft", OR: [{ title: { contains: "陈" } }, { clientName: { contains: "陈" } }] },
      skip: 40,
      take: 20,
    }));
    expect(prisma.practitionerReport.count).toHaveBeenCalledWith({ where: expect.objectContaining({ ownerId: "teacher-1", status: "draft" }) });
    expect(result).toMatchObject({ total: 87, pagination: { page: 3, pageSize: 20, total: 87 }, quota: { used: 120 } });
  });
});

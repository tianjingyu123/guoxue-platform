import { PractitionerService } from "./practitioner.service";

function setup() {
  const prisma: any = {
    practitionerReport: {
      findFirst: jest.fn(async ({ where }: any) =>
        where.id === "report-1" && where.ownerId === "teacher-1" ? { id: "report-1" } : null),
    },
    practitionerCase: {
      create: jest.fn(async ({ data }: any) => ({ id: "case-1", ...data })),
      findMany: jest.fn(async () => []),
    },
  };
  return { service: new PractitionerService(prisma, {} as any), prisma };
}

describe("工作台案例与来源报告", () => {
  it("归档时只接受本人报告，并保留来源关联", async () => {
    const { service, prisma } = setup();
    const created = await service.createCase("teacher-1", { reportId: "report-1", title: "复盘" });
    expect(created.reportId).toBe("report-1");
    expect(prisma.practitionerReport.findFirst).toHaveBeenCalledWith({
      where: { id: "report-1", ownerId: "teacher-1" }, select: { id: true },
    });
  });

  it("不能把他人报告挂到自己的案例，普通手建案例仍可创建", async () => {
    const { service, prisma } = setup();
    await expect(service.createCase("other-user", { reportId: "report-1", title: "越权" }))
      .rejects.toThrow("来源报告不存在");
    expect(prisma.practitionerCase.create).not.toHaveBeenCalled();
    await service.createCase("other-user", { title: "手建案例" });
    expect(prisma.practitionerCase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ownerId: "other-user", reportId: null }),
    });
  });

  it("关键词查询包含标签", async () => {
    const { service, prisma } = setup();
    await service.listCases("teacher-1", { keyword: "转行" });
    expect(prisma.practitionerCase.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ ownerId: "teacher-1", OR: expect.arrayContaining([{ tags: { has: "转行" } }]) }),
    }));
  });
});

import { PractitionerService } from "./practitioner.service";

function setup(shareToken: string | null) {
  const report = { id: "report-1", ownerId: "teacher-1", title: "原稿", status: shareToken ? "delivered" : "final", shareToken, sharedAt: null as Date | null, updatedAt: new Date("2026-09-23T00:00:00.000Z") };
  const prisma: any = {
    practitionerProfile: { findUnique: jest.fn(async () => ({ proExpireAt: new Date(Date.now() + 86400000) })) },
    practitionerReport: {
      findFirst: jest.fn(async () => ({ ...report })),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (where.shareToken !== undefined && where.shareToken !== report.shareToken) return { count: 0 };
        if (where.updatedAt && where.updatedAt.getTime() !== report.updatedAt.getTime()) return { count: 0 };
        Object.assign(report, data, { updatedAt: new Date(report.updatedAt.getTime() + 1000) });
        return { count: 1 };
      }),
      update: jest.fn(async ({ data }: any) => Object.assign(report, data, { updatedAt: new Date(report.updatedAt.getTime() + 1000) })),
    },
  };
  return { service: new PractitionerService(prisma, {} as any), prisma, report };
}

describe("从业者报告交付后锁定", () => {
  it("交付链接生效时，保存不能改动客户看到的正文", async () => {
    const { service, prisma } = setup("live-token");
    await expect(service.updateReport("teacher-1", "report-1", { title: "未审新稿" }))
      .rejects.toThrow("请先撤回交付链接");
    expect(prisma.practitionerReport.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "report-1", ownerId: "teacher-1", shareToken: null },
    }));
  });

  it("未交付的报告仍可保存", async () => {
    const { service, prisma, report } = setup(null);
    await service.updateReport("teacher-1", "report-1", { title: "已审新稿", updatedAt: report.updatedAt.toISOString() });
    expect(prisma.practitionerReport.updateMany).toHaveBeenCalledTimes(1);
  });

  it("另一设备已保存新版本时，旧编辑页不能覆盖", async () => {
    const { service, report } = setup(null);
    const oldVersion = report.updatedAt.toISOString();
    report.updatedAt = new Date(report.updatedAt.getTime() + 1000);
    await expect(service.updateReport("teacher-1", "report-1", { title: "旧编辑页内容", updatedAt: oldVersion }))
      .rejects.toThrow("其他设备修改");
    expect(report.title).toBe("原稿");
  });

  it("交付标记为 delivered，撤回后回到可编辑的 final", async () => {
    const { service, prisma, report } = setup(null);
    await service.shareReport("teacher-1", "report-1");
    expect(prisma.practitionerReport.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "report-1", ownerId: "teacher-1", shareToken: null },
      data: expect.objectContaining({ status: "delivered" }),
    }));
    const result = await service.unshareReport("teacher-1", "report-1", report.shareToken!);
    expect(result.shareToken).toBeNull();
    expect(prisma.practitionerReport.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: "report-1", ownerId: "teacher-1", shareToken: expect.any(String) },
      data: { shareToken: null, sharedAt: null, status: "final" },
    }));
  });

  it("旧设备不能撤回另一设备重新生成的交付链接", async () => {
    const { service, report, prisma } = setup("old-token");
    report.shareToken = "new-token";
    await expect(service.unshareReport("teacher-1", "report-1", "old-token"))
      .rejects.toThrow("交付链接已更新");
    expect(report.shareToken).toBe("new-token");
    expect(prisma.practitionerReport.updateMany).not.toHaveBeenCalled();
  });

  it("撤回请求读取后链接才被替换时，条件更新仍保护新链接", async () => {
    const { service, report, prisma } = setup("old-token");
    const update = prisma.practitionerReport.updateMany.getMockImplementation();
    prisma.practitionerReport.updateMany.mockImplementationOnce(async (args: any) => {
      report.shareToken = "new-token";
      return update(args);
    });

    await expect(service.unshareReport("teacher-1", "report-1", "old-token"))
      .rejects.toThrow("交付链接已更新");
    expect(report.shareToken).toBe("new-token");
  });

  it("并发生成交付链接时返回同一令牌，重复请求不刷新链接", async () => {
    const { service, prisma, report } = setup(null);
    let reads = 0;
    let releaseReads!: () => void;
    const bothRead = new Promise<void>((resolve) => { releaseReads = resolve; });
    prisma.practitionerReport.findFirst.mockImplementation(async () => {
      reads += 1;
      const snapshot = { ...report };
      if (reads === 2) releaseReads();
      await bothRead;
      return snapshot;
    });
    const [first, second] = await Promise.all([
      service.shareReport("teacher-1", "report-1"),
      service.shareReport("teacher-1", "report-1"),
    ]);
    expect(first.shareToken).toBeTruthy();
    expect(second.shareToken).toBe(first.shareToken);
    expect(report.shareToken).toBe(first.shareToken);
    const again = await service.shareReport("teacher-1", "report-1");
    expect(again).toEqual(first);
    expect(prisma.practitionerReport.updateMany).toHaveBeenCalledTimes(2);
  });
});

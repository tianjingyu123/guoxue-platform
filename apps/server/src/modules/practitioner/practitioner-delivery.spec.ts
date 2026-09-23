import { PractitionerService } from "./practitioner.service";

function setup(shareToken: string | null) {
  const report = { id: "report-1", ownerId: "teacher-1", status: shareToken ? "delivered" : "final", shareToken };
  const prisma: any = {
    practitionerProfile: { findUnique: jest.fn(async () => ({ proExpireAt: new Date(Date.now() + 86400000) })) },
    practitionerReport: {
      findFirst: jest.fn(async () => report),
      updateMany: jest.fn(async () => ({ count: shareToken ? 0 : 1 })),
      update: jest.fn(async ({ data }: any) => ({ ...report, ...data })),
    },
  };
  return { service: new PractitionerService(prisma, {} as any), prisma };
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
    const { service, prisma } = setup(null);
    await service.updateReport("teacher-1", "report-1", { title: "已审新稿" });
    expect(prisma.practitionerReport.updateMany).toHaveBeenCalledTimes(1);
  });

  it("交付标记为 delivered，撤回后回到可编辑的 final", async () => {
    const { service, prisma } = setup(null);
    await service.shareReport("teacher-1", "report-1");
    expect(prisma.practitionerReport.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "delivered" }),
    }));
    await service.unshareReport("teacher-1", "report-1");
    expect(prisma.practitionerReport.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: { shareToken: null, sharedAt: null, status: "final" },
    }));
  });
});

import { ClassicLibrarySeeder } from "./classic-library-seeder.service";

describe("古籍知识命名空间初始化", () => {
  const make = (exists: boolean) => {
    const prisma = {
      circle: {
        findUnique: jest.fn().mockResolvedValue(exists ? { id: "classic" } : null),
        create: jest.fn().mockResolvedValue({ id: "classic" }),
      },
      user: { upsert: jest.fn().mockResolvedValue({ id: "classic-knowledge-system" }) },
    };
    const svc = new ClassicLibrarySeeder(prisma as any, {} as any);
    jest.spyOn(svc, "seed").mockResolvedValue({ created: 0, skipped: 35 });
    jest.spyOn(svc, "syncToKnowledge").mockResolvedValue(12);
    jest.spyOn(svc, "vectorizeUnindexed").mockResolvedValue(12);
    return { prisma, svc };
  };

  it("全新库创建隐藏系统圈子，并补同步已有古籍", async () => {
    const { prisma, svc } = make(false);
    await svc.onModuleInit();
    expect(prisma.user.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ id: "classic-knowledge-system", status: "DISABLED" }),
    }));
    expect(prisma.circle.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ id: "classic", ownerId: "classic-knowledge-system", status: "DISABLED" }),
    }));
    expect(svc.syncToKnowledge).toHaveBeenCalledTimes(1);
  });

  it("已有命名空间且没有新书时不重复同步", async () => {
    const { prisma, svc } = make(true);
    await svc.onModuleInit();
    expect(prisma.user.upsert).not.toHaveBeenCalled();
    expect(prisma.circle.create).not.toHaveBeenCalled();
    expect(svc.syncToKnowledge).not.toHaveBeenCalled();
  });

  it("两个实例同时创建命名空间时，只由创建成功的一侧补同步", async () => {
    const { prisma, svc } = make(false);
    prisma.circle.create.mockRejectedValueOnce({ code: "P2002" });
    await svc.onModuleInit();
    expect(svc.syncToKnowledge).not.toHaveBeenCalled();
  });
});

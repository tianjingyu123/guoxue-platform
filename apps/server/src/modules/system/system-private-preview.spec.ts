import { SystemService } from "./system.service";

describe("新排盘私有配置的通用入口隔离", () => {
  const key = "paipan.native-preview.enabled";
  let service: SystemService;
  let prisma: any;
  let redis: any;
  beforeEach(() => {
    prisma = {
      configSystem: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
      configVersion: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    };
    redis = { getJson: jest.fn(), setJson: jest.fn() };
    service = new SystemService(prisma, redis, {} as any,
      { isThirdPartyKey: () => false } as any, {} as any);
  });

  it("缓存列表仍过滤私有配置", async () => {
    redis.getJson.mockResolvedValue([{ configKey: key, configValue: "true" }, { configKey: "home_layout" }]);
    expect(await service.getAllConfigs()).toEqual([{ configKey: "home_layout" }]);
  });

  it("单键读写、删除、历史查询和回滚在访问存储前拒绝", async () => {
    for (const operation of [
      () => service.getConfig(key), () => service.setConfig(key, "true"),
      () => service.deleteConfig(key), () => service.getConfigVersions(key, 1, 20),
      () => service.rollbackConfig(key, 1), () => service.getConfigDiff(key, 1, 2),
    ]) await expect(operation()).rejects.toThrow("配置项不存在");
    expect(redis.getJson).not.toHaveBeenCalled();
    expect(prisma.configSystem.findUnique).not.toHaveBeenCalled();
    expect(prisma.configSystem.upsert).not.toHaveBeenCalled();
  });

  it("历史ID不能旁路返回私有内容，列表计数使用同一过滤条件", async () => {
    prisma.configVersion.findUnique.mockResolvedValue({ configKey: key, value: "true" });
    await expect(service.getConfigVersion("id")).rejects.toThrow("配置项不存在");
    await service.getConfigVersions(undefined, 1, 20);
    const where = { NOT: { configKey: { startsWith: "paipan.native-preview." } } };
    expect(prisma.configVersion.count).toHaveBeenCalledWith({ where });
    expect(prisma.configVersion.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
  });

  it("公开批量读取从查询和输出双重排除私有配置", async () => {
    prisma.configSystem.findMany.mockResolvedValue([{ configKey: key, configValue: "true" }, { configKey: "home_layout", configValue: "[]" }]);
    expect(await service.getPublicConfigs([key, "home_layout"])).toEqual({ home_layout: "[]" });
    expect(prisma.configSystem.findMany).toHaveBeenCalledWith({ where: { configKey: { in: ["home_layout"] } } });
  });
});

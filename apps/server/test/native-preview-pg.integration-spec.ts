import { randomUUID } from "node:crypto";
import { currentNativePreviewAllowed, currentNativeSuiteAllowed, PaipanRuntimeService, NATIVE_PAIPAN_PREVIEW_KEY } from "../src/common/paipan-runtime.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { CircleWorkflowLocalPg } from "./fixtures/circle-workflow-local-pg";
import { NativePreviewService } from "../src/modules/system/native-preview.service";
import { NativePreviewController } from "../src/modules/system/native-preview.controller";
import { ExecutionContext, INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../src/common/jwt-auth.guard";
import { RedLineGuard } from "../src/common/red-lines";
import { PAIPAN_SUITE_MODE_KEY } from "../src/common/paipan-suite-policy";

const localSuite = process.env.RUN_CIRCLE_WORKFLOW_LOCAL_PG === "YES" ? describe : describe.skip;
localSuite("新工具预览主库双条件", () => {
  const pg = new CircleWorkflowLocalPg();
  beforeAll(() => pg.start(), 120000);
  afterAll(() => pg.stop(), 65000);
  beforeEach(async () => {
    await pg.observer.configVersion.deleteMany({ where: { configKey: NATIVE_PAIPAN_PREVIEW_KEY } });
    await pg.observer.configSystem.deleteMany({ where: { configKey: { in: [NATIVE_PAIPAN_PREVIEW_KEY, PAIPAN_SUITE_MODE_KEY] } } });
  });
  async function superAdmin() {
    const id = randomUUID();
    await pg.observer.user.create({ data: { id, nickname: "LOCAL_PREVIEW_MANAGER", status: "ACTIVE" }, select: { id: true } });
    const role = await pg.observer.userRole.create({ data: { userId: id, roleType: "SUPER_ADMIN", bindId: null }, select: { id: true } });
    return { id, role };
  }
  it("默认关闭；普通角色/圈级绑定无权；开启后超级管理员可用；撤权/关闭立即失效", async () => {
    const id = randomUUID();
    await pg.observer.user.create({ data: { id, nickname: "LOCAL_PREVIEW_ONLY", status: "ACTIVE" }, select: { id: true } });
    const check = () => currentNativePreviewAllowed(pg.a as PrismaService, id);
    const role = await pg.observer.userRole.create({ data: { userId: id, roleType: "SUPER_ADMIN", bindId: null }, select: { id: true } });
    expect(await check()).toBe(false);
    await pg.observer.configSystem.create({ data: { configKey: NATIVE_PAIPAN_PREVIEW_KEY, configValue: "true" }, select: { id: true } });
    expect(await check()).toBe(true);
    await pg.observer.userRole.update({ where: { id: role.id }, data: { roleType: "OPERATION_ADMIN" }, select: { id: true } });
    expect(await check()).toBe(false);
    await pg.observer.userRole.update({ where: { id: role.id }, data: { roleType: "SUPER_ADMIN", bindId: randomUUID() }, select: { id: true } });
    expect(await check()).toBe(false);
    await pg.observer.userRole.update({ where: { id: role.id }, data: { bindId: null }, select: { id: true } });
    for (const value of ["false", "TRUE", "1", "{\"enabled\":true}", ""]) {
      await pg.observer.configSystem.update({ where: { configKey: NATIVE_PAIPAN_PREVIEW_KEY }, data: { configValue: value }, select: { id: true } });
      expect(await check()).toBe(false);
    }
    await pg.observer.configSystem.update({ where: { configKey: NATIVE_PAIPAN_PREVIEW_KEY }, data: { configValue: "true" }, select: { id: true } });
    await pg.observer.user.update({ where: { id }, data: { status: "DISABLED" }, select: { id: true } });
    expect(await check()).toBe(false);
    expect(await currentNativePreviewAllowed(pg.a as PrismaService)).toBe(false);
  });

  it("关闭时可管理；开启与关闭即时影响预览；旧指纹不能覆盖，私有台账准确", async () => {
    const { id } = await superAdmin();
    const service = new NativePreviewService(pg.a as PrismaService);
    const initial = await service.get(id);
    expect(initial.enabled).toBe(false);
    const opened = await service.set(id, true, initial.revision);
    expect(await currentNativePreviewAllowed(pg.observer as PrismaService, id)).toBe(true);
    await expect(service.set(id, false, initial.revision)).rejects.toThrow("设置已变化");
    const closed = await service.set(id, false, opened.revision);
    expect(closed.enabled).toBe(false);
    expect(await currentNativePreviewAllowed(pg.observer as PrismaService, id)).toBe(false);
    expect(await pg.observer.configVersion.findMany({ where: { configKey: NATIVE_PAIPAN_PREVIEW_KEY }, orderBy: { version: "asc" }, select: { version: true, value: true, changedBy: true } }))
      .toEqual([
        { version: 1, value: { enabled: true, previousEnabled: false, mode: initial.mode, previousMode: initial.mode }, changedBy: id },
        { version: 2, value: { enabled: false, previousEnabled: true, mode: initial.mode, previousMode: initial.mode }, changedBy: id },
      ]);
  });

  it("撤销角色或停用账号后，既有设置指纹不能用于读写", async () => {
    const { id, role } = await superAdmin();
    const service = new NativePreviewService(pg.a as PrismaService);
    const initial = await service.get(id);
    await pg.observer.userRole.update({ where: { id: role.id }, data: { roleType: "OPERATION_ADMIN" } });
    await expect(service.get(id)).rejects.toThrow("页面不存在");
    await expect(service.set(id, true, initial.revision)).rejects.toThrow("页面不存在");
    await pg.observer.userRole.update({ where: { id: role.id }, data: { roleType: "SUPER_ADMIN" } });
    await pg.observer.user.update({ where: { id }, data: { status: "DISABLED" } });
    await expect(service.set(id, true, initial.revision)).rejects.toThrow("页面不存在");
    expect(await pg.observer.configSystem.count({ where: { configKey: NATIVE_PAIPAN_PREVIEW_KEY } })).toBe(0);
  });

  it("两个管理员并发保存同一指纹只能成功一次", async () => {
    const first = await superAdmin(); const second = await superAdmin();
    const a = new NativePreviewService(pg.a as PrismaService);
    const b = new NativePreviewService(pg.b as PrismaService);
    const initial = await a.get(first.id);
    const results = await Promise.allSettled([
      a.set(first.id, true, initial.revision), b.set(second.id, false, initial.revision),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(failure?.reason.getStatus()).toBe(409);
    expect(await pg.observer.configVersion.count({ where: { configKey: NATIVE_PAIPAN_PREVIEW_KEY } })).toBe(1);
  });

  it("私有台账写入失败时不遗留已开启配置", async () => {
    const { id } = await superAdmin();
    const service = new NativePreviewService(pg.a as PrismaService);
    const initial = await service.get(id);
    await pg.observer.$executeRawUnsafe(`ALTER TABLE "ConfigVersion" ADD CONSTRAINT local_preview_audit_failure CHECK ("configKey" <> 'paipan.native-preview.enabled')`);
    try {
      await expect(service.set(id, true, initial.revision, "native")).rejects.toThrow();
      expect(await pg.observer.configSystem.count({ where: { configKey: NATIVE_PAIPAN_PREVIEW_KEY } })).toBe(0);
      expect(await pg.observer.configSystem.count({ where: { configKey: PAIPAN_SUITE_MODE_KEY } })).toBe(0);
      expect(await currentNativePreviewAllowed(pg.observer as PrismaService, id)).toBe(false);
    } finally {
      await pg.observer.$executeRawUnsafe('ALTER TABLE "ConfigVersion" DROP CONSTRAINT local_preview_audit_failure');
    }
  });

  it("真实HTTP和主库贯通：参数校验、真人开关、自动化拒绝、撤权立即404（身份入口为合成替身）", async () => {
    const { id, role } = await superAdmin();
    let app: INestApplication | undefined;
    try {
      const module = await Test.createTestingModule({
        controllers: [NativePreviewController], providers: [NativePreviewService, RedLineGuard,
          { provide: PrismaService, useValue: pg.a }],
      }).overrideGuard(JwtAuthGuard).useValue({ canActivate(ctx: ExecutionContext) {
        ctx.switchToHttp().getRequest().user = { id, roles: ["SUPER_ADMIN"] }; return true;
      } }).compile();
      app = module.createNestApplication({ logger: false });
      app.useGlobalGuards(module.get(RedLineGuard));
      app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
      await app.init();
      const api = request(app.getHttpServer()); const url = "/system/native-paipan-preview";
      const initial = await api.get(url).expect(200).expect("Cache-Control", "private, no-store");
      expect(initial.body.enabled).toBe(false);
      await api.put(url).send({ enabled: false, mode: "tool:bazi", expectedRevision: initial.body.revision }).expect(400);
      await api.put(url).send({ enabled: "true", expectedRevision: initial.body.revision }).expect(400);
      await api.put(url).set("x-executor-type", "AUTOMATION")
        .send({ enabled: true, expectedRevision: initial.body.revision }).expect(403);
      expect(await pg.observer.configSystem.count({ where: { configKey: NATIVE_PAIPAN_PREVIEW_KEY } })).toBe(0);
      const opened = await api.put(url).send({ enabled: true, expectedRevision: initial.body.revision })
        .expect(200).expect("Cache-Control", "private, no-store");
      expect(opened.body.enabled).toBe(true);
      await api.put(url).send({ enabled: false, expectedRevision: initial.body.revision }).expect(409);
      await pg.observer.userRole.update({ where: { id: role.id }, data: { roleType: "OPERATION_ADMIN" } });
      // 合成身份仍携带旧 SUPER_ADMIN，服务端必须依当前主库拒绝。
      await api.get(url).expect(404);
      await api.put(url).send({ enabled: false, expectedRevision: opened.body.revision }).expect(404);
      expect(await pg.observer.configVersion.count({ where: { configKey: NATIVE_PAIPAN_PREVIEW_KEY } })).toBe(1);
    } finally { await app?.close(); }
  });

  it("主库整套模式切换与回退，另一个连接即时读取且旧版本不能覆盖", async () => {
    const { id } = await superAdmin();
    const writer = new NativePreviewService(pg.a as PrismaService);
    const reader = new NativePreviewService(pg.b as PrismaService);
    const initial = await writer.get(id);
    const normalId = randomUUID();
    await pg.observer.user.create({ data: { id: normalId, nickname: "LOCAL_SUITE_CONSUMER", status: "ACTIVE" } });
    const check = () => currentNativeSuiteAllowed(pg.observer as PrismaService, normalId, false);
    const runtime = new PaipanRuntimeService();
    const mode = () => runtime.getCurrentMode(pg.observer as PrismaService);
    const opened = await writer.set(id, false, initial.revision, "native");
    expect(await mode()).toBe("native");
    expect(await check()).toBe(true);
    await pg.observer.user.update({ where: { id: normalId }, data: { status: "DISABLED" } });
    expect(await check()).toBe(false);
    await pg.observer.user.update({ where: { id: normalId }, data: { status: "ACTIVE" } });
    expect(await reader.get(id)).toMatchObject({ enabled: false, mode: "native", revision: opened.revision });
    const closed = await writer.set(id, true, opened.revision, "legacy");
    expect(await mode()).toBe("legacy");
    expect(await check()).toBe(false);
    expect(await currentNativeSuiteAllowed(pg.observer as PrismaService, id, true)).toBe(true);
    expect(await currentNativeSuiteAllowed(pg.observer as PrismaService, id, false)).toBe(false);
    expect(await reader.get(id)).toMatchObject({ enabled: true, mode: "legacy", revision: closed.revision });
    await expect(writer.set(id, false, initial.revision, "native")).rejects.toMatchObject({ status: 409 });
    expect(await pg.observer.configSystem.count({ where: { configKey: { startsWith: "paipan.native-preview." } } })).toBe(2);
    await pg.observer.configSystem.update({ where: { configKey: PAIPAN_SUITE_MODE_KEY }, data: { configValue: "invalid" } });
    expect(await check()).toBe(false);
    await expect(mode()).rejects.toMatchObject({ status: 503 });
  });
});

import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { VideoController } from "../src/modules/video/video.controller";
import { VideoService } from "../src/modules/video/video.service";
import { JwtAuthGuard } from "../src/common/jwt-auth.guard";
import { TencentCallbackGuard } from "../src/common/tencent-callback.guard";
import { RedLineGuard } from "../src/common/red-lines";

describe("短视频作者外发红线真实HTTP（业务与身份为合成替身）", () => {
  let app: INestApplication;
  const svc = { create: jest.fn().mockResolvedValue({ id: "synthetic-video" }), update: jest.fn().mockResolvedValue({ id: "synthetic-video" }) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [VideoController], providers: [
      { provide: VideoService, useValue: svc }, RedLineGuard,
    ] }).overrideGuard(JwtAuthGuard).useValue({ canActivate(ctx: ExecutionContext) {
      ctx.switchToHttp().getRequest().user = { id: "synthetic-author", roles: ["USER"] }; return true;
    } }).overrideGuard(TencentCallbackGuard).useValue({ canActivate: () => false }).compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalGuards(module.get(RedLineGuard)); await app.init();
  });
  afterAll(async () => app?.close());
  beforeEach(() => jest.clearAllMocks());
  it.each(["post", "put"] as const)("AUTOMATION %s 在业务写入前403", async method => {
    await request(app.getHttpServer())[method](method === "post" ? "/videos" : "/videos/synthetic-video")
      .set("x-executor-type", "AUTOMATION").send({ title: "合成" }).expect(403);
    expect(svc.create).not.toHaveBeenCalled(); expect(svc.update).not.toHaveBeenCalled();
  });
  it("真人作者仍进入既有业务服务，不冒充管理员", async () => {
    await request(app.getHttpServer()).post("/videos").send({ title: "合成" }).expect(201);
    expect(svc.create).toHaveBeenCalledWith("synthetic-author", { title: "合成" }, false, "HUMAN");
    await request(app.getHttpServer()).put("/videos/synthetic-video").send({ title: "修改合成" }).expect(200);
    expect(svc.update).toHaveBeenCalledWith("synthetic-author", "synthetic-video", { title: "修改合成" });
  });
});

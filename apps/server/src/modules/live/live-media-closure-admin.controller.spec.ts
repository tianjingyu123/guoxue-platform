import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { LiveMediaClosureAdminController } from "./live-media-closure-admin.controller";
import { LiveMediaClosureAdminService } from "./live-media-closure-admin.service";

describe("媒体资源核验只读 HTTP 入口", () => {
  let app: INestApplication;
  const get = jest.fn();
  const roomId = "00000000-0000-4000-8000-000000000001";
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [LiveMediaClosureAdminController],
      providers: [{ provide: LiveMediaClosureAdminService, useValue: { get } }],
    }).overrideGuard(JwtAuthGuard).useValue({
      // 仅替换身份解析；保留真实 RolesGuard、参数管道与路由行为。
      canActivate(context: any) {
        const req = context.switchToHttp().getRequest();
        req.user = { id: "synthetic-admin", roles: [req.headers["x-test-role"] || "USER"] };
        return true;
      },
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => { get.mockReset().mockResolvedValue({ room: { id: roomId }, mediaState: "UNKNOWN" }); });

  it.each(["SUPER_ADMIN", "OPERATION_ADMIN"])("%s 可只读查询且禁止缓存", async role => {
    const result = await request(app.getHttpServer()).get(`/api/v1/live/admin/media-closure/${roomId}`).set("x-test-role", role).expect(200);
    expect(result.headers["cache-control"]).toBe("private, no-store");
    expect(get).toHaveBeenCalledWith(roomId, "synthetic-admin");
    expect(get).toHaveBeenCalledTimes(1);
  });
  it.each(["USER", "CIRCLE_OWNER", "FINANCE_ADMIN"])("%s 不可访问运维证据", async role => {
    await request(app.getHttpServer()).get(`/api/v1/live/admin/media-closure/${roomId}`).set("x-test-role", role).expect(403);
    expect(get).not.toHaveBeenCalled();
  });
  it("非法房间参数在读取服务前拒绝", async () => {
    await request(app.getHttpServer()).get("/api/v1/live/admin/media-closure/not-a-room").set("x-test-role", "SUPER_ADMIN").expect(400);
    expect(get).not.toHaveBeenCalled();
  });
  it.each(["post", "put", "delete"] as const)("不提供 %s 强制收尾入口", async method => {
    await request(app.getHttpServer())[method](`/api/v1/live/admin/media-closure/${roomId}`).set("x-test-role", "SUPER_ADMIN").expect(404);
    expect(get).not.toHaveBeenCalled();
  });
});

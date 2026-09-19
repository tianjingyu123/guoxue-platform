import "reflect-metadata";
import * as http from "http";
import { AddressInfo } from "net";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AiGatewayController } from "./ai-gateway.controller";
import { AiGatewayService } from "./ai-gateway.service";
import { ModelRouterService } from "./model-router.service";
import { StreamUnifierService } from "./stream-unifier.service";
import { ChatSceneAccessService } from "./chat-scene-access.service";
import { DeepSeekAdapter } from "./adapters/deepseek.adapter";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { SanitizePipe } from "../../common/sanitize.pipe";
import { chineseValidationExceptionFactory } from "../../common/validation-chinese";

/**
 * 通用 AI 对话接口的场景准入与输入收口 —— HTTP 入口级验证。
 *
 * ## 隔离性（重要）
 * - 供应商为**本机桩模型**（临时 http server，端口由系统分配 `listen(0)`，不固定占用），
 *   全程 **不调用任何付费模型**；
 * - 不连数据库、不连 Redis、**不执行 `prisma generate`**，不写 node_modules；
 *   测试中没有任何 Prisma 模型读写（`@prisma/client` 仅因控制器依赖链被加载，只读且未使用任何模型）；
 * - 不启动平台服务、不占用其他任务的端口。
 *
 * ## 被测链路
 * 真实 HTTP → 全局管道（SanitizePipe + ValidationPipe，配置与 `main.ts:154-163` 一致）
 *   → 真实 AiGatewayController → 真实 ChatSceneAccessService
 *   → 网关替身（逐字复刻 `ai-gateway.service.ts:93` 的 `{...options, ...req.options}` 合并）
 *   → **真实 DeepSeekAdapter** → 桩模型
 *
 * 网关替身的说明：`AiGatewayService` 在主工作区有未提交改动（09-17 用量记账），
 * 本候选基于 HEAD，不改动该文件，因此用替身承接，并把合并逻辑逐字复刻以保证
 * 「未传参数不得覆盖路由默认值」这一条是端到端可信的 —— 断言取自**桩模型实际收到的请求体**。
 */

const ROUTE_OPTIONS = { temperature: 0.25, maxTokens: 333, topP: 0.77 };
const ROUTE_MODEL = "deepseek-stub-model";

interface StubRecord {
  model: string;
  stream: boolean;
  temperature: number;
  max_tokens: number;
  top_p: number;
  messages: Array<{ role: string; content: string }>;
}

/** 本机桩模型：OpenAI 兼容，记录收到的每一次请求 */
class StubModelServer {
  readonly received: StubRecord[] = [];
  private server!: http.Server;
  private port = 0;

  get callCount(): number {
    return this.received.length;
  }

  get baseUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  reset(): void {
    this.received.length = 0;
  }

  async start(): Promise<void> {
    this.server = http.createServer((req, res) => {
      if (req.method !== "POST" || !req.url?.startsWith("/v1/chat/completions")) {
        res.statusCode = 404;
        res.end();
        return;
      }
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c as Buffer));
      req.on("end", () => {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as StubRecord;
        this.received.push(body);

        if (body.stream) {
          res.writeHead(200, { "Content-Type": "text/event-stream" });
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "桩" } }] })}\n\n`);
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "回答" } }] })}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              model: body.model,
              choices: [{ message: { content: "桩回答" }, finish_reason: "stop" }],
              usage: { prompt_tokens: 11, completion_tokens: 22, total_tokens: 33 },
            }),
          );
        }
      });
    });
    await new Promise<void>((resolve) => this.server.listen(0, "127.0.0.1", resolve));
    this.port = (this.server.address() as AddressInfo).port;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}

describe("AI 通用对话接口 · 场景准入与输入收口（HTTP 入口）", () => {
  let app: INestApplication;
  const stub = new StubModelServer();
  let gatewayCalls = 0;

  beforeAll(async () => {
    await stub.start();
    process.env.DEEPSEEK_API_KEY = "stub-key-not-a-real-credential";
    process.env.DEEPSEEK_BASE_URL = stub.baseUrl;

    const adapter = new DeepSeekAdapter();

    // 网关替身：合并逻辑逐字复刻 ai-gateway.service.ts:93 / :188
    const gatewayDouble = {
      async chat(req: { scene: string; messages: any[]; options?: any }) {
        gatewayCalls++;
        const merged = { ...ROUTE_OPTIONS, ...req.options };
        return adapter.chat(ROUTE_MODEL, req.messages, merged);
      },
      async *chatStream(req: { scene: string; messages: any[]; options?: any }) {
        gatewayCalls++;
        const merged = { ...ROUTE_OPTIONS, ...req.options };
        yield* adapter.chatStream(ROUTE_MODEL, req.messages, merged);
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AiGatewayController],
      providers: [
        ChatSceneAccessService,
        StreamUnifierService,
        { provide: AiGatewayService, useValue: gatewayDouble },
        {
          provide: ModelRouterService,
          useValue: {
            getRoutingConfig: async () => ({ default: { model: ROUTE_MODEL, ...ROUTE_OPTIONS }, scenes: {} }),
            getSceneBudgets: async () => ({ defaultModel: ROUTE_MODEL, scenes: {}, totalScenes: 0 }),
          },
        },
      ],
    })
      // 身份由测试头注入，等价于 JwtAuthGuard 已通过
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          const roles = String(req.headers["x-test-roles"] || "").trim();
          req.user = { id: String(req.headers["x-test-user"] || "u-test"), roles: roles ? roles.split(",") : [] };
          return true;
        },
      })
      .overrideGuard(StrictRedisThrottleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    // 与 main.ts:154-163 一致
    app.useGlobalPipes(
      new SanitizePipe(),
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
        exceptionFactory: chineseValidationExceptionFactory,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await stub.stop();
  });

  beforeEach(() => {
    stub.reset();
    gatewayCalls = 0;
  });

  const asUser = (r: request.Test) => r.set("x-test-user", "u-normal");
  const asAdmin = (r: request.Test) =>
    r.set("x-test-user", "u-admin").set("x-test-roles", "OPERATION_ADMIN");

  // ────────────── 一、未授权场景被拒，且供应商零调用 ──────────────

  describe("场景准入", () => {
    it.each([
      ["未登记的场景名", "totally_made_up_scene"],
      ["内部场景 zhixuan_chat（有自己的额度门禁）", "zhixuan_chat"],
      ["内部场景 circle_assistant（有自己的成员门禁）", "circle_assistant"],
      ["内部场景 paipan_report（有自己的归属校验）", "paipan_report"],
      ["管理端场景 nl2sql，但调用者是普通用户", "nl2sql"],
    ])("普通用户请求 %s → 403，桩模型调用次数为 0", async (_label, scene) => {
      const res = await asUser(
        request(app.getHttpServer()).post("/ai/chat").send({
          scene,
          messages: [{ role: "user", content: "你好" }],
        }),
      );

      expect(res.status).toBe(403);
      expect(stub.callCount).toBe(0);
      expect(gatewayCalls).toBe(0);
    });

    it("未登记场景与无权限场景返回同一个响应，不构成场景名探测器", async () => {
      const unknown = await asUser(
        request(app.getHttpServer())
          .post("/ai/chat")
          .send({ scene: "totally_made_up_scene", messages: [{ role: "user", content: "x" }] }),
      );
      const forbidden = await asUser(
        request(app.getHttpServer())
          .post("/ai/chat")
          .send({ scene: "nl2sql", messages: [{ role: "user", content: "x" }] }),
      );

      expect(unknown.status).toBe(forbidden.status);
      expect(unknown.body.message).toBe(forbidden.body.message);
      expect(stub.callCount).toBe(0);
    });

    it("管理员请求 nl2sql → 放行，桩模型被调用 1 次", async () => {
      const res = await asAdmin(
        request(app.getHttpServer())
          .post("/ai/chat")
          .send({ scene: "nl2sql", messages: [{ role: "user", content: "统计最近7天订单" }] }),
      );

      expect(res.status).toBe(201);
      expect(stub.callCount).toBe(1);
    });
  });

  // ────────────── 二、畸形消息与超限输入被拒 ──────────────

  describe("输入校验", () => {
    const bad: Array<[string, unknown]> = [
      ["messages 为空数组", { scene: "general_chat", messages: [] }],
      ["messages 缺失", { scene: "general_chat" }],
      [
        "role 非法",
        { scene: "general_chat", messages: [{ role: "root", content: "x" }] },
      ],
      [
        "content 不是字符串",
        { scene: "general_chat", messages: [{ role: "user", content: { a: 1 } }] },
      ],
      [
        "content 为空串",
        { scene: "general_chat", messages: [{ role: "user", content: "" }] },
      ],
      [
        "scene 含非法字符",
        { scene: "general chat/../admin", messages: [{ role: "user", content: "x" }] },
      ],
      [
        "maxTokens 非整数",
        { scene: "general_chat", messages: [{ role: "user", content: "x" }], maxTokens: 12.5 },
      ],
      [
        "maxTokens 超出场景上限 2048",
        { scene: "general_chat", messages: [{ role: "user", content: "x" }], maxTokens: 999999 },
      ],
      [
        "maxTokens 为 0",
        { scene: "general_chat", messages: [{ role: "user", content: "x" }], maxTokens: 0 },
      ],
      [
        "temperature 超出场景上限 1",
        { scene: "general_chat", messages: [{ role: "user", content: "x" }], temperature: 5 },
      ],
      [
        "topP 超出场景上限 1",
        { scene: "general_chat", messages: [{ role: "user", content: "x" }], topP: 1.5 },
      ],
      [
        "消息条数超出场景上限 20",
        {
          scene: "general_chat",
          messages: Array.from({ length: 21 }, () => ({ role: "user", content: "x" })),
        },
      ],
      [
        "单条长度超出场景上限 4000",
        { scene: "general_chat", messages: [{ role: "user", content: "字".repeat(4001) }] },
      ],
      [
        "总长度超出场景上限 12000",
        {
          scene: "general_chat",
          messages: Array.from({ length: 4 }, () => ({ role: "user", content: "字".repeat(3500) })),
        },
      ],
    ];

    it.each(bad)("%s → 被拒，桩模型调用次数为 0", async (_label, payload) => {
      const res = await asUser(request(app.getHttpServer()).post("/ai/chat").send(payload as object));

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(stub.callCount).toBe(0);
      expect(gatewayCalls).toBe(0);
    });

    it("场景不同，参数边界不同：temperature 0.7 在 general_chat 放行、在 nl2sql 被拒", async () => {
      const ok = await asUser(
        request(app.getHttpServer())
          .post("/ai/chat")
          .send({ scene: "general_chat", messages: [{ role: "user", content: "x" }], temperature: 0.7 }),
      );
      expect(ok.status).toBe(201);
      expect(stub.received[0].temperature).toBe(0.7);

      stub.reset();

      const rejected = await asAdmin(
        request(app.getHttpServer())
          .post("/ai/chat")
          .send({ scene: "nl2sql", messages: [{ role: "user", content: "x" }], temperature: 0.7 }),
      );
      expect(rejected.status).toBe(400);
      expect(stub.callCount).toBe(0);
    });
  });

  // ────────────── 三、未传参数不得覆盖路由默认值 ──────────────

  describe("路由默认值", () => {
    it("完全不传可选参数 → 供应商收到的是路由配置值", async () => {
      await asUser(
        request(app.getHttpServer())
          .post("/ai/chat")
          .send({ scene: "general_chat", messages: [{ role: "user", content: "你好" }] }),
      ).expect(201);

      expect(stub.callCount).toBe(1);
      expect(stub.received[0]).toMatchObject({
        model: ROUTE_MODEL,
        temperature: ROUTE_OPTIONS.temperature,
        max_tokens: ROUTE_OPTIONS.maxTokens,
        top_p: ROUTE_OPTIONS.topP,
      });
    });

    it("只传 maxTokens → 只有它被覆盖，其余仍是路由配置值", async () => {
      await asUser(
        request(app.getHttpServer())
          .post("/ai/chat")
          .send({ scene: "general_chat", messages: [{ role: "user", content: "你好" }], maxTokens: 128 }),
      ).expect(201);

      expect(stub.received[0]).toMatchObject({
        temperature: ROUTE_OPTIONS.temperature,
        max_tokens: 128,
        top_p: ROUTE_OPTIONS.topP,
      });
    });

    it("流式路径同样保留路由默认值", async () => {
      await asUser(
        request(app.getHttpServer())
          .post("/ai/chat/stream")
          .send({ scene: "general_chat", messages: [{ role: "user", content: "你好" }] }),
      ).expect(201);

      expect(stub.received[0]).toMatchObject({
        stream: true,
        temperature: ROUTE_OPTIONS.temperature,
        max_tokens: ROUTE_OPTIONS.maxTokens,
        top_p: ROUTE_OPTIONS.topP,
      });
    });
  });

  // ────────────── 四、正常调用兼容性（已知调用方） ──────────────

  describe("已知调用方兼容", () => {
    it("k6 压测脚本的请求体（general_chat + 平铺 temperature/maxTokens）仍然成功", async () => {
      // 取自 tests/performance/k6/main.js:357-365
      const res = await asUser(
        request(app.getHttpServer())
          .post("/ai/chat")
          .send({
            scene: "general_chat",
            messages: [{ role: "user", content: "请用一句话介绍孔子" }],
            temperature: 0.7,
            maxTokens: 128,
          }),
      );

      expect(res.status).toBe(201);
      expect(res.body.content).toBe("桩回答");
      expect(stub.received[0]).toMatchObject({ temperature: 0.7, max_tokens: 128 });
    });

    it("管理端 DataExplorer 的请求体（nl2sql + system 上下文 + 嵌套 options）在管理员身份下仍然成功", async () => {
      // 取自 apps/admin/src/views/ai/DataExplorer.vue:165-183 与 ChatUI.vue:142-146
      const res = await asAdmin(
        request(app.getHttpServer())
          .post("/ai/chat/stream")
          .send({
            scene: "nl2sql",
            messages: [
              { role: "system", content: "你是一个 SQL 专家。数据库是 PostgreSQL。" },
              { role: "user", content: "最近7天每天的订单金额" },
            ],
            // 管理端把参数嵌在 options 里下发；ChatDto 是平铺字段，
            // 该对象会被 whitelist 剥掉 —— 此前如此，本次改动后仍然如此（见交付说明 D-2）
            options: { maxTokens: 500, temperature: 0.1 },
          }),
      );

      expect(res.status).toBe(201);
      expect(res.headers["content-type"]).toContain("text/event-stream");
      expect(res.text).toContain('"type":"chunk"');
      expect(res.text).toContain('"type":"done"');
      // options 被剥离 → 用的是路由配置值，不是管理端以为的 500/0.1
      expect(stub.received[0]).toMatchObject({
        max_tokens: ROUTE_OPTIONS.maxTokens,
        temperature: ROUTE_OPTIONS.temperature,
      });
    });
  });

  // ────────────── 五、被拒的流式请求不得留下半截 SSE ──────────────

  describe("流式拒绝路径", () => {
    it("场景无权 → 普通 JSON 403，响应不是 SSE、不含任何 data: 行", async () => {
      const res = await asUser(
        request(app.getHttpServer())
          .post("/ai/chat/stream")
          .send({ scene: "nl2sql", messages: [{ role: "user", content: "x" }] }),
      );

      expect(res.status).toBe(403);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(res.headers["content-type"]).not.toContain("text/event-stream");
      expect(res.text).not.toContain("data:");
      expect(stub.callCount).toBe(0);
    });

    it("输入超限 → 普通 JSON 400，响应不是 SSE、不含任何 data: 行", async () => {
      const res = await asUser(
        request(app.getHttpServer())
          .post("/ai/chat/stream")
          .send({ scene: "general_chat", messages: [{ role: "user", content: "字".repeat(4001) }] }),
      );

      expect(res.status).toBe(400);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(res.text).not.toContain("data:");
      expect(stub.callCount).toBe(0);
    });
  });

  // ────────────── 六、额度：本接口当前不存在额度门禁 ──────────────

  describe("用户额度", () => {
    it("控制器依赖图中不含任何额度/会员服务 —— 被拒请求不可能扣额度，同时锁定该缺口", () => {
      const deps: Array<{ name?: string }> =
        Reflect.getMetadata("design:paramtypes", AiGatewayController) ?? [];
      const names = deps.map((d) => d?.name).filter(Boolean) as string[];

      expect(names).toEqual([
        "AiGatewayService",
        "ModelRouterService",
        "StreamUnifierService",
        "ChatSceneAccessService",
      ]);
      // 这两个接口至今没有 consumeAiQuota（对比 zhixuan.controller.ts:40,55）。
      // 本轮按要求不新增额度扣减：是否补、怎么补、失败如何回退，见交付说明 D-3。
      expect(names.some((n) => /Member|Quota|Benefit/i.test(n))).toBe(false);
    });
  });
});

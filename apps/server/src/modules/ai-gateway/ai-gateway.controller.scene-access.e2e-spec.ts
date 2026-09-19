import "reflect-metadata";
import * as http from "http";
import { AddressInfo } from "net";
import { runInThisContext } from "node:vm";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AiGatewayController } from "./ai-gateway.controller";
import { AiGatewayService } from "./ai-gateway.service";
import { ModelRouterService, type ModelRoutingConfig } from "./model-router.service";
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
 * - 供应商为**本机桩模型**（临时 `http.Server`，`listen(0)` 由系统分配端口，不固定占用），
 *   全程 **不调用任何付费模型**；
 * - 不连数据库、不连 Redis、**不执行 `prisma generate`**，不写 `node_modules`；
 *   测试中没有任何 Prisma 模型读写（`@prisma/client` 仅因控制器依赖链被加载，只读且未使用任何模型）；
 * - 不启动平台服务、不占用其他任务的端口。
 *
 * ## 被测链路
 * ```
 * 真实 HTTP(supertest)
 *   → 全局管道 SanitizePipe + ValidationPipe（配置逐项对齐 main.ts:154-163）
 *   → 真实 AiGatewayController
 *   → 真实 ChatSceneAccessService（含最终生效参数解析）
 *   → 网关替身（逐字复刻 ai-gateway.service.ts:93 的 {...routeOptions, ...req.options} 合并，
 *      且 routeOptions 由与被测服务同一份路由配置按 model-router.service.ts resolve() 的取值链推导）
 *   → 真实 DeepSeekAdapter → 桩模型
 * ```
 *
 * 所有"最终发给供应商的参数"断言都取自**桩模型实际收到的请求体**，不是替身的内部状态。
 *
 * **为什么用网关替身**：`ai-gateway.service.ts` 在主工作区有未提交改动，本候选基于 HEAD
 * 且不改该文件（本轮限定只影响通用 HTTP 入口，不擅自改变其他内部调用）。
 */

const ROUTE_MODEL = "deepseek-stub-model";

/** 与 nl2sql / general_chat 两个场景的边界都兼容；取非常规数字，避免与适配器硬编码 0.3/2048/0.9 混淆 */
const CONFIG_COMPATIBLE: ModelRoutingConfig = {
  default: { model: ROUTE_MODEL, temperature: 0.25, maxTokens: 333, topP: 0.77 },
  scenes: {},
};

/** 与 prisma/seed.ts:1233 的 default 一致：maxTokens 2048 超过 nl2sql 的 500 */
const CONFIG_SEED_LIKE: ModelRoutingConfig = {
  default: { model: ROUTE_MODEL, temperature: 0.3, maxTokens: 2048, topP: 0.9 },
  scenes: {},
};

/** 三项都超过 nl2sql 的边界（500 / 0.3 / 0.9） */
const CONFIG_OVER: ModelRoutingConfig = {
  default: { model: ROUTE_MODEL, temperature: 0.9, maxTokens: 4096, topP: 0.95 },
  scenes: {},
};

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
  /** 被测服务与网关替身共用同一份路由配置，单个用例内可改 */
  let routingConfig: ModelRoutingConfig = CONFIG_COMPATIBLE;

  beforeAll(async () => {
    // Jest 的 node 环境不会稳定继承 Node 18+ 的全局 fetch；显式注入，避免测试环境误连供应商失败。
    global.fetch = runInThisContext("fetch") as typeof fetch;
    await stub.start();
    process.env.DEEPSEEK_API_KEY = "stub-key-not-a-real-credential";
    process.env.DEEPSEEK_BASE_URL = stub.baseUrl;

    const adapter = new DeepSeekAdapter();

    /** 复刻 model-router.service.ts resolve() 的 options 取值链 */
    const routeOptionsOf = (scene: string) => {
      const sc = routingConfig.scenes?.[scene] || routingConfig.default;
      return {
        temperature: sc?.temperature ?? routingConfig.default?.temperature ?? 0.3,
        maxTokens: sc?.maxTokens ?? routingConfig.default?.maxTokens ?? 2048,
        topP: sc?.topP ?? routingConfig.default?.topP ?? 0.9,
      };
    };

    // 网关替身：合并逻辑逐字复刻 ai-gateway.service.ts:93 / :188
    const gatewayDouble = {
      async chat(req: { scene: string; messages: any[]; options?: any }) {
        gatewayCalls++;
        const merged = { ...routeOptionsOf(req.scene), ...req.options };
        return adapter.chat(ROUTE_MODEL, req.messages, merged);
      },
      async *chatStream(req: { scene: string; messages: any[]; options?: any }) {
        gatewayCalls++;
        const merged = { ...routeOptionsOf(req.scene), ...req.options };
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
            getRoutingConfig: async () => routingConfig,
            getSceneBudgets: async () => ({ defaultModel: ROUTE_MODEL, scenes: {}, totalScenes: 0 }),
          },
        },
      ],
    })
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
    routingConfig = CONFIG_COMPATIBLE;
  });

  const asUser = (r: request.Test) => r.set("x-test-user", "u-normal");
  const asAdmin = (r: request.Test) =>
    r.set("x-test-user", "u-admin").set("x-test-roles", "OPERATION_ADMIN");

  // ────────────── 一、场景准入 ──────────────

  describe("场景准入", () => {
    it.each([
      ["未登记的场景名", "totally_made_up_scene"],
      ["内部场景 zhixuan_chat", "zhixuan_chat"],
      ["内部场景 circle_assistant", "circle_assistant"],
      ["内部场景 paipan_report", "paipan_report"],
      ["受控场景 general_chat，但调用者是普通用户", "general_chat"],
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

  // ────────────── 二、输入校验 ──────────────

  describe("输入校验", () => {
    const bad: Array<[string, unknown]> = [
      ["messages 为空数组", { scene: "general_chat", messages: [] }],
      ["messages 缺失", { scene: "general_chat" }],
      ["role 非法", { scene: "general_chat", messages: [{ role: "root", content: "x" }] }],
      ["content 不是字符串", { scene: "general_chat", messages: [{ role: "user", content: { a: 1 } }] }],
      ["content 为空串", { scene: "general_chat", messages: [{ role: "user", content: "" }] }],
      ["scene 含非法字符", { scene: "general chat/../admin", messages: [{ role: "user", content: "x" }] }],
      ["maxTokens 非整数", { scene: "general_chat", messages: [{ role: "user", content: "x" }], maxTokens: 12.5 }],
      ["maxTokens 超出场景上限 2048", { scene: "general_chat", messages: [{ role: "user", content: "x" }], maxTokens: 999999 }],
      ["maxTokens 为 0", { scene: "general_chat", messages: [{ role: "user", content: "x" }], maxTokens: 0 }],
      ["temperature 超出场景上限 1", { scene: "general_chat", messages: [{ role: "user", content: "x" }], temperature: 5 }],
      ["topP 超出场景上限 1", { scene: "general_chat", messages: [{ role: "user", content: "x" }], topP: 1.5 }],
      [
        "消息条数超出场景上限 20",
        { scene: "general_chat", messages: Array.from({ length: 21 }, () => ({ role: "user", content: "x" })) },
      ],
      ["单条长度超出场景上限 4000", { scene: "general_chat", messages: [{ role: "user", content: "字".repeat(4001) }] }],
      [
        "总长度超出场景上限 12000",
        { scene: "general_chat", messages: Array.from({ length: 4 }, () => ({ role: "user", content: "字".repeat(3500) })) },
      ],
    ];

    it.each(bad)("%s → 被拒，桩模型调用次数为 0", async (_label, payload) => {
      const res = await asAdmin(request(app.getHttpServer()).post("/ai/chat").send(payload as object));

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(stub.callCount).toBe(0);
      expect(gatewayCalls).toBe(0);
    });

    it("场景不同，参数边界不同：temperature 0.7 在 general_chat 放行、在 nl2sql 被拒", async () => {
      const ok = await asAdmin(
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

  // ────────────── 三、最终生效参数（本轮重点） ──────────────

  describe("最终生效参数", () => {
    it("合法的路由默认值原样保留（不裁剪、不改写）", async () => {
      routingConfig = CONFIG_COMPATIBLE;

      await asAdmin(
        request(app.getHttpServer())
          .post("/ai/chat")
          .send({ scene: "general_chat", messages: [{ role: "user", content: "你好" }] }),
      ).expect(201);

      expect(stub.received[0]).toMatchObject({
        model: ROUTE_MODEL,
        temperature: 0.25,
        max_tokens: 333,
        top_p: 0.77,
      });
    });

    it("nl2sql 不传 maxTokens、路由默认 2048 时，发给供应商的不得超过场景上限 500", async () => {
      routingConfig = CONFIG_SEED_LIKE; // 与 prisma/seed.ts 的 default 一致

      await asAdmin(
        request(app.getHttpServer())
          .post("/ai/chat")
          .send({ scene: "nl2sql", messages: [{ role: "user", content: "最近7天订单" }] }),
      ).expect(201);

      expect(stub.callCount).toBe(1);
      expect(stub.received[0].max_tokens).toBe(500);
      expect(stub.received[0].max_tokens).toBeLessThanOrEqual(500);
      // temperature / topP 在该配置下未越界，应原样保留
      expect(stub.received[0].temperature).toBe(0.3);
      expect(stub.received[0].top_p).toBe(0.9);
    });

    it("路由默认值三项全部越界时，三项都被裁剪到 nl2sql 的场景边界", async () => {
      routingConfig = CONFIG_OVER; // 0.9 / 4096 / 0.95

      await asAdmin(
        request(app.getHttpServer())
          .post("/ai/chat")
          .send({ scene: "nl2sql", messages: [{ role: "user", content: "x" }] }),
      ).expect(201);

      expect(stub.received[0]).toMatchObject({
        temperature: 0.3,
        max_tokens: 500,
        top_p: 0.9,
      });
    });

    it("general_chat 的路由默认值越界时同样被裁剪到该场景边界 2048", async () => {
      routingConfig = CONFIG_OVER; // maxTokens 4096

      await asAdmin(
        request(app.getHttpServer())
          .post("/ai/chat")
          .send({ scene: "general_chat", messages: [{ role: "user", content: "x" }] }),
      ).expect(201);

      expect(stub.received[0].max_tokens).toBe(2048);
      // general_chat 的 temperature 上限是 1，0.9 合法 → 保留
      expect(stub.received[0].temperature).toBe(0.9);
    });

    it("调用方显式传入的越界值一律拒绝，不做裁剪", async () => {
      routingConfig = CONFIG_SEED_LIKE;

      const res = await asAdmin(
        request(app.getHttpServer())
          .post("/ai/chat")
          .send({ scene: "nl2sql", messages: [{ role: "user", content: "x" }], maxTokens: 2048 }),
      );

      expect(res.status).toBe(400);
      expect(stub.callCount).toBe(0);
    });

    it("只传一项时，另两项仍走（必要时裁剪后的）路由默认值", async () => {
      routingConfig = CONFIG_SEED_LIKE;

      await asAdmin(
        request(app.getHttpServer())
          .post("/ai/chat")
          .send({ scene: "nl2sql", messages: [{ role: "user", content: "x" }], temperature: 0.1 }),
      ).expect(201);

      expect(stub.received[0]).toMatchObject({
        temperature: 0.1, // 调用方的合法取值
        max_tokens: 500, // 路由 2048 → 裁剪
        top_p: 0.9, // 路由值合法 → 保留
      });
    });

    it("流式与非流式的最终生效参数完全一致", async () => {
      routingConfig = CONFIG_OVER;
      const body = { scene: "nl2sql", messages: [{ role: "user", content: "同一请求" }] };

      await asAdmin(request(app.getHttpServer()).post("/ai/chat").send(body)).expect(201);
      await asAdmin(request(app.getHttpServer()).post("/ai/chat/stream").send(body)).expect(201);

      expect(stub.callCount).toBe(2);
      const [nonStream, streamed] = stub.received;
      expect(streamed.stream).toBe(true);
      expect(nonStream.stream).toBe(false);
      expect({
        temperature: streamed.temperature,
        max_tokens: streamed.max_tokens,
        top_p: streamed.top_p,
      }).toEqual({
        temperature: nonStream.temperature,
        max_tokens: nonStream.max_tokens,
        top_p: nonStream.top_p,
      });
      expect(streamed.max_tokens).toBe(500);
    });
  });

  // ────────────── 四、拒绝发生在供应商调用与 SSE 响应头之前 ──────────────

  describe("流式拒绝路径", () => {
    it.each([
      ["场景无权", 403, { scene: "nl2sql", messages: [{ role: "user", content: "x" }] }],
      ["输入超限", 400, { scene: "general_chat", messages: [{ role: "user", content: "字".repeat(4001) }] }],
      [
        "调用方参数越界",
        400,
        { scene: "general_chat", messages: [{ role: "user", content: "x" }], maxTokens: 999999 },
      ],
    ])("%s → 普通 JSON %s，响应不是 SSE、不含任何 data: 行，桩模型零调用", async (_label, status, payload) => {
      const caller = status === 403 ? asUser : asAdmin;
      const res = await caller(
        request(app.getHttpServer()).post("/ai/chat/stream").send(payload as object),
      );

      expect(res.status).toBe(status);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(res.headers["content-type"]).not.toContain("text/event-stream");
      expect(res.text).not.toContain("data:");
      expect(stub.callCount).toBe(0);
      expect(gatewayCalls).toBe(0);
    });
  });

  // ────────────── 五、已知调用方兼容 ──────────────

  describe("已知调用方兼容", () => {
    it("受控运维账号执行 k6 请求体（general_chat + 平铺 temperature/maxTokens）仍然成功", async () => {
      // 取自 tests/performance/k6/main.js:357-365
      const res = await asAdmin(
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

    it("管理端 DataExplorer 的真实请求体：流式可用，嵌套 options 被忽略，最终参数由路由+裁剪决定", async () => {
      // 路由配置取与 prisma/seed.ts:1233 一致的 default，贴近真实部署
      routingConfig = CONFIG_SEED_LIKE;

      // 请求体取自 apps/admin/src/views/ai/DataExplorer.vue:165-183 与 ChatUI.vue:142-152
      const res = await asAdmin(
        request(app.getHttpServer())
          .post("/ai/chat/stream")
          .send({
            scene: "nl2sql",
            messages: [
              {
                role: "system",
                content:
                  "\n你是一个 SQL 专家。数据库是 PostgreSQL。\n可查询的表：User (用户), Content (内容), Comment (评论)\n查询规则：\n1. 只生成 SELECT 查询\n",
              },
              { role: "user", content: "最近7天每天的订单金额" },
            ],
            // 管理端把参数嵌在 options 对象里下发；ChatDto 是平铺字段，
            // 该对象被全局 whitelist 剥掉 —— 改动前后都如此
            options: { maxTokens: 500, temperature: 0.1 },
          }),
      );

      // 输出可用：SSE 正常，chunk 与 done 都在
      expect(res.status).toBe(201);
      expect(res.headers["content-type"]).toContain("text/event-stream");
      expect(res.text).toContain('"type":"chunk"');
      expect(res.text).toContain('"type":"done"');

      // 被忽略的是管理端嵌套 options 里的两项：
      // - temperature 意图 0.1，实际用路由值 0.3（**未生效**）
      // - maxTokens  意图 500，实际是路由 2048 被裁剪到场景上限 500（**数值恰好相同，但不是它生效了**）
      expect(stub.received[0].temperature).toBe(0.3);
      expect(stub.received[0].temperature).not.toBe(0.1);
      expect(stub.received[0].max_tokens).toBe(500);
      expect(stub.received[0].top_p).toBe(0.9);

      // 系统提示词原样送达（SanitizePipe 对 content 字段放行）
      expect(stub.received[0].messages[0].content).toContain("你是一个 SQL 专家");
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

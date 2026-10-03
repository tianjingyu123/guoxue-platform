import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { runInThisContext } from "node:vm";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { QwenAdapter } from "./qwen.adapter";
import { AiGatewayController } from "../ai-gateway.controller";
import { AiGatewayService } from "../ai-gateway.service";
import { ModelRouterService } from "../model-router.service";
import { StreamUnifierService } from "../stream-unifier.service";
import { ChatSceneAccessService } from "../chat-scene-access.service";
import { JwtAuthGuard } from "../../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../../common/redis-throttle.guard";
import { managedChatResult, ManagedIncompleteChatError } from "../../managed-tenancy/managed-chat-result";

/** 实际localhost供应商、Qwen、网关及HTTP控制器；认证/缓存/计量替身不代表生产渠道。 */
describe("客户请求编号与原平台响应隔离", () => {
  let upstream: Server, app: INestApplication, endpoint: string, platform: QwenAdapter;
  let calls = 0;
  let responseId: unknown = "chatcmpl-synthetic-private-42", finishReason = "stop";
  const savedKey = process.env.DASHSCOPE_API_KEY, savedUrl = process.env.DASHSCOPE_BASE_URL;
  const savedFetch = globalThis.fetch;
  const usage = { prompt_tokens: 4, completion_tokens: 3, total_tokens: 7 };

  beforeAll(async () => {
    // Jest 29 沙箱可能没有 fetch；使用 Node 实际传输，禁止测试访问本机以外的通道。
    const nativeFetch = runInThisContext("fetch") as typeof fetch;
    globalThis.fetch = (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (url.protocol !== "http:" || url.hostname !== "127.0.0.1") throw new Error("边界测试仅允许本机 HTTP");
      return nativeFetch(input, init);
    };
    upstream = createServer(async (req, res) => {
      if (req.method !== "POST" || req.url !== "/v1/chat/completions") { res.writeHead(404).end(); return; }
      for await (const ignored of req) { void ignored; }
      calls++;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ id: responseId, model: "synthetic-qwen", usage, choices: [{ message: { content: "合成本机答复" }, finish_reason: finishReason }] }));
    });
    await new Promise<void>(done => upstream.listen(0, "127.0.0.1", done));
    endpoint = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}/v1`;
    process.env.DASHSCOPE_API_KEY = "synthetic-platform-key-never-an-account";
    process.env.DASHSCOPE_BASE_URL = endpoint;
    platform = new QwenAdapter();
    const router = {
      resolve: async () => ({ provider: "alibaba", model: "synthetic-qwen", options: {} }),
      getRoutingConfig: async () => ({ default: { model: "synthetic-qwen", temperature: 0.3, maxTokens: 512, topP: 0.9 }, scenes: {} }),
    };
    const unused = {} as never;
    const gateway = new AiGatewayService(
      router as never, { log: async () => undefined } as never, { record: async () => undefined } as never,
      { lookup: async () => null, store: async () => undefined } as never,
      unused, unused, platform, unused, { recordAiCall: () => undefined } as never,
      { setGateway: () => undefined } as never, { setGateway: () => undefined } as never,
    );
    const module = await Test.createTestingModule({
      controllers: [AiGatewayController],
      providers: [ChatSceneAccessService, { provide: AiGatewayService, useValue: gateway }, { provide: ModelRouterService, useValue: router }, { provide: StreamUnifierService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate(context: { switchToHttp(): { getRequest(): { headers: Record<string, string>; user?: unknown } } }) {
        const req = context.switchToHttp().getRequest();
        req.user = { id: "synthetic-http-user", roles: req.headers["x-synthetic-role"] === "member" ? ["USER"] : ["OPERATION_ADMIN"] };
        return true;
      } })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true }).compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, "127.0.0.1");
  });

  beforeEach(() => { responseId = "chatcmpl-synthetic-private-42"; finishReason = "stop"; });
  afterAll(async () => {
    await app?.close();
    upstream?.closeAllConnections();
    if (upstream) await new Promise<void>(done => upstream.close(() => done()));
    if (savedKey === undefined) delete process.env.DASHSCOPE_API_KEY; else process.env.DASHSCOPE_API_KEY = savedKey;
    if (savedUrl === undefined) delete process.env.DASHSCOPE_BASE_URL; else process.env.DASHSCOPE_BASE_URL = savedUrl;
    if (savedFetch === undefined) delete (globalThis as { fetch?: typeof fetch }).fetch;
    else globalThis.fetch = savedFetch;
  });

  const request = async (role = "admin", scene = "general_chat") => fetch(`${await app.getUrl()}/ai/chat`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-synthetic-role": role },
    body: JSON.stringify({ scene, messages: [{ role: "user", content: "合成边界验证" }] }),
  });

  it("原平台实际HTTP保留正文/模型/用量/结束原因，不新增客户维护编号", async () => {
    const before = calls, response = await request(), body = await response.json();
    expect(response.status).toBe(201);
    expect(body).toEqual({ content: "合成本机答复", model: "synthetic-qwen", usage: { promptTokens: 4, completionTokens: 3, totalTokens: 7 }, finishReason: "stop" });
    expect(calls - before).toBe(1);
  });
  it("通用场景仍拒绝普通用户，供应商未收到请求", async () => {
    const before = calls;
    expect((await request("member")).status).toBe(403);
    expect(calls).toBe(before);
  });
  it("未登记产品场景不能借通用接口绕过专用门禁", async () => {
    const before = calls;
    expect((await request("admin", "circle_assistant")).status).toBe(403);
    expect(calls).toBe(before);
  });
  it.each([123, "", "x".repeat(129), "bad\r\nheader", "中文编号"])("固定客户配置拒绝非法编号 %p，正文仍有效", async value => {
    responseId = value;
    const adapter = new QwenAdapter({ baseUrl: endpoint, apiKey: "synthetic-fixed-key" });
    const response = await adapter.chat("synthetic-qwen", []);
    expect(response.requestId).toBeUndefined();
    expect(managedChatResult(response)).toEqual({ content: "合成本机答复" });
  });
  it("固定客户编号原样保留，共享转换不改写为本地键", async () => {
    responseId = "x".repeat(128);
    const adapter = new QwenAdapter({ baseUrl: endpoint, apiKey: "synthetic-fixed-key" });
    const response = await adapter.chat("synthetic-qwen", []);
    expect(response.requestId).toBe(responseId);
    expect(managedChatResult(response)).toEqual({ content: "合成本机答复", requestId: responseId });
  });
  it("完整JSON但未正常结束时不返回答复，可信错误保留合法编号", async () => {
    finishReason = "length";
    const adapter = new QwenAdapter({ baseUrl: endpoint, apiKey: "synthetic-fixed-key" });
    const response = await adapter.chat("synthetic-qwen", []);
    let error: unknown;
    try { managedChatResult(response); } catch (caught) { error = caught; }
    expect(error).toBeInstanceOf(ManagedIncompleteChatError);
    expect((error as ManagedIncompleteChatError).requestId).toBe(responseId);
  });
  it("缺编号时留空，不使用响应正文或本地重试键", async () => {
    responseId = undefined;
    const adapter = new QwenAdapter({ baseUrl: endpoint, apiKey: "synthetic-fixed-key" });
    expect(managedChatResult(await adapter.chat("synthetic-qwen", []))).toEqual({ content: "合成本机答复" });
  });
});

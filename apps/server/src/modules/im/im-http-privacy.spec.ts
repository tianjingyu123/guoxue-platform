import { Controller, Get, INestApplication, Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { request } from "node:http";
import { createHash } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ImCallbackController } from "./im-callback.controller";
import { AppGateway } from "../websocket/websocket.gateway";
import { TencentImCallbackGuard } from "../../common/tencent-im-callback.guard";
import { LoggingInterceptor } from "../../common/logging.interceptor";
import { AllExceptionsFilter } from "../../common/http-exception.filter";
import { PinoLoggerService } from "../../common/pino-logger.service";
import { sendAlert } from "../../common/alert";

// 告警只捕获参数，禁止真实通知；测试服务器仅监听本机随机端口。
jest.mock("../../common/alert", () => ({ sendAlert: jest.fn() }));
const privateValue = "SYNTHETIC_HTTP_IM_PRIVATE_SENTINEL";
const fakeToken = "synthetic-http-callback-token";
@Controller("im")
class SyntheticFailureController {
  @Get("privacy-failure")
  fail() { throw new Error(privateValue); }
}

describe("IM 回调真实 HTTP 日志与告警隐私", () => {
  let app: INestApplication;
  let port: number;
  const pino = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const ws = { notifyImMessage: jest.fn(), notifyImGroupMessage: jest.fn() };
  const sigs: string[] = [];
  const previous = { token: process.env.IM_CALLBACK_TOKEN, appId: process.env.IM_APP_ID };
  let loggerSpies: jest.SpyInstance[];
  const privateLogs = () => {
    const snapshot = JSON.stringify({ logs: [pino.info.mock.calls, pino.warn.mock.calls, pino.error.mock.calls,
      ...loggerSpies.map(x => x.mock.calls)], alerts: jest.mocked(sendAlert).mock.calls });
    expect(snapshot).not.toContain(privateValue);
    expect(snapshot).not.toContain(fakeToken);
    for (const sig of sigs) expect(snapshot).not.toContain(sig);
  };
  const http = (method: string, path: string, body?: unknown) => new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, method, path, headers: { "Content-Type": "application/json" } }, res => {
      let text = "";
      res.setEncoding("utf8"); res.on("data", chunk => { text += chunk; });
      res.on("end", () => { try { resolve({ status: res.statusCode!, body: JSON.parse(text) }); } catch (error) { reject(error); } });
    });
    req.on("error", reject); req.setTimeout(5000, () => req.destroy(new Error("synthetic timeout")));
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
  const callback = async (command: string, signatureValid = true) => {
    const time = String(Math.floor(Date.now() / 1000));
    const sig = createHash("sha256").update(fakeToken + time).digest("hex");
    sigs.push(sig);
    const path = `/api/v1/im/callback?SdkAppid=1400000000&RequestTime=${time}&Sign=${signatureValid ? sig : privateValue}&CallbackCommand=${encodeURIComponent(command)}&debug=${privateValue}`;
    return http("POST", path, { CallbackCommand: command, From_Account: "synthetic-from", To_Account: "synthetic-to",
      GroupId: "synthetic-group", MsgBody: [{ MsgContent: { Text: privateValue } }], MsgTime: 1700000000 });
  };
  beforeAll(async () => {
    process.env.IM_CALLBACK_TOKEN = fakeToken; process.env.IM_APP_ID = "1400000000";
    jest.spyOn(PinoLoggerService, "getInstance").mockReturnValue({ raw: () => pino } as unknown as PinoLoggerService);
    loggerSpies = ["log", "debug", "warn", "error"].map(name => jest.spyOn(Logger.prototype, name as "log").mockImplementation(() => {}));
    const mod = await Test.createTestingModule({ controllers: [ImCallbackController, SyntheticFailureController],
      providers: [TencentImCallbackGuard, { provide: AppGateway, useValue: ws }],
    }).compile();
    app = mod.createNestApplication({ logger: false }); app.setGlobalPrefix("api/v1");
    app.useGlobalInterceptors(new LoggingInterceptor()); app.useGlobalFilters(new AllExceptionsFilter());
    await app.listen(0, "127.0.0.1"); port = (app.getHttpServer().address() as AddressInfo).port;
  });
  beforeEach(() => { jest.clearAllMocks(); sigs.length = 0; ws.notifyImMessage.mockReset(); ws.notifyImGroupMessage.mockReset(); });
  afterAll(async () => {
    await app?.close(); jest.restoreAllMocks();
    if (previous.token === undefined) delete process.env.IM_CALLBACK_TOKEN; else process.env.IM_CALLBACK_TOKEN = previous.token;
    if (previous.appId === undefined) delete process.env.IM_APP_ID; else process.env.IM_APP_ID = previous.appId;
  });

  it.each(["C2C.CallbackAfterSendMsg", "Group.CallbackAfterSendMsg", "Bot.OnC2CMessage", privateValue])("真实验签通过的 %s 不把查询签名写入请求日志", async command => {
    expect((await callback(command)).status).toBe(200);
    expect(pino.info).toHaveBeenCalled();
    if (command.startsWith("C2C")) expect(ws.notifyImMessage).toHaveBeenCalledWith("synthetic-to", expect.objectContaining({ text: privateValue }));
    privateLogs();
  });
  it("错误签名真实拒绝且无投递、无签名回显日志", async () => {
    expect((await callback("C2C.CallbackAfterSendMsg", false)).status).toBe(401);
    expect(ws.notifyImMessage).not.toHaveBeenCalled();
    privateLogs();
  });
  it("回调内部故障保留协议 FAIL，日志不记录异常原文或查询签名", async () => {
    ws.notifyImMessage.mockImplementation(() => { throw new Error(privateValue); });
    const response = await callback("C2C.CallbackAfterSendMsg");
    expect(response.status).toBe(200); expect(response.body.ActionStatus).toBe("FAIL");
    privateLogs();
  });
  it("全局异常过滤器和告警不包含 IM 查询参数或异常原文", async () => {
    const response = await http("GET", `/api/v1/im/privacy-failure?usersig=${privateValue}`);
    expect(response.status).toBe(500);
    expect(sendAlert).toHaveBeenCalled();
    privateLogs();
  });
  it("严重慢请求的日志与告警仍保留状态、耗时和路径，移除签名", async () => {
    const base = Date.now(); let elapsed = 0;
    const clock = jest.spyOn(Date, "now").mockImplementation(() => base + elapsed);
    ws.notifyImMessage.mockImplementation(() => { elapsed = 12001; });
    try {
      expect((await callback("C2C.CallbackAfterSendMsg")).status).toBe(200);
      expect(sendAlert).toHaveBeenCalled();
      expect(pino.error).toHaveBeenCalledWith(expect.objectContaining({ method: "POST", status: 200, ms: 12001 }), expect.any(String));
      privateLogs();
    } finally { clock.mockRestore(); }
  });
});

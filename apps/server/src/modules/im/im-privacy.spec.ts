import { Logger } from "@nestjs/common";
import { ImCallbackController } from "./im-callback.controller";
import { ImService } from "./im.service";
import type { TlsSigService } from "./tlssig.service";
import type { ImPolicyService } from "./im-policy.service";
import type { AuditService } from "../audit/audit.service";
import type { MetricsService } from "../../common/metrics.service";
import { AppGateway } from "../websocket/websocket.gateway";
import type { WsAuthService } from "../websocket/ws-auth.service";
import type { PrismaService } from "../../prisma/prisma.service";
import type { RedisService } from "../../redis/redis.service";
import type { Server } from "socket.io";
import { BusinessException } from "../../common/business.exception";

// 全部为合成哨兵；真实第三方网络、密钥、数据库和消息发送均不接入。
const privateValue = "SYNTHETIC_IM_PRIVATE_SENTINEL";
const commands = ["Group.CallbackBeforeSendMsg", "C2C.CallbackAfterSendMsg", "Group.CallbackAfterSendMsg",
  "State.StateChange", "Bot.OnC2CMessage", "Sns.CallbackFriendAdd", "Sns.CallbackFriendDelete",
  "Sns.CallbackBlackListAdd", "Sns.CallbackBlackListDelete", `${privateValue}\nforged=log`];

describe("IM 日志、指标与异常隐私边界", () => {
  let logs: jest.SpyInstance[];
  let metrics: { recordExternalApi: jest.Mock };
  let ws: { notifyImMessage: jest.Mock; notifyImGroupMessage: jest.Mock };
  let audit: { hasLocalViolation: jest.Mock; classifyTextRisk: jest.Mock };
  let fetchMock: jest.Mock;
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.IM_ADMIN_KEY;
  const previousId = process.env.IM_ADMIN_ID;
  const previousSample = process.env.IM_AUDIT_SAMPLE;
  const restoreEnv = (key: string, value?: string) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; };
  const service = () => new ImService({ getAppId: () => 1400000000, genAdminSig: () => privateValue } as unknown as TlsSigService,
    { evaluateC2C: async () => ({ canSend: true }), incrementSent: async () => {}, resetOnReply: async () => {} } as unknown as ImPolicyService,
    audit as unknown as AuditService, metrics as unknown as MetricsService);
  const gateway = () => new AppGateway({} as WsAuthService, {} as PrismaService, {} as RedisService, audit as unknown as AuditService);
  const assertPrivate = (error?: unknown) => {
    const exception = error instanceof BusinessException ? { response: error.getResponse(), stack: error.stack }
      : error instanceof Error ? { message: error.message, stack: error.stack } : error;
    const recorded = JSON.stringify({ logs: logs.map(x => x.mock.calls), metrics: metrics.recordExternalApi.mock.calls, exception },
      (_key, value: unknown) => value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value);
    expect(recorded).not.toContain(privateValue);
    expect(recorded).not.toContain("forged=log");
  };
  beforeEach(() => {
    process.env.IM_ADMIN_KEY = privateValue;
    process.env.IM_ADMIN_ID = "synthetic-admin";
    process.env.IM_AUDIT_SAMPLE = "1";
    logs = ["log", "debug", "warn", "error"].map(name => jest.spyOn(Logger.prototype, name as "log").mockImplementation(() => {}));
    metrics = { recordExternalApi: jest.fn() };
    ws = { notifyImMessage: jest.fn(), notifyImGroupMessage: jest.fn() };
    audit = { hasLocalViolation: jest.fn(() => []), classifyTextRisk: jest.fn(async () => ({ verdict: "pass" })) };
    fetchMock = jest.fn().mockResolvedValue({ json: async () => ({ ErrorCode: 0, MsgKey: "synthetic-key" }) } as Response);
    globalThis.fetch = fetchMock as typeof fetch;
  });
  afterEach(() => {
    jest.restoreAllMocks();
    globalThis.fetch = previousFetch;
    restoreEnv("IM_ADMIN_KEY", previousKey); restoreEnv("IM_ADMIN_ID", previousId); restoreEnv("IM_AUDIT_SAMPLE", previousSample);
  });

  it.each(commands)("回调 %s 不记录正文、账号、签名或任意命令文本", async command => {
    const ctrl = new ImCallbackController(ws as unknown as AppGateway);
    await ctrl.handleCallback({ CallbackCommand: command, From_Account: privateValue, To_Account: [privateValue],
      GroupId: `live_${privateValue}`, Operator_Account: privateValue,
      Info: { Action: `${privateValue}\nforged=log`, To_Account: privateValue },
      MsgBody: [{ MsgContent: { Text: privateValue } }], MsgTime: 1700000000, MsgKey: privateValue });
    assertPrivate();
  });

  it.each([new Error(privateValue), { message: privateValue, toString: () => privateValue }])("回调故障不把异常原文写入日志", async error => {
    ws.notifyImMessage.mockImplementation(() => { throw error; });
    const response = await new ImCallbackController(ws as unknown as AppGateway).handleCallback({
      CallbackCommand: "C2C.CallbackAfterSendMsg", From_Account: "synthetic-from", To_Account: "synthetic-to",
      MsgBody: [{ MsgContent: { Text: privateValue } }], MsgTime: 1700000000,
    });
    expect(response).toEqual({ ActionStatus: "FAIL", ErrorCode: 1, ErrorInfo: "internal error" });
    assertPrivate();
  });

  it.each([10003, privateValue, { unsafe: privateValue }])("供应商错误码 %p 仅保留安全分类，不回显响应详情", async code => {
    fetchMock.mockResolvedValue({ json: async () => ({ ErrorCode: code, ErrorInfo: privateValue, MsgBody: privateValue, usersig: privateValue }) } as Response);
    let caught: unknown;
    try { await service().importAccount("synthetic-user"); } catch (error) { caught = error; }
    expect(caught).toBeInstanceOf(BusinessException);
    assertPrivate(caught);
    expect(metrics.recordExternalApi).toHaveBeenCalledWith("im", "im_open_login_svc/account_import", false, expect.any(Number), typeof code === "number" ? "10003" : "invalid_response");
  });

  it.each([
    [new Error(`https://synthetic.invalid/?usersig=${privateValue}`), "network_error"],
    [{ message: privateValue }, "network_error"],
    [Object.assign(new Error(privateValue), { name: "AbortError" }), "timeout"],
    [Object.assign(new Error(privateValue), { name: "TimeoutError" }), "timeout"],
    [new SyntaxError(privateValue), "invalid_response"],
  ])("网络或解码异常不进入日志、指标标签及上层异常", async (error, reason) => {
    fetchMock.mockRejectedValue(error);
    let caught: unknown;
    try { await service().importAccount("synthetic-user"); } catch (err) { caught = err; }
    expect(caught).toBeInstanceOf(BusinessException);
    assertPrivate(caught);
    expect(metrics.recordExternalApi).toHaveBeenCalledWith("im", "im_open_login_svc/account_import", false, expect.any(Number), reason);
  });

  it("私信深审失败保留已发送结果，异常正文不落日志", async () => {
    audit.classifyTextRisk.mockRejectedValue(new Error(privateValue));
    const response = await service().sendC2CMsg("synthetic-from", "synthetic-to", privateValue);
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(response.ErrorCode).toBe(0);
    expect(audit.classifyTextRisk).toHaveBeenCalledWith(privateValue, expect.any(Object));
    assertPrivate();
  });

  it.each(["user", "users", "admins", "broadcast", "room"])("WS %s 推送故障不记录含消息的异常", kind => {
    const gw = gateway();
    const emit = jest.fn(() => { throw new Error(privateValue); });
    gw.server = { to: () => ({ emit }), emit } as unknown as Server;
    const payload = { text: privateValue };
    if (kind === "user") gw.sendToUser(privateValue, privateValue, payload);
    if (kind === "users") gw.sendToUsers([privateValue], privateValue, payload);
    if (kind === "admins") gw.sendToAdmins(privateValue, payload);
    if (kind === "broadcast") gw.broadcast(privateValue, payload);
    if (kind === "room") gw.sendToRoom(privateValue, privateValue, payload);
    expect(emit).toHaveBeenCalled();
    assertPrivate();
  });

  it.each(["C2C.CallbackAfterSendMsg", "Group.CallbackAfterSendMsg"])("%s 正常消息仍按原文投递，不因日志处理改变消息", async command => {
    const gw = gateway();
    const emit = jest.fn(); const to = jest.fn(() => ({ emit }));
    gw.server = { to, emit } as unknown as Server;
    expect(await new ImCallbackController(gw).handleCallback({ CallbackCommand: command,
      From_Account: "synthetic-from", To_Account: "synthetic-to", GroupId: "synthetic-group",
      MsgBody: [{ MsgContent: { Text: privateValue } }], MsgTime: 1700000000, MsgKey: "synthetic-key",
    })).toEqual({ ActionStatus: "OK", ErrorCode: 0 });
    expect(to).toHaveBeenCalledWith(command.startsWith("C2C") ? "user:synthetic-to" : "circle:synthetic-group");
    expect(emit).toHaveBeenCalledWith(command.startsWith("C2C") ? "im_new_message" : "im_group_message", expect.objectContaining({ text: privateValue, fromUserId: "synthetic-from", timestamp: "2023-11-14T22:13:20.000Z" }));
    assertPrivate();
  });
});

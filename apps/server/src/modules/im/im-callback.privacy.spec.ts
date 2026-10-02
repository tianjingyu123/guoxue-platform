import { Logger } from "@nestjs/common";
import { ImCallbackController } from "./im-callback.controller";
import { AppGateway } from "../websocket/websocket.gateway";

describe("IM 回调日志隐私与正常消息转发", () => {
  const marker = "合成私密消息13800000000@example.test";
  const from = "synthetic-private-from";
  const to = "synthetic-private-to";
  const group = "synthetic-private-group";
  let logs: string[];
  const ws = { notifyImMessage: jest.fn(), notifyImGroupMessage: jest.fn() };
  const ctrl = new ImCallbackController(ws as unknown as AppGateway);

  beforeEach(() => {
    logs = [];
    jest.resetAllMocks();
    for (const method of ["log", "debug", "warn", "error"] as const) {
      jest.spyOn(Logger.prototype, method).mockImplementation((...args: unknown[]) => { logs.push(args.map(String).join(" ")); });
    }
  });
  afterEach(() => jest.restoreAllMocks());

  const assertPrivate = () => {
    const output = logs.join("\n");
    for (const value of [marker, from, to, group]) expect(output).not.toContain(value);
  };

  it.each(["C2C.CallbackAfterSendMsg", "Group.CallbackAfterSendMsg", "Bot.OnC2CMessage"])("%s 正文与账户不进入日志，正常正文不被截断", async command => {
    const text = marker.repeat(5);
    await expect(ctrl.handleCallback({
      CallbackCommand: command, From_Account: from, To_Account: to, GroupId: group,
      MsgBody: [{ MsgContent: { Text: text } }], MsgTime: 1700000000, MsgKey: "synthetic-key",
    })).resolves.toEqual({ ActionStatus: "OK", ErrorCode: 0 });
    assertPrivate();
    if (command.startsWith("C2C")) {
      expect(ws.notifyImMessage).toHaveBeenCalledWith(to, { fromUserId: from, toUserId: to, text, msgTime: 1700000000, msgKey: "synthetic-key" });
    } else if (command.startsWith("Group")) {
      expect(ws.notifyImGroupMessage).toHaveBeenCalledWith(group, { fromUserId: from, text, msgTime: 1700000000 });
    } else {
      expect(ws.notifyImMessage).not.toHaveBeenCalled();
    }
  });

  it("消息转发异常中的原文和错误对象不进入日志或回调响应", async () => {
    ws.notifyImMessage.mockImplementation(() => { throw new Error(marker); });
    const reply = await ctrl.handleCallback({ CallbackCommand: "C2C.CallbackAfterSendMsg", From_Account: from, To_Account: to, MsgBody: [{ MsgContent: { Text: marker } }] });
    expect(reply).toEqual({ ActionStatus: "FAIL", ErrorCode: 1, ErrorInfo: "internal error" });
    assertPrivate();
    expect(JSON.stringify(reply)).not.toContain(marker);
  });

  it("未知回调命令不能将私密文本注入日志", async () => {
    await expect(ctrl.handleCallback({ CallbackCommand: marker })).resolves.toEqual({ ActionStatus: "OK", ErrorCode: 0, ErrorInfo: "ignored" });
    assertPrivate();
  });

  it("在线状态、好友、黑名单和直播拦截日志不暴露账户或群号", async () => {
    for (const command of ["State.StateChange", "Sns.CallbackFriendAdd", "Sns.CallbackFriendDelete", "Sns.CallbackBlackListAdd", "Sns.CallbackBlackListDelete", "Group.CallbackBeforeSendMsg"]) {
      await ctrl.handleCallback({ CallbackCommand: command, From_Account: from,
        To_Account: command.includes("Black") ? [to] : to, GroupId: "live_" + group,
        Operator_Account: from, Info: { Action: marker, To_Account: to } });
    }
    assertPrivate();
    expect(logs.join("\n")).not.toContain(marker);
  });
});

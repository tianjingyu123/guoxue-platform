import { Test } from "@nestjs/testing";
import { ImCallbackController } from "./im-callback.controller";
import { AppGateway } from "../websocket/websocket.gateway";
import { TencentCallbackGuard } from "../../common/tencent-callback.guard";

const mockWs = {
  notifyImMessage: jest.fn(),
  notifyImGroupMessage: jest.fn(),
};

describe("ImCallbackController", () => {
  let ctrl: ImCallbackController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ImCallbackController],
      providers: [{ provide: AppGateway, useValue: mockWs }],
    })
      .overrideGuard(TencentCallbackGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(ImCallbackController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  describe("C2C.CallbackAfterSendMsg", () => {
    it("单聊消息推送给接收方", async () => {
      const body = {
        CallbackCommand: "C2C.CallbackAfterSendMsg",
        From_Account: "u1",
        To_Account: "u2",
        MsgBody: [{ MsgContent: { Text: "你好" } }],
        MsgTime: 1700000000,
        MsgKey: "msg-key-1",
      };
      const result = await ctrl.handleCallback(body);
      expect(result).toEqual({ ActionStatus: "OK", ErrorCode: 0 });
      expect(mockWs.notifyImMessage).toHaveBeenCalledWith("u2", expect.objectContaining({
        fromUserId: "u1",
        text: "你好",
        msgTime: 1700000000,
      }));
    });
  });

  describe("Group.CallbackAfterSendMsg", () => {
    it("群消息推送给群成员", async () => {
      const body = {
        CallbackCommand: "Group.CallbackAfterSendMsg",
        GroupId: "group1",
        From_Account: "u1",
        MsgBody: [{ MsgContent: { Text: "群消息" } }],
        MsgTime: 1700000000,
      };
      const result = await ctrl.handleCallback(body);
      expect(result).toEqual({ ActionStatus: "OK", ErrorCode: 0 });
      expect(mockWs.notifyImGroupMessage).toHaveBeenCalledWith("group1", expect.objectContaining({
        fromUserId: "u1",
        text: "群消息",
      }));
    });
  });

  describe("State.StateChange", () => {
    it("用户状态变更返回OK", async () => {
      const body = {
        CallbackCommand: "State.StateChange",
        Info: { Action: "Logout", To_Account: "u1" },
      };
      const result = await ctrl.handleCallback(body);
      expect(result).toEqual({ ActionStatus: "OK", ErrorCode: 0 });
    });
  });

  describe("Bot.OnC2CMessage", () => {
    it("机器人消息返回OK", async () => {
      const body = {
        CallbackCommand: "Bot.OnC2CMessage",
        From_Account: "bot1",
        MsgBody: [{ MsgContent: { Text: "自动回复" } }],
      };
      const result = await ctrl.handleCallback(body);
      expect(result).toEqual({ ActionStatus: "OK", ErrorCode: 0 });
    });
  });

  describe("好友/黑名单事件", () => {
    it("好友申请推送给被申请人", async () => {
      const body = {
        CallbackCommand: "Sns.CallbackFriendAdd",
        From_Account: "u1",
        To_Account: "u2",
      };
      const result = await ctrl.handleCallback(body);
      expect(result).toEqual({ ActionStatus: "OK", ErrorCode: 0 });
      expect(mockWs.notifyImMessage).toHaveBeenCalledWith("u2", expect.objectContaining({
        fromUserId: "u1",
      }));
    });

    it("好友删除返回OK", async () => {
      const body = {
        CallbackCommand: "Sns.CallbackFriendDelete",
        From_Account: "u1",
        To_Account: "u2",
      };
      const result = await ctrl.handleCallback(body);
      expect(result).toEqual({ ActionStatus: "OK", ErrorCode: 0 });
    });

    it("黑名单添加返回OK", async () => {
      const body = {
        CallbackCommand: "Sns.CallbackBlackListAdd",
        From_Account: "u1",
        To_Account: ["u2"],
      };
      const result = await ctrl.handleCallback(body);
      expect(result).toEqual({ ActionStatus: "OK", ErrorCode: 0 });
    });

    it("黑名单移除返回OK", async () => {
      const body = {
        CallbackCommand: "Sns.CallbackBlackListDelete",
        From_Account: "u1",
        To_Account: ["u2"],
      };
      const result = await ctrl.handleCallback(body);
      expect(result).toEqual({ ActionStatus: "OK", ErrorCode: 0 });
    });
  });

  describe("未知回调类型", () => {
    it("未识别的回调类型返回ignored", async () => {
      const body = { CallbackCommand: "Unknown.Type" };
      const result = await ctrl.handleCallback(body);
      expect(result).toEqual({ ActionStatus: "OK", ErrorCode: 0, ErrorInfo: "ignored" });
    });
  });

  describe("异常处理", () => {
    it("处理失败返回FAIL", async () => {
      mockWs.notifyImMessage.mockImplementation(() => { throw new Error("WS故障"); });
      const body = {
        CallbackCommand: "C2C.CallbackAfterSendMsg",
        From_Account: "u1",
        To_Account: "u2",
        MsgBody: [{ MsgContent: { Text: "test" } }],
        MsgTime: 1700000000,
      };
      const result = await ctrl.handleCallback(body);
      expect(result).toEqual({ ActionStatus: "FAIL", ErrorCode: 1, ErrorInfo: "internal error" });
    });
  });
});

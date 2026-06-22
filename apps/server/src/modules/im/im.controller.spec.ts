import { Test } from "@nestjs/testing";
import { ImController } from "./im.controller";
import { ImService } from "./im.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockImSvc = {
  genUserSig: jest.fn().mockResolvedValue({ userId: "u1", sig: "sig123", expire: 86400 }),
  importAccount: jest.fn().mockResolvedValue({ success: true }),
  queryAccountState: jest.fn().mockResolvedValue([{ userId: "u1", status: "Online" }]),
  updateProfile: jest.fn().mockResolvedValue({ success: true }),
  createGroup: jest.fn().mockResolvedValue({ groupId: "g1" }),
  destroyGroup: jest.fn().mockResolvedValue({ success: true }),
  addGroupMembers: jest.fn().mockResolvedValue({ added: ["u1", "u2"] }),
  deleteGroupMembers: jest.fn().mockResolvedValue({ deleted: ["u1"] }),
  sendGroupMsg: jest.fn().mockResolvedValue({ msgId: "msg1" }),
  getGroupHistory: jest.fn().mockResolvedValue([{ msgId: "msg1", text: "大家好" }]),
  sendC2CMsg: jest.fn().mockResolvedValue({ msgId: "msg2" }),
  getC2CHistory: jest.fn().mockResolvedValue([{ msgId: "msg2", text: "你好" }]),
  withdrawMsg: jest.fn().mockResolvedValue({ success: true }),
  addFriend: jest.fn().mockResolvedValue({ success: true }),
  deleteFriend: jest.fn().mockResolvedValue({ success: true }),
  getFriendList: jest.fn().mockResolvedValue([{ userId: "u2", remark: "好友" }]),
  addBlacklist: jest.fn().mockResolvedValue({ success: true }),
  isFriend: jest.fn().mockResolvedValue(true),
  isGroupMember: jest.fn().mockResolvedValue(true),
  getGroupInfo: jest.fn().mockResolvedValue({ GroupInfo: [{ GroupId: "g1" }] }),
  getGroupMembers: jest.fn().mockResolvedValue({ MemberList: [{ Member_Account: "u1" }] }),
};

describe("ImController", () => {
  let ctrl: ImController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ImController],
      providers: [{ provide: ImService, useValue: mockImSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(ImController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /im/user-sig — 生成UserSig", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = {};
    const result: any = await ctrl.genUserSig(req, dto);
    expect(result.sig).toBe("sig123");
    expect(mockImSvc.genUserSig).toHaveBeenCalledWith("u1");
  });

  it("POST /im/account/import — 导入IM账号", async () => {
    const req: any = { user: { id: "u1" } };
    const dto = { userId: "u1", nickname: "张三", avatar: "https://..." };
    const result: any = await ctrl.importAccount(req, dto);
    expect(result.success).toBe(true);
    expect(mockImSvc.importAccount).toHaveBeenCalledWith("u1", "张三", "https://...");
  });

  it("GET /im/account/state — 查询自己/好友在线状态", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.queryAccountState(req, "u1,u2,u3");
    expect(result).toHaveLength(1);
    expect(mockImSvc.queryAccountState).toHaveBeenCalledWith(["u1", "u2", "u3"]);
  });

  it("GET /im/account/state — 禁止查询非好友在线状态", async () => {
    mockImSvc.isFriend.mockResolvedValueOnce(false);
    const req: any = { user: { id: "u1" } };
    await expect(ctrl.queryAccountState(req, "stranger")).rejects.toThrow();
  });

  it("POST /im/account/:userId/profile — 更新自己的资料", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { nickname: "新昵称" };
    const result: any = await ctrl.updateProfile(req, "u1", dto);
    expect(result.success).toBe(true);
  });

  it("POST /im/account/:userId/profile — 禁止修改他人资料", () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { nickname: "恶意修改" };
    expect(() => ctrl.updateProfile(req, "u2", dto)).toThrow();
  });

  it("POST /im/groups — 创建群组", async () => {
    const dto = { groupId: "g1", name: "国学研究群", type: "PUBLIC", ownerId: "u1" };
    const result: any = await ctrl.createGroup(dto);
    expect(result.groupId).toBe("g1");
    expect(mockImSvc.createGroup).toHaveBeenCalledWith("g1", "国学研究群", "PUBLIC", "u1");
  });

  it("DELETE /im/groups/:groupId — 解散群组", async () => {
    const result: any = await ctrl.destroyGroup("g1");
    expect(result.success).toBe(true);
  });

  it("POST /im/groups/:groupId/members — 添加群成员", async () => {
    const dto = { memberIds: ["u1", "u2"] };
    const result: any = await ctrl.addGroupMembers("g1", dto);
    expect(result.added).toContain("u1");
  });

  it("DELETE /im/groups/:groupId/members — 删除群成员", async () => {
    const dto = { memberIds: ["u1"] };
    const result: any = await ctrl.deleteGroupMembers("g1", dto);
    expect(result.deleted).toContain("u1");
  });

  it("POST /im/groups/:groupId/msg — 发送群消息", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { text: "大家好" };
    const result: any = await ctrl.sendGroupMsg(req, "g1", dto);
    expect(result.msgId).toBe("msg1");
  });

  it("GET /im/groups/:groupId/history — 群历史消息", async () => {
    const result: any = await ctrl.getGroupHistory("g1", "1", "20");
    expect(result).toHaveLength(1);
    expect(mockImSvc.getGroupHistory).toHaveBeenCalledWith("g1", 1, 20);
  });

  it("POST /im/c2c/send — 发送单聊消息", async () => {
    const req: any = { user: { id: "u1" } };
    const dto = { toUserId: "u2", text: "你好" };
    const result: any = await ctrl.sendC2CMsg(req, dto);
    expect(result.msgId).toBe("msg2");
  });

  it("GET /im/c2c/history — 单聊历史", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getC2CHistory(req, "u2", "20");
    expect(result).toHaveLength(1);
  });

  it("POST /im/msg/withdraw — 撤回消息", async () => {
    const req: any = { user: { id: "u1" } };
    const dto = { toUserId: "u2", msgKey: "mk123" };
    const result: any = await ctrl.withdrawMsg(req, dto);
    expect(result.success).toBe(true);
  });

  it("POST /im/friends — 添加好友", async () => {
    const req: any = { user: { id: "u1" } };
    const dto = { toUserId: "u2", remark: "好友" };
    const result: any = await ctrl.addFriend(req, dto);
    expect(result.success).toBe(true);
  });

  it("DELETE /im/friends/:toUserId — 删除好友", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.deleteFriend(req, "u2");
    expect(result.success).toBe(true);
  });

  it("GET /im/friends — 好友列表", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getFriendList(req);
    expect(result).toHaveLength(1);
  });

  it("POST /im/blacklist — 拉黑用户", async () => {
    const req: any = { user: { id: "u1" } };
    const dto = { toUserId: "u2" };
    const result: any = await ctrl.addBlacklist(req, dto);
    expect(result.success).toBe(true);
  });
});

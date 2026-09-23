import { XiaobuMcpServer } from "./xiaobu-mcp-server";

/** 模拟验证：MCP JSON-RPC 协议处理与公开数据边界 */
function setup() {
  const prisma: any = {
    classicBook: { findMany: jest.fn(async () => [{ title: "论语", author: "孔子", dynasty: "春秋", intro: "语录体" }]) },
    paipanReportKnowledge: { findMany: jest.fn(async () => []) },
  };
  const guide: any = { guide: jest.fn(async () => ({ query: "q", cards: [{ type: "article", id: "a1", title: "易经入门", target: "/x" }] })) };
  return { svc: new XiaobuMcpServer(prisma, guide), prisma, guide };
}

describe("XiaobuMcpServer", () => {
  it("initialize / tools/list / 通知不回复 / 未知方法", async () => {
    const { svc } = setup();
    const init = JSON.parse((await svc.handle(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })))!);
    expect(init.result.capabilities.tools).toBeDefined();
    expect(await svc.handle(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }))).toBeNull();
    const list = JSON.parse((await svc.handle(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" })))!);
    expect(list.result.tools.map((t: any) => t.name)).toEqual(["search_classics", "explain_bazi_term", "find_platform_content"]);
    const unknown = JSON.parse((await svc.handle(JSON.stringify({ jsonrpc: "2.0", id: 3, method: "resources/list" })))!);
    expect(unknown.error.code).toBe(-32601);
    const bad = JSON.parse((await svc.handle("{not json"))!);
    expect(bad.error.code).toBe(-32700);
  });

  it("只查询公开古籍与已审核知识条目", async () => {
    const { svc, prisma } = setup();
    const r = JSON.parse((await svc.handle(JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "search_classics", arguments: { query: "论语" } } })))!);
    expect(r.result.content[0].text).toContain("《论语》");
    expect(prisma.classicBook.findMany.mock.calls[0][0].where.status).toBe("PUBLISHED");
    const t = JSON.parse((await svc.handle(JSON.stringify({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "explain_bazi_term", arguments: { term: "偏财格" } } })))!);
    expect(prisma.paipanReportKnowledge.findMany.mock.calls[0][0].where.status).toBe("APPROVED");
    expect(t.result.content[0].text).toContain("暂未收录");
  });

  it("缺少参数与未知工具返回 -32602", async () => {
    const { svc } = setup();
    const miss = JSON.parse((await svc.handle(JSON.stringify({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "find_platform_content", arguments: {} } })))!);
    expect(miss.error.code).toBe(-32602);
    const unk = JSON.parse((await svc.handle(JSON.stringify({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "read_user_memory", arguments: {} } })))!);
    expect(unk.error.code).toBe(-32602);
  });
});

describe("XiaobuMcpServer · 身份绑定工具边界", () => {
  function setupCircle(member: any, rows: any[] = [{ content: "本圈讲义：用神取法" }]) {
    const prisma: any = {
      classicBook: { findMany: jest.fn(async () => []) },
      paipanReportKnowledge: { findMany: jest.fn(async () => []) },
      circleMember: { findUnique: jest.fn(async () => member) },
      circleKnowledge: { findMany: jest.fn(async () => rows) },
    };
    return { svc: new XiaobuMcpServer(prisma, { guide: jest.fn() } as any), prisma };
  }
  const call = (svc: XiaobuMcpServer, identity?: any, args: any = { query: "用神" }) =>
    svc.handle(JSON.stringify({ jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "search_circle_knowledge", arguments: args } }), identity).then((r) => JSON.parse(r!));

  it("官方接入点（未验证身份）：圈子工具不出现在列表，硬调用被拒且不查库", async () => {
    const { svc, prisma } = setupCircle({ expireAt: null, circle: { status: "ACTIVE", deletedAt: null } });
    const list = JSON.parse((await svc.handle(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })))!);
    expect(list.result.tools.map((t: any) => t.name)).not.toContain("search_circle_knowledge");
    const r = await call(svc);
    expect(r.error.code).toBe(-32001);
    expect(prisma.circleKnowledge.findMany).not.toHaveBeenCalled();
  });

  it("模型在参数里自报 userId/circleId 无效：身份只认服务端解析结果", async () => {
    const { svc, prisma } = setupCircle({ expireAt: null, circle: { status: "ACTIVE", deletedAt: null } });
    const r = await call(svc, undefined, { query: "用神", userId: "u1", circleId: "c1" });
    expect(r.error.code).toBe(-32001);
    expect(prisma.circleMember.findUnique).not.toHaveBeenCalled();
  });

  it("已验证身份（将来供应商能力到位）：仍逐次校验有效成员，只查本圈 active 片段", async () => {
    const identity = { verified: true, userId: "u1", circleId: "c1", source: "vendor_verified" };
    const ok = setupCircle({ expireAt: null, circle: { status: "ACTIVE", deletedAt: null } });
    const list = JSON.parse((await ok.svc.handle(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }), identity as any))!);
    expect(list.result.tools.map((t: any) => t.name)).toContain("search_circle_knowledge");
    const r = await call(ok.svc, identity);
    expect(r.result.content[0].text).toContain("本圈讲义");
    expect(ok.prisma.circleKnowledge.findMany.mock.calls[0][0].where).toMatchObject({ circleId: "c1", status: "active" });

    const expired = setupCircle({ expireAt: new Date(Date.now() - 1000), circle: { status: "ACTIVE", deletedAt: null } });
    expect((await call(expired.svc, identity)).error.code).toBe(-32001);
    const banned = setupCircle({ expireAt: null, circle: { status: "BANNED", deletedAt: null } });
    expect((await call(banned.svc, identity)).error.code).toBe(-32001);
    const none = setupCircle(null);
    expect((await call(none.svc, identity)).error.code).toBe(-32001);
    expect(none.prisma.circleKnowledge.findMany).not.toHaveBeenCalled();
  });
});

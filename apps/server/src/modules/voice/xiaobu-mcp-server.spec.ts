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

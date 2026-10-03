import { PreferredNameService } from "./preferred-name.service";

/**
 * 称呼的记忆与用户可控入口。
 *
 * 机器人记住了你的称呼，你就得能看见、能改、能删——这既是体验，也是隐私上的必要项。
 */
function setup(over?: { row?: any; nickname?: string }) {
  let row = over?.row ?? null;
  const prisma: any = {
    userPreferredName: {
      findUnique: jest.fn(async () => row),
      upsert: jest.fn(async ({ create, update }: any) => {
        row = row ? { ...row, ...update } : { userId: "u1", ...create };
        return row;
      }),
    },
    user: { findUnique: jest.fn(async () => ({ nickname: over?.nickname ?? "用户8f3a2b" })) },
  };
  return { svc: new PreferredNameService(prisma), prisma, get row() { return row; } };
}

describe("称呼记忆", () => {
  it("已确认称呼时：直接用，且不再问", async () => {
    const { svc } = setup({ row: { name: "老陈", askedAt: new Date() } });
    const r = await svc.addressPrompt("u1");
    expect(r.preferred).toBe("老陈");
    expect(r.shouldAsk).toBe(false);
    expect(r.prompt).toContain("老陈");
  });

  it("昵称可用时：直接用昵称，不必问", async () => {
    const { svc } = setup({ nickname: "王小明" });
    const r = await svc.addressPrompt("u1");
    expect(r.shouldAsk).toBe(false);
    expect(r.prompt).toContain("王小明");
  });

  it("昵称不可用且没问过：该问一次", async () => {
    const { svc } = setup({ nickname: "用户8f3a2b" });
    expect((await svc.addressPrompt("u1")).shouldAsk).toBe(true);
  });

  it("问过就不再问——用户没答也算问过", async () => {
    const { svc } = setup({ row: { name: null, askedAt: new Date() }, nickname: "用户8f3a2b" });
    expect((await svc.addressPrompt("u1")).shouldAsk).toBe(false);
  });

  it("未登录不查库、不出称呼指令", async () => {
    const { svc, prisma } = setup();
    const r = await svc.addressPrompt(null);
    expect(r.prompt).toBe("");
    expect(prisma.userPreferredName.findUnique).not.toHaveBeenCalled();
  });

  it("查库出错不影响对话：称呼是锦上添花，不该拖垮整轮问答", async () => {
    const { svc, prisma } = setup();
    prisma.user.findUnique.mockRejectedValueOnce(new Error("db down"));
    const r = await svc.addressPrompt("u1");
    expect(r).toEqual({ prompt: "", preferred: null, shouldAsk: false });
  });

  it("从用户的话里认出称呼并记住，来源标为「自己说的」", async () => {
    const s = setup();
    expect(await s.svc.captureFromMessage("u1", "叫我老陈就行")).toBe("老陈");
    expect(s.row.name).toBe("老陈");
    expect(s.row.source).toBe("asked");
  });

  it("认不出就不记，也不报错", async () => {
    const s = setup();
    expect(await s.svc.captureFromMessage("u1", "今年运势如何")).toBeNull();
    expect(s.prisma.userPreferredName.upsert).not.toHaveBeenCalled();
  });

  it("设置页要说清这个称呼是哪来的", async () => {
    const withName = setup({ row: { name: "老陈" }, nickname: "用户8f3a2b" });
    const d1 = await withName.svc.detail("u1");
    expect(d1).toMatchObject({ name: "老陈", source: "asked", nicknameUsable: false });

    const fromNick = setup({ nickname: "王小明" });
    const d2 = await fromNick.svc.detail("u1");
    expect(d2).toMatchObject({ name: "王小明", source: "nickname", nicknameUsable: true });

    const none = setup({ nickname: "用户8f3a2b" });
    const d3 = await none.svc.detail("u1");
    expect(d3).toMatchObject({ name: null, source: null });
  });

  it("设置称呼要过一遍判定：叫不出口的不给设", async () => {
    const s = setup();
    expect(await s.svc.set("u1", "废物一个")).toEqual({ ok: false, reason: "self_deprecating" });
    expect(await s.svc.set("u1", "老陈")).toEqual({ ok: true, name: "老陈" });
  });

  it("清除称呼后改回用「你」，但 askedAt 保留——清空不等于可以再问一遍", async () => {
    const s = setup({ row: { name: "老陈", askedAt: new Date("2026-09-18") } });
    await s.svc.clear("u1");
    expect(s.row.name).toBeNull();
    expect(s.row.askedAt).toBeTruthy();
  });
});

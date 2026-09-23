import { buildAddressPrompt, extractPreferredName, judgeNickname } from "./preferred-name";

/**
 * 决策人要求：「有些用户名不适合作为称呼，对话机器人应该有判断力，
 * 不适合的情况，他应该主动和用户商量询问确定称呼，然后自己记忆存储。」
 *
 * 这里锁三件事：判断得准、问得得体、只问一次。
 */
describe("昵称能不能当称呼", () => {
  it("正常的名字可以直接叫", () => {
    for (const n of ["老陈", "王小明", "阿May", "青山客"]) {
      expect(judgeNickname(n)).toEqual({ ok: true, name: n });
    }
  });

  it("系统默认昵称不能叫", () => {
    for (const n of ["微信用户", "用户8f3a2b", "用户_123", "游客", "未命名"]) {
      expect(judgeNickname(n).ok).toBe(false);
    }
  });

  it("账号 ID 不能叫——张口叫一声 abc123，用户就知道对面不上心", () => {
    const v = judgeNickname("chainmu5navy0-me");
    expect(v).toEqual({ ok: false, reason: "identifier" });
  });

  it("全是符号表情的念不出来", () => {
    expect(judgeNickname("✨❤✨").ok).toBe(false);
    expect(judgeNickname("。。。").ok).toBe(false);
  });

  it("带广告联系方式的不能叫", () => {
    expect(judgeNickname("加微信xyz")).toEqual({ ok: false, reason: "ad" });
  });

  it("自嘲自贬的不能叫：用户自己起着玩，机器人一本正经叫出来性质就变了", () => {
    for (const n of ["废物一个", "倒霉蛋", "单身狗"]) {
      expect(judgeNickname(n)).toEqual({ ok: false, reason: "self_deprecating" });
    }
  });

  it("太长的不适合在对话里反复叫", () => {
    expect(judgeNickname("这个世界上最帅的男人不接受反驳")).toEqual({ ok: false, reason: "too_long" });
  });

  it("空昵称按「还没设」处理", () => {
    expect(judgeNickname("")).toEqual({ ok: false, reason: "empty" });
    expect(judgeNickname(null)).toEqual({ ok: false, reason: "empty" });
  });
});

describe("从用户回答里认出称呼", () => {
  it("认得出常见说法", () => {
    expect(extractPreferredName("叫我老陈就行")).toBe("老陈");
    expect(extractPreferredName("你就喊我阿明吧")).toBe("阿明");
    expect(extractPreferredName("称呼我王老师")).toBe("王老师");
    expect(extractPreferredName("老周就好")).toBe("老周");
  });

  it("用户说随便、不用，就不记——他不想说", () => {
    for (const t of ["随便", "不用了", "无所谓", "都行", "不想说"]) {
      expect(extractPreferredName(t)).toBeNull();
    }
  });

  it("认不出就返回 null：猜错了比不猜更尴尬", () => {
    expect(extractPreferredName("我想问问今年的事业运")).toBeNull();
    expect(extractPreferredName("")).toBeNull();
  });

  it("抽出来的称呼也要过一遍判定", () => {
    // 用户可能说「叫我废物就行」——不能照着叫
    expect(extractPreferredName("叫我废物就行")).toBeNull();
  });
});

describe("给模型的称呼指令", () => {
  it("已确认称呼：照着叫，别再问", () => {
    const p = buildAddressPrompt({ preferred: "老陈" });
    expect(p).toContain("「老陈」");
    expect(p).toContain("不要再问");
  });

  it("昵称可用：直接用，用户中途改口以他为准", () => {
    const p = buildAddressPrompt({ nickname: "王小明" });
    expect(p).toContain("「王小明」");
    expect(p).toContain("以他说的为准");
  });

  it("昵称不可用且没问过：本轮结尾顺口问一次，并说明只问这一次", () => {
    const p = buildAddressPrompt({ nickname: "用户8f3a2b" });
    expect(p).toContain("系统默认昵称");
    expect(p).toContain("结尾");
    expect(p).toContain("只问这一次");
    // 不许拿账号名硬叫，也不许自己编
    expect(p).toContain("不要用账号名称呼他");
    expect(p).toContain("不要自己编一个称呼");
  });

  it("已经问过就不再问——追着问称呼比叫错更烦人", () => {
    const p = buildAddressPrompt({ nickname: "用户8f3a2b", alreadyAsked: true });
    expect(p).toContain("不要再问");
    expect(p).toContain("用「你」就好");
  });

  it("自嘲昵称的问法要说清原因，且不复述那个昵称", () => {
    const p = buildAddressPrompt({ nickname: "废物一个" });
    expect(p).toContain("自嘲");
    expect(p).not.toContain("废物");
  });
});

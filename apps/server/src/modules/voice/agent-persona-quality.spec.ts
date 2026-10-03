import { checkPersonaQuality } from "./agent-persona-quality";

/**
 * 决策人要求：「不同的智能体，不同的场景和角色要有不同的名字和性格，要有针对性的区别。」
 *
 * 这里锁的是「帮圈主写好」这个定位：
 * 全部输出建议、不拦截提交——圈主是付费开通助理的人，平台不该卡着不让他上线。
 */
const good = {
  name: "老陈",
  persona:
    "说话像坐在你对面的老同行：先问清楚你要问的是哪一件具体的事，再给判断。" +
    "讲完必定补一句这是哪一派的看法，遇到成员抬杠不争辩，把盘面摆出来让他自己看。",
  prompt:
    "主要回答本圈关于六爻起卦与断卦的问题。答不上来或拿不准的直说拿不准，不硬答。" +
    "超出本圈范围的（比如看阳宅、挑日子），引导成员去平台对应的板块，不要自己接。",
  ownerServices: ["老陈一对一断卦"],
};

describe("语音角色人设质检", () => {
  it("写得好的人设不该被挑刺", () => {
    expect(checkPersonaQuality(good)).toEqual([]);
  });

  it("通用名字会被点出来：每个圈子都能用的名字，成员记不住", () => {
    const s = checkPersonaQuality({ ...good, name: "智能助手" });
    const hit = s.find((x) => x.field === "name");
    expect(hit?.level).toBe("warn");
    expect(hit?.text).toContain("每个圈子都能用");
  });

  it("名字里塞功能说明会被提示（那是说明不是名字）", () => {
    const s = checkPersonaQuality({ ...good, name: "六爻咨询" });
    expect(s.some((x) => x.field === "name" && /功能说明/.test(x.text))).toBe(true);
  });

  it("与平台角色重名要提示：成员会分不清是圈主的还是平台的", () => {
    const s = checkPersonaQuality({ ...good, name: "小卜" });
    const hit = s.find((x) => x.field === "name");
    expect(hit?.level).toBe("warn");
    expect(hit?.text).toContain("平台角色");
  });

  it("与其他圈子撞名给 tip（不是错，但换一个更好记）", () => {
    const s = checkPersonaQuality({ ...good, name: "老李" }, ["老李", "老王"]);
    const hit = s.find((x) => x.field === "name");
    expect(hit?.level).toBe("tip");
    expect(hit?.text).toContain("别的圈子在用");
  });

  it("性格太短要警告：模型只能靠猜", () => {
    const s = checkPersonaQuality({ ...good, persona: "热情专业" });
    expect(s.some((x) => x.field === "persona" && x.level === "warn")).toBe(true);
  });

  it("形容词堆砌要提示，并给出可替换的写法", () => {
    const s = checkPersonaQuality({
      ...good,
      persona: "非常专业，非常热情，非常耐心，对每一位成员都认真负责，竭诚为大家服务到底。",
    });
    const hit = s.find((x) => x.field === "persona" && x.level === "tip");
    expect(hit?.text).toContain("落不到具体行为");
    expect(hit?.text).toContain("先问清楚要问哪一件事");
  });

  it("角色说明太短要警告：上线后会什么都答、什么都敢答", () => {
    const s = checkPersonaQuality({ ...good, prompt: "回答圈里的问题" });
    const hit = s.find((x) => x.field === "prompt" && x.level === "warn");
    expect(hit?.text).toContain("什么都敢答");
  });

  it("没写「答不上来怎么办」「超出范围怎么办」会被逐条点出", () => {
    const s = checkPersonaQuality({
      ...good,
      prompt: "你是本圈的助理，负责回答成员提出的关于本圈内容的各类问题，认真作答即可。".repeat(2),
    });
    expect(s.some((x) => x.field === "prompt" && /答不上来/.test(x.text))).toBe(true);
    expect(s.some((x) => x.field === "prompt" && /超出范围/.test(x.text))).toBe(true);
  });

  it("没填圈主自己的服务要提示：助理由圈主出钱，立场该站在他这边", () => {
    const s = checkPersonaQuality({ ...good, ownerServices: [] });
    const hit = s.find((x) => x.field === "ownerServices");
    expect(hit?.text).toContain("立场应当站在你这边");
  });

  it("全部只是建议：没有任何一条会阻断提交", () => {
    const worst = checkPersonaQuality({ name: "助手", persona: "专业热情", prompt: "答问题", ownerServices: [] });
    expect(worst.length).toBeGreaterThan(3);
    // 级别只有 tip / warn 两种，没有 error/block
    expect(worst.every((x) => x.level === "tip" || x.level === "warn")).toBe(true);
  });
});

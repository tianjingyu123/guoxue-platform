import {
  buildCircleReferralPrompt,
  buildPolicyPrompt,
  buildSceneSystemPrefix,
  detectReferral,
  personaOfScene,
  personaPrompt,
  referralCard,
  SCENE_POLICIES,
} from "./dialogue-policy";
import { PERSONAS } from "./dialogue-personas";

describe("对话统一策略：知识库优先 → 模型兜底 → 超范围转介", () => {
  it("古籍伴读里用户想看八字：转介到八字排盘，不在此处直接解读", () => {
    const r = detectReferral("classic_companion", "我想看个八字，帮我算算今年运势");
    expect(r?.intent).toBe("bazi_reading");
    expect(r?.target.path).toBe("/pkg-paipan/bazi/index");
    expect(r?.target.paid).toBe(true);

    const prompt = buildPolicyPrompt({ scene: "classic_companion", hasEvidence: false, referral: r });
    expect(prompt).toContain("超出范围");
    expect(prompt).toContain("八字排盘");
    expect(prompt).toContain("不要在这里直接给出完整的排盘结果");
    // 不能变成只推销、不给帮助
    expect(prompt).toContain("别让用户空手而归");
    expect(prompt).toContain("不是推销");
  });

  it("识别各类专业请求并给出对应入口", () => {
    const cases: [string, string, string][] = [
      ["帮我起一卦看看这事成不成", "divination", "/pkg-paipan2/liuyao/index"],
      ["我想学紫微斗数，先看看我的命盘", "ziwei_reading", "/pkg-paipan/ziwei/index"],
      ["我和他八字合不合", "hehun", "/pkg-paipan/hepan/index"],
      ["我家房子朝向好不好", "fengshui", "/pkg-paipan/xuankong/index"],
      ["给孩子起名有什么讲究，帮我取一个", "naming", "/pkg-paipan2/qiming/index"],
      ["下个月哪天适合搬家", "zeri", "/pkg-paipan/wannianli/index"],
      ["能不能找个老师一对一看看", "expert_consult", "/pkg-circle/circles/consult-experts"],
      ["用奇门看看这单生意", "qimen", "/pkg-paipan/qimen/index"],
    ];
    for (const [q, intent, path] of cases) {
      const r = detectReferral("classic_companion", q);
      expect([q, r?.intent]).toEqual([q, intent]);
      expect(r?.target.path).toBe(path);
    }
  });

  it("正常的古籍问题不触发转介", () => {
    for (const q of [
      "这句「学而时习之」怎么理解？",
      "朱熹和王阳明对格物的解释有什么不同",
      "这一章讲的是什么",
      "八佾篇里孔子为什么生气",
    ]) {
      expect(detectReferral("classic_companion", q)).toBeNull();
    }
  });

  it("报告问答场景内不把八字问题转走（用户本来就在看八字报告）", () => {
    expect(detectReferral("paipan_report_dialogue", "帮我看看八字")).toBeNull();
    // 但其他工具仍然转介
    expect(detectReferral("paipan_report_dialogue", "再帮我起一卦")?.intent).toBe("divination");
    expect(detectReferral("paipan_report_dialogue", "我家风水怎么样")?.intent).toBe("fengshui");
  });

  it("有知识库依据时以依据为准", () => {
    const p = buildPolicyPrompt({ scene: "paipan_report_dialogue", hasEvidence: true });
    expect(p).toContain("优先使用【依据】");
    expect(p).toContain("以依据为准");
    expect(p).not.toContain("通行说法");
  });

  it("知识库不足时允许模型兜底，但必须标明且不得虚构出处", () => {
    const p = buildPolicyPrompt({ scene: "classic_companion", hasEvidence: false });
    expect(p).toContain("可以基于通用知识回答");
    expect(p).toContain("平台尚无审核过的依据");
    expect(p).toContain("绝不虚构书名");
    expect(p).toContain("不同说法");
  });

  it("圈主助理与广场智能体都识别排盘类请求、都允许兜底（但转介范围不同，见圈子用例）", () => {
    for (const scene of ["circle_assistant", "agent_square"]) {
      expect(detectReferral(scene, "帮我算算命")?.intent).toBe("bazi_reading");
      expect(SCENE_POLICIES[scene].allowModelFallback).toBe(true);
    }
  });

  it("转介卡片给前端的字段完整", () => {
    const r = detectReferral("circle_assistant", "看看我的八字")!;
    expect(referralCard(r)).toMatchObject({
      intent: "bazi_reading",
      label: "八字排盘",
      path: "/pkg-paipan/bazi/index",
      kind: "tool",
      paid: true,
    });
    expect(referralCard(r).reason).toContain("排盘");
  });

  it("未知场景不产生策略片段", () => {
    expect(detectReferral("unknown_scene", "算命")).toBeNull();
    expect(buildPolicyPrompt({ scene: "unknown_scene", hasEvidence: false })).toBe("");
  });
});

describe("角色谱：不同场景不同名字与性格", () => {
  it("每个角色的名字、来历、性格、音色互不相同", () => {
    const ids = Object.keys(PERSONAS);
    expect(ids.length).toBeGreaterThanOrEqual(6);
    const names = ids.map((i) => PERSONAS[i].name);
    expect(new Set(names).size).toBe(names.length); // 名字不重复
    for (const id of ids) {
      const p = PERSONAS[id];
      expect(p.origin).toBeTruthy(); // 每个名字都有来历
      expect(p.character.length).toBeGreaterThan(20); // 性格要具体
      expect(p.handsOff).toBeTruthy(); // 每个角色都知道什么活不接
      expect(p.voiceId).toMatch(/^std-/);
    }
  });

  it("场景绑定到各自的角色：报告=小卜，伴读=小简，卦类=小爻，风水=小罗，择日=小历，客服=小热", () => {
    expect(personaOfScene("paipan_report_dialogue")?.name).toBe("小卜");
    expect(personaOfScene("classic_companion")?.name).toBe("小简");
    expect(personaOfScene("liuyao_dialogue")?.name).toBe("小爻");
    expect(personaOfScene("fengshui_dialogue")?.name).toBe("小罗");
    expect(personaOfScene("zeri_dialogue")?.name).toBe("小历");
    expect(personaOfScene("customer_service")?.name).toBe("小热");
  });

  it("人设片段写入名字、来历、性格与不接的活", () => {
    const p = personaPrompt("classic_companion");
    expect(p).toContain("小简");
    expect(p).toContain("竹简");
    expect(p).toContain("温雅博学");
    expect(p).toContain("你不接的活");
  });

  it("平台场景转介时点名接手的同伴", () => {
    const r = detectReferral("classic_companion", "帮我算算命")!;
    const prompt = buildPolicyPrompt({ scene: "classic_companion", hasEvidence: false, referral: r });
    expect(prompt).toContain("我的同伴「小卜」"); // 像团队接力，不像推销
    expect(referralCard(r).persona).toMatchObject({ name: "小卜" });
  });

  it("场景前缀 = 人设 + 策略", () => {
    const s = buildSceneSystemPrefix({ scene: "classic_companion", hasEvidence: true });
    expect(s).toContain("你叫「小简」");
    expect(s).toContain("优先使用【依据】");
  });
});

describe("圈子助理：圈主付费供养，转介必须圈内优先", () => {
  it("不把成员推给平台其他老师（那是抢圈主的客户）", () => {
    // 平台场景会转介到老师咨询
    expect(detectReferral("classic_companion", "能找个老师一对一看看吗")?.intent).toBe("expert_consult");
    // 圈子场景不会
    expect(detectReferral("circle_assistant", "能找个老师一对一看看吗")).toBeNull();
    expect(SCENE_POLICIES.circle_assistant.referrals.some((r) => r.intent === "expert_consult")).toBe(false);
    expect(SCENE_POLICIES.circle_assistant.circleFirst).toBe(true);
  });

  it("圈子转介话术：先圈内、不外推、用完回圈里继续聊", () => {
    const r = detectReferral("circle_assistant", "帮我看看八字")!;
    const p = buildCircleReferralPrompt({ referral: r, circleName: "子平研习圈" });
    expect(p).toContain("子平研习圈");
    expect(p).toContain("圈内有就先介绍圈内的");
    expect(p).toContain("不要主动把成员介绍到其他老师、其他圈子或站外");
    expect(p).toContain("回来接着聊");
    expect(p).toContain("不要在这里直接给出完整的排盘结果");
  });

  it("圈主配置了自己的服务时，优先引导到圈主的服务", () => {
    const p = buildCircleReferralPrompt({
      referral: detectReferral("circle_assistant", "帮我看看八字"),
      circleName: "子平研习圈",
      ownerServices: ["张老师八字详批", "圈内每周答疑"],
    });
    expect(p).toContain("张老师八字详批");
    expect(p).toContain("优先引导到这里");
  });

  it("没有转介需求时也保持圈内优先的立场", () => {
    const p = buildCircleReferralPrompt({ referral: null, circleName: "子平研习圈" });
    expect(p).toContain("本圈优先");
    expect(p).not.toContain("这次的问题");
  });
});

import { buildRoleAnglePrompt, NEWCOMER_DAYS } from "./circle-member-roles";

/**
 * 决策人要求：圈子助理「要能区分圈成员角色，根据不同角色有不同的回答问题的角度」。
 *
 * 这里锁两头：角度确实分开了；以及分角色没有被做成差别对待——
 * 规矩、服务、知识库内容对谁都是同一套，变的只是切入角度与详略。
 */
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);

describe("圈成员角色视角", () => {
  it("圈主：给能用于经营的判断，并说明助理由他出资", () => {
    const p = buildRoleAnglePrompt("OWNER");
    expect(p).toContain("圈主");
    expect(p).toContain("出资");
    expect(p).toContain("经营");
    // 不替他改主张，也不替他做决定
    expect(p).toContain("不要替他改主张");
    expect(p).toContain("不越俎代庖");
  });

  it("管理员：先给规则依据再给建议，不替平台下处罚结论", () => {
    const p = buildRoleAnglePrompt("ADMIN");
    expect(p).toContain("规则");
    expect(p).toContain("不替平台下处罚结论");
  });

  it("普通成员：先解决眼前问题，术语要解释，不因为问得浅就敷衍", () => {
    const p = buildRoleAnglePrompt("MEMBER");
    expect(p).toContain("听得懂");
    expect(p).toContain("术语第一次出现");
    expect(p).toContain("不因为他问得浅就敷衍");
  });

  it("嘉宾：按同行口径对话，不评价其他嘉宾", () => {
    const p = buildRoleAnglePrompt("GUEST");
    expect(p).toContain("同行");
    expect(p).toContain("不评价其他嘉宾");
  });

  it("志愿者：偏重「怎么帮上忙」，超出权限的引导去找管理员或圈主", () => {
    const p = buildRoleAnglePrompt("VOLUNTEER");
    expect(p).toContain("帮上忙");
    expect(p).toContain("超出权限");
  });

  it("合伙人：与圈主同视角但偏协作分工", () => {
    const p = buildRoleAnglePrompt("PARTNER");
    expect(p).toContain("合伙人");
    expect(p).toContain("协作");
  });

  it("角色取不到时按普通成员处理（最保守的一档），不报错", () => {
    for (const bad of [null, undefined, "", "SOMETHING_NEW"]) {
      const p = buildRoleAnglePrompt(bad as any);
      expect(p).toContain("普通成员");
    }
  });

  it("新成员额外给一层入门引导，且要求一句话带过不长篇介绍", () => {
    const fresh = buildRoleAnglePrompt("MEMBER", daysAgo(1));
    expect(fresh).toContain("刚加入本圈不久");
    expect(fresh).toContain("不要长篇介绍");

    const old = buildRoleAnglePrompt("MEMBER", daysAgo(NEWCOMER_DAYS + 1));
    expect(old).not.toContain("刚加入本圈不久");
  });

  it("新成员引导只给普通成员：圈主是创建者，管理员嘉宾都是熟人", () => {
    // 实测踩到的：圈主的 joinedAt 也是最近，差点被当成新人引导一番
    for (const r of ["OWNER", "PARTNER", "ADMIN", "GUEST", "VOLUNTEER"]) {
      expect(buildRoleAnglePrompt(r, daysAgo(1))).not.toContain("刚加入本圈不久");
    }
    expect(buildRoleAnglePrompt("MEMBER", daysAgo(1))).toContain("刚加入本圈不久");
  });

  it("每种角色都带「一视同仁」那条：分角色只调整角度，不给不同的人不同的答案", () => {
    for (const r of ["OWNER", "PARTNER", "ADMIN", "GUEST", "VOLUNTEER", "MEMBER"]) {
      const p = buildRoleAnglePrompt(r);
      expect(p).toContain("对谁都是同一套口径");
      expect(p).toContain("不是给不同的人不同的答案");
    }
  });

  it("圈主与合伙人视角都不碰成员个人信息", () => {
    expect(buildRoleAnglePrompt("OWNER")).toContain("不掌握也不转述具体成员的付费、私聊、举报等个人信息");
    expect(buildRoleAnglePrompt("PARTNER")).toContain("不涉及具体成员的个人信息");
  });
});

import { USER_ANSWER_EXPERIENCE_PROMPT, withUserAnswerExperience } from "./answer-experience";

describe("全平台 AI 作答体验", () => {
  it("明确区分简单、单句解释、普通与复杂问题", () => {
    expect(USER_ANSWER_EXPERIENCE_PROMPT).toContain("寒暄、确认、简单事实");
    expect(USER_ANSWER_EXPERIENCE_PROMPT).toContain("单句古文");
    expect(USER_ANSWER_EXPERIENCE_PROMPT).toContain("普通问题");
    expect(USER_ANSWER_EXPERIENCE_PROMPT).toContain("复杂、专业或高风险问题");
  });

  it("给已有角色提示词追加体验规则", () => {
    const prompt = withUserAnswerExperience("你是课程助教。");
    expect(prompt).toContain("你是课程助教");
    expect(prompt).toContain("能一句说清就不要三段");
  });
});

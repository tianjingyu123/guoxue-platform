import { screenCircleKnowledge } from "./circle-knowledge-intake";

describe("圈子知识自动采集初筛", () => {
  it("明显闲聊与空内容不入候选", () => {
    expect(screenCircleKnowledge("哈哈哈！")).toBe("skip");
    expect(screenCircleKnowledge("<p>谢谢老师</p>")).toBe("skip");
    expect(screenCircleKnowledge("   ")).toBe("skip");
  });

  it("短内容留给人工复核，不直接当知识或扔掉", () => {
    expect(screenCircleKnowledge("《论语》说学而时习之。")).toBe("review");
  });

  it("有实质内容可进入后续审核和去重", () => {
    expect(screenCircleKnowledge("《论语》中的仁并不是单一礼节，而是对人的关怀。讲解时可先从日常关系说起，再结合原文辨析仁与礼的关系。 ")).toBe("eligible");
  });
});

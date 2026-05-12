import { Test } from "@nestjs/testing";
import { ModerationService } from "./moderation.service";

describe("ModerationService", () => {
  let svc: ModerationService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [ModerationService],
    }).compile();
    svc = mod.get(ModerationService);
  });

  describe("isImagePass", () => {
    it("结果为 null/undefined 时通过", () => {
      expect(svc.isImagePass(null)).toBe(true);
      expect(svc.isImagePass(undefined)).toBe(true);
    });

    it("Suggestion 为 Pass 时通过", () => {
      expect(svc.isImagePass({ Suggestion: "Pass" })).toBe(true);
      expect(svc.isImagePass({ Suggestion: 0 })).toBe(true);
    });

    it("Suggestion 为 Block 时不通过", () => {
      expect(svc.isImagePass({ Suggestion: "Block" })).toBe(false);
    });

    it("嵌套 Data.Suggestion 为 Pass 时通过", () => {
      expect(svc.isImagePass({ Data: { Suggestion: "Pass" } })).toBe(true);
    });
  });

  describe("isTextPass", () => {
    it("结果为 null/undefined 时通过", () => {
      expect(svc.isTextPass(null)).toBe(true);
    });

    it("Suggestion 为 Review 时不通过", () => {
      expect(svc.isTextPass({ Suggestion: "Review" })).toBe(false);
    });

    it("Suggestion 为 Pass 时通过", () => {
      expect(svc.isTextPass({ Suggestion: "Pass" })).toBe(true);
    });
  });

  describe("getBlockedLabels", () => {
    it("无违规时返回空数组", () => {
      const result: unknown = { Data: { LabelResults: [{ HitFlag: 0, Label: "Ad" }] } };
      expect(svc.getBlockedLabels(result)).toHaveLength(0);
    });

    it("有违规时返回对应标签", () => {
      const result: unknown = {
        Data: {
          LabelResults: [
            { HitFlag: 1, Label: "Porn", Scene: "色情" },
            { HitFlag: 0, Label: "Ad" },
            { HitFlag: 1, Scene: "暴恐" },
          ],
        },
      };
      const labels = svc.getBlockedLabels(result);
      expect(labels).toContain("Porn");
      expect(labels).not.toContain("Ad");
    });

    it("兼容扁平 LabelResults 结构", () => {
      const result: unknown = { LabelResults: [{ HitFlag: 1, Label: "Spam" }] };
      expect(svc.getBlockedLabels(result)).toEqual(["Spam"]);
    });
  });
});

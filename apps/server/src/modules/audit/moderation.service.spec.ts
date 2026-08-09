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

  describe("getImageSuggestion", () => {
    it("null/未识别按最宽松 Pass", () => {
      expect(svc.getImageSuggestion(null)).toBe("Pass");
      expect(svc.getImageSuggestion({})).toBe("Pass");
    });
    it("Block/Review/Pass 字符串档", () => {
      expect(svc.getImageSuggestion({ Suggestion: "Block" })).toBe("Block");
      expect(svc.getImageSuggestion({ Suggestion: "Review" })).toBe("Review");
      expect(svc.getImageSuggestion({ Suggestion: "Pass" })).toBe("Pass");
      expect(svc.getImageSuggestion({ Suggestion: 0 })).toBe("Pass");
    });
    it("数值档 2=Block / 1=Review 防御性映射", () => {
      expect(svc.getImageSuggestion({ Suggestion: 2 })).toBe("Block");
      expect(svc.getImageSuggestion({ Suggestion: 1 })).toBe("Review");
    });
    it("兼容嵌套 Data.Suggestion", () => {
      expect(svc.getImageSuggestion({ Data: { Suggestion: "Block" } })).toBe("Block");
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

  describe("实例角色调用", () => {
    afterEach(() => {
      delete process.env.TENCENT_CREDENTIAL_MODE;
      delete process.env.TENCENT_CVM_ROLE_NAME;
    });

    it("文本审核携带实例角色安全令牌", async () => {
      process.env.TENCENT_CREDENTIAL_MODE = "instance-role";
      process.env.TENCENT_CVM_ROLE_NAME = "RebugxModerationSpecRole";
      const originalFetch = globalThis.fetch;
      const fetchMock = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            Code: "Success",
            TmpSecretId: "role-id",
            TmpSecretKey: "role-key",
            Token: "role-token",
            ExpiredTime: Math.floor(Date.now() / 1000) + 3600,
          }),
        } as Response)
        .mockResolvedValueOnce({
          json: async () => ({ Response: { Suggestion: "Pass" } }),
        } as Response);
      (globalThis as { fetch?: typeof fetch }).fetch = fetchMock;

      try {
        await expect(svc.textModeration({ content: "国学文化测试" })).resolves.toMatchObject({
          Suggestion: "Pass",
        });
        expect(fetchMock.mock.calls[1][1].headers).toMatchObject({ "X-TC-Token": "role-token" });
      } finally {
        if (originalFetch === undefined) delete (globalThis as { fetch?: typeof fetch }).fetch;
        else globalThis.fetch = originalFetch;
      }
    });
  });
});

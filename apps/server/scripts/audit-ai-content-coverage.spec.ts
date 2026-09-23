import { PrismaClient } from "@prisma/client";
import { collectCoverage } from "./audit-ai-content-coverage";

describe("AI 内容只读覆盖率盘点", () => {
  it("只调用 count，并将权限未定义的帖子/直播标为未评估", async () => {
    const count = jest.fn().mockResolvedValue(2);
    const prisma = Object.fromEntries(
      ["article", "course", "video", "product", "circle", "content", "classicBook", "post", "liveRoom"]
        .map((type) => [type, { count }]),
    ) as unknown as PrismaClient;

    const rows = await collectCoverage(prisma);
    expect(rows).toHaveLength(9);
    expect(rows.find((r) => r.type === "VIDEO")?.publicEligible).toBe(2);
    expect(rows.find((r) => r.type === "POST")?.publicEligible).toBeNull();
    expect(rows.find((r) => r.type === "LIVE")?.publicEligible).toBeNull();
    const videoFilter = count.mock.calls.map((args) => args[0]?.where)
      .find((where) => where?.isPrivate === false);
    expect(videoFilter).toMatchObject({ status: "PUBLISHED", auditStatus: "APPROVED", visibility: "PLATFORM" });
    expect(Object.values(prisma).every((delegate) => Object.keys(delegate).join() === "count")).toBe(true);
  });
});

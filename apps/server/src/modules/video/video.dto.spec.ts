import { validate } from "class-validator";
import { UpdateVideoDto } from "./video.dto";

describe("视频作者编辑状态边界", () => {
  it.each(["PUBLISHED", "AUDITING", "PROCESSING", "REJECTED", "APPROVED"])("普通编辑DTO拒绝%s", async status => {
    const errors = await validate(Object.assign(new UpdateVideoDto(), { status }));
    expect(errors.some(error => error.property === "status")).toBe(true);
  });
  it.each([{ status: "HIDDEN" }, { title: "更新标题" }, { coverUrl: "https://example.test/cover.jpg" }])("保留合法编辑 %j", async value => {
    expect(await validate(Object.assign(new UpdateVideoDto(), value))).toHaveLength(0);
  });
});

import { CourseReviewQaService } from "./course-review-qa.service";

describe("CourseReviewQaService.getMyReviewStatus", () => {
  const findFirst = jest.fn();
  const service = new CourseReviewQaService(
    { courseReview: { findFirst } } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => findFirst.mockReset());

  it("仅按当前用户与课程查询，不返回评价内容", async () => {
    findFirst.mockResolvedValue({ id: "review-1", status: "HIDDEN" });
    await expect(service.getMyReviewStatus("user-1", "course-1")).resolves.toEqual({ hasReviewed: true, status: "HIDDEN" });
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", courseId: "course-1" },
      select: { id: true, status: true },
    });
  });

  it("无本人记录时返回未评价", async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.getMyReviewStatus("user-2", "course-1")).resolves.toEqual({ hasReviewed: false, status: null });
  });
});

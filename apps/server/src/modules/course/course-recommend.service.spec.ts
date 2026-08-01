import { PUBLIC_QUARANTINED_IDS } from "../../common/public-content-quarantine";
import { CourseRecommendService } from "./course-recommend.service";

describe("CourseRecommendService 公开内容卫生", () => {
  const prisma = {
    course: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const aiGateway = { chat: jest.fn() };
  const service = new CourseRecommendService(prisma as any, aiGateway as any);

  beforeEach(() => jest.clearAllMocks());

  it("相关推荐主查询排除精确隔离课程", async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: "source-course",
      title: "周易入门",
      intro: "",
      tags: ["周易"],
      categoryLevel1: "易经命理",
      categoryLevel2: null,
    });
    prisma.course.findMany.mockResolvedValue([{ id: "normal-course", title: "正常课程" }]);

    await service.getRelatedCourses("source-course", 1);

    expect(prisma.course.findMany.mock.calls[0][0].where.id).toEqual({
      not: "source-course",
      notIn: [...PUBLIC_QUARANTINED_IDS.course],
    });
  });

  it("同类热门补位同样排除隔离课程", async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: "source-course",
      title: "周易入门",
      intro: "",
      tags: [],
      categoryLevel1: "易经命理",
      categoryLevel2: null,
    });
    prisma.course.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await service.getRelatedCourses("source-course", 2);

    const notIn = prisma.course.findMany.mock.calls[1][0].where.id.notIn;
    expect(notIn).toEqual(expect.arrayContaining([
      "source-course",
      ...PUBLIC_QUARANTINED_IDS.course,
    ]));
  });
});

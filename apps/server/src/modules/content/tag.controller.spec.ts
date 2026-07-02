import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { TagController } from "./tag.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockPrisma = {
  topicTag: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  content: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("TagController", () => {
  let ctrl: TagController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [TagController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(TagController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  describe("公开接口", () => {
    it("获取热门标签", async () => {
      mockPrisma.topicTag.findMany.mockResolvedValue([{ id: "t1", name: "论语" }]);
      const result: any = await ctrl.hotTags(10);
      expect(result).toHaveLength(1);
      expect(mockPrisma.topicTag.findMany).toHaveBeenCalledWith({
        where: { status: "ACTIVE" }, orderBy: { postCount: "desc" }, take: 10,
      });
    });

    it("搜索标签", async () => {
      mockPrisma.topicTag.findMany.mockResolvedValue([{ id: "t1", name: "道德经" }]);
      const result: any = await ctrl.search("道德");
      expect(result).toHaveLength(1);
      expect(mockPrisma.topicTag.findMany).toHaveBeenCalledWith({
        where: { name: { contains: "道德" }, status: "ACTIVE" }, take: 10,
      });
    });

    it("标签下内容聚合", async () => {
      mockPrisma.content.findMany.mockResolvedValue([{ id: "c1", title: "文章" }]);
      mockPrisma.content.count.mockResolvedValue(1);
      const result: any = await ctrl.tagPosts("论语", 1, 20);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it("标签下内容聚合——分页偏移", async () => {
      mockPrisma.content.findMany.mockResolvedValue([]);
      mockPrisma.content.count.mockResolvedValue(100);
      await ctrl.tagPosts("国学", 3, 10);
      expect(mockPrisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe("管理接口", () => {
    it("创建标签", async () => {
      mockPrisma.topicTag.create.mockResolvedValue({ id: "t1", name: "新标签" });
      const result: any = await ctrl.adminCreate({ name: "新标签" } as any);
      expect(result.id).toBe("t1");
    });

    it("编辑标签", async () => {
      mockPrisma.topicTag.findUnique.mockResolvedValue({ id: "t1", name: "原标签" });
      mockPrisma.topicTag.update.mockResolvedValue({ id: "t1", name: "修改后" });
      const result: any = await ctrl.adminUpdate("t1", { name: "修改后" } as any);
      expect(result.name).toBe("修改后");
    });

    it("删除标签", async () => {
      mockPrisma.topicTag.findUnique.mockResolvedValue({ id: "t1", name: "待删标签" });
      mockPrisma.topicTag.delete.mockResolvedValue({ id: "t1" });
      await ctrl.adminDelete("t1");
      expect(mockPrisma.topicTag.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
    });
  });
});

import { Test } from "@nestjs/testing";
import { OfflineService } from "./offline.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  stationOffline: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  offlineCourse: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  instituteMember: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
};

describe("OfflineService", () => {
  let svc: OfflineService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        OfflineService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(OfflineService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("createStation", () => {
    it("创建线下驿站成功", async () => {
      mockPrisma.stationOffline.create.mockResolvedValue({
        id: "s1", name: "北京国学驿站", city: "北京", address: "东城区",
        phone: "13800138000",
      });
      const result = await svc.createStation({
        name: "北京国学驿站", city: "北京", address: "东城区", phone: "13800138000",
      }, "u1");
      expect(result.id).toBe("s1");
    });

    it("创建驿站带可选字段", async () => {
      mockPrisma.stationOffline.create.mockResolvedValue({
        id: "s1", name: "驿站", cover: "cover.jpg", depositAmount: 100,
      });
      const result = await svc.createStation({
        name: "驿站", city: "上海", address: "静安区", phone: "13900139000",
        cover: "cover.jpg", depositAmount: 100,
      }, "u1");
      expect(result.depositAmount).toBe(100);
    });

    it("未指定 depositAmount 时默认 0", async () => {
      mockPrisma.stationOffline.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "s1", ...data }),
      );
      const result = await svc.createStation({
        name: "驿站", city: "广州", address: "天河区", phone: "13700137000",
      }, "u1");
      expect(result.depositAmount).toBe(0);
    });
  });

  describe("listStations", () => {
    it("列出所有驿站", async () => {
      mockPrisma.stationOffline.findMany.mockResolvedValue([]);
      mockPrisma.stationOffline.count.mockResolvedValue(0);
      const result = await svc.listStations();
      expect(result).toHaveProperty("stations");
      expect(result.total).toBe(0);
    });

    it("按城市过滤", async () => {
      mockPrisma.stationOffline.findMany.mockResolvedValue([]);
      mockPrisma.stationOffline.count.mockResolvedValue(0);
      await svc.listStations(1, 20, "北京");
      expect(mockPrisma.stationOffline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { city: "北京" } }),
      );
    });

    it("按状态过滤", async () => {
      mockPrisma.stationOffline.findMany.mockResolvedValue([]);
      mockPrisma.stationOffline.count.mockResolvedValue(0);
      await svc.listStations(1, 20, undefined, "APPROVED");
      expect(mockPrisma.stationOffline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "APPROVED" } }),
      );
    });

    it("支持分页", async () => {
      mockPrisma.stationOffline.findMany.mockResolvedValue([]);
      mockPrisma.stationOffline.count.mockResolvedValue(0);
      await svc.listStations(2, 10);
      expect(mockPrisma.stationOffline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe("getStation", () => {
    it("获取驿站详情成功", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({
        id: "s1", name: "驿站", owner: {}, courses: [], products: [],
      });
      const result = await svc.getStation("s1");
      expect(result.id).toBe("s1");
    });

    it("驿站不存在抛出 NotFoundException", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue(null);
      await expect(svc.getStation("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("auditStation", () => {
    it("审核驿站成功", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ id: "s1", status: "PENDING" });
      mockPrisma.stationOffline.update.mockResolvedValue({ id: "s1", status: "APPROVED" });
      const result = await svc.auditStation("s1", "APPROVED");
      expect(result.status).toBe("APPROVED");
    });

    it("驳回驿站成功", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ id: "s1", status: "PENDING" });
      mockPrisma.stationOffline.update.mockResolvedValue({ id: "s1", status: "REJECTED" });
      const result = await svc.auditStation("s1", "REJECTED");
      expect(result.status).toBe("REJECTED");
    });
  });

  describe("createOfflineCourse", () => {
    it("创建线下课程成功", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ ownerUserId: "u1" });
      mockPrisma.offlineCourse.create.mockResolvedValue({ id: "oc1", title: "易经面授课" });
      const result = await svc.createOfflineCourse("u1", {
        stationId: "s1", title: "易经面授课", maxStudents: 30,
        startTime: "2026-06-01T09:00:00Z", endTime: "2026-06-01T17:00:00Z", location: "北京国学馆",
      });
      expect(result.id).toBe("oc1");
    });

    it("未指定 price 时默认 0", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ ownerUserId: "u1" });
      mockPrisma.offlineCourse.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "oc1", ...data }),
      );
      const result = await svc.createOfflineCourse("u1", {
        stationId: "s1", title: "课程", maxStudents: 20,
        startTime: "2026-06-01T09:00:00Z", endTime: "2026-06-01T17:00:00Z", location: "地点",
      });
      expect(result.price).toBe(0);
    });

    it("非驿站拥有者创建课程抛出 FORBIDDEN", async () => {
      mockPrisma.stationOffline.findUnique.mockResolvedValue({ ownerUserId: "owner" });
      await expect(svc.createOfflineCourse("attacker", {
        stationId: "s1", title: "课程", maxStudents: 20,
        startTime: "2026-06-01T09:00:00Z", endTime: "2026-06-01T17:00:00Z", location: "地点",
      })).rejects.toThrow(BusinessException);
      expect(mockPrisma.offlineCourse.create).not.toHaveBeenCalled();
    });
  });

  describe("listOfflineCourses", () => {
    it("列出驿站线下课程", async () => {
      mockPrisma.offlineCourse.findMany.mockResolvedValue([{ id: "oc1", title: "面授课" }]);
      mockPrisma.offlineCourse.count.mockResolvedValue(1);
      const result = await svc.listOfflineCourses("s1");
      expect(result.courses).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("无课程时返回空数组", async () => {
      mockPrisma.offlineCourse.findMany.mockResolvedValue([]);
      mockPrisma.offlineCourse.count.mockResolvedValue(0);
      const result = await svc.listOfflineCourses("s1");
      expect(result.courses).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("listMembers", () => {
    it("列出研究院成员", async () => {
      mockPrisma.instituteMember.findMany.mockResolvedValue([{ id: "m1", user: { nickname: "张三" } }]);
      mockPrisma.instituteMember.count.mockResolvedValue(1);
      const result = await svc.listMembers();
      expect(result.members).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("支持分页", async () => {
      mockPrisma.instituteMember.findMany.mockResolvedValue([]);
      mockPrisma.instituteMember.count.mockResolvedValue(0);
      await svc.listMembers(2, 10);
      expect(mockPrisma.instituteMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe("updateMember", () => {
    it("更新成员信息成功", async () => {
      mockPrisma.instituteMember.findUnique.mockResolvedValue({ id: "m1", role: "STUDENT", status: "ACTIVE" });
      mockPrisma.instituteMember.update.mockResolvedValue({ id: "m1", role: "SCHOLAR", status: "ACTIVE" });
      const result = await svc.updateMember("m1", { role: "SCHOLAR", status: "ACTIVE" });
      expect(result.role).toBe("SCHOLAR");
    });
  });
});

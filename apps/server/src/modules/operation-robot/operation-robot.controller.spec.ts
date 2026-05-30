import { Test } from "@nestjs/testing";
import { OperationRobotController } from "./operation-robot.controller";
import { OperationRobotService } from "./operation-robot.service";
import { SystemService } from "../system/system.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockSystemSvc = { logAudit: jest.fn().mockResolvedValue(undefined) };

describe("OperationRobotController", () => {
  let ctrl: OperationRobotController;
  let svc: jest.Mocked<OperationRobotService>;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [OperationRobotController],
      providers: [
        {
          provide: OperationRobotService,
          useValue: {
            getRobotStatus: jest.fn(),
            getExecutionLogs: jest.fn(),
            getRobotConfig: jest.fn(),
            triggerRobot: jest.fn(),
            toggleRobot: jest.fn(),
            init: jest.fn(),
          },
        },
        { provide: SystemService, useValue: mockSystemSvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(OperationRobotController);
    svc = mod.get(OperationRobotService) as jest.Mocked<OperationRobotService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const req: any = { user: { id: "admin1" }, ip: "127.0.0.1" };

  describe("getStatus", () => {
    it("获取所有机器人状态", async () => {
      const status = [
        { role: "like_bot", name: "内容点赞助手", enabled: true, frequency: "medium" as const },
        { role: "comment_bot", name: "评论互动助手", enabled: false, frequency: "low" as const },
      ];
      svc.getRobotStatus.mockReturnValue(status);
      const result = await ctrl.getStatus();
      expect(svc.getRobotStatus).toHaveBeenCalled();
      expect(result).toEqual(status);
    });

    it("返回空列表", async () => {
      svc.getRobotStatus.mockReturnValue([]);
      const result = await ctrl.getStatus();
      expect(result).toEqual([]);
    });
  });

  describe("trigger", () => {
    it("手动触发机器人并记录审计", async () => {
      svc.triggerRobot.mockResolvedValue({ success: true, message: "like_bot 手动触发完成" });
      const result = await ctrl.trigger("like_bot", req);
      expect(svc.triggerRobot).toHaveBeenCalledWith("like_bot");
      expect(result.success).toBe(true);
      expect(mockSystemSvc.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "TRIGGER_ROBOT" }));
    });
  });

  describe("toggle", () => {
    it("切换机器人开关并记录审计", async () => {
      svc.toggleRobot.mockResolvedValue({ role: "like_bot", enabled: false } as any);
      await ctrl.toggle("like_bot", false, req);
      expect(svc.toggleRobot).toHaveBeenCalledWith("like_bot", false);
      expect(mockSystemSvc.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "TOGGLE_ROBOT" }));
    });
  });

  describe("init", () => {
    it("初始化机器人系统并记录审计", async () => {
      svc.init.mockResolvedValue(undefined);
      const result = await ctrl.init(req);
      expect(svc.init).toHaveBeenCalled();
      expect(result).toEqual({ message: "机器人系统已初始化" });
      expect(mockSystemSvc.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "INIT_ROBOTS" }));
    });
  });
});

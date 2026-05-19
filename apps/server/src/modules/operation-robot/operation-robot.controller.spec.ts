import { Test } from "@nestjs/testing";
import { OperationRobotController } from "./operation-robot.controller";
import { OperationRobotService } from "./operation-robot.service";

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
            toggleRobot: jest.fn(),
            init: jest.fn(),
          },
        },
      ],
    }).compile();
    ctrl = mod.get(OperationRobotController);
    svc = mod.get(OperationRobotService) as jest.Mocked<OperationRobotService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  describe("toggle", () => {
    it("切换机器人开关（开启）", async () => {
      svc.toggleRobot.mockResolvedValue(undefined as any);
      await ctrl.toggle("like_bot", true);
      expect(svc.toggleRobot).toHaveBeenCalledWith("like_bot", true);
    });

    it("切换机器人开关（关闭）", async () => {
      svc.toggleRobot.mockResolvedValue(undefined as any);
      await ctrl.toggle("comment_bot", false);
      expect(svc.toggleRobot).toHaveBeenCalledWith("comment_bot", false);
    });

    it("传递 boolean 值", async () => {
      svc.toggleRobot.mockResolvedValue(undefined as any);
      await ctrl.toggle("like_bot", true as any);
      expect(svc.toggleRobot).toHaveBeenCalledWith("like_bot", true);
    });
  });

  describe("init", () => {
    it("初始化机器人系统", async () => {
      svc.init.mockResolvedValue(undefined);
      const result = await ctrl.init();
      expect(svc.init).toHaveBeenCalled();
      expect(result).toEqual({ message: "机器人系统已初始化" });
    });
  });
});

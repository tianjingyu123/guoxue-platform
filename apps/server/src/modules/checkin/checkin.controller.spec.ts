import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { CheckinController } from "./checkin.controller";
import { CheckinService } from "./checkin.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockService: Record<string, jest.Mock> = {
  checkIn: jest.fn(),
  getStatus: jest.fn(),
  getCalendar: jest.fn(),
  getDailyTasks: jest.fn(),
  completeTask: jest.fn(),
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("CheckinController", () => {
  let ctrl: CheckinController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CheckinController],
      providers: [{ provide: CheckinService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(CheckinController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  it("每日签到", async () => {
    mockService.checkIn.mockResolvedValue({ consecutiveDays: 5, rewardPoints: 8 });
    const result: any = await ctrl.checkIn({ user: { id: "u1" } } as any as any);
    expect(result.consecutiveDays).toBe(5);
    expect(result.rewardPoints).toBe(8);
  });

  it("查询签到状态", async () => {
    mockService.getStatus.mockResolvedValue({ checkedInToday: true, consecutiveDays: 3 });
    const result: any = await ctrl.getStatus({ user: { id: "u1" } } as any);
    expect(result.checkedInToday).toBe(true);
  });

  it("获取月度签到日历", async () => {
    mockService.getCalendar.mockResolvedValue({ year: 2025, month: 6, days: [] });
    const result: any = await ctrl.getCalendar({ user: { id: "u1" } } as any, { year: 2025, month: 6 } as any);
    expect(result.year).toBe(2025);
    expect(result.month).toBe(6);
  });

  it("获取每日任务列表", async () => {
    mockService.getDailyTasks.mockResolvedValue({ date: new Date(), tasks: [] });
    const result: any = await ctrl.getDailyTasks({ user: { id: "u1" } } as any);
    expect(result.tasks).toHaveLength(0);
  });

  it("完成任务", async () => {
    mockService.completeTask.mockResolvedValue({ completed: true, rewardPoints: 5 });
    const result: any = await ctrl.completeTask({ user: { id: "u1" } } as any, "task1");
    expect(result.rewardPoints).toBe(5);
    expect(mockService.completeTask).toHaveBeenCalledWith("u1", "task1");
  });
});

import { VoiceUserController } from "./voice-user.controller";
import { DEFAULT_VOICE_BILLING } from "./voice-quota.service";

/**
 * 用户花 29 元买一份报告，附带 30 分钟语音——他得看得见自己还剩多少。
 * 此前只有后台能查额度，用户侧没有任何入口。
 */
function setup(over?: { available?: number; reserved?: number; charging?: boolean }) {
  const quota: any = {
    getConfig: jest.fn(async () => ({ ...DEFAULT_VOICE_BILLING, chargeUsers: over?.charging ?? false })),
    getAvailable: jest.fn(async () => ({
      chargeUsers: over?.charging ?? false,
      balanceSeconds: (over?.available ?? 0) + (over?.reserved ?? 0),
      reservedSeconds: over?.reserved ?? 0,
      availableSeconds: over?.available ?? 0,
    })),
  };
  const trial: any = { status: jest.fn(), start: jest.fn(), finish: jest.fn(), mine: jest.fn() };
  const commerce: any = { memberOverview: jest.fn(async () => ({ active: false, expireAt: null, planKey: null, plans: [], monthlyVoiceMinutes: 300 })) };
  return { ctrl: new VoiceUserController(quota, trial, commerce), quota, trial, commerce };
}

/** 鉴权守卫注入的是 req.user.id —— 早先按 userId 取，线上会拿到 undefined */
const req = (id = "u1") => ({ user: { id } }) as any;

describe("我的语音时长", () => {
  it("返回可用时长与折合分钟；分钟向下取整", async () => {
    const { ctrl } = setup({ available: 12 * 60 + 47 });
    const r = await ctrl.myQuota(req());
    expect(r.availableSeconds).toBe(767);
    // 「还剩 12 分钟」比「12.78 分钟」更可信，也不会让用户以为还能聊满 13 分钟
    expect(r.availableMinutes).toBe(12);
  });

  it("带出每份报告附带的时长与续费单价，供「用完了怎么办」说明", async () => {
    const { ctrl } = setup({ available: 0 });
    const r = await ctrl.myQuota(req());
    expect(r.includedSecondsPerReport).toBe(30 * 60); // 29 元一份，含 30 分钟
    expect(r.topUpPricePerMinuteCents).toBe(200); // 2 元/分钟
    expect(r.sessionMaxSeconds).toBe(DEFAULT_VOICE_BILLING.sessionMaxSeconds);
  });

  it("语音链路未接通时 charging=false：价格已定，但不能先把用户挡在付费墙后面", async () => {
    const { ctrl } = setup({ available: 0, charging: false });
    const r = await ctrl.myQuota(req());
    expect(r.charging).toBe(false);
    expect(r.freeSessionMaxSeconds).toBe(DEFAULT_VOICE_BILLING.freeSessionMaxSeconds);
  });

  it("只查自己的额度，不接受外部传入的用户 id", async () => {
    const { ctrl, quota } = setup({ available: 60 });
    await ctrl.myQuota(req("me"));
    expect(quota.getAvailable).toHaveBeenCalledWith("user", "me");
  });

  it("进行中会话的预留要从可用里扣掉，否则用户会以为还能开新会话", async () => {
    const { ctrl } = setup({ available: 300, reserved: 600 });
    const r = await ctrl.myQuota(req());
    expect(r.availableSeconds).toBe(300);
    expect(r.reservedSeconds).toBe(600);
  });
});

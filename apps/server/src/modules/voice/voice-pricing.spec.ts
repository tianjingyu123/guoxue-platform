import { DEFAULT_VOICE_BILLING, DEFAULT_VOICE_PRICING, VoiceQuotaService } from "./voice-quota.service";

/**
 * 售价配置与毛利核算（决策人 2026-09-17 拍板的价格）
 * 纯计算，无需数据库：构造服务时依赖项传 null。
 */
describe("小卜语音售价与毛利", () => {
  const svc = new VoiceQuotaService(null as any);
  const YUAN = 1_000_000;

  it("默认价格与决策一致：报告 29 元含 30 分钟、续费与广场 2 元/分钟、圈子 0.1 元/分钟赠 500 分钟", () => {
    expect(DEFAULT_VOICE_PRICING.reportPriceMicro).toBe(29 * YUAN);
    expect(DEFAULT_VOICE_PRICING.reportIncludedSeconds).toBe(1800);
    expect(DEFAULT_VOICE_PRICING.userMicroPerMinute).toBe(2 * YUAN);
    expect(DEFAULT_VOICE_PRICING.agentMicroPerMinute).toBe(2 * YUAN);
    expect(DEFAULT_VOICE_PRICING.trialSecondsPerAgent).toBe(180);
    expect(DEFAULT_VOICE_PRICING.trialMaxAgents).toBe(5);
    expect(DEFAULT_VOICE_PRICING.circleMicroPerMinute).toBe(100_000);
    expect(DEFAULT_VOICE_PRICING.circleGrantSeconds).toBe(30_000);
    expect(DEFAULT_VOICE_PRICING.chargeCircleMembers).toBe(false);
  });

  it("语音链路未接通前不向用户扣费：价格已定但开关默认关闭", () => {
    expect(DEFAULT_VOICE_BILLING.chargeUsers).toBe(false);
  });

  it("圈子助理默认锁 lite 档（standard 档毛利过薄）", () => {
    expect(DEFAULT_VOICE_PRICING.circleTier).toBe("lite");
    const lite = svc.pricingOverview(DEFAULT_VOICE_BILLING).items.find((i) => i.key === "circle_minute")!;
    expect(lite.marginPercent).toBe(59); // (0.1-0.041)/0.1
  });

  it("圈子助理若改 standard 档，毛利跌到 19% 并给出告警", () => {
    const cfg = { ...DEFAULT_VOICE_BILLING, pricing: { ...DEFAULT_VOICE_PRICING, circleTier: "standard" as const } };
    const o = svc.pricingOverview(cfg);
    expect(o.items.find((i) => i.key === "circle_minute")!.marginPercent).toBe(19);
    expect(o.warnings.some((w) => w.includes("毛利仅 19%"))).toBe(true);
  });

  it("报告与续费毛利：含 30 分钟语音仍在 95% 以上，续费 98%", () => {
    const o = svc.pricingOverview(DEFAULT_VOICE_BILLING);
    const report = o.items.find((i) => i.key === "report")!;
    expect(report.costMicro).toBe(1_230_000); // 30min × 0.041
    expect(report.marginPercent).toBeGreaterThanOrEqual(95);
    expect(o.items.find((i) => i.key === "user_minute")!.marginPercent).toBe(98);
  });

  it("赠送与试聊成本按规模给出风险提示", () => {
    const o = svc.pricingOverview(DEFAULT_VOICE_BILLING);
    expect(o.circleGrantCostMicro).toBe(20_500_000); // 500min × 0.041 = 20.5 元/圈
    expect(o.trialCostPerUserMicro).toBe(615_000); // 15min × 0.041 = 0.615 元/人
    expect(o.warnings.some((w) => w.includes("圈主确认后开通"))).toBe(true);
    expect(o.warnings.some((w) => w.includes("防刷"))).toBe(true);
  });

  it("后台可覆盖价格，未覆盖字段回落默认值", async () => {
    const system: any = {
      getConfig: async () => ({ configValue: JSON.stringify({ chargeUsers: true, pricing: { userMicroPerMinute: 3 * YUAN } }) }),
    };
    const s2 = new VoiceQuotaService(null as any, system);
    const cfg = await s2.getConfig();
    expect(cfg.chargeUsers).toBe(true);
    expect(cfg.pricing.userMicroPerMinute).toBe(3 * YUAN);
    expect(cfg.pricing.reportPriceMicro).toBe(29 * YUAN);
    expect(cfg.supplierMicroPerMinute.lite).toBe(41_000);
  });
});

import { PrismaClient } from "@prisma/client";
import { RedisService } from "../../redis/redis.service";
import { VoiceQuotaService } from "./voice-quota.service";
import { VoiceDeviceService } from "./voice-device.service";
import { VoiceSessionService } from "./voice-session.service";
import { VoiceContextBuilder } from "./voice-context.builder";
import { VoiceDeviceHandoffService } from "./voice-device-handoff.service";
import { MockXiaozhiProvider } from "./provider/mock-xiaozhi.provider";

/**
 * 场景接续（App 选场景 → 硬件接着聊）· 真实库验证（默认跳过）：XIAOBU_IT_DATABASE_URL=<隔离库>
 * 供应商为模拟；只验证权限、上下文与会话编排，不代表真实语音接通。
 */
const dbUrl = process.env.XIAOBU_IT_DATABASE_URL;
const run = dbUrl ? describe : describe.skip;

run("硬件场景接续 · 真实库", () => {
  let prisma: PrismaClient;
  let devices: VoiceDeviceService;
  let sessions: VoiceSessionService;
  let handoff: VoiceDeviceHandoffService;
  const tag = `it-ho-${Date.now()}`;
  const alice = `${tag}-alice`;
  const bob = `${tag}-bob`;
  let deviceId = "";
  let reportId = "";
  let bobReportId = "";
  let circleId = "";
  let n = 0;
  const start = (uid = alice) => sessions.startForDevice(uid, deviceId, `${tag}-${++n}`, { allowPendingVendorForMockRelay: true });

  beforeAll(async () => {
    process.env.XIAOBU_DEVICE_PEPPER = "it-only-pepper-0123456789abcdef0123456789";
    delete process.env.REDIS_URL;
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    await prisma.user.createMany({ data: [{ id: alice, nickname: "阿丽" }, { id: bob, nickname: "阿波" }] });
    const content = JSON.stringify({ title: "命书", summary: "摘要", sections: [{ id: "s3", title: "事业", content: "……" }], dialogueOutline: [{ sectionId: "s3", title: "事业", keyPoints: ["稳"], evidenceIds: [] }], facts: {}, metadata: { paipanType: "bazi", version: "v1" } });
    reportId = (await prisma.aiAnalysisRecord.create({ data: { userId: alice, analyzeType: "REPORT_GENERAL", scene: "paipan_report", modelName: "it", analysisContent: content } })).id;
    bobReportId = (await prisma.aiAnalysisRecord.create({ data: { userId: bob, analyzeType: "REPORT_GENERAL", scene: "paipan_report", modelName: "it", analysisContent: content } })).id;
    const circle = await prisma.circle.create({ data: { name: `${tag}-圈`, intro: "it", ownerId: bob, status: "ACTIVE" } as any });
    circleId = circle.id;
    await prisma.circleMember.create({ data: { circleId, userId: alice, expireAt: new Date(Date.now() + 86400_000) } as any });
    await prisma.voiceAgentProfile.create({ data: { ownerType: "circle", ownerId: circleId, name: "圈助理", persona: "p", prompt: "p", voiceId: "v", status: "APPROVED", activeVersion: 1 } as any });
    await prisma.voiceAgentProfileVersion.create({ data: { profileId: (await prisma.voiceAgentProfile.findFirstOrThrow({ where: { ownerId: circleId } })).id, version: 1, name: "圈助理", persona: "p", prompt: "p", voiceId: "v", tier: "lite", approvedBy: "it" } as any });

    const redis = new RedisService();
    const quota = new VoiceQuotaService(prisma as any, { getConfig: async () => null } as any);
    devices = new VoiceDeviceService(prisma as any);
    const contexts = new VoiceContextBuilder(prisma as any);
    handoff = new VoiceDeviceHandoffService(redis, devices, contexts);
    sessions = new VoiceSessionService(prisma as any, quota, contexts, new MockXiaozhiProvider(), devices, handoff);
    const d = await devices.register("it-admin", { serial: "c0:ff:ee:00:11:22", productSku: `${tag}-sku` });
    deviceId = d.id;
    await devices.bindUnboundDevice(alice, deviceId);
  });

  afterAll(async () => {
    await prisma.voiceSession.deleteMany({ where: { userId: { in: [alice, bob] } } });
    await prisma.voiceDeviceTransfer.deleteMany({ where: { deviceId } });
    await prisma.voiceDeviceBinding.deleteMany({ where: { deviceId } });
    await prisma.voiceDevice.deleteMany({ where: { id: deviceId } });
    const prof = await prisma.voiceAgentProfile.findMany({ where: { ownerId: circleId } });
    await prisma.voiceAgentProfileVersion.deleteMany({ where: { profileId: { in: prof.map((p) => p.id) } } });
    await prisma.voiceAgentProfile.deleteMany({ where: { ownerId: circleId } });
    await prisma.circleMember.deleteMany({ where: { circleId } });
    await prisma.circle.deleteMany({ where: { id: circleId } });
    await prisma.aiAnalysisRecord.deleteMany({ where: { userId: { in: [alice, bob] } } });
    const acc = await prisma.voiceQuotaAccount.findMany({ where: { ownerId: { in: [alice, bob, circleId] } } });
    await prisma.voiceQuotaLedger.deleteMany({ where: { accountId: { in: acc.map((a) => a.id) } } });
    await prisma.voiceQuotaAccount.deleteMany({ where: { id: { in: acc.map((a) => a.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: [alice, bob] } } });
    await prisma.$disconnect();
  });

  it("没有接续场景：硬件开普通对话（scene=device）", async () => {
    const r: any = await start();
    const s = await prisma.voiceSession.findUniqueOrThrow({ where: { id: r.session.id } });
    expect(s).toMatchObject({ scene: "device", deviceId, providerIsMock: true });
  });

  it("接续自己的报告：硬件会话进入报告对话、挂在设备上；2 小时内每次按键都接着聊", async () => {
    const v = await handoff.set(alice, deviceId, { scene: "report_dialogue", contextId: reportId, sectionId: "s3" });
    expect(v.scene).toBe("report_dialogue");
    for (let i = 0; i < 2; i++) {
      const r: any = await start();
      const s = await prisma.voiceSession.findUniqueOrThrow({ where: { id: r.session.id } });
      expect(s).toMatchObject({ scene: "report_dialogue", contextType: "paipan_report", contextId: reportId, deviceId, deviceBindingVersion: 1 });
    }
    expect((await handoff.get(alice, deviceId))!.scene).toBe("report_dialogue");
  });

  it("权限：别人的报告、未加入的圈子设置不上；别人不能给我的设备设场景", async () => {
    await expect(handoff.set(alice, deviceId, { scene: "report_dialogue", contextId: bobReportId })).rejects.toThrow(/无权/);
    await expect(handoff.set(bob, deviceId, { scene: "report_dialogue", contextId: bobReportId })).rejects.toThrow(/不存在/);
    await expect(handoff.set(alice, deviceId, { scene: "device" as any })).rejects.toThrow(/暂不支持/);
  });

  it("使用时重新校验：圈子会员到期后，按键回到普通硬件对话并清掉接续场景", async () => {
    await handoff.set(alice, deviceId, { scene: "circle_assistant", contextId: circleId });
    const ok: any = await start();
    expect((await prisma.voiceSession.findUniqueOrThrow({ where: { id: ok.session.id } })).scene).toBe("circle_assistant");
    await prisma.circleMember.updateMany({ where: { circleId, userId: alice }, data: { expireAt: new Date(Date.now() - 1000) } });
    const r: any = await start();
    expect((await prisma.voiceSession.findUniqueOrThrow({ where: { id: r.session.id } })).scene).toBe("device");
    expect(await handoff.get(alice, deviceId)).toBeNull();
  });

  it("换主人：转赠后新主人拿不到上一任设置的场景", async () => {
    await handoff.set(alice, deviceId, { scene: "report_dialogue", contextId: reportId });
    const { transferCode } = await devices.initiateTransfer(alice, deviceId);
    await devices.acceptTransfer(bob, transferCode);
    expect(await handoff.get(bob, deviceId)).toBeNull();
    const r: any = await start(bob);
    const s = await prisma.voiceSession.findUniqueOrThrow({ where: { id: r.session.id } });
    expect(s).toMatchObject({ scene: "device", userId: bob, deviceBindingVersion: 2 });
  });

  it("清除：清掉后回到普通硬件对话", async () => {
    await handoff.set(bob, deviceId, { scene: "report_dialogue", contextId: bobReportId });
    await handoff.clear(bob, deviceId);
    const r: any = await start(bob);
    expect((await prisma.voiceSession.findUniqueOrThrow({ where: { id: r.session.id } })).scene).toBe("device");
  });
});

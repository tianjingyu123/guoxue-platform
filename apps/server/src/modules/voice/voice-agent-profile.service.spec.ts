import { VoiceAgentProfileService } from "./voice-agent-profile.service";

/** 模拟验证：内存版表；验证申请—审核—发布—回滚流程与权限边界 */
function fake(memberRole: string | null = "OWNER", circle = { status: "ACTIVE", deletedAt: null as Date | null }) {
  const profiles = new Map<string, any>();
  const versions: any[] = [];
  let seq = 0;
  const byOwner = (w: any) => [...profiles.values()].find((p) => p.ownerType === w.ownerType_ownerId.ownerType && p.ownerId === w.ownerType_ownerId.ownerId) ?? null;
  const prisma: any = {
    circleMember: { findUnique: jest.fn(async () => (memberRole ? { role: memberRole, circle } : null)) },
    voiceAgentProfile: {
      findUnique: jest.fn(async ({ where, include }: any) => {
        const p = where.id ? profiles.get(where.id) ?? null : byOwner(where);
        if (p && include?.versions) return { ...p, versions: versions.filter((v) => v.profileId === p.id) };
        return p;
      }),
      findUniqueOrThrow: jest.fn(async ({ where }: any) => profiles.get(where.id)),
      create: jest.fn(async ({ data }: any) => {
        const p = { id: `p${++seq}`, status: "DRAFT", draftVersion: 1, activeVersion: null, riskFlags: [], tier: "lite", updatedAt: new Date(seq), ...data };
        profiles.set(p.id, p);
        return p;
      }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(profiles.get(where.id), data, { updatedAt: new Date(++seq) })),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const p = profiles.get(where.id);
        const ok = p && Object.entries(where).every(([k, v]) => k === "id" || (v instanceof Date ? p[k]?.getTime() === v.getTime() : p[k] === v));
        if (!ok) return { count: 0 };
        Object.assign(p, data, { updatedAt: new Date(++seq) });
        return { count: 1 };
      }),
      findMany: jest.fn(async ({ where }: any) => [...profiles.values()].filter((p) => p.status === where.status)),
    },
    voiceAgentProfileVersion: {
      create: jest.fn(async ({ data }: any) => {
        versions.push({ id: `v${++seq}`, ...data });
        return data;
      }),
      findUnique: jest.fn(async ({ where }: any) =>
        versions.find((v) => v.profileId === where.profileId_version.profileId && v.version === where.profileId_version.version) ?? null),
    },
  };
  prisma.$transaction = jest.fn(async (fn: any) => fn(prisma));
  return { svc: new VoiceAgentProfileService(prisma), prisma, profiles, versions };
}

const draft = { name: "小卜·易学圈", persona: "温和耐心，爱打比方", prompt: "你是易学圈的讲解员，只讲圈内资料。", voiceId: "std-female-01" };

describe("VoiceAgentProfileService", () => {
  it("非圈主、停用圈子不能申请", async () => {
    await expect(fake("ADMIN").svc.saveCircleDraft("c1", "u1", draft)).rejects.toThrow("只有圈主本人");
    await expect(fake("OWNER", { status: "DISABLED", deletedAt: null }).svc.saveCircleDraft("c1", "u1", draft)).rejects.toThrow("不可用");
  });

  it("草稿 → 提交（规则检查）→ 通过发布生成快照；圈主不能自行开启标准版", async () => {
    const { svc } = fake();
    const saved = await svc.saveCircleDraft("c1", "u1", { ...draft, tier: "standard" });
    expect(saved.tier).toBe("lite");
    await svc.saveCircleDraft("c1", "u1", { ...draft, prompt: "帮用户付费化解，保证灵验" });
    const submitted = await svc.submitCircleDraft("c1", "u1");
    expect(submitted.status).toBe("PENDING_REVIEW");
    expect(submitted.riskFlags).toEqual(expect.arrayContaining(["含付费化解/开运类表述", "含保证灵验类承诺"]));
    await expect(svc.saveCircleDraft("c1", "u1", draft)).rejects.toThrow("审核中");

    const approved = await svc.approve(saved.id, "admin1", { note: "提示词需去掉化解表述后再上线" });
    expect(approved.status).toBe("APPROVED");
    expect(approved.activeVersion).toBe(1);
    expect(approved.draftVersion).toBe(2);
    expect((await svc.getPublished("circle", "c1"))?.version).toBe(1);
  });

  it("已发布后再次修改与驳回不影响线上版本；驳回需要原因；停用后运行时拿不到角色", async () => {
    const { svc } = fake();
    const p = await svc.saveCircleDraft("c1", "u1", draft);
    await svc.submitCircleDraft("c1", "u1");
    await svc.approve(p.id, "admin1");

    await svc.saveCircleDraft("c1", "u1", { ...draft, persona: "更活泼" });
    await svc.submitCircleDraft("c1", "u1");
    await expect(svc.reject(p.id, "admin1", "")).rejects.toThrow("驳回原因");
    const rejected = await svc.reject(p.id, "admin1", "性格描述与圈子定位不符");
    expect(rejected.status).toBe("REJECTED");
    const live = await svc.getPublished("circle", "c1");
    expect(live?.persona).toBe(draft.persona);

    await svc.disable(p.id, "admin1", "投诉处理中");
    expect(await svc.getPublished("circle", "c1")).toBeNull();
  });

  it("回滚到历史版本", async () => {
    const { svc } = fake();
    const p = await svc.saveCircleDraft("c1", "u1", draft);
    await svc.submitCircleDraft("c1", "u1");
    await svc.approve(p.id, "admin1");
    await svc.saveCircleDraft("c1", "u1", { ...draft, name: "小卜·新版" });
    await svc.submitCircleDraft("c1", "u1");
    await svc.approve(p.id, "admin1");
    expect((await svc.getPublished("circle", "c1"))?.name).toBe("小卜·新版");
    const rolled = await svc.publishVersion(p.id, 1, "admin1");
    expect(rolled.activeVersion).toBe(1);
    expect((await svc.getPublished("circle", "c1"))?.name).toBe(draft.name);
    await expect(svc.publishVersion(p.id, 9, "admin1")).rejects.toThrow("版本不存在");
  });
});

import { NativePreviewService } from "./native-preview.service";
import { PAIPAN_SUITE_MODE_KEY } from "../../common/paipan-suite-policy";

// 服务单测使用事务替身；数据库真实回滚与并发仍需独立 PostgreSQL 验收。
function fixture() {
  const rows = new Map<string, any>();
  let authorized = true;
  const history: any[] = [];
  const tx = {
    $queryRaw: jest.fn(async () => authorized ? [{ id: "admin" }] : []),
    $executeRaw: jest.fn(async () => 1),
    configSystem: {
      findUnique: jest.fn(async ({ where }) => rows.get(where.configKey) ?? null),
      upsert: jest.fn(async ({ where, create, update }) => {
        const before = rows.get(where.configKey);
        const row = { ...(before ?? create), ...(before ? update : {}), id: where.configKey, updatedAt: new Date(0) };
        rows.set(where.configKey, row); return row;
      }),
    },
    configVersion: {
      findFirst: jest.fn(async () => history.at(-1) ?? null),
      create: jest.fn(async ({ data }) => { history.push(data); return data; }),
    },
  };
  const service = new NativePreviewService({ $transaction: async (work: any) => work(tx) } as any);
  return { service, rows, tx, history, revoke: () => { authorized = false; } };
}

describe("整套排盘设置服务", () => {
  const env = process.env.PAIPAN_MODE;
  beforeEach(() => { process.env.PAIPAN_MODE = "legacy"; });
  afterAll(() => { if (env === undefined) delete process.env.PAIPAN_MODE; else process.env.PAIPAN_MODE = env; });

  it("同一次设置保存整套模式、独立预览状态与审计，不产生工具权限记录", async () => {
    const f = fixture(); const initial = await f.service.get("admin");
    expect(initial).toMatchObject({ enabled: false, mode: "legacy" });
    const next = await f.service.set("admin", false, initial.revision, "native");
    expect(next).toMatchObject({ enabled: false, mode: "native" });
    expect(f.rows.size).toBe(2);
    expect(f.rows.get(PAIPAN_SUITE_MODE_KEY).configValue).toBe("native");
    expect(f.history[0].value).toEqual({ enabled: false, previousEnabled: false, mode: "native", previousMode: "legacy" });
    expect(next.revision).not.toBe(initial.revision);
  });
  it("旧客户端只修改预览时不覆盖已选正式模式", async () => {
    const f = fixture(); const initial = await f.service.get("admin");
    const next = await f.service.set("admin", false, initial.revision, "native");
    expect(await f.service.set("admin", true, next.revision)).toMatchObject({ enabled: true, mode: "native" });
  });
  it("旧指纹不能覆盖他人新模式，返回原模式后旧指纹仍失效", async () => {
    const f = fixture(); const initial = await f.service.get("admin");
    const next = await f.service.set("admin", false, initial.revision, "native");
    await f.service.set("admin", false, next.revision, "legacy");
    await expect(f.service.set("admin", true, initial.revision, "native")).rejects.toMatchObject({ status: 409 });
    expect(f.history).toHaveLength(2);
  });
  it("撤权后读取与保存都拒绝且不写配置", async () => {
    const f = fixture(); const initial = await f.service.get("admin"); f.revoke();
    await expect(f.service.get("admin")).rejects.toMatchObject({ status: 404 });
    await expect(f.service.set("admin", false, initial.revision, "native")).rejects.toMatchObject({ status: 404 });
    expect(f.tx.configSystem.upsert).not.toHaveBeenCalled();
  });
  it("数据库已存模式优先于进程旧环境值", async () => {
    const f = fixture(); const initial = await f.service.get("admin");
    await f.service.set("admin", false, initial.revision, "native");
    expect((await f.service.get("admin")).mode).toBe("native");
  });
});

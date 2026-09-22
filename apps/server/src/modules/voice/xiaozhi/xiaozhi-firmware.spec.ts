import { PrismaClient } from "@prisma/client";
import { compareVersion, parseAppImage, rolloutBucket, MAX_OFFERS_PER_DEVICE, XiaozhiFirmwareService } from "./xiaozhi-firmware.service";

/** 按 ESP-IDF 应用镜像格式造一个最小镜像：镜像头 + 首段头 + esp_app_desc_t */
export function fakeAppImage(version: string, opts: { chipId?: number; project?: string; size?: number; noDesc?: boolean } = {}) {
  const buf = Buffer.alloc(opts.size ?? 4096);
  buf[0] = 0xe9;
  buf[1] = 3;
  buf.writeUInt16LE(opts.chipId ?? 5, 12);
  if (!opts.noDesc) {
    const d = 0x20;
    buf.writeUInt32LE(0xabcd5432, d);
    buf.write(version, d + 16, "utf8");
    buf.write(opts.project ?? "xiaozhi", d + 48, "utf8");
    buf.write("12:00:00", d + 80, "utf8");
    buf.write("Sep 22 2026", d + 96, "utf8");
    buf.write("v5.5.4", d + 112, "utf8");
  }
  return buf;
}

describe("固件镜像解析与版本规则", () => {
  it("从镜像自带描述读出版本、项目名、芯片", () => {
    expect(parseAppImage(fakeAppImage("2.2.7"))).toMatchObject({ version: "2.2.7", projectName: "xiaozhi", chipId: 5, chipName: "esp32c3", idfVersion: "v5.5.4" });
    expect(parseAppImage(fakeAppImage("3.0.1", { chipId: 9 })).chipName).toBe("esp32s3");
  });

  it("拒绝：不是镜像、没有应用描述（如合并镜像/引导程序）、版本非纯数字（设备无法比较新旧）", () => {
    expect(() => parseAppImage(Buffer.alloc(4096))).toThrow(/镜像头不对/);
    expect(() => parseAppImage(fakeAppImage("1.0.0", { noDesc: true }))).toThrow(/应用描述/);
    expect(() => parseAppImage(fakeAppImage("2.2.7-rebu"))).toThrow(/纯数字点分/);
  });

  it("新旧比较与固件端一致：逐段数字比较、缺段按 0", () => {
    expect(compareVersion("2.2.7", "2.2.6")).toBe(1);
    expect(compareVersion("2.10.0", "2.9.9")).toBe(1);
    expect(compareVersion("2.2", "2.2.0")).toBe(0);
    expect(compareVersion("1.9.9", "2.0.0")).toBe(-1);
  });

  it("灰度分桶：同设备同发布恒定；1 万台设备分布大致均匀", () => {
    expect(rolloutBucket("r1", "d1")).toBe(rolloutBucket("r1", "d1"));
    const hits = Array.from({ length: 10000 }, (_, i) => rolloutBucket("r1", `dev-${i}`) < 10).filter(Boolean).length;
    expect(hits).toBeGreaterThan(850);
    expect(hits).toBeLessThan(1150);
  });
});

const dbUrl = process.env.XIAOBU_IT_DATABASE_URL;
const run = dbUrl ? describe : describe.skip;

run("固件在线升级通道 · 真实库", () => {
  let prisma: PrismaClient;
  let fw: XiaozhiFirmwareService;
  const objects = new Map<string, Buffer>();
  const tag = `it-fw-${Date.now()}`;
  const board = `${tag}-board`;
  const base = "http://192.168.1.2:3989";
  const dev = (id: string) => ({ id, status: "bound" });
  let n = 0;

  beforeAll(async () => {
    process.env.XIAOBU_MEDIA_URL_SECRET = "it-only-media-secret-0123456789abcdef0123";
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    const storage: any = {
      uploadBuffer: async ({ body }: any) => { const key = `firmware/${++n}.bin`; objects.set(key, Buffer.from(body)); return { url: key, key }; },
      download: async (key: string) => objects.get(key)!,
    };
    fw = new XiaozhiFirmwareService(prisma as any, storage);
  });

  afterAll(async () => {
    await prisma.voiceFirmwareRelease.deleteMany({ where: { boardName: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  const idOf = (url: string) => url.match(/firmware\/([^.]+)\.bin/)![1];
  const q = (url: string) => new URL(url).searchParams;

  it("上传：版本从镜像读出；同板型同版本不能重复；超出分区上限拒绝", async () => {
    const r = await fw.create("admin", { boardName: board, notes: "修复", file: fakeAppImage("2.2.7") });
    expect(r).toMatchObject({ version: "2.2.7", status: "draft", rolloutPercent: 0, chipName: "esp32c3" });
    await expect(fw.create("admin", { boardName: board, file: fakeAppImage("2.2.7") })).rejects.toThrow(/已有 2\.2\.7/);
    await expect(fw.create("admin", { boardName: board, file: fakeAppImage("9.9.9", { size: fw.maxBytes + 1 }) })).rejects.toThrow(/超过/);
    await expect(fw.create("admin", { boardName: "Bad Board", file: fakeAppImage("1.0.1") })).rejects.toThrow(/板型名/);
  });

  it("草稿不推送；灰度 100% 后旧版本设备拿到签名下载地址，签名/有效期被校验，下载内容逐字节一致", async () => {
    expect(await fw.decide(dev(`${tag}-a`), board, "2.2.6", base)).toEqual({ version: "2.2.6", url: "" });
    const [rel] = (await fw.list()).filter((r) => r.boardName === board);
    await fw.rollout("admin", rel.id, 100);
    const f = await fw.decide(dev(`${tag}-a`), board, "2.2.6", base);
    expect(f.version).toBe("2.2.7");
    expect(f.url.startsWith(`${base}/api/v1/xiaozhi/firmware/${rel.id}.bin?exp=`)).toBe(true);
    const got = await fw.download(idOf(f.url), Number(q(f.url).get("exp")), q(f.url).get("sig")!);
    expect(got!.body.equals(fakeAppImage("2.2.7"))).toBe(true);
    expect(await fw.download(rel.id, Number(q(f.url).get("exp")), "00".repeat(32))).toBeNull(); // 签名错
    expect(await fw.download(rel.id, Math.floor(Date.now() / 1000) - 1, q(f.url).get("sig")!)).toBeNull(); // 过期
    // 同版本、更新版本的设备、其他板型都不推
    expect((await fw.decide(dev(`${tag}-b`), board, "2.2.7", base)).url).toBe("");
    expect((await fw.decide(dev(`${tag}-c`), `${tag}-other`, "1.0.0", base)).url).toBe("");
    expect((await fw.decide({ id: `${tag}-d`, status: "disabled" }, board, "2.2.6", base)).url).toBe("");
  });

  it("升级成功：设备下次上报新版本即记为成功，不再推送", async () => {
    await fw.decide(dev(`${tag}-a`), board, "2.2.7", base);
    const s = await prisma.voiceFirmwareDeviceState.findFirstOrThrow({ where: { deviceId: `${tag}-a` } });
    expect(s).toMatchObject({ status: "succeeded", fromVersion: "2.2.6" });
    const [rel] = (await fw.list()).filter((r) => r.boardName === board);
    expect(rel.stats.succeeded).toBe(1);
  });

  it("止损：推送 3 次仍停在旧版本（设备端回滚）→ 判失败、不再推送", async () => {
    for (let i = 0; i < MAX_OFFERS_PER_DEVICE; i++) expect((await fw.decide(dev(`${tag}-e`), board, "2.2.6", base)).url).not.toBe("");
    expect((await fw.decide(dev(`${tag}-e`), board, "2.2.6", base)).url).toBe("");
    expect((await prisma.voiceFirmwareDeviceState.findFirstOrThrow({ where: { deviceId: `${tag}-e` } })).status).toBe("failed");
    expect((await fw.decide(dev(`${tag}-e`), board, "2.2.6", base)).url).toBe("");
  });

  it("灰度比例：1% 时只有桶内设备拿到；暂停后停推；同板型只能一个进行中；归档后下载失效", async () => {
    const [rel] = (await fw.list()).filter((r) => r.boardName === board);
    await fw.rollout("admin", rel.id, 1);
    const ids = Array.from({ length: 300 }, (_, i) => `${tag}-g${i}`);
    const offered: string[] = [];
    for (const id of ids) if ((await fw.decide(dev(id), board, "2.2.6", base)).url) offered.push(id);
    expect(offered.every((id) => rolloutBucket(rel.id, id) < 1)).toBe(true);
    expect(offered.length).toBeLessThan(15);
    const r2 = await fw.create("admin", { boardName: board, file: fakeAppImage("2.2.8") });
    await expect(fw.rollout("admin", r2.id, 50)).rejects.toThrow(/进行中/);
    await fw.setStatus("admin", rel.id, "paused");
    expect((await fw.decide(dev(`${tag}-z`), board, "2.2.6", base)).url).toBe("");
    await fw.rollout("admin", r2.id, 100);
    const f = await fw.decide(dev(`${tag}-z`), board, "2.2.6", base);
    expect(f.version).toBe("2.2.8"); // 跳过暂停的 2.2.7，直接给最新进行中的版本
    await fw.setStatus("admin", r2.id, "archived");
    expect(await fw.download(idOf(f.url), Number(q(f.url).get("exp")), q(f.url).get("sig")!)).toBeNull();
  });
});

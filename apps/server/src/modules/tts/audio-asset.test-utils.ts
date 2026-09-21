/**
 * 音频资产测试夹具：内存版 audioAsset 表（按 assetKey 唯一）与对象存储。
 * 仅供单测使用，用于验证“命中资产零合成”“并发只生成一次”等行为，不是真实数据库或 COS。
 */
import { randomUUID } from "crypto";

export function createFakeAudioAssetPrisma() {
  const rows = new Map<string, any>();
  const byId = () => new Map([...rows.values()].map((r) => [r.id, r]));
  const audioAsset = {
    findUnique: jest.fn(async ({ where }: any) => {
      if (where.assetKey) return rows.get(where.assetKey) ?? null;
      return byId().get(where.id) ?? null;
    }),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const current = rows.get(where.assetKey);
      if (current) {
        Object.assign(current, update, { updatedAt: new Date() });
        return current;
      }
      const row = { id: randomUUID(), durationMs: null, createdAt: new Date(), updatedAt: new Date(), ...create };
      rows.set(where.assetKey, row);
      return row;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const row = byId().get(where.id);
      if (!row) throw new Error("not found");
      Object.assign(row, data);
      return row;
    }),
    updateMany: jest.fn(async () => ({ count: 0 })),
  };
  return { prisma: { audioAsset } as any, rows };
}

export function createFakeStorage() {
  const objects = new Map<string, Buffer>();
  const storage = {
    uploadBuffer: jest.fn(async (req: { body: Buffer; prefix: string }) => {
      const key = `${req.prefix}/${randomUUID()}.mp3`;
      objects.set(key, Buffer.from(req.body));
      return { url: `https://cdn.test/${key}`, key };
    }),
    download: jest.fn(async (key: string) => {
      const obj = objects.get(key);
      if (!obj) throw Object.assign(new Error("对象不存在"), { code: "NOT_FOUND" });
      return obj;
    }),
    delete: jest.fn(async (key: string) => {
      objects.delete(key);
    }),
  };
  return { storage, objects };
}

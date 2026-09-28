import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { CircleMembershipService } from './circle-membership.service';

const dbUrl = process.env.REBU_LOCAL_CIRCLE_EXPIRY_TEST_URL;
if (dbUrl) {
  const url = new URL(dbUrl);
  if (url.hostname !== '127.0.0.1' || url.port !== '55439' || url.pathname !== '/rebu_candidate_test') {
    throw new Error('只允许明确的本机隔离测试库');
  }
}
const run = dbUrl ? describe : describe.skip;
run('圈子过期清理独立数据库', () => {
  const prefix = `synthetic-expiry-${randomUUID()}`;
  const owner = `${prefix}-owner`, renewed = `${prefix}-renewed`, promoted = `${prefix}-promoted`, expired = `${prefix}-expired`;
  let db: PrismaClient;
  let circleId: string;
  const send = jest.fn().mockResolvedValue(undefined);
  const del = jest.fn();
  const exec = jest.fn().mockResolvedValue([]);
  const redis = { runExclusive: async (_key: string, _ttl: number, fn: () => Promise<void>) => fn(), getClient: () => ({ pipeline: () => ({ del, exec }) }) };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    await db.user.createMany({ data: [owner, renewed, promoted, expired].map(id => ({ id, nickname: '合成过期测试' })) });
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    const circle = await db.circle.create({ data: { name: '隔离测试圈', intro: '仅用于本机验证', tags: [], ownerId: owner, memberCount: 3 } });
    circleId = circle.id;
    await db.circleMember.createMany({ data: [renewed, promoted, expired].map(userId => ({ circleId, userId, expireAt: new Date(Date.now() - 86400000) })) });
  });
  afterEach(async () => { await db.circle.deleteMany({ where: { id: circleId } }); });
  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: [owner, renewed, promoted, expired] } } });
    await db.$disconnect();
  });
  const service = (prisma: any) => new CircleMembershipService(prisma, redis as any, {} as any, {} as any, undefined, undefined, { send } as any);

  it('扫描后已续费或变为圈主的成员不删除、不通知；只清理仍过期成员', async () => {
    const facade = {
      circleMember: { findMany: async (args: any) => {
        const rows = await db.circleMember.findMany(args);
        // 在扫描结束与清理事务开始之间提交状态变更，确定性复现旧名单竞态。
        await db.circleMember.update({ where: { circleId_userId: { circleId, userId: renewed } }, data: { expireAt: new Date(Date.now() + 86400000) } });
        await db.circleMember.update({ where: { circleId_userId: { circleId, userId: promoted } }, data: { role: 'OWNER' } });
        return rows;
      } },
      $transaction: (fn: any) => db.$transaction(fn),
    };
    await service(facade).cleanupExpiredMembers();
    const members = await db.circleMember.findMany({ where: { circleId }, select: { userId: true } });
    expect(members.map(m => m.userId).sort()).toEqual([renewed, promoted].sort());
    expect((await db.circle.findUniqueOrThrow({ where: { id: circleId } })).memberCount).toBe(2);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expired, expect.objectContaining({ type: 'CIRCLE_EXPIRED' }));
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith(`circles:member:${circleId}:${expired}`);
  });

  it('最后一批成员过期后人数归零', async () => {
    await service(db).cleanupExpiredMembers();
    expect(await db.circleMember.count({ where: { circleId } })).toBe(0);
    expect((await db.circle.findUniqueOrThrow({ where: { id: circleId } })).memberCount).toBe(0);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('事务内更新人数失败时删除回滚，不清缓存或发通知', async () => {
    const facade = {
      circleMember: db.circleMember,
      $transaction: (fn: any) => db.$transaction(tx => fn({
        circleMember: tx.circleMember,
        circle: { update: async () => { throw new Error('synthetic count failure'); } },
      })),
    };
    await expect(service(facade).cleanupExpiredMembers()).rejects.toThrow('synthetic count failure');
    expect(await db.circleMember.count({ where: { circleId } })).toBe(3);
    expect(send).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });
});

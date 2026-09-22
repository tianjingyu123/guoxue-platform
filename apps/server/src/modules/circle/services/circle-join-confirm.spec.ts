import { CircleMembershipService } from './circle-membership.service';

/** 模拟数据库事务的控制器级边界；不创建真实订单或成员。 */
describe('入圈订单确认事务', () => {
  function setup() {
    const tx: any = {
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      circleViolation: { findFirst: jest.fn().mockResolvedValue(null) },
      circleMember: { create: jest.fn().mockResolvedValue({ id: 'member', circleId: 'circle', userId: 'buyer' }) },
      circle: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = {
      circle: { findUnique: jest.fn().mockResolvedValue({ id: 'circle', status: 'ACTIVE', type: 'PAID', price: 88 }) },
      circleMember: { findUnique: jest.fn().mockResolvedValue(null) },
      order: { findFirst: jest.fn().mockResolvedValue({ id: 'order', status: 'PAID', type: 'CIRCLE_JOIN', targetId: 'circle', userId: 'buyer' }), updateMany: jest.fn() },
      $transaction: jest.fn().mockImplementation((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    };
    const redis: any = { del: jest.fn().mockResolvedValue(undefined) };
    const svc = new CircleMembershipService(prisma, redis, {} as never, {} as never);
    return { svc, prisma, tx };
  }
  it('同一个已付订单在同一事务里完结、建成员和增加人数', async () => {
    const { svc, prisma, tx } = setup();
    await svc.confirmJoin('circle', 'buyer', { orderId: 'order' });
    expect(tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'order', userId: 'buyer', targetId: 'circle', type: 'CIRCLE_JOIN', status: 'PAID' } }));
    expect(tx.circleMember.create).toHaveBeenCalledTimes(1);
    expect(tx.circle.update).toHaveBeenCalledTimes(1);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });
  it('订单状态被并发请求认领后，不再建成员', async () => {
    const { svc, tx } = setup();
    tx.order.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.confirmJoin('circle', 'buyer', { orderId: 'order' })).rejects.toThrow();
    expect(tx.circleMember.create).not.toHaveBeenCalled();
    expect(tx.circle.update).not.toHaveBeenCalled();
  });
  it('两个并发请求最多建一条成员关系', async () => {
    const { svc, tx } = setup();
    let available = true;
    tx.order.updateMany.mockImplementation(async () => {
      if (!available) return { count: 0 };
      available = false;
      return { count: 1 };
    });
    const results = await Promise.allSettled([
      svc.confirmJoin('circle', 'buyer', { orderId: 'order' }),
      svc.confirmJoin('circle', 'buyer', { orderId: 'order' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(tx.circleMember.create).toHaveBeenCalledTimes(1);
  });
  it('成员创建失败时事务报错，不返回入圈成功', async () => {
    const { svc, tx } = setup();
    tx.circleMember.create.mockRejectedValue(new Error('模拟成员写入失败'));
    await expect(svc.confirmJoin('circle', 'buyer', { orderId: 'order' })).rejects.toThrow('模拟成员写入失败');
    expect(tx.circle.update).not.toHaveBeenCalled();
  });
  it('订单类型、用户或圈子不匹配时确认前拒绝', async () => {
    const { svc, prisma, tx } = setup();
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(svc.confirmJoin('circle', 'buyer', { orderId: 'other' })).rejects.toThrow();
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });
});

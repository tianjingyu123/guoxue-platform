import { CircleMembershipService } from './circle-membership.service';

/** 旧确认入口应复用唯一履约事务，不再单独建成员或完结订单。 */
describe('入圈订单确认事务', () => {
  function setup() {
    const member = { id: 'member', circleId: 'circle', userId: 'buyer', expireAt: null };
    const tx: any = {
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 'order', userId: 'buyer', type: 'CIRCLE_JOIN', targetId: 'circle', quantity: 1, status: 'PAID', paidAt: new Date(), refundedAt: null }])
        .mockResolvedValueOnce([]),
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      circle: { findUnique: jest.fn().mockResolvedValue({ id: 'circle', status: 'ACTIVE', type: 'PAID' }), update: jest.fn().mockResolvedValue({}) },
      circleMember: { create: jest.fn().mockResolvedValue(member), findUnique: jest.fn().mockResolvedValue(null) },
    };
    const prisma: any = {
      circle: { findUnique: jest.fn().mockResolvedValue({ id: 'circle', status: 'ACTIVE', type: 'PAID', price: 88 }) },
      circleViolation: { findFirst: jest.fn().mockResolvedValue(null) },
      circleMember: { findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValue(member) },
      order: { findFirst: jest.fn().mockResolvedValue({ id: 'order', status: 'PAID', type: 'CIRCLE_JOIN', targetId: 'circle', userId: 'buyer', payAmount: 88 }), updateMany: jest.fn() },
      $transaction: jest.fn().mockImplementation((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    };
    const redis: any = { del: jest.fn().mockResolvedValue(undefined) };
    const svc = new CircleMembershipService(prisma, redis, {} as never, {} as never);
    return { svc, prisma, tx, member };
  }

  it('同一事务锁定订单、建成员、完结订单', async () => {
    const { svc, prisma, tx, member } = setup();
    await expect(svc.confirmJoin('circle', 'buyer', { orderId: 'order' })).resolves.toEqual(member);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.circleMember.create).toHaveBeenCalledTimes(1);
    expect(tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'order', status: { in: ['PAID', 'SHIPPED'] } } }));
    expect(tx.circle.update).toHaveBeenCalledTimes(1);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('订单状态变化导致认领失败时，不报告入圈成功', async () => {
    const { svc, tx } = setup();
    tx.order.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.confirmJoin('circle', 'buyer', { orderId: 'order' })).rejects.toThrow('订单认领失败');
  });

  it('成员创建失败时事务报错，不返回入圈成功', async () => {
    const { svc, tx } = setup();
    tx.circleMember.create.mockRejectedValue(new Error('模拟成员写入失败'));
    await expect(svc.confirmJoin('circle', 'buyer', { orderId: 'order' })).rejects.toThrow('模拟成员写入失败');
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });

  it('订单类型、用户或圈子不匹配时确认前拒绝', async () => {
    const { svc, prisma, tx } = setup();
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(svc.confirmJoin('circle', 'buyer', { orderId: 'other' })).rejects.toThrow();
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
});

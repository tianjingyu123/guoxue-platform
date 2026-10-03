import { CircleRefundService } from './circle-refund.service';

jest.mock('../../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../commission/commission.service', () => ({ CommissionService: class {} }));

describe('自动退款的收益事实边界', () => {
  const params = { orderId: 'order', circleId: 'circle', memberId: 'member', paidAmount: 100 };

  it.each([
    ['超额分成', 100, 600],
    ['负分成', 100, -1],
    ['非有限分成', 100, NaN],
    ['无限分成', 100, Infinity],
    ['非有限收益', NaN, 60],
    ['无限收益', Infinity, 60],
    ['零收益', 0, 0],
    ['负收益', -100, 60],
  ])('%s 不能因订单键命中就认定为可自动冲正', async (_name, amount, ownerShare) => {
    const tx = { $queryRawUnsafe: jest.fn().mockResolvedValue([
      { id: 'revenue', circleId: 'circle', sourceId: 'member', amount, ownerShare },
    ]) };
    const result = await (new CircleRefundService({} as any) as any).resolveOwnerShare(tx, params);
    expect(result.kind).toBe('mismatch');
    expect(result.ownerShare).toBeNull();
  });

  it.each([NaN, Infinity, 0, -100])('异常退款实付快照 %s 不允许精确匹配', async (paidAmount) => {
    const tx = { $queryRawUnsafe: jest.fn().mockResolvedValue([
      { id: 'revenue', circleId: 'circle', sourceId: 'member', amount: 100, ownerShare: 60 },
    ]) };
    const result = await (new CircleRefundService({} as any) as any).resolveOwnerShare(tx, { ...params, paidAmount });
    expect(result.kind).toBe('mismatch');
  });

  function refund(ownerShare: number) {
    const tx = {
      $queryRawUnsafe: jest.fn(async (sql: string) => {
        if (sql.includes('FOR UPDATE')) return [{ refundStatus: 'refunding' }];
        if (sql.includes('UserWallet')) return [{ balance: 40 }];
        return [{ id: 'revenue', circleId: 'circle', sourceId: 'member', amount: 100, ownerShare }];
      }),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      circleMember: { findUnique: jest.fn().mockResolvedValue({ id: 'member' }), delete: jest.fn() },
      circle: { findUnique: jest.fn().mockResolvedValue({ ownerId: 'owner' }), update: jest.fn() },
      circleRevenueRecord: { create: jest.fn() },
    };
    const service = new CircleRefundService({ $transaction: async (fn: any) => fn(tx) } as any);
    const execute = () => (service as any).executeRefund({ id: 'refund', circleId: 'circle', userId: 'buyer',
      orderId: 'order', actualRefund: 40, paidAmount: 100 });
    return { tx, execute };
  }

  it('异常分成不写负收益，用户退款继续到账，并保留金额为零的人工核对台账', async () => {
    const { tx, execute } = refund(600);
    await execute();
    expect(tx.circleRevenueRecord.create).not.toHaveBeenCalled();
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining("'pending_manual'"),
      expect.any(String), 'refund', 'owner', 'revenue_share_invalid', 'member');
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining("'refunded'"), 'refund', 0);
    expect(tx.circleMember.delete).toHaveBeenCalled();
  });

  it('正常部分退款按 40/100 自动冲正收益40和圈主分成24', async () => {
    const { tx, execute } = refund(60);
    await execute();
    expect(tx.circleRevenueRecord.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: -40, ownerShare: -24 }) });
  });

  it('合法零圈主分成仍完成用户退款，不能因为无需扣圈主而阻断退款', async () => {
    const { tx, execute } = refund(0);
    await expect(execute()).resolves.toBeUndefined();
    expect(tx.circleRevenueRecord.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: -40, ownerShare: -0 }) });
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining("'refunded'"), 'refund', 0);
  });
});

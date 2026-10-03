import { CircleRefundService } from './circle-refund.service';

// 本组只验证人工冲正边界，隔离未调用的依赖，避免启动其他业务模块的定时任务。
jest.mock('../../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../commission/commission.service', () => ({ CommissionService: class {} }));

describe('人工冲正按原订单实付约束收益金额', () => {
  function setup(amount = 100, ownerShare = 60, paid = 100, orderType = 'CIRCLE_JOIN') {
    const rows = [
      { id: 'recall', refundId: 'refund', userId: 'owner', userType: 'owner', status: 'pending_manual', sourceId: 'member' },
      { id: 'refund', circleId: 'circle', userId: 'buyer', orderId: 'order', paidAmount: 999, actualRefund: 40,
        ownerId: 'owner', orderUserId: 'buyer', orderTargetId: 'circle', orderType, orderPaidAmount: paid },
      { id: 'revenue', circleId: 'circle', sourceId: 'member', orderId: 'order', type: 'circle_join', amount, ownerShare },
    ];
    let row = 0;
    const tx = {
      $queryRawUnsafe: jest.fn(async () => [rows[row++]]),
      $executeRawUnsafe: jest.fn(async () => 1),
      circleRevenueRecord: {
        count: jest.fn(async () => 0),
        create: jest.fn(async (args: any) => args.data),
      },
    };
    const service = new CircleRefundService({ $transaction: async (fn: any) => fn(tx) } as any);
    const resolve = (decision = 'adjust') => service.resolveManualRecall('recall', 'finance', {
      decision, revenueRecordId: 'revenue', note: '合成测试：核对本订单及收益台账',
    });
    return { tx, resolve };
  }

  it.each(['CIRCLE_JOIN', 'CIRCLE_RENEW'])('拒绝 %s 的超实付收益，结案和资金均不写入', async (type) => {
    const { tx, resolve } = setup(1000, 600, 100, type);
    await expect(resolve()).rejects.toThrow('指定收益行金额超过原订单实付额');
    expect(tx.circleRevenueRecord.create).not.toHaveBeenCalled();
    expect(tx.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('依据优惠后的订单实付额拒绝异常收益，不能改用退款申请快照', async () => {
    const { tx, resolve } = setup(100, 60, 80);
    await expect(resolve()).rejects.toThrow('指定收益行金额超过原订单实付额');
    expect(tx.circleRevenueRecord.create).not.toHaveBeenCalled();
    expect(tx.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('正常部分退款仍按 40/100 比例追回圈主 24 元', async () => {
    const { tx, resolve } = setup();
    await expect(resolve()).resolves.toMatchObject({ ownerRecalled: 24, revenueAmountRecalled: 40, refundRatio: 0.4 });
    expect(tx.circleRevenueRecord.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: -40, ownerShare: -24 }) });
  });

  it('收益小于实付额可按比例处理且不会扩大退款', async () => {
    const { resolve } = setup(80, 48);
    await expect(resolve()).resolves.toMatchObject({ ownerRecalled: 19.2, revenueAmountRecalled: 32 });
  });

  it('no_change 仅结案，异常收益不触发资金写入或收益行查询', async () => {
    const { tx, resolve } = setup(1000, 600);
    await expect(resolve('no_change')).resolves.toMatchObject({ ownerRecalled: 0, revenueRecordId: null });
    expect(tx.$queryRawUnsafe).toHaveBeenCalledTimes(2);
    expect(tx.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    expect(tx.circleRevenueRecord.count).not.toHaveBeenCalled();
    expect(tx.circleRevenueRecord.create).not.toHaveBeenCalled();
  });
});

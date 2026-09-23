import { CircleRefundController } from './circle-refund.controller';
import { CircleRefundService } from './circle-refund.service';

describe('圈主已审核退款记录', () => {
  const query = jest.fn().mockResolvedValue([]);
  const service = new CircleRefundService({ $queryRawUnsafe: query } as any);

  beforeEach(() => query.mockClear());

  it('按当前 JWT 圈主过滤且只返回已审核记录，分页参数使用占位符', async () => {
    const controller = new CircleRefundController(service);
    await controller.ownerReviewed({ user: { id: 'owner-a' } } as any, '20', '40');
    const [sql, ownerId, take, skip] = query.mock.calls[0];
    expect(sql).toContain(`c."ownerId"=$1 AND r."ownerStatus" IN ('approved','rejected')`);
    expect(sql).toContain('LIMIT $2 OFFSET $3');
    expect([ownerId, take, skip]).toEqual(['owner-a', 20, 40]);
  });

  it('限制异常页大小和负偏移量', async () => {
    await service.getOwnerReviewed('owner-a', 999, -1);
    expect(query.mock.calls[0].slice(1)).toEqual(['owner-a', 50, 0]);
    await service.getOwnerReviewed('owner-a', Infinity, Infinity);
    expect(query.mock.calls[1].slice(1)).toEqual(['owner-a', 20, 0]);
  });
});

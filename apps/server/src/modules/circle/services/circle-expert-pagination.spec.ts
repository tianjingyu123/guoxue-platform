import { CircleExpertService } from './circle-expert.service';

describe('全平台达人分页', () => {
  const findMany = jest.fn().mockResolvedValue([]);
  const service = new CircleExpertService(
    { circleMember: { findMany } } as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => findMany.mockClear());

  it('使用稳定顺序和偏移量，避免同价达人跨页重复或遗漏', async () => {
    await service.listAllExperts(20, 20);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 20,
      skip: 20,
      orderBy: [
        { questionPriceCoin: 'desc' },
        { circleId: 'asc' },
        { userId: 'asc' },
      ],
    }));
  });

  it('限制每页大小和负偏移量', async () => {
    await service.listAllExperts(999, -10);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100, skip: 0 }));
    await service.listAllExperts(Infinity, Infinity);
    expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 50, skip: 0 }));
  });
});

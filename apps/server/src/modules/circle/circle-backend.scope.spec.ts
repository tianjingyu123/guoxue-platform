import { CircleBackendController } from './circle-backend.controller';

describe('嘉宾分账圈子边界', () => {
  let db: any;
  let controller: CircleBackendController;
  const req: any = { user: { id: 'owner', roles: [] } };
  beforeEach(() => {
    db = {
      circle: { findUnique: jest.fn().mockResolvedValue({ id: 'b' }) },
      circleMember: { findFirst: jest.fn(), findMany: jest.fn() },
      circleRevenueSplit: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}), update: jest.fn() },
      circleGuestEarning: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    controller = new CircleBackendController(db);
  });
  it('读取显式圈子，按本圈管理身份校验并仅查询该圈嘉宾', async () => {
    db.circleMember.findFirst.mockResolvedValue({ circle: { id: 'b' } });
    db.circleMember.findMany.mockResolvedValue([]);
    await controller.getGuests(req, 'b');
    expect(db.circleMember.findFirst).toHaveBeenCalledWith({ where: { circleId: 'b', userId: 'owner', role: { in: ['OWNER', 'ADMIN'] } }, include: { circle: true } });
    expect(db.circleMember.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { circleId: 'b', role: 'GUEST' } }));
  });
  it('无本圈管理身份不能读嘉宾，也不能修改分账', async () => {
    db.circleMember.findFirst.mockResolvedValue(null);
    await expect(controller.getGuests(req, 'other')).rejects.toThrow();
    await expect(controller.setGuestShareRate(req, 'guest', { circleId: 'other', shareRate: 30 })).rejects.toThrow();
    expect(db.circleRevenueSplit.create).not.toHaveBeenCalled();
    expect(db.circleRevenueSplit.update).not.toHaveBeenCalled();
    expect(db.circleGuestEarning.groupBy).not.toHaveBeenCalled();
  });
  it('旧客户端未指定圈子且存在多圈时拒绝写入', async () => {
    db.circleMember.findMany.mockResolvedValue([{ circle: { id: 'a' } }, { circle: { id: 'b' } }]);
    await expect(controller.setGuestShareRate(req, 'guest', { shareRate: 30 })).rejects.toThrow();
    expect(db.circleRevenueSplit.create).not.toHaveBeenCalled();
    expect(db.circleRevenueSplit.findFirst).not.toHaveBeenCalled();
  });
  it('旧客户端只有一个管理圈子时保留读取兼容', async () => {
    db.circleMember.findMany.mockResolvedValueOnce([{ circle: { id: 'a' } }]).mockResolvedValueOnce([]);
    await controller.getGuests(req);
    expect(db.circleRevenueSplit.findMany).toHaveBeenCalledWith({ where: { circleId: 'a', status: 'ACTIVE' } });
  });
  it('嘉宾必须属于所选圈子，否则不写入', async () => {
    db.circleMember.findFirst.mockResolvedValueOnce({ circle: { id: 'b' } }).mockResolvedValueOnce(null);
    await expect(controller.setGuestShareRate(req, 'guest-a', { circleId: 'b', shareRate: 30 })).rejects.toThrow();
    expect(db.circleRevenueSplit.create).not.toHaveBeenCalled();
  });
  it('合法写入绑定所选圈子，百分比换算保持原规则', async () => {
    db.circleMember.findFirst.mockResolvedValueOnce({ circle: { id: 'b' } }).mockResolvedValueOnce({ id: 'membership' });
    await controller.setGuestShareRate(req, 'guest', { circleId: 'b', shareRate: 30 });
    expect(db.circleMember.findFirst).toHaveBeenLastCalledWith({ where: { circleId: 'b', userId: 'guest', role: 'GUEST' } });
    expect(db.circleRevenueSplit.create).toHaveBeenCalledWith({ data: { circleId: 'b', guestId: 'guest', splitRate: 0.3 } });
  });
  it('平台既有跨圈权限保留，但不存在的圈子拒绝', async () => {
    const admin: any = { user: { id: 'platform', roles: ['SUPER_ADMIN'] } };
    db.circleMember.findMany.mockResolvedValue([]);
    await controller.getGuests(admin, 'b');
    expect(db.circleMember.findFirst).not.toHaveBeenCalled();
    db.circle.findUnique.mockResolvedValue(null);
    await expect(controller.getGuests(admin, 'missing')).rejects.toThrow();
  });
});

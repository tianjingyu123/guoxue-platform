import { CoinService } from "./coin.service";

describe("CoinService 外层资金事务边界", () => {
  const root = {
    virtualCoinAccount: { findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  };
  const tx = {
    virtualCoinAccount: { upsert: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    virtualCoinTransaction: { create: jest.fn() },
  };
  let service: CoinService;

  beforeEach(() => {
    jest.resetAllMocks();
    for (const method of [root.virtualCoinAccount.findUnique, root.virtualCoinAccount.create, root.$transaction]) {
      method.mockImplementation(() => { throw new Error("不能在外层事务之外开户或另开事务"); });
    }
    tx.virtualCoinAccount.upsert.mockResolvedValue({ userId: "payer", balance: 100 });
    tx.virtualCoinAccount.updateMany.mockResolvedValue({ count: 1 });
    tx.virtualCoinAccount.findUnique.mockResolvedValue({ userId: "payer", balance: 92 });
    tx.virtualCoinAccount.update.mockResolvedValue({ userId: "author", balance: 4 });
    tx.virtualCoinTransaction.create.mockResolvedValue({ id: "ledger" });
    service = new CoinService(root as any, {} as any);
  });

  it("扣款与开户使用传入事务，内部稳定流水编号不落入公开DTO", async () => {
    await service.spend("payer", { amountCoin: 8, scene: "POST_REWARD", refId: "post" }, tx as any, "stable-debit");
    expect(tx.virtualCoinAccount.upsert).toHaveBeenCalledWith({ where: { userId: "payer" }, create: { userId: "payer" }, update: {} });
    expect(tx.virtualCoinTransaction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ id: "stable-debit", userId: "payer", amountCoin: -8, balanceAfter: 92, refId: "post" }) });
    expect(root.$transaction).not.toHaveBeenCalled();
  });

  it("作者首次开户和入账仍使用传入事务，收入流水关联扣款主键", async () => {
    await service.refund("author", 4, "帖子打赏收入", tx as any, "stable-debit");
    expect(tx.virtualCoinAccount.upsert).toHaveBeenCalledWith({ where: { userId: "author" }, create: { userId: "author" }, update: {} });
    expect(tx.virtualCoinTransaction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "author", type: "REFUND", scene: "REFUND", amountCoin: 4, refId: "stable-debit" }) });
    expect(root.virtualCoinAccount.create).not.toHaveBeenCalled();
    expect(root.$transaction).not.toHaveBeenCalled();
  });
});

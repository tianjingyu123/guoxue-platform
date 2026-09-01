import { DataExplorerService } from "./data-explorer.service";

describe("DataExplorerService", () => {
  function setup() {
    const tx = {
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ total: 3 }]),
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    const aiGateway = {
      chat: jest
        .fn()
        .mockResolvedValueOnce({ content: 'SELECT COUNT(*) AS total FROM "User"' })
        .mockResolvedValueOnce({ content: "共有3位用户。" }),
    };
    const registry = {
      register: jest.fn().mockResolvedValue("capability-1"),
      recordCall: jest.fn().mockResolvedValue(undefined),
    };
    const service = new DataExplorerService(
      prisma as any,
      aiGateway as any,
      registry as any,
    );
    return { service, prisma, tx };
  }

  it("在同一事务连接内设置查询超时并执行只读SQL", async () => {
    const { service, prisma, tx } = setup();

    const result = await service.ask("当前用户总数是多少");

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { maxWait: 2_000, timeout: 12_000 },
    );
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
      "SET LOCAL statement_timeout = '10s'",
    );
    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('SELECT COUNT(*) AS total FROM "User"'),
    );
    expect(result.rowCount).toBe(1);
  });

  it("拦截敏感列、危险函数和非白名单数据源", () => {
    const { service } = setup();
    const isSafeSql = (service as any).isSafeSql.bind(service);

    expect(isSafeSql('SELECT "phone" FROM "User"')).toBe(false);
    expect(isSafeSql("SELECT current_setting('server_version')")).toBe(false);
    expect(isSafeSql('SELECT * FROM "PaymentSecret"')).toBe(false);
    expect(isSafeSql('SELECT COUNT(*) FROM "Order"')).toBe(true);
  });
});

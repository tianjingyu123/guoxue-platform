import { parseCatalogAuditArgs } from "./audit-public-catalog-readonly";

describe("目录只读盘点入口", () => {
  it("未显式声明只读和目标身份时拒绝运行", () => {
    expect(() => parseCatalogAuditArgs([])).toThrow("--read-only");
    expect(() => parseCatalogAuditArgs(["--read-only"])).toThrow("expected-database");
    expect(() => parseCatalogAuditArgs(["--read-only", "--expected-database=test"])).toThrow("expected-user");
  });

  it("只接受明确的数据库、账号和服务端地址", () => {
    expect(parseCatalogAuditArgs(["--read-only", "--expected-database=rebu_test",
      "--expected-user=reader", "--expected-host=127.0.0.1"])).toEqual({
      database: "rebu_test", user: "reader", host: "127.0.0.1",
    });
  });
});

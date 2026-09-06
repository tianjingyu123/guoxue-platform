import { Prisma } from "@prisma/client";
import { capabilityTimestamp } from "./circle-capability-time";

describe("能力仓储 UTC 时间参数", () => {
  it.each(["2026-09-05T00:01:02.123Z", "2026-01-05T23:59:59.999Z"])("UTC 文本作为参数而非拼接：%s", iso => {
    const sql = capabilityTimestamp(new Date(iso));
    expect(sql.text).toBe("$1::timestamp(3)"); expect(sql.values).toEqual([iso]); expect(sql.text).not.toContain(iso);
    expect(Prisma.sql`SELECT ${sql}`.values).toEqual([iso]);
  });
  it("空日期仍保留类型化 NULL", () => {
    expect(capabilityTimestamp(null).values).toEqual([null]); expect(capabilityTimestamp(null).text).toBe("$1::timestamp(3)");
  });
  it.each([undefined, "2026-09-05", 0, {}, new Date(NaN)])("不接受隐式转换日期 %#", value => {
    expect(() => capabilityTimestamp(value as Date)).toThrow("CAPABILITY_INVALID_TIMESTAMP");
  });
});

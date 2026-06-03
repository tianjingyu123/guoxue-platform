import { safePagination, paginated } from "./pagination";

describe("pagination", () => {
  describe("safePagination", () => {
    it("默认参数返回第1页20条", () => {
      const result = safePagination();
      expect(result).toEqual({ page: 1, pageSize: 20, skip: 0 });
    });

    it("字符串参数正确转换", () => {
      const result = safePagination("3", "10");
      expect(result).toEqual({ page: 3, pageSize: 10, skip: 20 });
    });

    it("page小于1时修正为1", () => {
      const result = safePagination(-5, 10);
      expect(result.page).toBe(1);
    });

    it("pageSize超过上限时限制", () => {
      const result = safePagination(1, 200);
      expect(result.pageSize).toBe(100);
    });

    it("自定义maxPageSize", () => {
      const result = safePagination(1, 500, 200);
      expect(result.pageSize).toBe(200);
    });

    it("pageSize小于1时修正为1", () => {
      const result = safePagination(1, -10);
      expect(result.pageSize).toBe(1);
    });

    it("skip计算正确：第2页15条 = skip 15", () => {
      const result = safePagination(2, 15);
      expect(result.skip).toBe(15);
    });
  });

  describe("paginated", () => {
    it("创建标准分页响应", () => {
      const result = paginated([{ id: 1 }, { id: 2 }], 50, 2, 10);
      expect(result.rows).toHaveLength(2);
      expect(result.total).toBe(50);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result._paginated).toBe(true);
    });

    it("空数据分页", () => {
      const result = paginated([], 0, 1, 20);
      expect(result.rows).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
